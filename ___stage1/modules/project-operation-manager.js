// ProjectOperationManager: Serializes and locks all file operations per project
// Ensures no race conditions or concurrent writes for any project data

import fs from 'fs/promises';

class ProjectOperationManager {
  constructor() {
    this.projectLocks = new Map(); // projectId -> lock (Promise)
    this.operationQueues = new Map(); // projectId -> queue (array of functions)
  }

  getOrCreateQueue(projectId) {
    if (!this.operationQueues.has(projectId)) {
      this.operationQueues.set(projectId, []);
    }
    return this.operationQueues.get(projectId);
  }

  async acquireFileLock(projectId) {
    // Simple in-memory lock (can be replaced with file-based lock for multi-process)
    let lock = this.projectLocks.get(projectId);
    if (lock) {
      // Wait for previous lock to resolve
      await lock;
    }
    // Create a new lock (a Promise that resolves when released)
    let release;
    const lockPromise = new Promise((resolve) => { release = resolve; });
    this.projectLocks.set(projectId, lockPromise);
    return release;
  }

  async releaseFileLock(projectId, release) {
    if (typeof release === 'function') {
      release();
    }
    this.projectLocks.delete(projectId);
  }

  async executeWithLock(projectId, operation) {
    const queue = this.getOrCreateQueue(projectId);
    return new Promise((resolve, reject) => {
      queue.push(async () => {
        const release = await this.acquireFileLock(projectId);
        try {
          const result = await operation();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          await this.releaseFileLock(projectId, release);
          queue.shift();
          if (queue.length > 0) {
            // Run next operation in queue
            queue[0]();
          }
        }
      });
      // If this is the only operation, run it immediately
      if (queue.length === 1) {
        queue[0]();
      }
    });
  }
}

export const projectOperationManager = new ProjectOperationManager();
