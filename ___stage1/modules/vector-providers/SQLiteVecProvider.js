// SQLiteVecProvider.js
import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import IVectorProvider from './IVectorProvider.js';

/**
 * SQLite-based vector provider for local storage
 * Implements IVectorProvider interface
 */
class SQLiteVecProvider extends IVectorProvider {
    /**
     * @param {{dbPath?: string, dimension?: number}} [config]
     */
    constructor(config = {}) {
        super();
        this.dbPath = config.dbPath || '.forest-vectors/vectors.sqlite';
        this.dimension = config.dimension || 1536;
        this.db = null;
        this.initialized = false;
        
        // Cache for frequently accessed vectors
        this.cache = new Map();
        this.maxCacheSize = config.maxCacheSize || 1000;
        this.cacheAccessOrder = new Map();
        this.accessCounter = 0;
    }

    /**
     * @param {{dbPath?: string, dimension?: number}} [config]
     */
    async initialize(config = {}) {
        if (config.dbPath) this.dbPath = config.dbPath;
        if (config.dimension) this.dimension = config.dimension;

        // Ensure directory exists
        const dir = path.dirname(this.dbPath);
        await fs.mkdir(dir, { recursive: true });

        // Initialize database
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(new Error(`Failed to initialize SQLite database: ${err.message}`));
                    return;
                }

