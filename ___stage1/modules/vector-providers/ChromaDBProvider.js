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
    }

    /**
     * @param {{collection?: string, url?: string, dimension?: number}} [config]
     */
    async initialize(config = {}) {
        this.config = { ...this.config, ...(config || {}) };
        const ClientClass = await loadChromaClient();
        
        // Use embedded mode by default for ChromaDB v3.x
        const useEmbedded = !this.config.url || this.config.url.includes('embedded') || this.config.url === 'embedded://localhost';
        
        if (useEmbedded) {
            // Embedded mode - ChromaDB v3.x uses default constructor for embedded
            // For embedded mode, just create client without any configuration
            this.client = new ClientClass();
        } else {
            // Server mode
            this.client = new ClientClass({
                path: this.config.url
            });
        }

        this.collectionName = (this.config && typeof this.config.collection === 'string') ? this.config.collection : 'forest_vectors';
        
        // Ensure collection exists
        try {
            const collections = await this.client.listCollections();
            const collectionExists = collections.some(c => c.name === this.collectionName);
            
            if (!collectionExists) {
                this.collection = await this.client.createCollection({
                    name: this.collectionName,
                    metadata: {
                        description: 'Forest MCP vector storage',
                        dimension: typeof this.config.dimension === 'number' ? this.config.dimension : 1536,
                    },
                });
            } else {
                this.collection = await this.client.getCollection({
                    name: this.collectionName,
                });
            }
        } catch (err) {
            throw new Error('ChromaDBProvider: Failed to initialize collection: ' + (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' ? err.message : String(err)));
        }

        // Successful initialization status
        return {
            success: true,
            provider: 'ChromaDBProvider',
            collection: this.collectionName,
            mode: useEmbedded ? 'embedded' : 'server',
            path: useEmbedded ? (this.config.path || '.chromadb') : this.config.url,
            url: useEmbedded ? null : this.config.url,
        };
    }

    /**
     * @param {string} id
     * @param {number[]} vector
     * @param {any} metadata
     */
    async upsertVector(id, vector, metadata = {}) {
        if (!this.collection) throw new Error('ChromaDBProvider: collection not initialized');
        try {
            await this.collection.upsert({
                ids: [id],
                embeddings: [vector],
                metadatas: [metadata],
            });
        } catch (err) {
            console.error('[ChromaDBProvider] upsertVector failed:', err?.message || err);
            throw err;
        }
    }

    /**
     * @param {number[]} queryVector
     * @param {{limit?: number, threshold?: number}} [options]
     * @returns {Promise<Array<{id: string, similarity: number, metadata: any, vector: number[]}>>}
     */
    async queryVectors(queryVector, options = {}) {
        if (!this.collection) throw new Error('ChromaDBProvider: collection not initialized');
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
            throw new Error('ChromaDBProvider: queryVectors failed: ' + (err && err.message ? err.message : String(err)));
        }
    }

    /**
     * @param {string} id
     */
    async deleteVector(id) {
        if (!this.collection) throw new Error('ChromaDBProvider: collection not initialized');
        await this.collection.delete({
            ids: [id],
        });
    }

    /**
     * @param {string} namespace
     */
    async deleteNamespace(namespace) {
        if (!this.collection) throw new Error('ChromaDBProvider: collection not initialized');
        
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
    }

    /**
     * List all vectors whose ID starts with the given prefix.
     * @param {String} prefix
     * @returns {Promise<Array<{id: String, vector: Number[], metadata: any}>>}
     */
    async listVectors(prefix = '') {
        if (!this.collection) throw new Error('ChromaDBProvider: collection not initialized');
        
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

    async close() {
        // No explicit close needed for ChromaDB client
        return;
    }
}

export default ChromaDBProvider;
