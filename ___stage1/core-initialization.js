/**
 * Core Initialization Module - Streamlined Startup and Initialization Logic
 * Handles initialization of all consolidated modules with validation
 */

import Stage1CoreServer from './core-server.js';
// MCP servers must use stderr for logging to avoid interfering with JSON-RPC on stdout
const logger = {
  info: (...args) => console.error('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => console.error('[DEBUG]', ...args),
  warn: (...args) => console.error('[WARN]', ...args),
};
const debugLogger = logger;

export class CoreInitialization {
  constructor(options = {}) {
    this.options = options;
    this.server = null;
    this.logger = logger;
    this.debugLogger = debugLogger;
    this.initializationPhases = [];

    logger.info('[CoreInitialization] Initialized with consolidated architecture');
  }

  /**
   * Initialize the Forest system with all consolidated modules
   */
  async initialize() {
    const startTime = Date.now();

    try {
      logger.info('[CoreInitialization] Starting Forest system initialization...');

      // Phase 1: Core Infrastructure
      await this.initializePhase('Core Infrastructure', async () => {
        this.server = new Stage1CoreServer(this.options);
        await this.server.initialize();
      });

      // Phase 2: Module Validation
      await this.initializePhase('Module Validation', async () => {
        await this.validateConsolidatedModules();
      });

      // Phase 3: Health Checks
      await this.initializePhase('Health Checks', async () => {
        await this.performHealthChecks();
      });

      // Phase 4: Health Monitoring Integration
      await this.initializePhase('Health Monitoring Integration', async () => {
        await this.setupHealthMonitoring();
      });

      const duration = Date.now() - startTime;
      logger.info('[CoreInitialization] Forest system initialized successfully', {
        duration: `${duration}ms`,
        phases: this.initializationPhases.length,
      });

      return this.server;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('[CoreInitialization] Forest system initialization failed', {
        error: error.message,
        duration: `${duration}ms`,
        completedPhases: this.initializationPhases.length,
      });
      throw error;
    }
  }

  async initializePhase(phaseName, phaseFunction) {
    const phaseStart = Date.now();

    try {
      logger.debug(`[CoreInitialization] Starting phase: ${phaseName}`);

      await phaseFunction();

      const phaseDuration = Date.now() - phaseStart;
      this.initializationPhases.push({
        name: phaseName,
        duration: phaseDuration,
        success: true,
      });

      logger.debug(`[CoreInitialization] Phase completed: ${phaseName}`, {
        duration: `${phaseDuration}ms`,
      });
    } catch (error) {
      const phaseDuration = Date.now() - phaseStart;
      this.initializationPhases.push({
        name: phaseName,
        duration: phaseDuration,
        success: false,
        error: error.message,
      });

      logger.error(`[CoreInitialization] Phase failed: ${phaseName}`, {
        error: error.message,
        duration: `${phaseDuration}ms`,
      });

      throw new Error(`Initialization phase '${phaseName}' failed: ${error.message}`);
    }
  }

  /**
   * Validate all consolidated modules are properly initialized
   */
  async validateConsolidatedModules() {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const requiredModules = [
      'dataPersistence',
      'projectManagement',
      'htaCore',
      'taskStrategyCore',
      'coreIntelligence',
      'memorySync',
      'mcpCore',
    ];

    const validationResults = [];

    for (const moduleName of requiredModules) {
      try {
        const module = this.server[moduleName];
        if (!module) {
          throw new Error(`Module ${moduleName} not found`);
        }

        // Basic validation - check if module has expected methods
        const expectedMethods = this.getExpectedMethods(moduleName);
        for (const method of expectedMethods) {
          if (typeof module[method] !== 'function') {
            throw new Error(`Module ${moduleName} missing method: ${method}`);
          }
        }

        validationResults.push({
          module: moduleName,
          status: 'valid',
          methods: expectedMethods.length,
        });

        logger.debug(`[CoreInitialization] Module validated: ${moduleName}`);
      } catch (error) {
        validationResults.push({
          module: moduleName,
          status: 'invalid',
          error: error.message,
        });

        throw new Error(`Module validation failed for ${moduleName}: ${error.message}`);
      }
    }

    logger.info('[CoreInitialization] All consolidated modules validated', {
      moduleCount: validationResults.length,
      validModules: validationResults.filter(r => r.status === 'valid').length,
    });

    return validationResults;
  }

  getExpectedMethods(moduleName) {
    const methodMap = {
      dataPersistence: ['saveProjectData', 'loadProjectData', 'ensureDataDir', 'clearCache'],
      projectManagement: ['createProject', 'switchProject', 'listProjects', 'getActiveProject'],
      htaCore: ['buildHTATree', 'getHTAStatus'],
      taskStrategyCore: ['getNextTask', 'handleBlockCompletion', 'evolveStrategy'],
      coreIntelligence: ['analyzeReasoning', 'generateLogicalDeductions'],
      memorySync: ['syncForestMemory', 'queueSync', 'getSyncStatus'],
      mcpCore: ['setupHandlers', 'handleToolCall', 'getToolDefinitions'],
    };

    return methodMap[moduleName] || [];
  }

  async performHealthChecks() {
    const healthChecks = [];

    try {
      // Check data directory accessibility
      await this.server.dataPersistence.ensureDataDir();
      healthChecks.push({ check: 'data_directory', status: 'healthy' });

      // Check MCP server status
      const mcpServer = this.server.getServer();
      if (mcpServer) {
        healthChecks.push({ check: 'mcp_server', status: 'healthy' });
      } else {
        throw new Error('MCP server not available');
      }

      // Check tool definitions
      const toolDefinitions = await this.server.mcpCore.getToolDefinitions();
      if (toolDefinitions && toolDefinitions.length >= 12) {
        healthChecks.push({
          check: 'tool_definitions',
          status: 'healthy',
          toolCount: toolDefinitions.length,
        });
      } else {
        throw new Error(`Insufficient tool definitions: ${toolDefinitions?.length || 0}/12`);
      }

      logger.info('[CoreInitialization] Health checks passed', {
        checkCount: healthChecks.length,
        healthyChecks: healthChecks.filter(c => c.status === 'healthy').length,
      });

      return healthChecks;
    } catch (error) {
      healthChecks.push({
        check: 'health_validation',
        status: 'unhealthy',
        error: error.message,
      });

      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  /**
   * Get initialization status and metrics
   */
  getInitializationStatus() {
    return {
      server: this.server ? 'initialized' : 'not_initialized',
      phases: this.initializationPhases,
      totalPhases: this.initializationPhases.length,
      successfulPhases: this.initializationPhases.filter(p => p.success).length,
      failedPhases: this.initializationPhases.filter(p => !p.success).length,
      totalDuration: this.initializationPhases.reduce((sum, p) => sum + p.duration, 0),
    };
  }

  /**
   * Graceful shutdown with cleanup
   */
  async shutdown() {
    try {
      logger.info('[CoreInitialization] Starting graceful shutdown...');

      if (this.server) {
        await this.server.cleanup();
      }

      logger.info('[CoreInitialization] Forest system shutdown complete');
      return true;
    } catch (error) {
      logger.error('[CoreInitialization] Shutdown failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Setup health monitoring integration
   */
  async setupHealthMonitoring() {
    if (this.server && typeof this.server.healthCheck === 'function') {
      logger.info('[CoreInitialization] Health monitoring already integrated');
      return true;
    }
    
    // Add health monitoring to core server
    if (this.server) {
      this.server.healthCheck = () => ({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        modules: this.getModuleHealth(),
        uptime: process.uptime(),
        version: '1.0.0'
      });
      
      this.server.validateSystem = () => {
        const health = this.server.healthCheck();
        return health.status === 'healthy';
      };
      
      this.server.getSystemStatus = () => {
        return this.server.healthCheck();
      };
      
      logger.info('[CoreInitialization] Health monitoring integrated into core server');
      return true;
    }
    
    logger.warn('[CoreInitialization] Core server not available for health monitoring');
    return false;
  }

  /**
   * Get module health status
   */
  getModuleHealth() {
    const modules = [
      'dataPersistence', 'projectManagement', 'htaCore',
      'taskStrategyCore', 'coreIntelligence', 'memorySync', 'mcpCore'
    ];
    
    const health = {};
    modules.forEach(module => {
      health[module] = this.server && this.server[module] ? 'healthy' : 'missing';
    });
    
    return health;
  }

  /**
   * Get server instance (for external access)
   */
  getServer() {
    return this.server;
  }
}



