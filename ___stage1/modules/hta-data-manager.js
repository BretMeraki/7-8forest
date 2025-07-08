/**
 * HTA Data Manager - Handles HTA data persistence, loading, and vector storage
 * Split from hta-core.js for better modularity
 */

import { FILE_SYSTEM } from './constants.js';

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
      const htaData = await this.dataPersistence.loadPathData(projectId, canonicalPath, FILE_SYSTEM.HTA_FILENAME);
      // Perform lightweight schema migration to support legacy/camelCase keys
      if (htaData) {
        // Migrate `strategicBranches` ➜ `strategic_branches` if necessary
        if (!htaData.strategic_branches && Array.isArray(htaData.strategicBranches)) {
          htaData.strategic_branches = htaData.strategicBranches;
        }

        // Promote metadata.version to root-level version for backwards-compat
        if (!htaData.version && htaData.metadata && htaData.metadata.version) {
          htaData.version = htaData.metadata.version;
        }

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
      
      // Ensure `strategic_branches` uses snake_case for canonical storage
      if (Array.isArray(htaData.strategicBranches) && !htaData.strategic_branches) {
        htaData.strategic_branches = htaData.strategicBranches;
      }

      // Save to data persistence
      await this.dataPersistence.savePathData(projectId, canonicalPath, FILE_SYSTEM.HTA_FILENAME, htaData);
      
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
            branch: task.branch || 'General',
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
      return await this.dataPersistence.loadPathData(projectId, canonicalPath, FILE_SYSTEM.HTA_FILENAME);
    } catch (error) {
      return null;
    }
  }

  async ensureVectorStore() {
    try {
      // In most cases `this.vectorStore` is an instance of HTAVectorIntegration
      // which exposes `ensureVectorStore(dataPersistence)` that returns a
      // status object with `{ success, instance }`.
      if (this.vectorStore && typeof this.vectorStore.ensureVectorStore === 'function') {
        const status = await this.vectorStore.ensureVectorStore(this.dataPersistence);
        if (status && status.success && status.instance) {
          return status.instance; // HTAVectorStore instance
        }
      }
      return null;
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
      // Build candidate list once
      const incompleteNodes = htaData.frontierNodes.filter(node => !node.completed);
      if (incompleteNodes.length === 0) return null;

      // Attempt a lightweight semantic match against the learning goal if a
      // vector store (or at least the goal text) is available.
      const vectorStore = await this.ensureVectorStore();
      if (vectorStore && htaData.goal) {
        // Token–overlap heuristic: counts shared terms between goal and task text
        const goalTokens = new Set(
          htaData.goal.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
        );

        let bestTask = null;
        let bestScore = -1;
        for (const task of incompleteNodes) {
          const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
          const taskTokens = new Set(text.split(/[^a-z0-9]+/).filter(Boolean));
          const overlap = [...taskTokens].filter(t => goalTokens.has(t)).length;
          const score = overlap / (taskTokens.size + 1); // normalised

          if (score > bestScore) {
            bestScore = score;
            bestTask = task;
          }
        }

        if (bestTask) {
          return bestTask;
        }
      }

      // Fallback: choose by lowest priority then lowest difficulty for a
      // sensible progression order.
      incompleteNodes.sort(
        (a, b) =>
          (a.priority || 0) - (b.priority || 0) ||
          (a.difficulty || 0) - (b.difficulty || 0)
      );
      return incompleteNodes[0] || null;
    } catch (error) {
      console.warn('Task selection failed:', error.message);
      return null;
    }
  }
}

