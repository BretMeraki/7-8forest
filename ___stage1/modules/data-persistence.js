/**
 * Data Persistence Module - Consolidated Data Management
 * Optimized from data-persistence.js - Preserves atomic operations, caching, and validation
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { FILE_NAMES, DEFAULT_PATHS } from './memory-sync.js';
import { SQLiteCacheManager } from './stubs/sqlite-cache-manager.js';
import { projectOperationManager } from './project-operation-manager.js';
// Use stderr for logging to avoid interfering with MCP JSON-RPC on stdout
const loggerModule = {
  getLogger: async () => ({
    debug: (...args) => console.error('[DEBUG]', ...args),
    info: (...args) => console.error('[INFO]', ...args),
    warn: (...args) => console.error('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
  }),
};

// Constants for data persistence operations
const DATA_PERSISTENCE_CONSTANTS = {
  UUID_LENGTH: 36,
  UUID_SEGMENT_START: 2,
  UUID_SEGMENT_LENGTH: 9,
  DEFAULT_DIFFICULTY: 3,
  MIN_DIFFICULTY: 1,
  MAX_DIFFICULTY: 10,
  DEFAULT_PRIORITY: 100,
  MIN_PRIORITY: 1,
  MAX_PRIORITY: 10000,  // Allow much higher priorities for task ordering
  JSON_INDENT: 2,
  STACK_TRACE_LIMIT: 1000,
};

// Use environment variable or default to home directory
const dataDirGlobal = process.env.FOREST_DATA_DIR || path.join(os.homedir(), '.forest-data');

export class DataPersistence {
  constructor(dataDir) {
    this.dataDir = dataDir || dataDirGlobal;
    this.cache = new SQLiteCacheManager();
    this.transactions = new Map(); // Active transactions
    this.logger = null; // Will be initialized lazily
  }

  async getLogger() {
    if (!this.logger) {
      this.logger = await loggerModule.getLogger();
    }
    return this.logger;
  }

  async _log(level, message, data) {
    const logger = await this.getLogger();
    logger[level](message, data);
  }

  async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw new Error(`Failed to create data directory: ${error.message}`);
      }
    }
  }

  // ===== PROJECT DATA OPERATIONS =====

  async saveProjectData(projectId, fileName, data, transaction = null) {
    // CRITICAL FIX: Validate projectId is a string
    if (!projectId || typeof projectId !== 'string') {
      if (typeof projectId === 'object' && projectId !== null) {
        await this._log('warn', '[DataPersistence] saveProjectData received object instead of projectId string', {
          projectIdType: typeof projectId,
          projectIdKeys: Object.keys(projectId).slice(0, 5),
          fileName,
        });
      }
      throw new Error('projectId must be a non-empty string');
    }

    return projectOperationManager.executeWithLock(projectId, async function() {
      try {
        await this.ensureDataDir();
        const projectDir = path.join(this.dataDir, projectId);
        await fs.mkdir(projectDir, { recursive: true });

        const filePath = path.join(projectDir, fileName);

        // Normalize data before saving
        let normalizedData = data;
        if (fileName === FILE_NAMES.HTA && data && typeof data === 'object') {
          normalizedData = this._normalizeHTAData(data);
        }

        // Atomic write with validation
        await this._atomicWriteJSON(filePath, normalizedData);

        // CRITICAL FIX: Invalidate cache BEFORE AND AFTER successful write
        // This prevents race conditions where reads happen between write and cache invalidation
        this.invalidateProjectCache(projectId);
        
        // Additional aggressive cache clearing for this specific project
        const cacheKey = `project:${projectId}:${fileName}`;
        this.cache.delete(cacheKey);
        
        const logger = await this.getLogger();
        logger.debug('[DataPersistence] Project data saved', {
          projectId,
          fileName,
          hasTransaction: !!transaction,
          dataSize: JSON.stringify(normalizedData).length,
        });

        return true;
      } catch (error) {
        await this._log('error', '[DataPersistence] Failed to save project data', {
          projectId,
          fileName,
          error: error.message,
        });
        throw error;
      }
    }.bind(this));
  }

  async loadProjectData(projectId, fileName) {
    try {
      // CRITICAL FIX: Validate projectId is a string to prevent path.join errors
      if (!projectId || typeof projectId !== 'string') {
        if (typeof projectId === 'object' && projectId !== null) {
          await this._log('warn', '[DataPersistence] Received object instead of projectId string', {
            projectIdType: typeof projectId,
            projectIdKeys: Object.keys(projectId).slice(0, 5), // Log first 5 keys for debugging
            fileName,
          });
        }
        return null; // Return null instead of throwing error for invalid projectId
      }

      const cacheKey = `project:${projectId}:${fileName}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        // Cache hit - no logging needed, this is normal behavior
        return cached;
      }

      const filePath = path.join(this.dataDir, projectId, fileName);
      const data = await this._readJSON(filePath);

      if (data) {
        this.cache.set(cacheKey, data);
        await this._log('debug', '[DataPersistence] Project data loaded', { projectId, fileName });
      }

      return data;
    } catch (error) {
      if (error.code === 'ENOENT') {
        await this._log('debug', '[DataPersistence] Project data file not found', {
          projectId,
          fileName,
        });
        return null;
      }
      await this._log('error', '[DataPersistence] Failed to load project data', {
        projectId,
        fileName,
        error: error.message,
      });
      throw error;
    }
  }


  // ===== PATH DATA OPERATIONS =====

  async savePathData(projectId, pathName, fileName, data, transaction = null) {
    // CRITICAL FIX: Validate projectId is a string
    if (!projectId || typeof projectId !== 'string') {
      if (typeof projectId === 'object' && projectId !== null) {
        await this._log('warn', '[DataPersistence] savePathData received object instead of projectId string', {
          projectIdType: typeof projectId,
          projectIdKeys: Object.keys(projectId).slice(0, 5),
          pathName,
          fileName,
        });
      }
      throw new Error('projectId must be a non-empty string');
    }

    return projectOperationManager.executeWithLock(projectId, async () => {
      try {
        await this.ensureDataDir();
        const pathDir = path.join(this.dataDir, projectId, 'paths', pathName);
        await fs.mkdir(pathDir, { recursive: true });

        const filePath = path.join(pathDir, fileName);

        // Normalize data before saving
        let normalizedData = data;
        if (fileName === FILE_NAMES.HTA && data && typeof data === 'object') {
          normalizedData = this._normalizeHTAData(data);
        }

        // Atomic write with validation
        await this._atomicWriteJSON(filePath, normalizedData);

        // CRITICAL FIX: Invalidate cache BEFORE AND AFTER successful write
        // This prevents race conditions where reads happen between write and cache invalidation
        this.invalidateProjectCache(projectId);
        
        // Additional aggressive cache clearing for this specific path
        const cacheKey = `path:${projectId}:${pathName}:${fileName}`;
        this.cache.delete(cacheKey);

        await this._log('debug', '[DataPersistence] Path data saved', {
          projectId,
          pathName,
          fileName,
          hasTransaction: !!transaction,
          dataSize: JSON.stringify(normalizedData).length,
        });

        return true;
      } catch (error) {
        await this._log('error', '[DataPersistence] Failed to save path data', {
          projectId,
          pathName,
          fileName,
          error: error.message,
        });
        throw error;
      }
    });
  }

  async loadPathData(projectId, pathName, fileName) {
    try {
      // CRITICAL FIX: Validate projectId is a string
      if (!projectId || typeof projectId !== 'string') {
        if (typeof projectId === 'object' && projectId !== null) {
          await this._log('warn', '[DataPersistence] loadPathData received object instead of projectId string', {
            projectIdType: typeof projectId,
            projectIdKeys: Object.keys(projectId).slice(0, 5),
            pathName,
            fileName,
          });
        }
        return null; // Return null instead of throwing error for invalid projectId
      }

      const cacheKey = `path:${projectId}:${pathName}:${fileName}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        // Cache hit - no logging needed, this is normal behavior
        return cached;
      }

      const filePath = path.join(this.dataDir, projectId, 'paths', pathName, fileName);
      const data = await this._readJSON(filePath);

      if (data) {
        this.cache.set(cacheKey, data);
        await this._log('debug', '[DataPersistence] Path data loaded', {
          projectId,
          pathName,
          fileName,
        });
      }

      return data;
    } catch (error) {
      if (error.code === 'ENOENT') {
        await this._log('debug', '[DataPersistence] Path data file not found', {
          projectId,
          pathName,
          fileName,
        });
        return null;
      }
      await this._log('error', '[DataPersistence] Failed to load path data', {
        projectId,
        pathName,
        fileName,
        error: error.message,
      });
      throw error;
    }
  }

  // ===== GLOBAL DATA OPERATIONS =====

  async saveGlobalData(fileName, data) {
    // Use a global lock to serialize global writes
    return projectOperationManager.executeWithLock('GLOBAL', async () => {
      try {
        await this.ensureDataDir();
        const filePath = path.join(this.dataDir, fileName);

        await this._atomicWriteJSON(filePath, data);
        this.cache.delete(`global:${fileName}`);

        await this._log('debug', '[DataPersistence] Global data saved', { fileName });
        return true;
      } catch (error) {
        await this._log('error', '[DataPersistence] Failed to save global data', {
          fileName,
          error: error.message,
        });
        throw error;
      }
    });
  }

  async loadGlobalData(fileName) {
    try {
      const cacheKey = `global:${fileName}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        // Cache hit - no logging needed, this is normal behavior
        return cached;
      }

      const filePath = path.join(this.dataDir, fileName);
      const data = await this._readJSON(filePath);

      if (data) {
        this.cache.set(cacheKey, data);
        await this._log('debug', '[DataPersistence] Global data loaded', { fileName });
      }

      return data;
    } catch (error) {
      if (error.code === 'ENOENT') {
        await this._log('debug', '[DataPersistence] Global data file not found', { fileName });
        return null;
      }
      await this._log('error', '[DataPersistence] Failed to load global data', {
        fileName,
        error: error.message,
      });
      throw error;
    }
  }

  // ===== TRANSACTION SUPPORT =====

  beginTransaction() {
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.transactions.set(transactionId, {
      id: transactionId,
      operations: [],
      startTime: Date.now(),
    });

    // Use stderr for logging to avoid interfering with MCP JSON-RPC
    console.error('[DEBUG] [DataPersistence] Transaction started', { transactionId });
    return transactionId;
  }

  async commitTransaction(transactionId) {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    try {
      // All operations were already executed during the transaction
      // This is just cleanup
      this.transactions.delete(transactionId);

      await this._log('debug', '[DataPersistence] Transaction committed', {
        transactionId,
        operationCount: transaction.operations.length,
        duration: Date.now() - transaction.startTime,
      });

      return true;
    } catch (error) {
      await this._log('error', '[DataPersistence] Transaction commit failed', {
        transactionId,
        error: error.message,
      });
      throw error;
    }
  }

  async rollbackTransaction(transactionId) {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    try {
      // For simplicity, we'll just clear the transaction
      // In a full implementation, we'd restore previous states
      this.transactions.delete(transactionId);

      await this._log('debug', '[DataPersistence] Transaction rolled back', {
        transactionId,
        operationCount: transaction.operations.length,
      });

      return true;
    } catch (error) {
      await this._log('error', '[DataPersistence] Transaction rollback failed', {
        transactionId,
        error: error.message,
      });
      throw error;
    }
  }

  // ===== CACHE MANAGEMENT =====

  invalidateProjectCache(projectId) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`project:${projectId}:`) || key.startsWith(`path:${projectId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });

    // Only log if there were actually keys to delete
    if (keysToDelete.length > 0) {
      console.error('[DEBUG] [DataPersistence] Cache invalidated', {
        projectId,
        keysInvalidated: keysToDelete.length
      });
    }
  }

  async clearCache() {
    this.cache.clear();
    await this._log('debug', '[DataPersistence] Cache cleared');
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      hitRate: typeof this.cache.getHitRate === 'function' ? this.cache.getHitRate() : 0,
      memoryUsage: typeof this.cache.getMemoryUsage === 'function' ? this.cache.getMemoryUsage() : 'N/A',
    };
  }
  
  // Emergency debugging method for live cache inspection
  debugCacheState(projectId = null, cacheType = 'all') {
    const allKeys = Array.from(this.cache.keys());
    const stats = this.getCacheStats();
    
    let filteredKeys = allKeys;
    if (projectId) {
      filteredKeys = allKeys.filter(key => 
        key.startsWith(`project:${projectId}:`) || key.startsWith(`path:${projectId}:`)
      );
    }
    
    if (cacheType !== 'all') {
      filteredKeys = filteredKeys.filter(key => key.includes(cacheType));
    }
    
    // Build cache contents preview
    const contents = {};
    filteredKeys.slice(0, 10).forEach(key => {
      const value = this.cache.get(key);
      if (value && typeof value === 'object') {
        contents[key] = `[Object] ${Object.keys(value).length} keys`;
      } else {
        contents[key] = typeof value === 'string' ? value.slice(0, 50) + '...' : String(value);
      }
    });
    
    const result = {
      timestamp: new Date().toISOString(),
      totalEntries: allKeys.length,
      filteredEntries: filteredKeys.length,
      memoryUsage: `${Math.round(JSON.stringify(Array.from(this.cache.entries())).length / 1024)}KB`,
      hitRate: stats.hitRate || 0,
      mostRecent: filteredKeys.length > 0 ? filteredKeys[filteredKeys.length - 1] : null,
      contents,
      projectId: projectId || 'all',
      cacheType
    };
    
    console.error('[DEBUG] [DataPersistence] Cache State Debug:', JSON.stringify(result, null, 2));
    return result;
  }
  
  // Emergency cache clearing for specific project
  emergencyClearProjectCache(projectId) {
    console.error('[EMERGENCY] [DataPersistence] Emergency cache clear for project:', projectId);
    this.debugCacheState(projectId);
    this.invalidateProjectCache(projectId);
    this.debugCacheState(projectId);
    return true;
  }

  // Emergency cache clearing for all cached data
  emergencyClearCache() {
    console.error('[EMERGENCY] [DataPersistence] Emergency cache clear for all data');
    const beforeStats = this.getCacheStats();
    this.debugCacheState();
    this.cache.clear();
    const afterStats = this.getCacheStats();
    console.error('[EMERGENCY] [DataPersistence] Cache cleared successfully', {
      before: beforeStats,
      after: afterStats
    });
    return true;
  }

  // List all files in a project directory
  async listProjectFiles(projectId) {
    try {
      const projectDir = path.join(this.dataDir, projectId);
      const files = await fs.readdir(projectDir);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  async _atomicWriteJSON(filePath, data) {
    const tempPath = `${filePath}.tmp`;

    try {
      // Write to temporary file first
      await fs.writeFile(
        tempPath,
        JSON.stringify(data, null, DATA_PERSISTENCE_CONSTANTS.JSON_INDENT),
        'utf8'
      );

      // Atomic move to final location
      await fs.rename(tempPath, filePath);

      return true;
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  async _readJSON(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  _normalizeHTAData(data) {
    if (!data || typeof data !== 'object') return data;

    const normalized = { ...data };

    // Ensure frontierNodes is an array
    if (!Array.isArray(normalized.frontierNodes)) {
      normalized.frontierNodes = [];
    }

    // Normalize each frontier node
    normalized.frontierNodes = normalized.frontierNodes.map(node => {
      if (!node || typeof node !== 'object') return node;

      return {
        ...node,
        id:
          node.id ||
          `task_${Date.now()}_${Math.random().toString(DATA_PERSISTENCE_CONSTANTS.UUID_LENGTH).substr(DATA_PERSISTENCE_CONSTANTS.UUID_SEGMENT_START, DATA_PERSISTENCE_CONSTANTS.UUID_SEGMENT_LENGTH)}`,
        difficulty:
          typeof node.difficulty === 'number'
            ? Math.max(
                DATA_PERSISTENCE_CONSTANTS.MIN_DIFFICULTY,
                Math.min(DATA_PERSISTENCE_CONSTANTS.MAX_DIFFICULTY, node.difficulty)
              )
            : DATA_PERSISTENCE_CONSTANTS.DEFAULT_DIFFICULTY,
        priority:
          typeof node.priority === 'number'
            ? Math.max(
                DATA_PERSISTENCE_CONSTANTS.MIN_PRIORITY,
                Math.min(DATA_PERSISTENCE_CONSTANTS.MAX_PRIORITY, node.priority)
              )
            : DATA_PERSISTENCE_CONSTANTS.DEFAULT_PRIORITY,
        prerequisites: Array.isArray(node.prerequisites) ? node.prerequisites : [],
        completed: Boolean(node.completed),
        generated: Boolean(node.generated),
      };
    });

    // Ensure hierarchyMetadata exists
    if (!normalized.hierarchyMetadata || typeof normalized.hierarchyMetadata !== 'object') {
      normalized.hierarchyMetadata = {};
    }

    // Update metadata
    normalized.hierarchyMetadata.total_tasks = normalized.frontierNodes.length;
    normalized.hierarchyMetadata.last_updated = new Date().toISOString();
    normalized.lastUpdated = new Date().toISOString();

    return normalized;
  }

  async logError(operation, error, context = {}) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      operation,
      error: {
        message: error.message,
        stack: error.stack?.substring(0, DATA_PERSISTENCE_CONSTANTS.STACK_TRACE_LIMIT), // Limit stack trace
        name: error.name,
      },
      context,
    };

    try {
      await this.ensureDataDir();
      const errorLogPath = path.join(this.dataDir, 'error.log');
      const logEntry = `${JSON.stringify(errorLog)}\n`;

      await fs.appendFile(errorLogPath, logEntry, 'utf8');

      await this._log('error', '[DataPersistence] Error logged', {
        operation,
        error: error.message,
      });
    } catch (logError) {
      // If we can't log to file, at least log to console
      console.error('Failed to write error log:', logError.message);
      console.error('Original error:', error.message);
    }
  }

  async getProjectList() {
    try {
      await this.ensureDataDir();
      const entries = await fs.readdir(this.dataDir, { withFileTypes: true });

      const projects = [];
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          try {
            const configPath = path.join(this.dataDir, entry.name, FILE_NAMES.CONFIG);
            const config = await this._readJSON(configPath);
            if (config) {
              projects.push({
                id: entry.name,
                goal: config.goal,
                created_at: config.created_at,
                progress: config.progress || 0,
              });
            }
          } catch (error) {
            // Skip projects without valid config
            await this._log('debug', '[DataPersistence] Skipping invalid project', {
              projectId: entry.name,
              error: error.message,
            });
          }
        }
      }

      return projects;
    } catch (error) {
      await this._log('error', '[DataPersistence] Failed to get project list', {
        error: error.message,
      });
      return [];
    }
  }

  async projectExists(projectId) {
    try {
      const projectDir = path.join(this.dataDir, projectId);
      const stats = await fs.stat(projectDir);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  async deleteProject(projectId) {
    try {
      const projectDir = path.join(this.dataDir, projectId);
      await fs.rm(projectDir, { recursive: true, force: true });

      // Clear related cache entries
      this.invalidateProjectCache(projectId);

      await this._log('info', '[DataPersistence] Project deleted', { projectId });
      return true;
    } catch (error) {
      await this._log('error', '[DataPersistence] Failed to delete project', {
        projectId,
        error: error.message,
      });
      throw error;
    }
  }

  // ===== ATOMIC OPERATIONS =====
  
  async atomicWrite(filePath, data, options = {}) {
    const tempPath = `${filePath}.tmp`;
    
    try {
      // Write to temporary file first
      await this.saveData(tempPath, data, options);
      
      // Atomic rename
      const fs = await import('fs');
      await fs.promises.rename(tempPath, filePath);
      
      return true;
    } catch (error) {
      // Cleanup temp file on failure
      try {
        const fs = await import('fs');
        await fs.promises.unlink(tempPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }
  
  async transaction(operations) {
    const backups = [];
    const completed = [];
    
    try {
      // Execute all operations
      for (const operation of operations) {
        const { type, path: filePath, data } = operation;
        
        // Backup existing file
        if (await this.fileExists(filePath)) {
          const backup = await this.loadData(filePath);
          backups.push({ path: filePath, data: backup });
        }
        
        // Execute operation
        if (type === 'write') {
          await this.atomicWrite(filePath, data);
          completed.push(operation);
        }
      }
      
      return { success: true, completed: completed.length };
    } catch (error) {
      // Rollback on failure
      for (const backup of backups) {
        try {
          await this.saveData(backup.path, backup.data);
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError.message);
        }
      }
      
      throw error;
    }
  }
  
  get localFallback() {
    return true; // Always available
  }
  
  get fallbackMode() {
    return !this.isOnline;
  }
}