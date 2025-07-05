/**
 * HTA Data Manager - Handles HTA data persistence, loading, and vector storage
 * Split from hta-core.js for better modularity
 */

import { FILE_NAMES } from './constants.js';

export class HTADataManager {
  constructor(dataPersistence, projectManagement, vectorStore) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.vectorStore = vectorStore;
  }

  async loadHTAData(projectId, pathName = null) {
    try {
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
      const canonicalPath = pathName || (config && config.activePath) || 'general';
      
      // Try to load existing HTA data
      const htaData = await this.dataPersistence.loadPathData(projectId, canonicalPath, FILE_NAMES.HTA);
      
      if (htaData && htaData.version && htaData.strategic_branches) {
        console.log(`✅ Loaded existing HTA data for ${projectId}/${canonicalPath}`);
        return htaData;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to load HTA data:', error.message);
      return null;
    }
  }

  async saveHTAData(projectId, htaData, pathName = null) {
    try {
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
      const canonicalPath = pathName || (config && config.activePath) || 'general';
      
      // Add metadata if not present
      if (!htaData.metadata) {
        htaData.metadata = {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          version: '1.0.0'
        };
      } else {
        htaData.metadata.updated = new Date().toISOString();
      }
      
      // Save to data persistence
      await this.dataPersistence.savePathData(projectId, canonicalPath, FILE_NAMES.HTA, htaData);
      
      // Save to vector store if available
      await this.saveToVectorStore(projectId, canonicalPath, htaData);
      
      console.log(`✅ Saved HTA data for ${projectId}/${canonicalPath}`);
      return true;
    } catch (error) {
      console.error('Failed to save HTA data:', error);
      throw error;
    }
  }

  async saveToVectorStore(projectId, pathName, htaData) {
    try {
      const vectorStore = await this.ensureVectorStore();
      if (!vectorStore) {
        console.log('Vector store not available, skipping vector save');
        return;
      }

      // Create semantic vectors for strategic branches
      if (htaData.strategic_branches && Array.isArray(htaData.strategic_branches)) {
        for (const branch of htaData.strategic_branches) {
          const branchText = `${branch.name}: ${branch.description}`;
          await vectorStore.storeHTA(projectId, pathName, branch.name, branchText, {
            type: 'strategic_branch',
            branch_name: branch.name,
            priority: branch.priority,
            task_count: branch.tasks ? branch.tasks.length : 0
          });
        }
      }

      // Create semantic vectors for frontier nodes (tasks)
      if (htaData.frontierNodes && Array.isArray(htaData.frontierNodes)) {
        for (const task of htaData.frontierNodes) {
          const taskText = `${task.title}: ${task.description}`;
          await vectorStore.storeHTA(projectId, pathName, task.id, taskText, {
            type: 'frontier_node',
            task_id: task.id,
            branch: task.branch,
            difficulty: task.difficulty,
            duration: task.duration,
            completed: task.completed || false
          });
        }
      }

      console.log(`✅ Saved HTA vectors for ${projectId}/${pathName}`);
    } catch (error) {
      console.warn('Failed to save to vector store:', error.message);
      // Non-fatal error - HTA still saved to regular persistence
    }
  }

  async loadPathHTA(projectId, pathName) {
    // Always use activePath from config if not provided
    const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
    const canonicalPath = pathName || (config && config.activePath) || 'general';
    try {
      return await this.dataPersistence.loadPathData(projectId, canonicalPath, FILE_NAMES.HTA);
    } catch (error) {
      return null;
    }
  }

  async ensureVectorStore() {
    try {
      if (this.vectorStore && typeof this.vectorStore.isConnected === 'function') {
        const connected = await this.vectorStore.isConnected();
        return connected ? this.vectorStore : null;
      }
      return this.vectorStore || null;
    } catch (error) {
      console.warn('Vector store check failed:', error.message);
      return null;
    }
  }

  async getNextTaskFromExistingTree(htaData) {
    if (!htaData?.frontierNodes?.length) {
      return null;
    }

    try {
      // Try vector-enhanced task selection first
      const vectorStore = await this.ensureVectorStore();
      if (vectorStore) {
        // Use vector similarity for task selection
        const incompleteNodes = htaData.frontierNodes.filter(node => !node.completed);
        if (incompleteNodes.length > 0) {
          // For now, return first incomplete task
          // TODO: Implement vector-based recommendation
          return incompleteNodes[0];
        }
      }

      // Fallback to simple selection
      const incompleteNodes = htaData.frontierNodes.filter(node => !node.completed);
      return incompleteNodes.length > 0 ? incompleteNodes[0] : null;
    } catch (error) {
      console.warn('Task selection failed:', error.message);
      return null;
    }
  }
}

