/**
 * ChromaDB Provider - Vector storage using ChromaDB
 * Currently a placeholder implementation that falls back to LocalJSON
 */

import IVectorProvider from './IVectorProvider.js';
import LocalJSONProvider from './LocalJSONProvider.js';

class ChromaDBProvider extends IVectorProvider {
  constructor(config = {}) {
    super();
    this.config = {
      host: 'localhost',
      port: 8000,
      collection: 'hta_vectors',
      ...config
    };
    this.initialized = false;
    this.fallbackProvider = null;
  }

  async initialize(config = {}) {
    try {
      // For now, ChromaDB is not implemented - fall back to LocalJSON
      console.error('[ChromaDB] ChromaDB provider not fully implemented, falling back to LocalJSON');
      this.fallbackProvider = new LocalJSONProvider(config);
      const result = await this.fallbackProvider.initialize(config);
      this.initialized = true;
      return result;
    } catch (error) {
      console.error('[ChromaDB] Failed to initialize ChromaDB provider:', error.message);
      throw error;
    }
  }

  async upsertVector(id, vector, metadata = {}) {
    if (!this.initialized) throw new Error('Provider not initialized');
    return await this.fallbackProvider.upsertVector(id, vector, metadata);
  }

  async queryVectors(queryVector, options = {}) {
    if (!this.initialized) throw new Error('Provider not initialized');
    return await this.fallbackProvider.queryVectors(queryVector, options);
  }

  async listVectors(prefix = '') {
    if (!this.initialized) throw new Error('Provider not initialized');
    return await this.fallbackProvider.listVectors(prefix);
  }

  async deleteVector(id) {
    if (!this.initialized) throw new Error('Provider not initialized');
    return await this.fallbackProvider.deleteVector(id);
  }

  async deleteNamespace(prefix) {
    if (!this.initialized) throw new Error('Provider not initialized');
    return await this.fallbackProvider.deleteNamespace(prefix);
  }

  async flush() {
    if (!this.initialized) throw new Error('Provider not initialized');
    if (this.fallbackProvider.flush) {
      return await this.fallbackProvider.flush();
    }
  }

  async getStats() {
    if (!this.initialized) throw new Error('Provider not initialized');
    return await this.fallbackProvider.getStats();
  }
}

export default ChromaDBProvider;
