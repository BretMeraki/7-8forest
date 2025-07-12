/**
 * Code Analysis Agent
 * Performs static code analysis to identify potential issues
 */

import { promises as fs } from 'fs';
import path from 'path';
import { DEBUG_CONFIG, PRIORITY_LEVELS } from './config.js';
import { agentCommunication } from './agent-communication.js';

export class CodeAnalysisAgent {
  constructor() {
    this.agentId = 'code_analysis';
    this.config = DEBUG_CONFIG.agents.codeAnalysis;
    this.detectedIssues = new Map();
    this.fileCache = new Map();
    this.isRunning = false;
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    agentCommunication.registerAgent(this.agentId, this);
    console.log('[CodeAnalysisAgent] Initializing...');
    
    // Perform initial scan
    await this.performFullScan();
    
    console.log('[CodeAnalysisAgent] Initialized');
  }

  /**
   * Start the agent
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log('[CodeAnalysisAgent] Starting code analysis...');
    
    // Start periodic scan
    this.scanInterval = setInterval(() => {
      this.performIncrementalScan();
    }, this.config.scanInterval);
    
    // Send initial status
    this.sendStatus();
  }

  /**
   * Perform a full scan of all directories
   */
  async performFullScan() {
    console.log('[CodeAnalysisAgent] Performing full scan...');
    
    for (const directory of this.config.directories) {
      await this.scanDirectory(directory);
    }
    
    console.log(`[CodeAnalysisAgent] Full scan complete. Found ${this.detectedIssues.size} issues`);
  }

  /**
   * Perform incremental scan (only changed files)
   */
  async performIncrementalScan() {
    agentCommunication.heartbeat(this.agentId);
    
    for (const directory of this.config.directories) {
      await this.scanDirectory(directory, true);
    }
    
    this.sendStatus();
  }

