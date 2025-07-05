/**
 * Dynamically load Qdrant client only if the package is installed.
 * Throws with clear message otherwise so caller can fall back.
 * @returns {Promise<function>} QdrantClient constructor
 */
async function loadQdrantClient() {
  if (QdrantClient) return QdrantClient;
  try {
    const pkg = await import('@qdrant/js-client-rest');
    QdrantClient = pkg.QdrantClient || (pkg.default && pkg.default.QdrantClient) || pkg.default;
    if (!QdrantClient) throw new Error('QdrantClient export not found');
    return QdrantClient;
  } catch (err) {
    throw new Error('QdrantProvider: @qdrant/js-client-rest unavailable - ' + (err && err.message ? err.message : String(err)));
  }
}
import IVectorProvider from './IVectorProvider.js';

/**
 * Qdrant vector database provider (default)
 * Implements IVectorProvider interface
 */
class QdrantProvider extends IVectorProvider {
    /**
     * @param {{collection?: string, url?: string, apiKey?: string, dimension?: number}} [config]
     */
    constructor(config = {}) {
        super();
        this.config = config || {};
        this.client = null;
        this.collection = (config && typeof config.collection === 'string') ? config.collection : 'forest_vectors';
    }
    /**
     * @param {{collection?: string, url?: string, apiKey?: string, dimension?: number}} [config]
     */
    async initialize(config = {}) {
        this.config = { ...this.config, ...(config || {}) };
        const ClientClass = await loadQdrantClient();
        this.client = new ClientClass({
            url: typeof this.config.url === 'string' ? this.config.url : 'http://localhost:6333',
            apiKey: typeof this.config.apiKey === 'string' ? this.config.apiKey : '',
        });
        this.collection = (this.config && typeof this.config.collection === 'string') ? this.config.collection : 'forest_vectors';
        // Ensure collection exists
        try {
            const collections = await this.client.getCollections();
            if (collections && collections.collections && !collections.collections.some(c => c.name === this.collection)) {
                await this.client.createCollection(this.collection, {
                    vectors: {
                        size: typeof this.config.dimension === 'number' ? this.config.dimension : 1536,
                        distance: 'Cosine',
                    },
                });
            }
        } catch (err) {
            throw new Error('QdrantProvider: Failed to initialize collection: ' + (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' ? err.message : String(err)));
        }

        // Successful initialization status
        return {
            success: true,
            provider: 'QdrantProvider',
            collection: this.collection,
            url: this.config.url || 'http://localhost:6333',
        };
    }
    /**
     * @param {string} id
     * @param {number[]} vector
     * @param {any} metadata
     */
    async upsertVector(id, vector, metadata = {}) {
        if (!this.client) throw new Error('QdrantProvider: client not initialized');
        try {
            await this.client.upsert(this.collection, {
                points: [{
                    id,
                    vector,
                    payload: metadata,
                }],
            });
        } catch (err) {
            console.error('[QdrantProvider] upsertVector failed:', err?.message || err);
            throw err;
        }
    }
    /**
     * @param {number[]} queryVector
     * @param {{limit?: number, threshold?: number}} [options]
     * @returns {Promise<void>}
     */
    async queryVectors(queryVector, options = {}) {
        if (!this.client) throw new Error('QdrantProvider: client not initialized');
        if (!Array.isArray(queryVector)) throw new Error('QdrantProvider: queryVector must be an array');

        const { limit = 10, threshold = 0.1, filter = {} } = options || {};

        try {
            // Qdrant REST client returns an array of points with distance/score
            /** @type {Array<{id: string|number, payload: any, vector: number[], score?: number, distance?: number}>} */
            const results = await this.client.search(this.collection, {
                vector: queryVector,
                limit,
                filter,
            });

            // The client may wrap results in { result: [...] }
            const points = Array.isArray(results) ? results : (results && results.result) ? results.result : [];

            return points
                .map(p => {
                    const similarity = typeof p.score === 'number' ? p.score : (typeof p.distance === 'number' ? 1 - p.distance : 0);
                    return {
                        id: p.id,
                        similarity,
                        metadata: p.payload || {},
                        vector: p.vector,
                    };
                })
                .filter(r => r.similarity >= threshold)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);
        } catch (err) {
            throw new Error('QdrantProvider: queryVectors failed: ' + (err && err.message ? err.message : String(err)));
        }
    }
    /**
     * @param {string} id
     */
    async deleteVector(id) {
        if (!this.client) throw new Error('QdrantProvider: client not initialized');
        await this.client.delete(this.collection, { points: [id] });
    }
    /**
     * @param {string} namespace
     */
    async deleteNamespace(namespace) {
        if (!this.client) throw new Error('QdrantProvider: client not initialized');
        const points = await this.client.scroll(this.collection, { limit: 10000 });
        const pts = Array.isArray(points && points.points) ? points.points : [];
        const idsToDelete = pts.filter(p => String(p.id).startsWith(namespace)).map(p => p.id);
        if (idsToDelete.length > 0) {
            await this.client.delete(this.collection, { points: idsToDelete });
        }
    }
    /**
     * List all vectors whose ID starts with the given prefix.
     * @param {String} prefix
     * @returns {Promise<Array<{id: String|Number, vector: Number[], metadata: any}>>}
     */
    async listVectors(prefix = '') {
        if (!this.client) throw new Error('QdrantProvider: client not initialized');
        const collected = [];
        let offset = undefined;
        try {
            do {
                const res = await this.client.scroll(this.collection, {
                    limit: 256,
                    offset,
                });
                const pts = Array.isArray(res && res.points) ? res.points : [];
                collected.push(...pts.filter(p => String(p.id).startsWith(prefix)));
                offset = res && res.next_page_offset ? res.next_page_offset : undefined;
            } while (offset !== undefined && offset !== null);
        } catch (err) {
            throw new Error('QdrantProvider: listVectors failed: ' + (err && err.message ? err.message : String(err)));
        }
        return collected.map(p => ({ id: p.id, vector: p.vector, metadata: p.payload || {} }));
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
        // Qdrant is transactional, so nothing to flush
        return;
    }
    async close() {
        // No explicit close needed for Qdrant REST client
        return;
    }
}

export default QdrantProvider; 