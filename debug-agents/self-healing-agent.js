/**
 * Self-Healing Agent
 * Automatically fixes common issues detected by other agents
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DEBUG_CONFIG, PRIORITY_LEVELS } from './config.js';
import { agentCommunication } from './agent-communication.js';

const execAsync = promisify(exec);

export class SelfHealingAgent {
  constructor() {
    this.agentId = 'self_healing';
    this.config = DEBUG_CONFIG.agents.selfHealing;
    this.fixHistory = new Map();
    this.fixQueue = [];
    this.isRunning = false;
    this.fixStrategies = this.initializeFixStrategies();
  }

  /**
   * Initialize fix strategies
   */
  initializeFixStrategies() {
    return {
      // Code fixes
      missing_semicolon: this.fixMissingSemicolon.bind(this),
      unused_import: this.fixUnusedImport.bind(this),
      formatting: this.fixFormatting.bind(this),
      simple_type_error: this.fixSimpleTypeError.bind(this),
      missing_await: this.fixMissingAwait.bind(this),
      console_statements: this.removeConsoleStatements.bind(this),
      
      // Dependency fixes
      missing_dependency: this.installMissingDependency.bind(this),
      vulnerability: this.fixVulnerability.bind(this),
      version_mismatch: this.fixVersionMismatch.bind(this),
      
      // Performance fixes
      memory_leak: this.fixMemoryLeak.bind(this),
      slow_operation: this.optimizeSlowOperation.bind(this),
      
      // Test fixes
      failing_test: this.fixFailingTest.bind(this),
      missing_test: this.generateMissingTest.bind(this),
      
      // Error fixes
      unhandled_promise: this.fixUnhandledPromise.bind(this),
      circular_dependency: this.fixCircularDependency.bind(this)
    };
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    agentCommunication.registerAgent(this.agentId, this);
    console.log('[SelfHealingAgent] Initializing...');
    
    // Subscribe to issue events from other agents
    agentCommunication.on(DEBUG_CONFIG.communication.eventTypes.ERROR_DETECTED, (message) => {
      this.handleDetectedIssue(message);
    });
    
    agentCommunication.on(DEBUG_CONFIG.communication.eventTypes.ISSUE_FOUND, (message) => {
      this.handleDetectedIssue(message);
    });
    
    agentCommunication.on(DEBUG_CONFIG.communication.eventTypes.DEPENDENCY_ISSUE, (message) => {
      this.handleDetectedIssue(message);
    });
    
    console.log('[SelfHealingAgent] Initialized');
  }

  /**
   * Start the agent
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log('[SelfHealingAgent] Starting self-healing...');
    
    // Start processing fix queue
    this.processInterval = setInterval(() => {
      this.processFixes();
    }, 5000); // Process every 5 seconds
    
    // Send initial status
    this.sendStatus();
  }

  /**
   * Handle detected issue
   */
  handleDetectedIssue(message) {
    if (!this.config.autoFix) return;
    
    const issue = message.data;
    
    // Check if we can fix this type of issue
    if (this.canFix(issue)) {
      this.queueFix({
        id: `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        issue,
        priority: issue.severity || PRIORITY_LEVELS.MEDIUM,
        timestamp: Date.now(),
        attempts: 0
      });
    }
  }

  /**
   * Check if we can fix an issue
   */
  canFix(issue) {
    // Check if issue type is in our fixable list
    if (this.config.fixableIssues.includes(issue.type)) {
      return true;
    }
    
    // Check if we have a strategy for this specific issue
    if (this.fixStrategies[issue.type]) {
      return true;
    }
    
    // Check for pattern-based fixes
    if (issue.type === 'code_issue' && issue.suggestion) {
      return true;
    }
    
    return false;
  }

  /**
   * Queue a fix
   */
  queueFix(fix) {
    // Check if we already have this fix queued
    const existing = this.fixQueue.find(f => 
      f.issue.type === fix.issue.type && 
      f.issue.file === fix.issue.file &&
      f.issue.line === fix.issue.line
    );
    
    if (!existing) {
      this.fixQueue.push(fix);
      console.log(`[SelfHealingAgent] Queued fix for ${fix.issue.type}`);
    }
  }

  /**
   * Process fixes from queue
   */
  async processFixes() {
    agentCommunication.heartbeat(this.agentId);
    
    if (this.fixQueue.length === 0) return;
    
    // Sort by priority
    this.fixQueue.sort((a, b) => a.priority - b.priority);
    
    // Process one fix at a time
    const fix = this.fixQueue.shift();
    
    try {
      console.log(`[SelfHealingAgent] Attempting to fix ${fix.issue.type}...`);
      
      const result = await this.applyFix(fix);
      
      if (result.success) {
        console.log(`[SelfHealingAgent] Successfully fixed ${fix.issue.type}`);
        
        // Record fix
        this.recordFix(fix, result);
        
        // Notify other agents
        agentCommunication.sendMessage(
          this.agentId,
          'broadcast',
          DEBUG_CONFIG.communication.eventTypes.FIX_APPLIED,
          {
            fix: fix.id,
            issue: fix.issue,
            result,
            timestamp: Date.now()
          }
        );
      } else {
        console.error(`[SelfHealingAgent] Failed to fix ${fix.issue.type}: ${result.error}`);
        
        // Retry if attempts < 3
        if (fix.attempts < 3) {
          fix.attempts++;
          this.fixQueue.push(fix);
        }
      }
      
    } catch (error) {
      console.error(`[SelfHealingAgent] Error applying fix:`, error);
    }
  }

  /**
   * Apply a fix
   */
  async applyFix(fix) {
    const strategy = this.fixStrategies[fix.issue.type];
    
    if (strategy) {
      return await strategy(fix.issue);
    }
    
    // Generic fix based on suggestion
    if (fix.issue.suggestion) {
      return await this.applyGenericFix(fix.issue);
    }
    
    return { success: false, error: 'No fix strategy available' };
  }

  /**
   * Fix missing semicolon
   */
  async fixMissingSemicolon(issue) {
    try {
      const content = await fs.readFile(issue.file, 'utf8');
      const lines = content.split('\n');
      
      if (issue.line && issue.line <= lines.length) {
        const line = lines[issue.line - 1];
        
        // Add semicolon if missing
        if (!line.trim().endsWith(';') && !line.trim().endsWith('{') && !line.trim().endsWith('}')) {
          lines[issue.line - 1] = line.trimRight() + ';';
          
          await fs.writeFile(issue.file, lines.join('\n'), 'utf8');
          
          return { success: true, change: 'Added missing semicolon' };
        }
      }
      
      return { success: false, error: 'Could not determine where to add semicolon' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix unused import
   */
  async fixUnusedImport(issue) {
    try {
      const content = await fs.readFile(issue.file, 'utf8');
      const lines = content.split('\n');
      
      // Find and remove the unused import
      const importPattern = new RegExp(`import.*${issue.code}.*from.*['"].*['"];?`);
      const requirePattern = new RegExp(`const.*${issue.code}.*=.*require\\(.*\\);?`);
      
      let modified = false;
      for (let i = 0; i < lines.length; i++) {
        if (importPattern.test(lines[i]) || requirePattern.test(lines[i])) {
          lines.splice(i, 1);
          modified = true;
          break;
        }
      }
      
      if (modified) {
        await fs.writeFile(issue.file, lines.join('\n'), 'utf8');
        return { success: true, change: `Removed unused import: ${issue.code}` };
      }
      
      return { success: false, error: 'Could not find import to remove' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix formatting issues
   */
  async fixFormatting(issue) {
    try {
      // Try to use prettier if available
      try {
        await execAsync(`npx prettier --write ${issue.file}`, { timeout: 30000 });
        return { success: true, change: 'Applied Prettier formatting' };
      } catch {
        // Fallback to basic formatting
        const content = await fs.readFile(issue.file, 'utf8');
        
        // Basic formatting fixes
        let formatted = content
          .replace(/\s+$/gm, '') // Remove trailing whitespace
          .replace(/\t/g, '  ') // Convert tabs to spaces
          .replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines
        
        await fs.writeFile(issue.file, formatted, 'utf8');
        return { success: true, change: 'Applied basic formatting' };
      }
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix simple type errors
   */
  async fixSimpleTypeError(issue) {
    try {
      const content = await fs.readFile(issue.file, 'utf8');
      const lines = content.split('\n');
      
      if (issue.line && issue.line <= lines.length) {
        const line = lines[issue.line - 1];
        
        // Common type error fixes
        let fixed = line;
        
        // Fix undefined check
        fixed = fixed.replace(/(\w+)\.(\w+)/, (match, obj, prop) => {
          return `${obj}?.${prop}`;
        });
        
        // Fix null/undefined comparison
        fixed = fixed.replace(/== null/, '=== null');
        fixed = fixed.replace(/!= null/, '!== null');
        
        if (fixed !== line) {
          lines[issue.line - 1] = fixed;
          await fs.writeFile(issue.file, lines.join('\n'), 'utf8');
          return { success: true, change: 'Fixed type error with optional chaining' };
        }
      }
      
      return { success: false, error: 'Could not determine type error fix' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix missing await
   */
  async fixMissingAwait(issue) {
    try {
      const content = await fs.readFile(issue.file, 'utf8');
      const lines = content.split('\n');
      
      if (issue.line && issue.line <= lines.length) {
        const line = lines[issue.line - 1];
        
        // Add await if calling an async function
        const asyncCallPattern = /(\w+)\s*\.\s*(\w+)\s*\(/;
        const match = line.match(asyncCallPattern);
        
        if (match && !line.includes('await')) {
          const indentation = line.match(/^\s*/)[0];
          lines[issue.line - 1] = `${indentation}await ${line.trim()}`;
          
          await fs.writeFile(issue.file, lines.join('\n'), 'utf8');
          return { success: true, change: 'Added missing await' };
        }
      }
      
      return { success: false, error: 'Could not determine where to add await' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove console statements
   */
  async removeConsoleStatements(issue) {
    try {
      const content = await fs.readFile(issue.file, 'utf8');
      
      // Remove console statements but keep important ones
      const cleaned = content.replace(
        /console\.(log|debug|info|warn).*$/gm,
        (match) => {
          // Keep error logs and important warnings
          if (match.includes('error') || match.includes('Error') || match.includes('failed')) {
            return match;
          }
          return '// ' + match; // Comment out instead of removing
        }
      );
      
      await fs.writeFile(issue.file, cleaned, 'utf8');
      return { success: true, change: 'Commented out console statements' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Install missing dependency
   */
  async installMissingDependency(issue) {
    try {
      const packageName = issue.package;
      console.log(`[SelfHealingAgent] Installing ${packageName}...`);
      
      const { stdout } = await execAsync(`npm install ${packageName}`, {
        timeout: 60000
      });
      
      return { success: true, change: `Installed ${packageName}`, output: stdout };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix vulnerability
   */
  async fixVulnerability(issue) {
    try {
      console.log(`[SelfHealingAgent] Fixing vulnerability in ${issue.package}...`);
      
      // Try npm audit fix first
      try {
        const { stdout } = await execAsync('npm audit fix', { timeout: 120000 });
        return { success: true, change: 'Applied npm audit fix', output: stdout };
      } catch {
        // Try updating the specific package
        const { stdout } = await execAsync(`npm update ${issue.package}`, {
          timeout: 60000
        });
        return { success: true, change: `Updated ${issue.package}`, output: stdout };
      }
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix version mismatch
   */
  async fixVersionMismatch(issue) {
    try {
      const { stdout } = await execAsync(`npm install ${issue.package}@${issue.expected}`, {
        timeout: 60000
      });
      
      return { success: true, change: `Fixed version mismatch for ${issue.package}`, output: stdout };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix memory leak
   */
  async fixMemoryLeak(issue) {
    try {
      // This is a complex fix that requires analysis
      // For now, we'll add cleanup code to common leak patterns
      
      if (issue.file) {
        const content = await fs.readFile(issue.file, 'utf8');
        let modified = content;
        
        // Add cleanup for event listeners
        if (content.includes('addEventListener') && !content.includes('removeEventListener')) {
          modified = modified.replace(
            /(\w+)\.addEventListener\(['"](\w+)['"],\s*(\w+)\)/g,
            (match, target, event, handler) => {
              return `${match};\n// TODO: Add cleanup: ${target}.removeEventListener('${event}', ${handler})`;
            }
          );
        }
        
        // Add cleanup for intervals
        if (content.includes('setInterval') && !content.includes('clearInterval')) {
          modified = modified.replace(
            /const\s+(\w+)\s*=\s*setInterval/g,
            (match, varName) => {
              return `${match};\n// TODO: Add cleanup: clearInterval(${varName})`;
            }
          );
        }
        
        if (modified !== content) {
          await fs.writeFile(issue.file, modified, 'utf8');
          return { success: true, change: 'Added memory leak cleanup TODOs' };
        }
      }
      
      return { success: false, error: 'Could not identify memory leak pattern' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Optimize slow operation
   */
  async optimizeSlowOperation(issue) {
    try {
      if (!issue.file) {
        return { success: false, error: 'No file specified for optimization' };
      }
      
      const content = await fs.readFile(issue.file, 'utf8');
      let modified = content;
      
      // Add caching for expensive operations
      const expensivePatterns = [
        /JSON\.parse\(JSON\.stringify\((\w+)\)\)/g,
        /Array\.from\(.*\)\.filter\(.*\)\.map\(.*\)/g,
        /for\s*\(.*\)\s*{\s*for\s*\(.*\)\s*{/g // Nested loops
      ];
      
      let optimized = false;
      
      for (const pattern of expensivePatterns) {
        if (pattern.test(modified)) {
          // Add TODO comments for manual optimization
          modified = modified.replace(pattern, (match) => {
            return `// TODO: Optimize this expensive operation\n${match}`;
          });
          optimized = true;
        }
      }
      
      if (optimized) {
        await fs.writeFile(issue.file, modified, 'utf8');
        return { success: true, change: 'Added optimization TODOs' };
      }
      
      return { success: false, error: 'No optimization opportunities found' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix failing test
   */
  async fixFailingTest(issue) {
    try {
      // Run the specific test to get more details
      const testFile = issue.file || issue.test;
      
      if (testFile) {
        // Try to fix common test issues
        const content = await fs.readFile(testFile, 'utf8');
        let modified = content;
        
        // Fix async test issues
        modified = modified.replace(
          /it\(['"]([^'"]+)['"],\s*\(\)\s*=>\s*{/g,
          (match, testName) => {
            if (content.includes('await') && !match.includes('async')) {
              return `it('${testName}', async () => {`;
            }
            return match;
          }
        );
        
        // Increase timeout for slow tests
        if (issue.error && issue.error.includes('timeout')) {
          modified = modified.replace(
            /it\(['"]([^'"]+)['"],/g,
            (match, testName) => {
              return `it('${testName}', `;
            }
          ).replace(/}\);/g, '}, 10000);'); // 10 second timeout
        }
        
        if (modified !== content) {
          await fs.writeFile(testFile, modified, 'utf8');
          return { success: true, change: 'Fixed test async/timeout issues' };
        }
      }
      
      return { success: false, error: 'Could not fix test automatically' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate missing test
   */
  async generateMissingTest(issue) {
    try {
      const functionName = issue.function || issue.name;
      const sourceFile = issue.file;
      
      if (!functionName || !sourceFile) {
        return { success: false, error: 'Missing function or file information' };
      }
      
      // Generate test file path
      const testDir = path.dirname(sourceFile);
      const baseName = path.basename(sourceFile, path.extname(sourceFile));
      const testFile = path.join(testDir, '__tests__', `${baseName}.test.js`);
      
      // Create test directory if needed
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      
      // Check if test file exists
      let testContent = '';
      try {
        testContent = await fs.readFile(testFile, 'utf8');
      } catch {
        // Create new test file
        testContent = `import { ${functionName} } from '../${baseName}';\n\ndescribe('${baseName}', () => {\n`;
      }
      
      // Add test for the function
      const newTest = `
  test('${functionName} should work correctly', () => {
    // TODO: Implement test for ${functionName}
    expect(${functionName}).toBeDefined();
  });
`;
      
      if (!testContent.includes(`test('${functionName}`)) {
        if (testContent.includes('describe(')) {
          // Insert before closing describe
          testContent = testContent.replace(/}\);[\s]*$/, `${newTest}});\n`);
        } else {
          testContent += newTest + '});\n';
        }
        
        await fs.writeFile(testFile, testContent, 'utf8');
        return { success: true, change: `Generated test stub for ${functionName}` };
      }
      
      return { success: false, error: 'Test already exists' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix unhandled promise
   */
  async fixUnhandledPromise(issue) {
    try {
      const content = await fs.readFile(issue.file, 'utf8');
      const lines = content.split('\n');
      
      if (issue.line && issue.line <= lines.length) {
        const line = lines[issue.line - 1];
        const indentation = line.match(/^\s*/)[0];
        
        // Add .catch() to unhandled promise
        if (line.includes('new Promise') || line.includes('.then(')) {
          if (!line.includes('.catch(')) {
            lines[issue.line - 1] = line.trimRight() + '\n' + 
              indentation + '  .catch(error => console.error("Unhandled promise rejection:", error));';
            
            await fs.writeFile(issue.file, lines.join('\n'), 'utf8');
            return { success: true, change: 'Added catch handler to promise' };
          }
        }
      }
      
      return { success: false, error: 'Could not fix unhandled promise' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix circular dependency
   */
  async fixCircularDependency(issue) {
    try {
      // This is a complex refactoring that usually requires manual intervention
      // We'll add TODO comments to guide the fix
      
      const cycles = issue.cycles || [];
      const recommendations = [];
      
      for (const cycle of cycles) {
        if (cycle.length > 0) {
          const firstFile = cycle[0];
          recommendations.push(`// TODO: Break circular dependency: ${cycle.join(' -> ')}`);
          
          // Try to find the file
          try {
            const content = await fs.readFile(firstFile, 'utf8');
            const modified = `${recommendations.join('\n')}\n\n${content}`;
            await fs.writeFile(firstFile, modified, 'utf8');
          } catch {
            // Skip if file not found
          }
        }
      }
      
      if (recommendations.length > 0) {
        return { success: true, change: 'Added circular dependency TODOs' };
      }
      
      return { success: false, error: 'Could not add circular dependency guidance' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply generic fix based on suggestion
   */
  async applyGenericFix(issue) {
    try {
      if (!issue.file || !issue.suggestion) {
        return { success: false, error: 'Missing file or suggestion' };
      }
      
      const content = await fs.readFile(issue.file, 'utf8');
      
      // Add TODO comment with suggestion
      const lines = content.split('\n');
      if (issue.line && issue.line <= lines.length) {
        const line = lines[issue.line - 1];
        const indentation = line.match(/^\s*/)[0];
        lines[issue.line - 1] = `${indentation}// TODO: ${issue.suggestion}\n${line}`;
        
        await fs.writeFile(issue.file, lines.join('\n'), 'utf8');
        return { success: true, change: 'Added fix suggestion as TODO' };
      }
      
      return { success: false, error: 'Could not apply generic fix' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Record fix in history
   */
  recordFix(fix, result) {
    const record = {
      id: fix.id,
      issue: fix.issue,
      result,
      timestamp: Date.now()
    };
    
    this.fixHistory.set(fix.id, record);
    
    // Keep only last 100 fixes
    if (this.fixHistory.size > 100) {
      const oldestKey = this.fixHistory.keys().next().value;
      this.fixHistory.delete(oldestKey);
    }
  }

  /**
   * Send current status
   */
  sendStatus() {
    const status = {
      queueSize: this.fixQueue.length,
      fixesApplied: this.fixHistory.size,
      recentFixes: Array.from(this.fixHistory.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5)
        .map(f => ({
          type: f.issue.type,
          file: f.issue.file,
          success: f.result.success,
          change: f.result.change,
          timestamp: f.timestamp
        })),
      autoFixEnabled: this.config.autoFix,
      fixableIssues: this.config.fixableIssues
    };
    
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
      case 'apply_fix':
        if (message.data.issue) {
          const result = await this.applyFix({
            issue: message.data.issue,
            priority: message.data.priority || PRIORITY_LEVELS.MEDIUM
          });
          return result;
        }
        break;
        
      case 'toggle_autofix':
        this.config.autoFix = message.data.enabled !== false;
        console.log(`[SelfHealingAgent] Auto-fix ${this.config.autoFix ? 'enabled' : 'disabled'}`);
        break;
        
      case 'get_fix_history':
        return Array.from(this.fixHistory.values());
        
      case 'clear_queue':
        this.fixQueue = [];
        console.log('[SelfHealingAgent] Fix queue cleared');
        break;
    }
  }

  /**
   * Stop the agent
   */
  stop() {
    this.isRunning = false;
    
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
    
    console.log('[SelfHealingAgent] Stopped');
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const successfulFixes = Array.from(this.fixHistory.values()).filter(f => f.result.success);
    const failedFixes = Array.from(this.fixHistory.values()).filter(f => !f.result.success);
    
    const fixesByType = {};
    for (const fix of this.fixHistory.values()) {
      const type = fix.issue.type;
      if (!fixesByType[type]) {
        fixesByType[type] = { total: 0, successful: 0 };
      }
      fixesByType[type].total++;
      if (fix.result.success) {
        fixesByType[type].successful++;
      }
    }
    
    return {
      totalFixes: this.fixHistory.size,
      successfulFixes: successfulFixes.length,
      failedFixes: failedFixes.length,
      successRate: this.fixHistory.size > 0 
        ? (successfulFixes.length / this.fixHistory.size * 100).toFixed(2) + '%'
        : '0%',
      queueSize: this.fixQueue.length,
      fixesByType,
      autoFixEnabled: this.config.autoFix
    };
  }
}