  /**
   * Scan a directory for code issues
   */
  async scanDirectory(directory, incremental = false) {
    try {
      const files = await this.getJavaScriptFiles(directory);
      
      for (const file of files) {
        try {
          const stats = await fs.stat(file);
          const cacheEntry = this.fileCache.get(file);
          
          // Skip if incremental and file hasn't changed
          if (incremental && cacheEntry && cacheEntry.mtime >= stats.mtime) {
            continue;
          }
          
          const content = await fs.readFile(file, 'utf8');
          this.fileCache.set(file, {
            mtime: stats.mtime,
            content
          });
          
          await this.analyzeFile(file, content);
        } catch (error) {
          console.error(`[CodeAnalysisAgent] Error analyzing ${file}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`[CodeAnalysisAgent] Error scanning directory ${directory}:`, error);
    }
  }

  /**
   * Get all JavaScript files in a directory recursively
   */
  async getJavaScriptFiles(directory, files = []) {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await this.getJavaScriptFiles(fullPath, files);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`[CodeAnalysisAgent] Error reading directory ${directory}:`, error);
    }
    
    return files;
  }

  /**
   * Analyze a file for code issues
   */
  async analyzeFile(filePath, content) {
    const issues = [];
    
    // Check for various code issues
    for (const [issueType, pattern] of Object.entries(this.config.issuePatterns)) {
      const matches = content.matchAll(pattern);
      
      for (const match of matches) {
        const lineNumber = this.getLineNumber(content, match.index);
        const issue = {
          id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: issueType,
          file: filePath,
          line: lineNumber,
          column: match.index - content.lastIndexOf('\n', match.index) - 1,
          code: match[0],
          severity: this.getIssueSeverity(issueType),
          suggestion: this.getSuggestion(issueType, match),
          timestamp: Date.now()
        };
        
        issues.push(issue);
      }
    }
    
    // Additional analysis
    issues.push(...this.analyzeComplexity(filePath, content));
    issues.push(...this.analyzeDependencies(filePath, content));
    issues.push(...this.analyzeAsyncPatterns(filePath, content));
    
    // Store issues
    if (issues.length > 0) {
      this.detectedIssues.set(filePath, issues);
      
      // Notify other agents
      for (const issue of issues) {
        if (issue.severity <= PRIORITY_LEVELS.HIGH) {
          agentCommunication.sendMessage(
            this.agentId,
            'broadcast',
            DEBUG_CONFIG.communication.eventTypes.ISSUE_FOUND,
            issue,
            issue.severity
          );
        }
      }
    } else {
      // Clear issues if file is now clean
      this.detectedIssues.delete(filePath);
    }
  }

  /**
   * Analyze code complexity
   */
  analyzeComplexity(filePath, content) {
    const issues = [];
    
    // Check cyclomatic complexity
    const functionMatches = content.matchAll(/function\s+(\w+)\s*\([^)]*\)\s*{([^}]*)}/g);
    
    for (const match of functionMatches) {
      const functionName = match[1];
      const functionBody = match[2];
      
      // Count decision points
      const complexity = this.calculateCyclomaticComplexity(functionBody);
      
      if (complexity > 10) {
        issues.push({
          id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'high_complexity',
          file: filePath,
          line: this.getLineNumber(content, match.index),
          code: functionName,
          severity: PRIORITY_LEVELS.MEDIUM,
          suggestion: `Function '${functionName}' has high cyclomatic complexity (${complexity}). Consider refactoring.`,
          metrics: { complexity },
          timestamp: Date.now()
        });
      }
    }
    
    return issues;
  }

  /**
   * Calculate cyclomatic complexity
   */
  calculateCyclomaticComplexity(code) {
    let complexity = 1;
    
    // Count decision points
    const patterns = [
      /if\s*\(/g,
      /else\s+if\s*\(/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /case\s+/g,
      /catch\s*\(/g,
      /\?\s*[^:]+:/g, // ternary operator
      /&&/g,
      /\|\|/g
    ];
    
    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  /**
   * Analyze dependencies
   */
  analyzeDependencies(filePath, content) {
    const issues = [];
    
    // Check for circular dependencies
    const importMatches = content.matchAll(/import\s+.*from\s+['"]([^'"]+)['"]/g);
    const requireMatches = content.matchAll(/require\s*\(['"]([^'"]+)['"]\)/g);
    
    const dependencies = [];
    for (const match of [...importMatches, ...requireMatches]) {
      dependencies.push(match[1]);
    }
    
    // Check for suspicious patterns
    if (dependencies.length > 20) {
      issues.push({
        id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'too_many_dependencies',
        file: filePath,
        line: 1,
        severity: PRIORITY_LEVELS.LOW,
        suggestion: `File has ${dependencies.length} dependencies. Consider splitting into smaller modules.`,
        metrics: { dependencyCount: dependencies.length },
        timestamp: Date.now()
      });
    }
    
    return issues;
  }

  /**
   * Analyze async patterns
   */
  analyzeAsyncPatterns(filePath, content) {
    const issues = [];
    
    // Check for missing await
    const asyncFunctionMatches = content.matchAll(/async\s+function\s*\w*\s*\([^)]*\)\s*{([^}]*)}/g);
    
    for (const match of asyncFunctionMatches) {
      const functionBody = match[1];
      const promiseMatches = functionBody.matchAll(/(\w+)\s*\.\s*(then|catch|finally)\s*\(/g);
      
      for (const promiseMatch of promiseMatches) {
        const line = this.getLineNumber(content, match.index + promiseMatch.index);
        issues.push({
          id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'promise_in_async',
          file: filePath,
          line,
          severity: PRIORITY_LEVELS.LOW,
          suggestion: 'Consider using await instead of .then() in async function',
          timestamp: Date.now()
        });
      }
    }
    
    // Check for unhandled promises
    const unhandledPromises = content.matchAll(/new\s+Promise\s*\([^)]+\)(?!\s*\.\s*(then|catch))/g);
    
    for (const match of unhandledPromises) {
      issues.push({
        id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'unhandled_promise',
        file: filePath,
        line: this.getLineNumber(content, match.index),
        severity: PRIORITY_LEVELS.MEDIUM,
        suggestion: 'Promise created without .then() or .catch() handler',
        timestamp: Date.now()
      });
    }
    
    return issues;
  }

  /**
   * Get line number from index
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Get issue severity
   */
  getIssueSeverity(issueType) {
    const severityMap = {
      unusedVariables: PRIORITY_LEVELS.LOW,
      longFunctions: PRIORITY_LEVELS.MEDIUM,
      complexConditions: PRIORITY_LEVELS.MEDIUM,
      todoComments: PRIORITY_LEVELS.INFO,
      console: PRIORITY_LEVELS.LOW,
      hardcodedValues: PRIORITY_LEVELS.MEDIUM,
      high_complexity: PRIORITY_LEVELS.MEDIUM,
      too_many_dependencies: PRIORITY_LEVELS.LOW,
      promise_in_async: PRIORITY_LEVELS.LOW,
      unhandled_promise: PRIORITY_LEVELS.MEDIUM
    };
    
    return severityMap[issueType] || PRIORITY_LEVELS.INFO;
  }

  /**
   * Get suggestion for issue type
   */
  getSuggestion(issueType, match) {
    const suggestions = {
      unusedVariables: `Remove unused variable '${match[1] || 'variable'}'`,
      longFunctions: 'Consider breaking this function into smaller functions',
      complexConditions: 'Simplify this complex condition',
      todoComments: `Address TODO: ${match[0]}`,
      console: 'Remove console statement before production',
      hardcodedValues: `Extract '${match[0]}' to configuration`
    };
    
    return suggestions[issueType] || 'Review this code';
  }

  /**
   * Send current status
   */
  sendStatus() {
    const status = {
      totalIssues: Array.from(this.detectedIssues.values()).flat().length,
      issuesByType: {},
      issuesBySeverity: {},
      filesAnalyzed: this.fileCache.size,
      topIssues: []
    };
    
    // Count issues
    for (const issues of this.detectedIssues.values()) {
      for (const issue of issues) {
        // By type
        if (!status.issuesByType[issue.type]) {
          status.issuesByType[issue.type] = 0;
        }
        status.issuesByType[issue.type]++;
        
        // By severity
        if (!status.issuesBySeverity[issue.severity]) {
          status.issuesBySeverity[issue.severity] = 0;
        }
        status.issuesBySeverity[issue.severity]++;
      }
    }
    
    // Get top issues
    const allIssues = Array.from(this.detectedIssues.values()).flat();
    status.topIssues = allIssues
      .sort((a, b) => a.severity - b.severity)
      .slice(0, 10)
      .map(issue => ({
        type: issue.type,
        file: issue.file,
        line: issue.line,
        severity: issue.severity,
        suggestion: issue.suggestion
      }));
    
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
      case 'analyze_file':
        if (message.data.filePath) {
          const content = await fs.readFile(message.data.filePath, 'utf8');
          await this.analyzeFile(message.data.filePath, content);
        }
        break;
        
      case 'get_issues':
        return Array.from(this.detectedIssues.entries());
        
      case 'rescan':
        await this.performFullScan();
        break;
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
    
    console.log('[CodeAnalysisAgent] Stopped');
  }

  /**
   * Get analysis statistics
   */
  getStatistics() {
    const stats = {
      filesAnalyzed: this.fileCache.size,
      totalIssues: 0,
      issuesByType: {},
      issuesBySeverity: {},
      averageIssuesPerFile: 0
    };
    
    let totalIssues = 0;
    for (const issues of this.detectedIssues.values()) {
      totalIssues += issues.length;
      
      for (const issue of issues) {
        // By type
        if (!stats.issuesByType[issue.type]) {
          stats.issuesByType[issue.type] = 0;
        }
        stats.issuesByType[issue.type]++;
        
        // By severity
        if (!stats.issuesBySeverity[issue.severity]) {
          stats.issuesBySeverity[issue.severity] = 0;
        }
        stats.issuesBySeverity[issue.severity]++;
      }
    }
    
    stats.totalIssues = totalIssues;
    stats.averageIssuesPerFile = this.detectedIssues.size > 0 
      ? (totalIssues / this.detectedIssues.size).toFixed(2) 
      : 0;
    
    return stats;
  }
}
