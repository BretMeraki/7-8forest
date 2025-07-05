/**
 * HTA Vector Integration Module
 * Handles vector database operations for HTA trees
 */

export class HTAVectorIntegration {
  constructor() {
    this.vectorStore = null;
    this.vectorStoreInitialized = false;
    this._vectorStoreStatus = null;
    this.vectorStoreError = null;
  }

  async ensureVectorStore(dataPersistence) {
    // Return cached status if already computed in this runtime
    if (this._vectorStoreStatus) {
      return this._vectorStoreStatus;
    }

    // Re-use existing initialized instance if available
    if (this.vectorStore) {
      this._vectorStoreStatus = {
        success: true,
        initialized: true,
        instance: this.vectorStore,
        provider: this.vectorStore?.provider?.constructor?.name || 'unknown',
      };
      return this._vectorStoreStatus;
    }

    try {
      const { HTAVectorStore } = await import('./hta-vector-store.js');
      const dataDir =
        dataPersistence?.dataDir || process.env.FOREST_DATA_DIR || '.forest-data';

      this.vectorStore = new HTAVectorStore(dataDir);
      const initResult = await this.vectorStore.initialize(); // may return status
      this.vectorStoreInitialized = true;

      this._vectorStoreStatus = {
        success: true,
        initialized: true,
        instance: this.vectorStore,
        provider: this.vectorStore?.provider?.constructor?.name || 'unknown',
        initResult,
      };

      console.error('✅ HTA Vector Store initialized successfully');
      return this._vectorStoreStatus;
    } catch (error) {
      console.warn(
        '⚠️ Vector store initialization failed, continuing without vectors:',
        error.message,
      );
      this.vectorStore = null;
      this.vectorStoreInitialized = false;
      this.vectorStoreError = error;

      this._vectorStoreStatus = {
        success: false,
        initialized: false,
        provider: process.env.FOREST_VECTOR_PROVIDER || 'unknown',
        error: { message: error.message, stack: error.stack?.substring(0, 500) },
      };
      return this._vectorStoreStatus;
    }
  }

  async storeHTAData(projectId, htaData) {
    try {
      const vectorStore = await this.ensureVectorStore();
      if (vectorStore && vectorStore.success && vectorStore.instance) {
        await vectorStore.instance.storeHTATree(projectId, htaData);
        console.error(`📊 HTA tree stored in vector database for project: ${projectId}`);
        return { success: true, provider: vectorStore.provider };
      }
      return { success: false, reason: 'Vector store not available' };
    } catch (error) {
      console.error('⚠️ Failed to store HTA in vector database:', error.message);
      return { success: false, error: error.message };
    }
  }

  async retrieveHTAData(projectId) {
    try {
      await this.ensureVectorStore();
      if (this.vectorStoreInitialized && this.vectorStore) {
        const htaData = await this.vectorStore.retrieveHTATree(projectId);
        if (htaData) {
          console.error(`[HTAVectorIntegration] Retrieved HTA from vector store for project ${projectId}`);
          return htaData;
        }
      }
      return null;
    } catch (error) {
      console.error('[HTAVectorIntegration] Vector store retrieval failed:', error.message);
      return null;
    }
  }

  async findNextTaskUsingVector(projectId, context, energyLevel, timeAvailable) {
    try {
      const vectorStore = await this.ensureVectorStore();
      if (vectorStore && vectorStore.success && vectorStore.instance) {
        const vectorTask = await vectorStore.instance.findNextTask(
          projectId,
          context,
          energyLevel,
          timeAvailable
        );
        
        if (vectorTask) {
          console.error('🎯 Selected task using vector intelligence');
          return vectorTask;
        }
      }
      return null;
    } catch (error) {
      console.warn('⚠️ Vector task selection failed:', error.message);
      return null;
    }
  }

  async getVectorStoreStats(projectId) {
    try {
      if (this.vectorStoreInitialized && this.vectorStore) {
        return await this.vectorStore.getProjectStats(projectId);
      }
      return null;
    } catch (error) {
      console.error('Failed to get vector store stats:', error.message);
      return null;
    }
  }

  getStatus() {
    return {
      initialized: this.vectorStoreInitialized,
      status: this._vectorStoreStatus,
      error: this.vectorStoreError
    };
  }
}
