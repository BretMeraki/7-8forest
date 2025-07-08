/**
 * Dynamically load ChromaDB client only if the package is installed.
 * Throws with clear message otherwise so caller can fall back.
 * @returns {Promise<function>} ChromaApi constructor
 */
async function loadChromaClient() {
  if (ChromaClient) return ChromaClient;
  try {
    const pkg = await import('chromadb');
    // ChromaDB v3.x uses ChromaClient, not ChromaApi
    ChromaClient = pkg.ChromaClient || (pkg.default && pkg.default.ChromaClient) || pkg.default;
    if (!ChromaClient) throw new Error('ChromaClient export not found');
    return ChromaClient;
  } catch (err) {
    throw new Error('ChromaDBProvider: chromadb unavailable - ' + (err && err.message ? err.message : String(err)));
  }
}

let ChromaClient = null;

import IVectorProvider from './IVectorProvider.js';

/**
 * ChromaDB vector database provider
 * Implements IVectorProvider interface
 */
class ChromaDBProvider extends IVectorProvider {
    /**
     * @param {{collection?: string, url?: string, dimension?: number}} [config]
     */
    constructor(config = {}) {
        super();
        this.config = config || {};
        this.client = null;
        this.collection = null;
        this.collectionName = (config && typeof config.collection === 'string') ? config.collection : 'forest_vectors';
        
        // Connection management
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
        this.lastActivity = Date.now();
        this.keepAliveInterval = null;
        this.connectionTimeout = 30000; // 30 seconds
    }