                // Create tables if they don't exist
                this.db.serialize(() => {
                    this.db.run(`
                        CREATE TABLE IF NOT EXISTS vectors (
                            id TEXT PRIMARY KEY,
                            vector BLOB NOT NULL,
                            metadata TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    `, (err) => {
                        if (err) {
                            reject(new Error(`Failed to create vectors table: ${err.message}`));
                            return;
                        }

                        // Create index for faster queries
                        this.db.run(`
                            CREATE INDEX IF NOT EXISTS idx_vectors_created_at ON vectors(created_at)
                        `, (err) => {
                            if (err) {
                                reject(new Error(`Failed to create index: ${err.message}`));
                                return;
                            }

                            this.initialized = true;
                            resolve({
                                success: true,
                                provider: 'SQLiteVecProvider',
                                dbPath: this.dbPath,
                                dimension: this.dimension
                            });
                        });
                    });
                });
            });
        });
    }

    /**
     * @param {string} id
     * @param {number[]} vector
     * @param {Object} metadata
     */
    async upsertVector(id, vector, metadata = {}) {
        if (!this.initialized) {
            throw new Error('SQLiteVecProvider not initialized');
        }

        if (!Array.isArray(vector)) {
            throw new Error('Vector must be an array');
        }

        if (vector.length !== this.dimension) {
            throw new Error(`Vector dimension mismatch: expected ${this.dimension}, got ${vector.length}`);
        }

        // Convert vector to buffer for storage
        const vectorBuffer = Buffer.from(new Float32Array(vector).buffer);
        const metadataJson = JSON.stringify(metadata);

        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT OR REPLACE INTO vectors (id, vector, metadata, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `, [id, vectorBuffer, metadataJson], (err) => {
                if (err) {
                    reject(new Error(`Failed to upsert vector: ${err.message}`));
                    return;
                }

                // Update cache
                this._updateCache(id, vector, metadata);
                resolve();
            });
        });
    }

    /**
     * @param {number[]} queryVector
     * @param {{threshold?: number, limit?: number, filter?: Object}} [options]
     * @returns {Promise<Array<{id: string, similarity: number, metadata: Object, vector: number[]}>>}
     */
    async queryVectors(queryVector, options = {}) {
        if (!this.initialized) {
            throw new Error('SQLiteVecProvider not initialized');
        }

        if (!Array.isArray(queryVector)) {
            throw new Error('Query vector must be an array');
        }

        const { threshold = 0.1, limit = 10, filter = null } = options;

        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT id, vector, metadata 
                FROM vectors 
                ORDER BY created_at DESC
            `, [], (err, rows) => {
                if (err) {
                    reject(new Error(`Failed to query vectors: ${err.message}`));
                    return;
                }

                const results = [];
                
                for (const row of rows) {
                    try {
                        // Convert buffer back to vector
                        const vectorArray = new Float32Array(row.vector.buffer);
                        const vector = Array.from(vectorArray);
                        
                        // Parse metadata
                        const metadata = JSON.parse(row.metadata || '{}');
                        
                        // Apply filter if provided
                        if (filter && !this._matchesFilter(metadata, filter)) {
                            continue;
                        }

                        // Calculate similarity
                        const similarity = this._cosineSimilarity(queryVector, vector);
                        
                        if (similarity >= threshold) {
                            results.push({
                                id: row.id,
                                similarity,
                                metadata,
                                vector
                            });
                        }

                        // Update cache access
                        this._updateCache(row.id, vector, metadata);
                        
                    } catch (parseErr) {
                        console.warn(`Failed to parse vector ${row.id}:`, parseErr.message);
                        continue;
                    }
                }

                // Sort by similarity and limit results
                results.sort((a, b) => b.similarity - a.similarity);
                resolve(results.slice(0, limit));
            });
        });
    }

    /**
     * @param {string} id
     */
    async deleteVector(id) {
        if (!this.initialized) {
            throw new Error('SQLiteVecProvider not initialized');
        }

        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM vectors WHERE id = ?`, [id], (err) => {
                if (err) {
                    reject(new Error(`Failed to delete vector: ${err.message}`));
                    return;
                }

                // Remove from cache
                this.cache.delete(id);
                this.cacheAccessOrder.delete(id);
                resolve();
            });
        });
    }

    /**
     * @param {string} namespace
     */
    async deleteNamespace(namespace) {
        if (!this.initialized) {
            throw new Error('SQLiteVecProvider not initialized');
        }

        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM vectors WHERE id LIKE ?`, [`${namespace}%`], (err) => {
                if (err) {
                    reject(new Error(`Failed to delete namespace: ${err.message}`));
                    return;
                }

                // Remove from cache
                for (const id of this.cache.keys()) {
                    if (id.startsWith(namespace)) {
                        this.cache.delete(id);
                        this.cacheAccessOrder.delete(id);
                    }
                }

                resolve();
            });
        });
    }

    /**
     * List all vectors whose ID starts with the given prefix.
     * @param {string} prefix
     * @returns {Promise<Array<{id: string, vector: number[], metadata: any}>>}
     */
    async listVectors(prefix = '') {
        if (!this.initialized) {
            throw new Error('SQLiteVecProvider not initialized');
        }

        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT id, vector, metadata 
                FROM vectors 
                WHERE id LIKE ?
                ORDER BY created_at DESC
            `, [`${prefix}%`], (err, rows) => {
                if (err) {
                    reject(new Error(`Failed to list vectors: ${err.message}`));
                    return;
                }

                const results = [];
                
                for (const row of rows) {
                    try {
                        // Convert buffer back to vector
                        const vectorArray = new Float32Array(row.vector.buffer);
                        const vector = Array.from(vectorArray);
                        
                        // Parse metadata
                        const metadata = JSON.parse(row.metadata || '{}');
                        
                        results.push({
                            id: row.id,
                            vector,
                            metadata
                        });

                        // Update cache access
                        this._updateCache(row.id, vector, metadata);
                        
                    } catch (parseErr) {
                        console.warn(`Failed to parse vector ${row.id}:`, parseErr.message);
                        continue;
                    }
                }

                resolve(results);
            });
        });
    }

    async getStats() {
        if (!this.initialized) {
            throw new Error('SQLiteVecProvider not initialized');
        }

        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT 
                    COUNT(*) as count,
                    AVG(LENGTH(vector)) as avg_vector_size,
                    SUM(LENGTH(vector) + LENGTH(metadata)) as total_size
                FROM vectors
            `, [], (err, row) => {
                if (err) {
                    reject(new Error(`Failed to get stats: ${err.message}`));
                    return;
                }

                resolve({
                    vectorCount: row.count,
                    averageVectorSize: row.avg_vector_size,
                    totalSize: row.total_size,
                    cacheSize: this.cache.size,
                    cacheUtilization: (this.cache.size / this.maxCacheSize * 100).toFixed(2) + '%'
                });
            });
        });
    }

    async ping() {
        if (!this.initialized || !this.db) {
            return false;
        }

        return new Promise((resolve) => {
            this.db.get('SELECT 1', (err) => {
                resolve(!err);
            });
        });
    }

    async flush() {
        // SQLite automatically flushes, but we can optimize by checkpointing WAL
        if (!this.initialized) return;

        return new Promise((resolve, reject) => {
            this.db.run(`PRAGMA wal_checkpoint(TRUNCATE)`, (err) => {
                if (err) {
                    console.warn('Failed to checkpoint WAL:', err.message);
                }
                resolve();
            });
        });
    }

    async close() {
        if (!this.initialized || !this.db) return;

        return new Promise((resolve) => {
            this.db.close((err) => {
                if (err) {
                    console.warn('Failed to close database:', err.message);
                }
                this.initialized = false;
                this.db = null;
                this.cache.clear();
                this.cacheAccessOrder.clear();
                resolve();
            });
        });
    }

    // Helper methods
    _updateCache(id, vector, metadata) {
        // Evict if cache is full
        this._evictIfNeeded();
        
        this.cache.set(id, { vector, metadata });
        this.cacheAccessOrder.set(id, ++this.accessCounter);
    }

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
            }
        }
    }

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
        if (!Array.isArray(vec1) || !Array.isArray(vec2) || vec1.length !== vec2.length) {
            return 0;
        }

        let dot = 0;
        let mag1 = 0;
        let mag2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dot += vec1[i] * vec2[i];
            mag1 += vec1[i] * vec1[i];
            mag2 += vec2[i] * vec2[i];
        }

        const mag = Math.sqrt(mag1) * Math.sqrt(mag2);
        return mag > 0 ? dot / mag : 0;
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

export default SQLiteVecProvider;
