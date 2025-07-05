// LocalJSONProvider.js
import { FileSystem } from '../../../modules/utils/file-system.js';
import IVectorProvider from './IVectorProvider.js';

/**
 * Local JSON file-based vector provider (fallback for Qdrant)
 * Implements IVectorProvider interface
 */
class LocalJSONProvider extends IVectorProvider {
    /**
     * @param {{baseDir?: string}} [config]
     */
    constructor(config) {
        super();
        if (config && typeof config === 'object' && typeof config.baseDir === 'string') {
            this.baseDir = config.baseDir;
        } else {
            this.baseDir = '.forest-vectors';
        }
        this.cache = new Map();
        this.initialized = false;
        
        // LRU cache management
        this.maxCacheSize = (config && config.maxCacheSize) || parseInt(process.env.VECTOR_CACHE_MAX) || 5000;
        this.cacheAccessOrder = new Map(); // Track access order for LRU
        this.accessCounter = 0;
    }
    /**
     * @param {{baseDir?: string}} [config]
     */
    async initialize(config = {}) {
        if (config && typeof config === 'object' && typeof config.baseDir === 'string') {
            this.baseDir = config.baseDir;
        }
        await FileSystem.ensureDir(this.baseDir);
        this.initialized = true;
        await this._loadAll();

        // Successful initialization status
        return {
            success: true,
            provider: 'LocalJSONProvider',
            baseDir: this.baseDir,
        };
    }
    /**
     * @param {string} id
     * @param {number[]} vector
     * @param {Object} metadata
     */
    async upsertVector(id, vector, metadata = {}) {
        // Evict if cache is full
        this._evictIfNeeded();
        
        this.cache.set(id, { vector, metadata });
        
        // Update access tracking
        this._updateAccess(id);
        
        await this._persistAll();
    }
    /**
     * @param {number[]} queryVector
     * @param {{threshold?: number, limit?: number}} [options]
     * @returns {Promise<Array<{id: string, similarity: number, metadata: Object, vector: number[]}>}
     */
    async queryVectors(queryVector, options = {}) {
        if (!Array.isArray(queryVector)) throw new Error('LocalJSONProvider: queryVector must be an array');
        const { threshold = 0.1, limit = 10, filter = null } = options || {};
        const results = [];
        for (const [id, { vector, metadata }] of this.cache.entries()) {
            // Update access tracking for queried vectors
            this._updateAccess(id);
            
            if (filter && !this._matchesFilter(metadata, filter)) continue;
            const similarity = this._cosineSimilarity(queryVector, vector);
            if (similarity >= threshold) {
                results.push({ id, similarity, metadata, vector });
            }
        }
        return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
    }
    /**
     * @param {string} id
     */
    async deleteVector(id) {
        this.cache.delete(id);
        await this._persistAll();
    }
    /**
     * @param {string} namespace
     */
    async deleteNamespace(namespace) {
        for (const id of Array.from(this.cache.keys())) {
            if (id.startsWith(namespace)) {
                this.cache.delete(id);
            }
        }
        await this._persistAll();
    }
    /**
     * List all vectors whose ID starts with the given prefix.
     * @param {String} prefix
     * @returns {Promise<Array<{id: String, vector: Number[], metadata: any}>>}
     */
    async listVectors(prefix = '') {
        const out = [];
        for (const [id, { vector, metadata }] of this.cache.entries()) {
            if (id.startsWith(prefix)) {
                out.push({ id, vector, metadata });
            }
        }
        return out;
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
        await this._persistAll();
    }
    async close() {
        this.cache.clear();
    }
    async _persistAll() {
        const filePath = FileSystem.join(this.baseDir, 'vectors.json');
        const data = Object.fromEntries(this.cache);
        await FileSystem.atomicWriteJSON(filePath, data);
    }
    async _loadAll() {
        const filePath = FileSystem.join(this.baseDir, 'vectors.json');
        if (await FileSystem.exists(filePath)) {
            const data = await FileSystem.readJSON(filePath);
            this.cache = new Map(Object.entries(data || {}));
        }
    }
    /**
     * @param {number[]} vec1
     * @param {number[]} vec2
     * @returns {number}
     */
    _matchesFilter(metadata, filterObj) {
        if (!filterObj || typeof filterObj !== 'object') return true;
        if (Array.isArray(filterObj.must)) {
            for (const clause of filterObj.must) {
                if (clause.key && clause.match && 'value' in clause.match) {
                    if (metadata?.[clause.key] !== clause.match.value) return false;
                }
            }
        }
        return true;
    }

    _cosineSimilarity(vec1, vec2) {
        if (!Array.isArray(vec1) || !Array.isArray(vec2) || vec1.length !== vec2.length) return 0;
        let dot = 0, mag1 = 0, mag2 = 0;
        for (let i = 0; i < vec1.length; i++) {
            dot += vec1[i] * vec2[i];
            mag1 += vec1[i] * vec1[i];
            mag2 += vec2[i] * vec2[i];
        }
        const mag = Math.sqrt(mag1) * Math.sqrt(mag2);
        return mag > 0 ? dot / mag : 0;
    }

    // LRU Cache Management Methods
    _evictIfNeeded() {
        if (this.cache.size >= this.maxCacheSize) {
            // Find least recently used item
            let oldestId = null;
            let oldestAccess = Infinity;
            
            for (const [id, accessTime] of this.cacheAccessOrder.entries()) {
                if (accessTime < oldestAccess) {
                    oldestAccess = accessTime;
                    oldestId = id;
                }
            }
            
            if (oldestId) {
                this.cache.delete(oldestId);
                this.cacheAccessOrder.delete(oldestId);
                console.warn(`[LocalJSONProvider] Evicted vector ${oldestId} from cache (LRU)`);
            }
        }
    }

    _updateAccess(id) {
        this.cacheAccessOrder.set(id, ++this.accessCounter);
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            utilization: (this.cache.size / this.maxCacheSize * 100).toFixed(2) + '%',
            accessCounter: this.accessCounter,
            oldestAccess: this.cacheAccessOrder.size > 0 ? Math.min(...this.cacheAccessOrder.values()) : null,
            newestAccess: this.cacheAccessOrder.size > 0 ? Math.max(...this.cacheAccessOrder.values()) : null,
        };
    }
}

export default LocalJSONProvider; 