    /**
     * @param {{collection?: string, url?: string, dimension?: number}} [config]
     */
    async initialize(config = {}) {
        this.config = { ...this.config, ...(config || {}) };
        
        try {
            await this.connect();
            return {
                success: true,
                provider: 'ChromaDBProvider',
                collection: this.collectionName,
                mode: 'embedded_local',
                path: process.env.CHROMA_DATA_DIR || '/Users/bretmeraki/.forest-data/.chromadb',
                url: null,
                note: 'Running in local embedded mode - no server required'
            };
        } catch (error) {
            console.error('[ChromaDBProvider] Initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Establish connection to ChromaDB
     */
    async connect() {
        try {
            const ClientClass = await loadChromaClient();
            
            // Determine if we should use server mode or embedded mode
            const useServerMode = this.config.url && this.config.url.startsWith('http');
            
            if (useServerMode) {
                console.log(`[ChromaDBProvider] Initializing ChromaDB client for server mode (${this.config.url})`);
                this.client = new ClientClass({ url: this.config.url });
                this.isEmbedded = false;
            } else {
                console.log('[ChromaDBProvider] Initializing local ChromaDB client (embedded mode)');
                this.client = new ClientClass();
                this.isEmbedded = true;
            }
            
            this.collectionName = (this.config && typeof this.config.collection === 'string') ? this.config.collection : 'forest_vectors';
            
            console.log(`[ChromaDBProvider] Using collection: ${this.collectionName}`);
            
            // Test connection by listing collections
            await this.client.listCollections();
            
            // Ensure collection exists
            await this.ensureCollection();
            
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.lastActivity = Date.now();
            
            // Start keep-alive for server mode
            if (!this.isEmbedded) {
                this.startKeepAlive();
            }
            
            console.log(`[ChromaDBProvider] Connected successfully (${this.isEmbedded ? 'embedded' : 'server'} mode)`);
            
        } catch (error) {
            this.isConnected = false;
            console.error('[ChromaDBProvider] Connection failed:', error.message);
            throw error;
        }
    }

    /**
     * Ensure collection exists
     */
    async ensureCollection() {
        try {
            const collections = await this.client.listCollections();
            const collectionExists = collections.some(c => c.name === this.collectionName);
            
            // Dynamically load default embedder to avoid heavy import when not needed
            let embeddingFunction;
            try {
                const embedMod = await import('@chroma-core/default-embed');
                const DefaultEmbeddingFunction = embedMod.DefaultEmbeddingFunction || embedMod.default;
                if (DefaultEmbeddingFunction) {
                    embeddingFunction = new DefaultEmbeddingFunction();
                }
            } catch (err) {
                console.warn('[ChromaDBProvider] Default embedding package not available, continuing without embeddingFunction');
            }

            if (!collectionExists) {
                this.collection = await this.client.createCollection({
                    name: this.collectionName,
                    metadata: {
                        description: 'Forest MCP vector storage',
                        dimension: typeof this.config.dimension === 'number' ? this.config.dimension : 1536,
                    },
                    ...(embeddingFunction && process.env.NODE_ENV !== 'test' ? { embeddingFunction } : {})
                });
            } else {
                // Ensure we still attach the embedding function when retrieving existing collection
                let embeddingFunction;
                try {
                    const embedMod = await import('@chroma-core/default-embed');
                    const DefaultEmbeddingFunction = embedMod.DefaultEmbeddingFunction || embedMod.default;
                    if (DefaultEmbeddingFunction) {
                        embeddingFunction = new DefaultEmbeddingFunction();
                    }
                } catch (_) {}

                this.collection = await this.client.getCollection({
                    name: this.collectionName,
                    ...(embeddingFunction && process.env.NODE_ENV !== 'test' ? { embeddingFunction } : {})
                });
            }
        } catch (err) {
            throw new Error('ChromaDBProvider: Failed to initialize collection: ' + (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' ? err.message : String(err)));
        }
    }

    /**
     * Start keep-alive mechanism for server connections
     */
    startKeepAlive() {
        if (this.keepAliveInterval || this.isEmbedded) return;
        
        this.keepAliveInterval = setInterval(async () => {
            try {
                // Only ping if we haven't had activity recently
                const timeSinceActivity = Date.now() - this.lastActivity;
                if (timeSinceActivity > this.connectionTimeout / 2) {
                    await this.client.listCollections();
                    this.lastActivity = Date.now();
                }
            } catch (error) {
                console.warn('[ChromaDBProvider] Keep-alive failed, will reconnect on next operation:', error.message);
                this.isConnected = false;
            }
        }, this.connectionTimeout / 3); // Ping every 10 seconds if timeout is 30s
    }

    /**
     * Stop keep-alive mechanism
     */
    stopKeepAlive() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
    }

    /**
     * Ensure connection is active, reconnect if needed
     */
    async ensureConnection() {
        if (this.isConnected && this.client && this.collection) {
            this.lastActivity = Date.now();
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            throw new Error(`ChromaDBProvider: Max reconnection attempts (${this.maxReconnectAttempts}) exceeded`);
        }

        console.log(`[ChromaDBProvider] Reconnecting (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
        
        try {
            // Wait before reconnecting (exponential backoff)
            if (this.reconnectAttempts > 0) {
                const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            await this.connect();
            console.log('[ChromaDBProvider] Reconnection successful');
        } catch (error) {
            this.reconnectAttempts++;
            console.error(`[ChromaDBProvider] Reconnection failed (attempt ${this.reconnectAttempts}):`, error.message);
            throw error;
        }
    }

    /**
     * @param {string} id
     * @param {number[]} vector
     * @param {any} metadata
     */
    async upsertVector(id, vector, metadata = {}) {
        await this.ensureConnection();
        try {
            // Flatten metadata to only include simple types (ChromaDB requirement)
            const flattenedMetadata = this.flattenMetadata(metadata);
            
            await this.collection.upsert({
                ids: [id],
                embeddings: [vector],
                metadatas: [flattenedMetadata],
            });
        } catch (err) {
            console.error('[ChromaDBProvider] upsertVector failed:', err?.message || err);
            
            // Check for corruption indicators
            const isCorruption = err?.message && (
                err.message.includes('tolist') ||
                err.message.includes('500') ||
                err.message.includes('Internal Server Error') ||
                err.message.includes('AttributeError') ||
                err.message.includes('status: 500')
            );
            
            if (isCorruption) {
                console.error('[ChromaDBProvider] 🔥 Corruption detected in upsertVector:', err.message);
                this.isConnected = false;
                throw new Error('CHROMADB_CORRUPTION: ' + err.message);
            }
            
            if (err?.message?.includes('channel') || err?.message?.includes('connection')) {
                this.isConnected = false;
            }
            throw err;
        }
    }
    
    /**
     * Flatten metadata to only include simple types (string, number, boolean)
     * @param {any} metadata - The metadata object to flatten
     * @returns {object} - Flattened metadata with only simple types
     */
    flattenMetadata(metadata) {
        if (!metadata || typeof metadata !== 'object') {
            return {};
        }
        
        const flattened = {};
        
        for (const [key, value] of Object.entries(metadata)) {
            if (value === null || value === undefined) {
                continue; // Skip null/undefined values
            }
            
            const type = typeof value;
            if (type === 'string' || type === 'number' || type === 'boolean') {
                flattened[key] = value;
            } else if (Array.isArray(value)) {
                // Convert arrays to JSON strings
                flattened[key] = JSON.stringify(value);
            } else if (type === 'object') {
                // Convert objects to JSON strings
                flattened[key] = JSON.stringify(value);
            } else {
                // Convert other types to strings
                flattened[key] = String(value);
            }
        }
        
        return flattened;
    }

    /**
     * @param {number[]} queryVector
     * @param {{limit?: number, threshold?: number}} [options]
     * @returns {Promise<Array<{id: string, similarity: number, metadata: any, vector: number[]}>>}
     */
    async queryVectors(queryVector, options = {}) {
        await this.ensureConnection();
        if (!Array.isArray(queryVector)) throw new Error('ChromaDBProvider: queryVector must be an array');

        const { limit = 10, threshold = 0.1, filter = {} } = options || {};

        try {
            const results = await this.collection.query({
                queryEmbeddings: [queryVector],
                nResults: limit,
                where: Object.keys(filter).length > 0 ? filter : undefined,
                include: ['metadatas', 'embeddings', 'distances'],
            });

            // ChromaDB returns results in arrays indexed by query
            const ids = results.ids[0] || [];
            const distances = results.distances[0] || [];
            const metadatas = results.metadatas[0] || [];
            const embeddings = results.embeddings[0] || [];

            return ids.map((id, index) => {
                // ChromaDB returns distances (lower is better), convert to similarity (higher is better)
                const distance = distances[index] || 1;
                const similarity = Math.max(0, 1 - distance);
                
                return {
                    id,
                    similarity,
                    metadata: metadatas[index] || {},
                    vector: embeddings[index] || [],
                };
            })
            .filter(r => r.similarity >= threshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
        } catch (err) {
            // Check for corruption indicators
            const isCorruption = err?.message && (
                err.message.includes('tolist') ||
                err.message.includes('500') ||
                err.message.includes('Internal Server Error') ||
                err.message.includes('AttributeError') ||
                err.message.includes('status: 500')
            );
            
            if (isCorruption) {
                console.error('[ChromaDBProvider] 🔥 Corruption detected in queryVectors:', err.message);
                this.isConnected = false;
                throw new Error('CHROMADB_CORRUPTION: ' + err.message);
            }
            
            if (err?.message?.includes('channel') || err?.message?.includes('connection')) {
                this.isConnected = false;
            }
            throw new Error('ChromaDBProvider: queryVectors failed: ' + (err && err.message ? err.message : String(err)));
        }
    }

    /**
     * @param {string} id
     */
    async deleteVector(id) {
        await this.ensureConnection();
        try {
            await this.collection.delete({
                ids: [id],
            });
        } catch (err) {
            if (err?.message?.includes('channel') || err?.message?.includes('connection')) {
                this.isConnected = false;
            }
            throw err;
        }
    }

    /**
     * @param {string} namespace
     */
    async deleteNamespace(namespace) {
        await this.ensureConnection();
        
        try {
            // Get all vectors that start with the namespace prefix
            const results = await this.collection.get({
                include: ['metadatas'],
            });
            
            const idsToDelete = results.ids.filter(id => String(id).startsWith(namespace));
            
            if (idsToDelete.length > 0) {
                await this.collection.delete({
                    ids: idsToDelete,
                });
            }
        } catch (err) {
            if (err?.message?.includes('channel') || err?.message?.includes('connection')) {
                this.isConnected = false;
            }
            throw err;
        }
    }

    /**
     * Reset the entire collection to recover from corruption
     */
    async resetCollection() {
        try {
            console.error('[ChromaDBProvider] 🔧 Resetting collection to recover from corruption...');
            
            if (this.collection) {
                try {
                    // Delete the entire collection
                    await this.client.deleteCollection({ name: this.collectionName });
                    console.error('[ChromaDBProvider] Collection deleted successfully');
                } catch (deleteError) {
                    console.error('[ChromaDBProvider] Collection deletion failed (may not exist):', deleteError.message);
                }
            }
            
            // Recreate the collection
            this.collection = await this.client.createCollection({
                name: this.collectionName,
                metadata: { 
                    description: 'Forest HTA Vector Store - Recreated after corruption recovery',
                    created: new Date().toISOString()
                }
            });
            
            // Reset connection state
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            console.error('[ChromaDBProvider] ✅ Collection reset completed successfully');
            
        } catch (error) {
            console.error('[ChromaDBProvider] ❌ Collection reset failed:', error.message);
            
            // Try to establish a fresh connection
            try {
                await this.connect();
                console.error('[ChromaDBProvider] Fresh connection established after reset failure');
            } catch (reconnectError) {
                console.error('[ChromaDBProvider] Fresh connection also failed:', reconnectError.message);
                throw new Error(`Collection reset and reconnection failed: ${error.message}`);
            }
        }
    }

    /**
     * List all vectors whose ID starts with the given prefix.
     * @param {String} prefix
     * @returns {Promise<Array<{id: String, vector: Number[], metadata: any}>>}
     */
    async listVectors(prefix = '') {
        await this.ensureConnection();
        
        try {
            const results = await this.collection.get({
                include: ['metadatas', 'embeddings'],
            });

            const ids = results.ids || [];
            const metadatas = results.metadatas || [];
            const embeddings = results.embeddings || [];

            return ids
                .map((id, index) => ({
                    id,
                    vector: embeddings[index] || [],
                    metadata: metadatas[index] || {},
                }))
                .filter(item => String(item.id).startsWith(prefix));
        } catch (err) {
            // Check for corruption indicators
            const isCorruption = err?.message && (
                err.message.includes('tolist') ||
                err.message.includes('500') ||
                err.message.includes('Internal Server Error') ||
                err.message.includes('AttributeError') ||
                err.message.includes('status: 500')
            );
            
            if (isCorruption) {
                console.error('[ChromaDBProvider] 🔥 Corruption detected in listVectors:', err.message);
                this.isConnected = false;
                throw new Error('CHROMADB_CORRUPTION: ' + err.message);
            }
            
            if (err?.message?.includes('channel') || err?.message?.includes('connection')) {
                this.isConnected = false;
            }
            throw new Error('ChromaDBProvider: listVectors failed: ' + (err && err.message ? err.message : String(err)));
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async getStats() {
        // For interface compliance, do nothing (or throw if needed)
        // Real implementation should return stats, but interface expects void
        return;
    }

    async flush() {
        // ChromaDB persists data automatically, so nothing to flush
        return;
    }

    /**
     * Ping the ChromaDB server to check connectivity
     */
    async ping() {
        try {
            await this.ensureConnection();
            // Try a simple operation to verify the connection works
            await this.collection.count();
            return true;
        } catch (error) {
            console.error('[ChromaDBProvider] Ping failed:', error.message);
            this.isConnected = false;
            throw error;
        }
    }

    async close() {
        console.log('[ChromaDBProvider] Closing connection...');
        
        // Stop keep-alive mechanism
        this.stopKeepAlive();
        
        // Mark as disconnected
        this.isConnected = false;
        
        // Clear references
        this.collection = null;
        this.client = null;
        
        console.log('[ChromaDBProvider] Connection closed');
    }
}

export default ChromaDBProvider;
