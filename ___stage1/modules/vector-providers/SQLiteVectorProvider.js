/**
 * SQLite Vector Provider for Forest Suite
 * Implements IVectorProvider interface using SQLite for vector storage and similarity search
 */

import sqlite3 from 'sqlite3';
import mlDistance from 'ml-distance';
const { cosine } = mlDistance.similarity;
import { promises as fs } from 'fs';
import path from 'path';

export class SQLiteVectorProvider {
  constructor() {
    this.db = null;
    this.config = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the SQLite vector database
   */
  async initialize(config) {
    try {
      this.config = config;
      
      // Ensure directory exists
      const dbDir = path.dirname(config.dbPath);
      await fs.mkdir(dbDir, { recursive: true });

      // Open SQLite database
      this.db = await this._openDatabase(config.dbPath);

      // Create vectors table if it doesn't exist
      await this._createTables();

      this.isInitialized = true;
      return { success: true, message: 'SQLite vector provider initialized' };

    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        message: 'Failed to initialize SQLite vector provider'
      };
    }
  }

  /**
   * Open SQLite database with promises
   */
  _openDatabase(dbPath) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(db);
        }
      });
    });
  }

  /**
   * Create necessary tables for vector storage
   */
  async _createTables() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS vectors (
        id TEXT PRIMARY KEY,
        vector TEXT NOT NULL,
        metadata TEXT,
        namespace TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_vectors_namespace ON vectors(namespace);
      CREATE INDEX IF NOT EXISTS idx_vectors_created_at ON vectors(created_at);
    `;

    return this._runQuery(createTableSQL);
  }

  /**
   * Execute SQL query with promise wrapper
   */
  _runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Execute SQL query that returns rows
   */
  _allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Execute SQL query that returns single row
   */
  _getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Upsert a vector with metadata
   */
  async upsertVector(id, vector, metadata = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('SQLite provider not initialized');
      }

      // Extract namespace from metadata (following ChromaDB pattern)
      const namespace = metadata.namespace || 'default';
      
      // Serialize vector and metadata
      const vectorJson = JSON.stringify(vector);
      const metadataJson = JSON.stringify(metadata);

      const sql = `
        INSERT OR REPLACE INTO vectors (id, vector, metadata, namespace, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      await this._runQuery(sql, [id, vectorJson, metadataJson, namespace]);
      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Query vectors by similarity
   */
  async queryVectors(queryVector, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('SQLite provider not initialized');
      }

      const {
        topK = 10,
        threshold = 0.1,
        namespace = null,
        where = {}
      } = options;

      // Build WHERE clause for metadata filtering
      let whereClause = '';
      let params = [];

      if (namespace) {
        whereClause += ' WHERE namespace = ?';
        params.push(namespace);
      }

      // Add metadata filters
      if (Object.keys(where).length > 0) {
        const metadataFilters = Object.entries(where).map(([key, value]) => {
          params.push(`%"${key}":"${value}"%`);
          return `metadata LIKE ?`;
        });

        if (whereClause) {
          whereClause += ` AND (${metadataFilters.join(' AND ')})`;
        } else {
          whereClause = ` WHERE ${metadataFilters.join(' AND ')}`;
        }
      }

      // Get all vectors that match filters
      const sql = `SELECT id, vector, metadata FROM vectors${whereClause}`;
      const rows = await this._allQuery(sql, params);

      // Calculate similarities and sort
      const results = [];
      for (const row of rows) {
        try {
          const storedVector = JSON.parse(row.vector);
          const metadata = JSON.parse(row.metadata || '{}');
          
          // Calculate cosine similarity (ml-distance returns dissimilarity, so we convert)
          const dissimilarity = cosine(queryVector, storedVector);
          const similarity = 1 - dissimilarity;

          if (similarity >= threshold) {
            results.push({
              id: row.id,
              score: similarity,
              metadata: metadata,
              vector: storedVector
            });
          }
        } catch (parseError) {
          console.warn(`Failed to parse vector for ID ${row.id}:`, parseError.message);
        }
      }

      // Sort by similarity score (descending) and limit
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, topK);

    } catch (error) {
      console.error('Query vectors error:', error);
      return [];
    }
  }

  /**
   * Delete a vector by ID
   */
  async deleteVector(id) {
    try {
      if (!this.isInitialized) {
        throw new Error('SQLite provider not initialized');
      }

      const sql = 'DELETE FROM vectors WHERE id = ?';
      const result = await this._runQuery(sql, [id]);
      
      return { 
        success: true, 
        deleted: result.changes > 0 
      };

    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Delete all vectors in a namespace
   */
  async deleteNamespace(namespace) {
    try {
      if (!this.isInitialized) {
        throw new Error('SQLite provider not initialized');
      }

      const sql = 'DELETE FROM vectors WHERE namespace = ?';
      const result = await this._runQuery(sql, [namespace]);
      
      return { 
        success: true, 
        deleted: result.changes 
      };

    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * List vectors with optional prefix filter
   */
  async listVectors(prefix = '') {
    try {
      if (!this.isInitialized) {
        throw new Error('SQLite provider not initialized');
      }

      let sql = 'SELECT id, metadata, namespace, created_at FROM vectors';
      let params = [];

      if (prefix) {
        sql += ' WHERE id LIKE ?';
        params.push(`${prefix}%`);
      }

      sql += ' ORDER BY created_at DESC';

      const rows = await this._allQuery(sql, params);
      
      return rows.map(row => ({
        id: row.id,
        metadata: JSON.parse(row.metadata || '{}'),
        namespace: row.namespace,
        created_at: row.created_at
      }));

    } catch (error) {
      console.error('List vectors error:', error);
      return [];
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      if (!this.isInitialized) {
        return { error: 'Provider not initialized' };
      }

      const countRow = await this._getQuery('SELECT COUNT(*) as count FROM vectors');
      const namespaceRows = await this._allQuery(`
        SELECT namespace, COUNT(*) as count 
        FROM vectors 
        GROUP BY namespace 
        ORDER BY count DESC
      `);

      return {
        total_vectors: countRow.count,
        namespaces: namespaceRows.reduce((acc, row) => {
          acc[row.namespace] = row.count;
          return acc;
        }, {}),
        provider: 'sqlite',
        database_path: this.config?.dbPath
      };

    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Flush/sync to disk (SQLite auto-syncs)
   */
  async flush() {
    // SQLite automatically syncs to disk, but we can force it
    if (this.isInitialized && this.db) {
      return new Promise((resolve) => {
        this.db.run('PRAGMA wal_checkpoint(FULL)', () => {
          resolve({ success: true });
        });
      });
    }
    return { success: true };
  }

  /**
   * Close the database connection
   */
  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          this.isInitialized = false;
          this.db = null;
          resolve({ success: !err, error: err?.message });
        });
      });
    }
    return { success: true };
  }

  /**
   * Check if provider is ready
   */
  isReady() {
    return this.isInitialized && this.db !== null;
  }

  /**
   * Get provider type
   */
  getType() {
    return 'sqlite';
  }
}