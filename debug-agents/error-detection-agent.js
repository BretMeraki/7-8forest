/**
 * Error Detection Agent
 * Monitors logs and detects errors in real-time
 */

import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import path from 'path';
import { DEBUG_CONFIG, PRIORITY_LEVELS, SEVERITY_MAP } from './config.js';
import { agentCommunication } from './agent-communication.js';

export class ErrorDetectionAgent {
  constructor() {
    this.agentId = 'error_detection';
    this.config = DEBUG_CONFIG.agents.errorDetection;
    this.detectedErrors = new Map();
    this.fileWatchers = new Map();
    this.lastPositions = new Map();
    this.isRunning = false;
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    agentCommunication.registerAgent(this.agentId, this);
    console.log('[ErrorDetectionAgent] Initializing...');
    
    // Initialize last positions for log files
    for (const logFile of this.config.logFiles) {
      try {
        const stats = await fs.stat(logFile);
        this.lastPositions.set(logFile, stats.size);
      } catch (error) {
        this.lastPositions.set(logFile, 0);
      }
    }
    
    console.log('[ErrorDetectionAgent] Initialized');
  }

  /**
   * Start monitoring
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log('[ErrorDetectionAgent] Starting error detection...');
    
    // Start monitoring each log file
    for (const logFile of this.config.logFiles) {
      this.monitorLogFile(logFile);
    }
    
    // Start periodic scan
    this.scanInterval = setInterval(() => {
      this.performScan();
    }, this.config.scanInterval);
    
    // Send initial status
    this.sendStatus();
  }

  /**
   * Monitor a specific log file
   */
  async monitorLogFile(logFile) {
    try {
      const fullPath = path.resolve(logFile);
      
      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        console.log(`[ErrorDetectionAgent] Log file not found: ${logFile}`);
        return;
      }
      
      // Watch for changes
      const watcher = fs.watch(fullPath, async (eventType) => {
        if (eventType === 'change') {
          await this.checkNewContent(fullPath);
        }
      });
      
      this.fileWatchers.set(logFile, watcher);
      console.log(`[ErrorDetectionAgent] Monitoring: ${logFile}`);
      
    } catch (error) {
      console.error(`[ErrorDetectionAgent] Failed to monitor ${logFile}:`, error);
    }
  }

  /**
   * Check new content in a log file
   */
  async checkNewContent(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const lastPosition = this.lastPositions.get(filePath) || 0;
      
      if (stats.size > lastPosition) {
        // Read only new content
        const stream = createReadStream(filePath, {
          start: lastPosition,
          end: stats.size
        });
        
        const rl = createInterface({
          input: stream,
          crlfDelay: Infinity
        });
        
        for await (const line of rl) {
          await this.analyzeLine(line, filePath);
        }
        
        this.lastPositions.set(filePath, stats.size);
      }
    } catch (error) {
      console.error(`[ErrorDetectionAgent] Error reading ${filePath}:`, error);
    }
  }

  /**
   * Analyze a log line for errors
   */
  async analyzeLine(line, source) {
    if (!line.trim()) return;
    
    for (const pattern of this.config.errorPatterns) {
      if (pattern.test(line)) {
        const error = {
          id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          source,
          line,
          pattern: pattern.toString(),
          timestamp: Date.now(),
          severity: this.determineSeverity(line),
          context: await this.extractContext(line, source)
        };
        
        // Store error
        this.detectedErrors.set(error.id, error);
        
        // Notify other agents
        agentCommunication.sendMessage(
          this.agentId,
          'broadcast',
          DEBUG_CONFIG.communication.eventTypes.ERROR_DETECTED,
          error,
          error.severity
        );
        
        console.log(`[ErrorDetectionAgent] Error detected: ${error.severity} - ${line.substring(0, 100)}...`);
        break;
      }
    }
  }

  /**
   * Determine error severity
   */
  determineSeverity(line) {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('fatal') || lowerLine.includes('crash')) {
      return PRIORITY_LEVELS.CRITICAL;
    } else if (lowerLine.includes('error') || lowerLine.includes('exception')) {
      return PRIORITY_LEVELS.HIGH;
    } else if (lowerLine.includes('warning') || lowerLine.includes('warn')) {
      return PRIORITY_LEVELS.MEDIUM;
    } else if (lowerLine.includes('deprecated')) {
      return PRIORITY_LEVELS.LOW;
    }
    
    return PRIORITY_LEVELS.INFO;
  }

  /**
   * Extract context around an error
   */
  async extractContext(errorLine, source) {
    const context = {
      stackTrace: null,
      relatedFiles: [],
      functionName: null,
      lineNumber: null
    };
    
    // Extract stack trace if present
    const stackMatch = errorLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (stackMatch) {
      context.functionName = stackMatch[1];
      context.relatedFiles.push(stackMatch[2]);
      context.lineNumber = parseInt(stackMatch[3]);
    }
    
    // Extract file references
    const fileMatches = errorLine.matchAll(/([a-zA-Z0-9_\-./]+\.(js|ts|json))/g);
    for (const match of fileMatches) {
      if (!context.relatedFiles.includes(match[1])) {
        context.relatedFiles.push(match[1]);
      }
    }
    
    return context;
  }

  /**
   * Perform periodic scan
   */
  async performScan() {
    agentCommunication.heartbeat(this.agentId);
    
    // Clean up old errors (older than 1 hour)
    const oneHourAgo = Date.now() - 3600000;
    for (const [id, error] of this.detectedErrors) {
      if (error.timestamp < oneHourAgo) {
        this.detectedErrors.delete(id);
      }
    }
    
    // Send status update
    this.sendStatus();
  }

  /**
   * Send current status
   */
  sendStatus() {
    const status = {
      totalErrors: this.detectedErrors.size,
      errorsBySeverity: {},
      recentErrors: [],
      monitoredFiles: Array.from(this.fileWatchers.keys())
    };
    
    // Count errors by severity
    for (const level of Object.values(PRIORITY_LEVELS)) {
      status.errorsBySeverity[level] = 0;
    }
    
    for (const error of this.detectedErrors.values()) {
      status.errorsBySeverity[error.severity]++;
    }
    
    // Get recent errors
    const recentErrors = Array.from(this.detectedErrors.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
    
    status.recentErrors = recentErrors.map(err => ({
      id: err.id,
      severity: err.severity,
      source: err.source,
      preview: err.line.substring(0, 100),
      timestamp: err.timestamp
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
      case 'get_errors':
        return Array.from(this.detectedErrors.values());
      
      case 'clear_errors':
        this.detectedErrors.clear();
        console.log('[ErrorDetectionAgent] Errors cleared');
        break;
        
      case 'add_pattern':
        if (message.data.pattern) {
          this.config.errorPatterns.push(new RegExp(message.data.pattern, 'i'));
          console.log(`[ErrorDetectionAgent] Added pattern: ${message.data.pattern}`);
        }
        break;
    }
  }

  /**
   * Stop the agent
   */
  stop() {
    this.isRunning = false;
    
    // Clear interval
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    
    // Close file watchers
    for (const watcher of this.fileWatchers.values()) {
      watcher.close();
    }
    
    console.log('[ErrorDetectionAgent] Stopped');
  }

  /**
   * Get error statistics
   */
  getStatistics() {
    const stats = {
      totalErrors: this.detectedErrors.size,
      errorsBySeverity: {},
      errorsBySource: {},
      errorRate: 0
    };
    
    // Initialize counters
    for (const level of Object.values(PRIORITY_LEVELS)) {
      stats.errorsBySeverity[level] = 0;
    }
    
    // Count errors
    for (const error of this.detectedErrors.values()) {
      stats.errorsBySeverity[error.severity]++;
      
      if (!stats.errorsBySource[error.source]) {
        stats.errorsBySource[error.source] = 0;
      }
      stats.errorsBySource[error.source]++;
    }
    
    // Calculate error rate (errors per minute)
    const timeRange = 60000; // 1 minute
    const recentErrors = Array.from(this.detectedErrors.values())
      .filter(err => err.timestamp > Date.now() - timeRange);
    stats.errorRate = recentErrors.length;
    
    return stats;
  }
}
