/**
 * ChromaDB Lifecycle Manager
 * Manages ChromaDB startup, health monitoring, and graceful shutdown in parallel with Forest
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import net from 'net';

export class ChromaDBLifecycleManager {
  constructor(options = {}) {
    this.options = {
      dataDir: options.dataDir || process.env.CHROMA_DATA_DIR || path.join(process.env.FOREST_DATA_DIR || './.forest-data', '.chromadb'),
      host: options.host || '0.0.0.0',
      port: options.port || 8000,
      authProvider: options.authProvider || null,
      authCredentials: options.authCredentials || null,
      serverPath: options.serverPath || 'python3',
      serverScript: options.serverScript || './start-chromadb-server.py',
      startupTimeout: options.startupTimeout || 30000, // 30 seconds
      healthCheckInterval: options.healthCheckInterval || 5000, // 5 seconds
      maxRetries: options.maxRetries || 3,
      enableAutoRestart: options.enableAutoRestart !== false, // Default to true
      ...options
    };

    this.serverProcess = null;
    this.isStarting = false;
    this.isRunning = false;
    this.isStopping = false;
    this.healthCheckTimer = null;
    this.startupPromise = null;
    this.logger = this.createLogger();
    this.retryCount = 0;
    this.lastHealthCheck = null;
  }

  createLogger() {
    return {
      info: (...args) => console.error('[ChromaDB-Lifecycle]', ...args),
      warn: (...args) => console.error('[ChromaDB-Lifecycle-WARN]', ...args),
      error: (...args) => console.error('[ChromaDB-Lifecycle-ERROR]', ...args),
      debug: (...args) => {
        if (process.env.DEBUG_CHROMADB) {
          console.error('[ChromaDB-Lifecycle-DEBUG]', ...args);
        }
      }
    };
  }

  /**
   * Start ChromaDB server in parallel with Forest initialization
   * Returns immediately while server starts in background
   */
  async startParallel() {
    if (this.isStarting || this.isRunning) {
      this.logger.warn('ChromaDB startup already in progress or running');
      return this.startupPromise;
    }

    this.isStarting = true;
    this.logger.info('🚀 Starting ChromaDB server in parallel with Forest...');

    // Create startup promise that resolves when server is ready
    this.startupPromise = this._performStartup();
    
    // Return a promise that won't reject to avoid unhandled rejections
    return this.startupPromise.catch(error => {
      this.logger.error('ChromaDB parallel startup failed:', error.message);
      this.isStarting = false;
      // Return error info instead of rejecting
      return { 
        status: 'failed', 
        error: error.message,
        retryCount: this.retryCount 
      };
    });
  }

  /**
   * Internal startup implementation
   */
  async _performStartup() {
    try {
      // Ensure data directory exists
      await this._ensureDataDirectory();

      // Check if ChromaDB is already running on the port
      const isPortInUse = await this._checkPortInUse();
      if (isPortInUse) {
        this.logger.info('ChromaDB already running on port', this.options.port);
        this.isRunning = true;
        this.isStarting = false;
        this._startHealthMonitoring();
        return { status: 'already_running', port: this.options.port };
      }

      // Start ChromaDB server process
      await this._startServerProcess();

      // Wait for server to be ready
      await this._waitForServerReady();

      this.isRunning = true;
      this.isStarting = false;
      this.retryCount = 0;

      // Start health monitoring
      this._startHealthMonitoring();

      this.logger.info('✅ ChromaDB server started successfully', {
        port: this.options.port,
        dataDir: this.options.dataDir,
        pid: this.serverProcess?.pid
      });

      return {
        status: 'started',
        port: this.options.port,
        dataDir: this.options.dataDir,
        pid: this.serverProcess?.pid
      };

    } catch (error) {
      this.isStarting = false;
      this.logger.error('ChromaDB startup failed:', error.message);
      
      // Attempt retry if enabled and under retry limit
      if (this.options.enableAutoRestart && this.retryCount < this.options.maxRetries) {
        this.retryCount++;
        this.logger.info(`Retrying ChromaDB startup (attempt ${this.retryCount}/${this.options.maxRetries})...`);
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, this.retryCount - 1)));
        
        return this._performStartup();
      }

      throw error;
    }
  }

  /**
   * Ensure ChromaDB data directory exists
   */
  async _ensureDataDirectory() {
    try {
      await fs.mkdir(this.options.dataDir, { recursive: true });
      this.logger.debug('ChromaDB data directory ensured:', this.options.dataDir);
    } catch (error) {
      throw new Error(`Failed to create ChromaDB data directory: ${error.message}`);
    }
  }

  /**
   * Check if port is already in use
   */
  async _checkPortInUse() {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(this.options.port, this.options.host, () => {
        server.close(() => resolve(false));
      });
      
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  /**
   * Start ChromaDB server process
   */
  async _startServerProcess() {
    return new Promise((resolve, reject) => {
      const args = [
        this.options.serverScript,
        '--host', this.options.host,
        '--port', this.options.port.toString(),
        '--data-dir', this.options.dataDir,
        '--log-level', 'INFO'
      ];

      this.logger.debug('Starting ChromaDB with args:', args);

      this.serverProcess = spawn(this.options.serverPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env: {
          ...process.env,
          CHROMA_DATA_DIR: this.options.dataDir
        }
      });

      // Handle server output
      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          this.logger.debug('ChromaDB stdout:', output);
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          // Check for startup success indicators
          if (output.includes('Uvicorn running') || output.includes('Application startup complete')) {
            this.logger.debug('ChromaDB startup detected in stderr:', output);
          } else {
            this.logger.debug('ChromaDB stderr:', output);
          }
        }
      });

      this.serverProcess.on('error', (error) => {
        this.logger.error('ChromaDB process error:', error.message);
        reject(new Error(`Failed to start ChromaDB server: ${error.message}`));
      });

      this.serverProcess.on('exit', (code, signal) => {
        this.logger.warn('ChromaDB server exited', { code, signal });
        this.isRunning = false;
        this.serverProcess = null;

        // Auto-restart if enabled and not intentionally stopped
        if (this.options.enableAutoRestart && !this.isStopping && code !== 0) {
          this.logger.info('Auto-restarting ChromaDB server...');
          setTimeout(() => {
            if (!this.isStopping) {
              this.startParallel();
            }
          }, 2000);
        }
      });

      // Give the process a moment to start
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          resolve();
        } else {
          reject(new Error('ChromaDB server process failed to start'));
        }
      }, 1000);
    });
  }

  /**
   * Wait for ChromaDB server to be ready to accept connections
   */
  async _waitForServerReady() {
    const startTime = Date.now();
    const maxWaitTime = this.options.startupTimeout;

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Try to make a health check request
        const isHealthy = await this._performHealthCheck();
        if (isHealthy) {
          this.logger.debug('ChromaDB server is ready');
          return;
        }
      } catch (error) {
        // Server not ready yet, continue waiting
        this.logger.debug('Waiting for ChromaDB to be ready...', error.message);
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`ChromaDB server did not become ready within ${maxWaitTime}ms`);
  }

  /**
   * Perform health check on ChromaDB server
   */
  async _performHealthCheck() {
    return new Promise((resolve) => {
      const http = require('http');
      
      const req = http.request({
        hostname: this.options.host,
        port: this.options.port,
        path: '/api/v1/heartbeat',
        method: 'GET',
        timeout: 5000
      }, (res) => {
        const isHealthy = res.statusCode >= 200 && res.statusCode < 300;
        this.lastHealthCheck = {
          timestamp: new Date().toISOString(),
          status: isHealthy ? 'healthy' : 'unhealthy',
          statusCode: res.statusCode
        };
        
        // Consume response data
        res.on('data', () => {});
        res.on('end', () => {
          resolve(isHealthy);
        });
      });

      req.on('error', (error) => {
        this.lastHealthCheck = {
          timestamp: new Date().toISOString(),
          status: 'error',
          error: error.message
        };
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        this.lastHealthCheck = {
          timestamp: new Date().toISOString(),
          status: 'error',
          error: 'Health check timeout'
        };
        resolve(false);
      });

      req.end();
    });
  }

  /**
   * Start continuous health monitoring
   */
  _startHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      if (!this.isRunning || this.isStopping) {
        return;
      }

      try {
        const isHealthy = await this._performHealthCheck();
        if (!isHealthy) {
          this.logger.warn('ChromaDB health check failed');
          
          // If auto-restart is enabled and server is unhealthy, restart it
          if (this.options.enableAutoRestart) {
            this.logger.info('Restarting unhealthy ChromaDB server...');
            await this.restart();
          }
        }
      } catch (error) {
        this.logger.debug('Health check error:', error.message);
      }
    }, this.options.healthCheckInterval);
  }

  /**
   * Stop health monitoring
   */
  _stopHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Restart ChromaDB server
   */
  async restart() {
    this.logger.info('Restarting ChromaDB server...');
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    return this.startParallel();
  }

  /**
   * Gracefully stop ChromaDB server
   */
  async stop() {
    if (this.isStopping) {
      this.logger.warn('ChromaDB shutdown already in progress');
      return;
    }

    if (!this.isRunning && !this.serverProcess) {
      this.logger.info('ChromaDB server not running');
      return;
    }

    this.isStopping = true;
    this.logger.info('🛑 Stopping ChromaDB server...');

    try {
      // Stop health monitoring
      this._stopHealthMonitoring();

      if (this.serverProcess) {
        // Try graceful shutdown first
        this.serverProcess.kill('SIGTERM');

        // Wait for graceful shutdown
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            // Force kill if graceful shutdown takes too long
            if (this.serverProcess && !this.serverProcess.killed) {
              this.logger.warn('Force killing ChromaDB server');
              this.serverProcess.kill('SIGKILL');
            }
            resolve();
          }, 10000); // 10 second timeout for graceful shutdown

          if (this.serverProcess) {
            this.serverProcess.on('exit', () => {
              clearTimeout(timeout);
              resolve();
            });
          } else {
            clearTimeout(timeout);
            resolve();
          }
        });
      }

      this.serverProcess = null;
      this.isRunning = false;
      this.isStarting = false;
      this.isStopping = false;

      this.logger.info('✅ ChromaDB server stopped successfully');

    } catch (error) {
      this.logger.error('Error during ChromaDB shutdown:', error.message);
      throw error;
    }
  }

  /**
   * Get current status of ChromaDB server
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isStarting: this.isStarting,
      isStopping: this.isStopping,
      port: this.options.port,
      host: this.options.host,
      dataDir: this.options.dataDir,
      pid: this.serverProcess?.pid || null,
      lastHealthCheck: this.lastHealthCheck,
      retryCount: this.retryCount,
      maxRetries: this.options.maxRetries,
      uptime: this.serverProcess ? Date.now() - this.serverProcess.spawnTime : 0
    };
  }

  /**
   * Wait for ChromaDB to be ready (for integration with Forest startup)
   */
  async waitForReady() {
    if (this.isRunning) {
      return true;
    }

    if (this.startupPromise) {
      try {
        const result = await this.startupPromise;
        // Check if result indicates failure
        if (result && result.status === 'failed') {
          throw new Error(result.error || 'ChromaDB startup failed');
        }
        return this.isRunning;
      } catch (error) {
        // Re-throw startup errors
        throw error;
      }
    }

    throw new Error('ChromaDB not starting - call startParallel() first');
  }

  /**
   * Get health status for integration with Forest health checks
   */
  async getHealthStatus() {
    if (!this.isRunning) {
      return {
        status: 'unhealthy',
        reason: 'ChromaDB server not running'
      };
    }

    try {
      const isHealthy = await this._performHealthCheck();
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        lastCheck: this.lastHealthCheck,
        port: this.options.port,
        dataDir: this.options.dataDir
      };
    } catch (error) {
      return {
        status: 'error',
        reason: error.message,
        lastCheck: this.lastHealthCheck
      };
    }
  }
}