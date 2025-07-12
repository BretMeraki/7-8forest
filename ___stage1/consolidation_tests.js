/**
 * Consolidation Tests - Validate Consolidated Modules
 * Ensures all consolidated modules work correctly and preserve functionality
 */

import { CoreInitialization } from './core-initialization.js';
import { Stage1CoreServer } from './core-server.js';
// Simple console logger for validation tools
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  debug: (...args) => console.log('[DEBUG]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
};
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ConsolidationTests {
  constructor(options = {}) {
    this.options = {
      dataDir: options.dataDir || path.join(__dirname, '../../test-data'),
      verbose: options.verbose || false,
      ...options,
    };
    this.testResults = [];
    this.logger = logger;
  }

  async runAllTests() {
    const startTime = Date.now();

    try {
      this.logger.info('[ConsolidationTests] Starting consolidation validation tests...');

      // Test 1: Module Initialization
      await this.runTest('Module Initialization', () => this.testModuleInitialization());

      // Test 2: Core Tool Definitions
      await this.runTest('Core Tool Definitions', () => this.testCoreToolDefinitions());

      // Test 3: Data Persistence
      await this.runTest('Data Persistence', () => this.testDataPersistence());

      // Test 4: Project Management
      await this.runTest('Project Management', () => this.testProjectManagement());

      // Test 5: HTA Core Functionality
      await this.runTest('HTA Core Functionality', () => this.testHTACore());

      // Test 6: Task Strategy Core
      await this.runTest('Task Strategy Core', () => this.testTaskStrategyCore());

      // Test 7: Memory Sync
      await this.runTest('Memory Sync', () => this.testMemorySync());

      const duration = Date.now() - startTime;
      const passedTests = this.testResults.filter(t => t.passed).length;
      const totalTests = this.testResults.length;

      this.logger.info('[ConsolidationTests] All tests completed', {
        duration: `${duration}ms`,
        passed: passedTests,
        total: totalTests,
        success: passedTests === totalTests,
      });

      return {
        success: passedTests === totalTests,
        passed: passedTests,
        total: totalTests,
        duration,
        results: this.testResults,
      };
    } catch (error) {
      this.logger.error('[ConsolidationTests] Test suite failed', {
        error: error.message,
      });
      throw error;
    }
  }

  async runTest(testName, testFunction) {
    const testStart = Date.now();

    try {
      if (this.options.verbose) {
        this.logger.debug(`[ConsolidationTests] Running test: ${testName}`);
      }

      await testFunction();

      const testDuration = Date.now() - testStart;
      this.testResults.push({
        name: testName,
        passed: true,
        duration: testDuration,
      });

      if (this.options.verbose) {
        this.logger.debug(`[ConsolidationTests] Test passed: ${testName}`, {
          duration: `${testDuration}ms`,
        });
      }
    } catch (error) {
      const testDuration = Date.now() - testStart;
      this.testResults.push({
        name: testName,
        passed: false,
        duration: testDuration,
        error: error.message,
      });

      this.logger.error(`[ConsolidationTests] Test failed: ${testName}`, {
        error: error.message,
        duration: `${testDuration}ms`,
      });

      throw new Error(`Test '${testName}' failed: ${error.message}`);
    }
  }

  async testModuleInitialization() {
    const initialization = new CoreInitialization(this.options);
    const server = await initialization.initialize();

    // Verify server exists
    if (!server) {
      throw new Error('Server not initialized');
    }

    // Verify all consolidated modules exist
    const requiredModules = [
      'dataPersistence',
      'projectManagement',
      'htaCore',
      'taskStrategyCore',
      'coreIntelligence',
      'memorySync',
      'mcpCore',
    ];

    for (const moduleName of requiredModules) {
      if (!server[moduleName]) {
        throw new Error(`Module ${moduleName} not initialized`);
      }
    }

    await initialization.shutdown();
  }

  async testCoreToolDefinitions() {
    const server = new Stage1CoreServer(this.options);
    await server.initialize();

    const toolDefinitions = await server.mcpCore.getToolDefinitions();

    if (!toolDefinitions || !Array.isArray(toolDefinitions)) {
      throw new Error('Tool definitions not available');
    }

    if (toolDefinitions.length < 12) {
      throw new Error(`Insufficient tool definitions: ${toolDefinitions.length}/12`);
    }

    // Verify core tools exist
    const coreTools = [
      'create_project_forest',
      'switch_project_forest',
      'list_projects_forest',
      'get_active_project_forest',
      'build_hta_tree_forest',
      'get_hta_status_forest',
      'get_next_task_forest',
      'complete_block_forest',
      'evolve_strategy_forest',
      'current_status_forest',
      'generate_daily_schedule_forest',
      'sync_forest_memory_forest',
    ];

    const availableTools = toolDefinitions.map(t => t.name);

    for (const toolName of coreTools) {
      if (!availableTools.includes(toolName)) {
        throw new Error(`Core tool missing: ${toolName}`);
      }
    }

    await server.cleanup();
  }

  async testDataPersistence() {
    const server = new Stage1CoreServer(this.options);
    await server.initialize();

    const testData = { test: 'consolidation_test', timestamp: Date.now() };
    const testProject = 'test_consolidation_project';
    const testFile = 'test.json';

    // Test save
    await server.dataPersistence.saveProjectData(testProject, testFile, testData);

    // Test load
    const loadedData = await server.dataPersistence.loadProjectData(testProject, testFile);

    if (!loadedData || loadedData.test !== testData.test) {
      throw new Error('Data persistence save/load failed');
    }

    await server.cleanup();
  }

  async testProjectManagement() {
    const server = new Stage1CoreServer(this.options);
    await server.initialize();

    const testProject = {
      project_id: 'test_consolidation_project',
      goal: 'Test consolidation functionality',
      urgency_level: 'medium',
      life_structure_preferences: {
        focus_duration: '30 minutes',
        wake_time: '7:00 AM',
        sleep_time: '11:00 PM',
      },
    };

    // Test project creation
    const createResult = await server.projectManagement.createProject(testProject);

    if (!createResult || !createResult.content) {
      throw new Error('Project creation failed');
    }

    // Test project listing
    const listResult = await server.projectManagement.listProjects();

    if (!listResult || !listResult.content) {
      throw new Error('Project listing failed');
    }

    await server.cleanup();
  }

  async testHTACore() {
    const server = new Stage1CoreServer(this.options);
    await server.initialize();

    // Create a test project first
    const testProject = {
      project_id: 'test_hta_project',
      goal: 'Test HTA functionality',
      urgency_level: 'medium',
    };

    await server.projectManagement.createProject(testProject);

    // Test HTA tree building
    const htaResult = await server.htaCore.buildHtaTree({
      learning_style: 'hands-on',
      focus_areas: ['testing', 'validation'],
    });

    if (!htaResult || !htaResult.content) {
      throw new Error('HTA tree building failed');
    }

    // Test HTA status
    const statusResult = await server.htaCore.getHtaStatus();

    if (!statusResult || !statusResult.content) {
      throw new Error('HTA status retrieval failed');
    }

    await server.cleanup();
  }

  async testTaskStrategyCore() {
    const server = new Stage1CoreServer(this.options);
    await server.initialize();

    // Test get next task (should handle no active project gracefully)
    const taskResult = await server.taskStrategyCore.getNextTask({
      energy_level: 3,
      time_available: '30 minutes',
    });

    if (!taskResult || !taskResult.content) {
      throw new Error('Task strategy core failed');
    }

    await server.cleanup();
  }

  async testMemorySync() {
    const server = new Stage1CoreServer(this.options);
    await server.initialize();

    // Test memory sync status
    const syncStatus = server.memorySync.getSyncStatus();

    if (!syncStatus || typeof syncStatus.isSyncing !== 'boolean') {
      throw new Error('Memory sync status failed');
    }

    await server.cleanup();
  }

  getTestResults() {
    return {
      results: this.testResults,
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(t => t.passed).length,
        failed: this.testResults.filter(t => !t.passed).length,
        totalDuration: this.testResults.reduce((sum, t) => sum + t.duration, 0),
      },
    };
  }
}

// CLI runner for standalone testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const tests = new ConsolidationTests({ verbose: true });

  tests
    .runAllTests()
    .then(results => {
      console.log('\n🎉 Consolidation Tests Results:');
      console.log(`✅ Passed: ${results.passed}/${results.total}`);
      console.log(`⏱️  Duration: ${results.duration}ms`);

      if (!results.success) {
        console.log('\n❌ Failed Tests:');
        results.results
          .filter(t => !t.passed)
          .forEach(test => {
            console.log(`  - ${test.name}: ${test.error}`);
          });
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    });
}
