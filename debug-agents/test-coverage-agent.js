/**
 * Test Coverage Agent
 * Analyzes test coverage and identifies gaps
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DEBUG_CONFIG, PRIORITY_LEVELS } from './config.js';
import { agentCommunication } from './agent-communication.js';

const execAsync = promisify(exec);

export class TestCoverageAgent {
  constructor() {
    this.agentId = 'test_coverage';
    this.config = DEBUG_CONFIG.agents.testCoverage;
    this.coverageData = null;
    this.testResults = new Map();
    this.untestableFunctions = new Map();
    this.isRunning = false;
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    agentCommunication.registerAgent(this.agentId, this);
    console.log('[TestCoverageAgent] Initializing...');
    
    // Check if test framework is available
    await this.checkTestEnvironment();
    
    console.log('[TestCoverageAgent] Initialized');
  }

  /**
   * Check test environment
   */
  async checkTestEnvironment() {
    try {
      // Check for Jest
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      this.testFramework = null;
      
      if (packageJson.devDependencies?.jest || packageJson.dependencies?.jest) {
        this.testFramework = 'jest';
      } else if (packageJson.devDependencies?.mocha || packageJson.dependencies?.mocha) {
        this.testFramework = 'mocha';
      }
      
      console.log(`[TestCoverageAgent] Test framework detected: ${this.testFramework || 'none'}`);
    } catch (error) {
      console.error('[TestCoverageAgent] Failed to check test environment:', error);
    }
  }

  /**
   * Start the agent
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log('[TestCoverageAgent] Starting test coverage analysis...');
    
    // Run initial coverage analysis
    await this.analyzeCoverage();
    
    // Start periodic analysis
    this.scanInterval = setInterval(() => {
      this.analyzeCoverage();
    }, this.config.scanInterval);
    
    // Send initial status
    this.sendStatus();
  }

  /**
   * Analyze test coverage
   */
  async analyzeCoverage() {
    agentCommunication.heartbeat(this.agentId);
    
    try {
      // Run coverage command based on test framework
      if (this.testFramework === 'jest') {
        await this.runJestCoverage();
      } else if (this.testFramework === 'mocha') {
        await this.runMochaCoverage();
      } else {
        // Manual analysis if no test framework
        await this.manualCoverageAnalysis();
      }
      
      // Analyze test files
      await this.analyzeTestFiles();
      
      // Identify untested functions
      await this.identifyUntestedFunctions();
      
      // Send status update
      this.sendStatus();
      
    } catch (error) {
      console.error('[TestCoverageAgent] Coverage analysis failed:', error);
    }
  }

  /**
   * Run Jest coverage
   */
  async runJestCoverage() {
    try {
      console.log('[TestCoverageAgent] Running Jest coverage...');
      
      const { stdout, stderr } = await execAsync('npm test -- --coverage --json --outputFile=coverage/coverage-final.json', {
        timeout: 60000 // 1 minute timeout
      });
      
      // Read coverage data
      const coverageFile = 'coverage/coverage-final.json';
      if (await this.fileExists(coverageFile)) {
        const coverageData = JSON.parse(await fs.readFile(coverageFile, 'utf8'));
        this.processCoverageData(coverageData);
      }
      
      // Parse test results
      if (stdout.includes('Tests:')) {
        this.parseJestOutput(stdout);
      }
      
    } catch (error) {
      console.error('[TestCoverageAgent] Jest coverage failed:', error.message);
    }
  }

  /**
   * Run Mocha coverage
   */
  async runMochaCoverage() {
    try {
      console.log('[TestCoverageAgent] Running Mocha coverage...');
      
      const { stdout } = await execAsync('npx nyc --reporter=json npm test', {
        timeout: 60000
      });
      
      // Read coverage data
      const coverageFile = 'coverage/coverage-final.json';
      if (await this.fileExists(coverageFile)) {
        const coverageData = JSON.parse(await fs.readFile(coverageFile, 'utf8'));
        this.processCoverageData(coverageData);
      }
      
    } catch (error) {
      console.error('[TestCoverageAgent] Mocha coverage failed:', error.message);
    }
  }

  /**
   * Manual coverage analysis
   */
  async manualCoverageAnalysis() {
    console.log('[TestCoverageAgent] Performing manual coverage analysis...');
    
    const sourceFiles = await this.getSourceFiles();
    const testFiles = await this.getTestFiles();
    
    // Create coverage map
    this.coverageData = {
      files: {},
      summary: {
        lines: { total: 0, covered: 0, pct: 0 },
        functions: { total: 0, covered: 0, pct: 0 },
        branches: { total: 0, covered: 0, pct: 0 }
      }
    };
    
    // Analyze each source file
    for (const sourceFile of sourceFiles) {
      const coverage = await this.analyzeFileCoverage(sourceFile, testFiles);
      this.coverageData.files[sourceFile] = coverage;
      
      // Update summary
      this.coverageData.summary.functions.total += coverage.functions.total;
      this.coverageData.summary.functions.covered += coverage.functions.covered;
    }
    
    // Calculate percentages
    if (this.coverageData.summary.functions.total > 0) {
      this.coverageData.summary.functions.pct = 
        (this.coverageData.summary.functions.covered / this.coverageData.summary.functions.total) * 100;
    }
  }

  /**
   * Analyze file coverage
   */
  async analyzeFileCoverage(sourceFile, testFiles) {
    const content = await fs.readFile(sourceFile, 'utf8');
    const functions = this.extractFunctions(content);
    
    const coverage = {
      path: sourceFile,
      functions: {
        total: functions.length,
        covered: 0,
        details: {}
      }
    };
    
    // Check which functions are tested
    for (const func of functions) {
      const isTested = await this.isFunctionTested(func, sourceFile, testFiles);
      if (isTested) {
        coverage.functions.covered++;
      }
      coverage.functions.details[func.name] = {
        tested: isTested,
        line: func.line
      };
    }
    
    return coverage;
  }

  /**
   * Extract functions from file content
   */
  extractFunctions(content) {
    const functions = [];
    const lines = content.split('\n');
    
    // Regular function declarations
    const funcPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/;
    // Arrow functions
    const arrowPattern = /(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/;
    // Class methods
    const methodPattern = /^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/;
    
    lines.forEach((line, index) => {
      let match = line.match(funcPattern);
      if (match) {
        functions.push({ name: match[1], line: index + 1, type: 'function' });
        return;
      }
      
      match = line.match(arrowPattern);
      if (match) {
        functions.push({ name: match[1], line: index + 1, type: 'arrow' });
        return;
      }
      
      match = line.match(methodPattern);
      if (match && !['constructor', 'if', 'for', 'while', 'switch'].includes(match[1])) {
        functions.push({ name: match[1], line: index + 1, type: 'method' });
      }
    });
    
    return functions;
  }

  /**
   * Check if a function is tested
   */
  async isFunctionTested(func, sourceFile, testFiles) {
    const moduleName = path.basename(sourceFile, path.extname(sourceFile));
    
    for (const testFile of testFiles) {
      try {
        const testContent = await fs.readFile(testFile, 'utf8');
        
        // Check for function references in tests
        if (testContent.includes(func.name) && 
            (testContent.includes(moduleName) || testContent.includes(sourceFile))) {
          return true;
        }
      } catch (error) {
        // Skip if can't read test file
      }
    }
    
    return false;
  }

  /**
   * Process coverage data
   */
  processCoverageData(coverageData) {
    this.coverageData = {
      files: {},
      summary: {
        lines: { total: 0, covered: 0, pct: 0 },
        functions: { total: 0, covered: 0, pct: 0 },
        branches: { total: 0, covered: 0, pct: 0 }
      }
    };
    
    // Process each file
    for (const [filePath, fileData] of Object.entries(coverageData)) {
      const summary = fileData.s || {};
      const functions = fileData.fnMap || {};
      const functionCoverage = fileData.f || {};
      
      this.coverageData.files[filePath] = {
        path: filePath,
        lines: this.calculateLineCoverage(summary),
        functions: this.calculateFunctionCoverage(functions, functionCoverage)
      };
      
      // Update totals
      this.updateSummary(this.coverageData.files[filePath]);
    }
    
    // Calculate percentages
    this.calculatePercentages();
  }

  /**
   * Analyze test files
   */
  async analyzeTestFiles() {
    const testFiles = await this.getTestFiles();
    
    for (const testFile of testFiles) {
      try {
        const content = await fs.readFile(testFile, 'utf8');
        const testInfo = this.analyzeTestFile(content, testFile);
        this.testResults.set(testFile, testInfo);
      } catch (error) {
        console.error(`[TestCoverageAgent] Failed to analyze test file ${testFile}:`, error);
      }
    }
  }

  /**
   * Analyze a test file
   */
  analyzeTestFile(content, filePath) {
    const info = {
      path: filePath,
      testCount: 0,
      skippedTests: 0,
      testNames: [],
      issues: []
    };
    
    // Count tests (Jest/Mocha patterns)
    const testPatterns = [
      /(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /describe\s*\(\s*['"`]([^'"`]+)['"`]/g
    ];
    
    for (const pattern of testPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        info.testCount++;
        info.testNames.push(match[1]);
      }
    }
    
    // Count skipped tests
    const skipPatterns = [
      /(?:it|test)\.skip/g,
      /(?:it|test)\.todo/g,
      /xdescribe/g,
      /xit/g
    ];
    
    for (const pattern of skipPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        info.skippedTests += matches.length;
      }
    }
    
    // Check for issues
    if (info.testCount === 0) {
      info.issues.push('No tests found in file');
    }
    
    if (info.skippedTests > 0) {
      info.issues.push(`${info.skippedTests} skipped tests`);
    }
    
    // Check for missing assertions
    if (!content.includes('expect') && !content.includes('assert')) {
      info.issues.push('No assertions found');
    }
    
    return info;
  }

  /**
   * Identify untested functions
   */
  async identifyUntestedFunctions() {
    if (!this.coverageData) return;
    
    this.untestableFunctions.clear();
    
    for (const [filePath, fileData] of Object.entries(this.coverageData.files)) {
      if (fileData.functions && fileData.functions.details) {
        const untestedFuncs = [];
        
        for (const [funcName, funcData] of Object.entries(fileData.functions.details)) {
          if (!funcData.tested) {
            untestedFuncs.push({
              name: funcName,
              line: funcData.line,
              file: filePath
            });
          }
        }
        
        if (untestedFuncs.length > 0) {
          this.untestableFunctions.set(filePath, untestedFuncs);
          
          // Notify about critical untested functions
          for (const func of untestedFuncs) {
            if (this.isCriticalFunction(func.name)) {
              agentCommunication.sendMessage(
                this.agentId,
                'broadcast',
                DEBUG_CONFIG.communication.eventTypes.TEST_FAILURE,
                {
                  type: 'untested_critical_function',
                  function: func.name,
                  file: func.file,
                  line: func.line,
                  severity: PRIORITY_LEVELS.HIGH
                },
                PRIORITY_LEVELS.HIGH
              );
            }
          }
        }
      }
    }
  }

  /**
   * Check if function is critical
   */
  isCriticalFunction(funcName) {
    const criticalPatterns = [
      /^handle/i,
      /^process/i,
      /^validate/i,
      /^auth/i,
      /^save/i,
      /^delete/i,
      /^update/i,
      /^create/i
    ];
    
    return criticalPatterns.some(pattern => pattern.test(funcName));
  }

  /**
   * Get source files
   */
  async getSourceFiles() {
    const files = [];
    const directories = ['___stage1/modules', 'modules', 'utils'];
    
    for (const dir of directories) {
      if (await this.fileExists(dir)) {
        await this.collectJSFiles(dir, files);
      }
    }
    
    return files.filter(f => !f.includes('test') && !f.includes('spec'));
  }

  /**
   * Get test files
   */
  async getTestFiles() {
    const files = [];
    
    for (const dir of this.config.testDirectories) {
      if (await this.fileExists(dir)) {
        await this.collectJSFiles(dir, files);
      }
    }
    
    // Also look for test files in source directories
    const allFiles = await this.collectJSFiles('.', []);
    const testFiles = allFiles.filter(f => 
      f.includes('.test.') || 
      f.includes('.spec.') || 
      f.includes('__tests__')
    );
    
    return [...new Set([...files, ...testFiles])];
  }

  /**
   * Collect JavaScript files recursively
   */
  async collectJSFiles(dir, files = []) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await this.collectJSFiles(fullPath, files);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    
    return files;
  }

  /**
   * Helper functions for coverage calculation
   */
  calculateLineCoverage(statements) {
    const total = Object.keys(statements).length;
    const covered = Object.values(statements).filter(count => count > 0).length;
    return { total, covered, pct: total > 0 ? (covered / total) * 100 : 0 };
  }

  calculateFunctionCoverage(fnMap, fnCoverage) {
    const total = Object.keys(fnMap).length;
    const covered = Object.values(fnCoverage).filter(count => count > 0).length;
    return { 
      total, 
      covered, 
      pct: total > 0 ? (covered / total) * 100 : 0,
      details: {}
    };
  }

  updateSummary(fileData) {
    if (fileData.lines) {
      this.coverageData.summary.lines.total += fileData.lines.total;
      this.coverageData.summary.lines.covered += fileData.lines.covered;
    }
    
    if (fileData.functions) {
      this.coverageData.summary.functions.total += fileData.functions.total;
      this.coverageData.summary.functions.covered += fileData.functions.covered;
    }
  }

  calculatePercentages() {
    const summary = this.coverageData.summary;
    
    if (summary.lines.total > 0) {
      summary.lines.pct = (summary.lines.covered / summary.lines.total) * 100;
    }
    
    if (summary.functions.total > 0) {
      summary.functions.pct = (summary.functions.covered / summary.functions.total) * 100;
    }
  }

  /**
   * Parse Jest output
   */
  parseJestOutput(output) {
    const testMatch = output.match(/Tests:\s+(\d+)\s+passed.*?(\d+)\s+total/);
    if (testMatch) {
      const passed = parseInt(testMatch[1]);
      const total = parseInt(testMatch[2]);
      const failed = total - passed;
      
      if (failed > 0) {
        agentCommunication.sendMessage(
          this.agentId,
          'broadcast',
          DEBUG_CONFIG.communication.eventTypes.TEST_FAILURE,
          {
            type: 'test_failures',
            passed,
            failed,
            total,
            severity: PRIORITY_LEVELS.HIGH
          },
          PRIORITY_LEVELS.HIGH
        );
      }
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send current status
   */
  sendStatus() {
    const status = {
      coverage: this.coverageData ? {
        lines: this.coverageData.summary.lines.pct.toFixed(2) + '%',
        functions: this.coverageData.summary.functions.pct.toFixed(2) + '%',
        threshold: this.config.coverageThreshold + '%',
        belowThreshold: this.coverageData.summary.functions.pct < this.config.coverageThreshold
      } : null,
      testFiles: this.testResults.size,
      totalTests: Array.from(this.testResults.values()).reduce((sum, info) => sum + info.testCount, 0),
      skippedTests: Array.from(this.testResults.values()).reduce((sum, info) => sum + info.skippedTests, 0),
      untestedFunctions: Array.from(this.untestableFunctions.values()).flat().length,
      criticalIssues: []
    };
    
    // Add critical issues
    if (status.coverage && status.coverage.belowThreshold) {
      status.criticalIssues.push(`Coverage (${status.coverage.functions}) below threshold (${status.coverage.threshold})`);
    }
    
    if (status.untestedFunctions > 0) {
      status.criticalIssues.push(`${status.untestedFunctions} functions without tests`);
    }
    
    agentCommunication.sendMessage(
      this.agentId,
      'orchestrator',
      DEBUG_CONFIG.communication.eventTypes.HEALTH_CHECK,
      status
    );
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(message) {
    switch (message.type) {
      case 'run_tests':
        await this.analyzeCoverage();
        break;
        
      case 'get_coverage':
        return this.coverageData;
        
      case 'get_untested':
        return Array.from(this.untestableFunctions.entries());
    }
  }

  /**
   * Stop the agent
   */
  stop() {
    this.isRunning = false;
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    
    console.log('[TestCoverageAgent] Stopped');
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      coverage: this.coverageData ? {
        lines: this.coverageData.summary.lines,
        functions: this.coverageData.summary.functions,
        files: Object.keys(this.coverageData.files).length
      } : null,
      tests: {
        files: this.testResults.size,
        total: Array.from(this.testResults.values()).reduce((sum, info) => sum + info.testCount, 0),
        skipped: Array.from(this.testResults.values()).reduce((sum, info) => sum + info.skippedTests, 0)
      },
      untested: {
        functions: Array.from(this.untestableFunctions.values()).flat().length,
        critical: Array.from(this.untestableFunctions.values())
          .flat()
          .filter(f => this.isCriticalFunction(f.name)).length
      }
    };
  }
}
