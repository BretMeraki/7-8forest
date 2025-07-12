/**
 * Performance Agent
 * Monitors and analyzes performance metrics
 */

import { performance } from 'perf_hooks';
import os from 'os';
import { DEBUG_CONFIG, PRIORITY_LEVELS } from './config.js';
import { agentCommunication } from './agent-communication.js';

export class PerformanceAgent {
  constructor() {
    this.agentId = 'performance';
    this.config = DEBUG_CONFIG.agents.performance;
    this.metrics = {
      cpu: [],
      memory: [],
      responseTime: [],
      throughput: [],
      errors: []
    };
    this.performanceMarks = new Map();
    this.isRunning = false;
    this.baselineMetrics = null;
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    agentCommunication.registerAgent(this.agentId, this);
    console.log('[PerformanceAgent] Initializing...');
    
    // Establish baseline metrics
    this.baselineMetrics = await this.collectSystemMetrics();
    
    // Set up performance observers
    this.setupPerformanceObservers();
    
    console.log('[PerformanceAgent] Initialized');
  }

  /**
   * Start monitoring
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log('[PerformanceAgent] Starting performance monitoring...');
    
    // Start periodic monitoring
    this.monitorInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitorInterval);
    
    // Start analysis interval
    this.analysisInterval = setInterval(() => {
      this.analyzePerformance();
    }, 30000); // Every 30 seconds
    
    // Send initial status
    this.sendStatus();
  }

  /**
   * Set up performance observers
   */
  setupPerformanceObservers() {
    // Monitor function execution times
    const obs = new PerformanceObserver((items) => {
      items.getEntries().forEach((entry) => {
        this.recordPerformanceEntry(entry);
      });
    });
    
    obs.observe({ entryTypes: ['measure', 'function'] });
    this.performanceObserver = obs;
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const loadAverage = os.loadavg();
    
    // Calculate CPU usage
    const cpuUsage = this.calculateCPUUsage(cpus);
    
    return {
      timestamp: Date.now(),
      cpu: {
        usage: cpuUsage,
        loadAverage: loadAverage[0], // 1 minute average
        cores: cpus.length
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: totalMemory - freeMemory,
        usagePercent: ((totalMemory - freeMemory) / totalMemory) * 100
      },
      process: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };
  }

  /**
   * Calculate CPU usage percentage
   */
  calculateCPUUsage(cpus) {
    if (!this.lastCPUInfo) {
      this.lastCPUInfo = cpus;
      return 0;
    }
    
    let totalDiff = 0;
    let idleDiff = 0;
    
    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      const lastCpu = this.lastCPUInfo[i];
      
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const lastTotal = Object.values(lastCpu.times).reduce((a, b) => a + b, 0);
      
      totalDiff += total - lastTotal;
      idleDiff += cpu.times.idle - lastCpu.times.idle;
    }
    
    this.lastCPUInfo = cpus;
    
    const usage = 100 - (100 * idleDiff / totalDiff);
    return Math.round(usage * 100) / 100;
  }

  /**
   * Collect metrics
   */
  async collectMetrics() {
    agentCommunication.heartbeat(this.agentId);
    
    const metrics = await this.collectSystemMetrics();
    
    // Store metrics (keep last 100 entries)
    this.metrics.cpu.push(metrics.cpu.usage);
    this.metrics.memory.push(metrics.memory.usagePercent);
    
    // Trim old data
    Object.keys(this.metrics).forEach(key => {
      if (this.metrics[key].length > 100) {
        this.metrics[key].shift();
      }
    });
    
    // Check for performance issues
    this.checkPerformanceThresholds(metrics);

    // Broadcast updated health status for dashboard/orchestrator
    this.sendStatus();
  }

  /**
   * Check performance thresholds
   */
  checkPerformanceThresholds(metrics) {
    const issues = [];
    
    // Check CPU usage
    if (metrics.cpu.usage > this.config.thresholds.cpuUsagePercent) {
      issues.push({
        type: 'high_cpu_usage',
        value: metrics.cpu.usage,
        threshold: this.config.thresholds.cpuUsagePercent,
        severity: PRIORITY_LEVELS.HIGH
      });
    }
    
    // Check memory usage
    const memoryUsageMB = metrics.process.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > this.config.thresholds.memoryUsageMB) {
      issues.push({
        type: 'high_memory_usage',
        value: memoryUsageMB,
        threshold: this.config.thresholds.memoryUsageMB,
        severity: PRIORITY_LEVELS.HIGH
      });
    }
    
    // Check system memory
    if (metrics.memory.usagePercent > 90) {
      issues.push({
        type: 'system_memory_critical',
        value: metrics.memory.usagePercent,
        threshold: 90,
        severity: PRIORITY_LEVELS.CRITICAL
      });
    }
    
    // Notify about issues
    for (const issue of issues) {
      agentCommunication.sendMessage(
        this.agentId,
        'broadcast',
        DEBUG_CONFIG.communication.eventTypes.PERFORMANCE_ALERT,
        issue,
        issue.severity
      );
    }
  }

  /**
   * Record performance entry
   */
  recordPerformanceEntry(entry) {
    if (entry.duration > this.config.thresholds.responseTimeMs) {
      // Slow operation detected
      agentCommunication.sendMessage(
        this.agentId,
        'broadcast',
        DEBUG_CONFIG.communication.eventTypes.PERFORMANCE_ALERT,
        {
          type: 'slow_operation',
          name: entry.name,
          duration: entry.duration,
          threshold: this.config.thresholds.responseTimeMs,
          severity: PRIORITY_LEVELS.MEDIUM
        },
        PRIORITY_LEVELS.MEDIUM
      );
    }
    
    // Store response time
    this.metrics.responseTime.push({
      name: entry.name,
      duration: entry.duration,
      timestamp: Date.now()
    });
  }

  /**
   * Analyze performance trends
   */
  analyzePerformance() {
    const analysis = {
      trends: {},
      anomalies: [],
      recommendations: []
    };
    
    // Analyze CPU trend
    if (this.metrics.cpu.length > 10) {
      const cpuTrend = this.calculateTrend(this.metrics.cpu);
      analysis.trends.cpu = cpuTrend;
      
      if (cpuTrend.direction === 'increasing' && cpuTrend.slope > 0.5) {
        analysis.anomalies.push({
          type: 'cpu_usage_increasing',
          trend: cpuTrend,
          severity: PRIORITY_LEVELS.MEDIUM
        });
        analysis.recommendations.push('CPU usage is steadily increasing. Check for CPU-intensive operations or infinite loops.');
      }
    }
    
    // Analyze memory trend
    if (this.metrics.memory.length > 10) {
      const memoryTrend = this.calculateTrend(this.metrics.memory);
      analysis.trends.memory = memoryTrend;
      
      if (memoryTrend.direction === 'increasing' && memoryTrend.slope > 0.3) {
        analysis.anomalies.push({
          type: 'memory_leak_suspected',
          trend: memoryTrend,
          severity: PRIORITY_LEVELS.HIGH
        });
        analysis.recommendations.push('Possible memory leak detected. Memory usage is continuously increasing.');
      }
    }
    
    // Analyze response times
    if (this.metrics.responseTime.length > 0) {
      const recentResponseTimes = this.metrics.responseTime.slice(-50);
      const avgResponseTime = recentResponseTimes.reduce((sum, rt) => sum + rt.duration, 0) / recentResponseTimes.length;
      
      analysis.trends.responseTime = {
        average: avgResponseTime,
        max: Math.max(...recentResponseTimes.map(rt => rt.duration)),
        min: Math.min(...recentResponseTimes.map(rt => rt.duration))
      };
      
      if (avgResponseTime > this.config.thresholds.responseTimeMs) {
        analysis.anomalies.push({
          type: 'slow_response_times',
          average: avgResponseTime,
          severity: PRIORITY_LEVELS.MEDIUM
        });
        analysis.recommendations.push('Average response time is above threshold. Consider optimizing slow operations.');
      }
    }
    
    // Check for performance degradation
    if (this.baselineMetrics) {
      const currentMetrics = this.getAverageMetrics();
      const degradation = this.checkDegradation(this.baselineMetrics, currentMetrics);
      
      if (degradation.length > 0) {
        analysis.anomalies.push(...degradation);
        analysis.recommendations.push('Performance has degraded compared to baseline. Review recent changes.');
      }
    }
    
    // Send analysis if anomalies found
    if (analysis.anomalies.length > 0) {
      agentCommunication.sendMessage(
        this.agentId,
        'orchestrator',
        'performance_analysis',
        analysis,
        PRIORITY_LEVELS.MEDIUM
      );
    }
    
    return analysis;
  }

  /**
   * Calculate trend from data points
   */
  calculateTrend(data) {
    if (data.length < 2) {
      return { direction: 'stable', slope: 0 };
    }
    
    // Simple linear regression
    const n = data.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * data[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return {
      direction: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
      slope: Math.round(slope * 100) / 100,
      intercept: Math.round(intercept * 100) / 100
    };
  }

  /**
   * Get average metrics
   */
  getAverageMetrics() {
    return {
      cpu: {
        usage: this.metrics.cpu.length > 0 
          ? this.metrics.cpu.reduce((a, b) => a + b, 0) / this.metrics.cpu.length 
          : 0
      },
      memory: {
        usagePercent: this.metrics.memory.length > 0
          ? this.metrics.memory.reduce((a, b) => a + b, 0) / this.metrics.memory.length
          : 0
      }
    };
  }

  /**
   * Check for performance degradation
   */
  checkDegradation(baseline, current) {
    const degradation = [];
    
    // Check CPU degradation
    const cpuIncrease = ((current.cpu.usage - baseline.cpu.usage) / baseline.cpu.usage) * 100;
    if (cpuIncrease > 50) {
      degradation.push({
        type: 'cpu_degradation',
        baseline: baseline.cpu.usage,
        current: current.cpu.usage,
        increase: cpuIncrease,
        severity: PRIORITY_LEVELS.MEDIUM
      });
    }
    
    // Check memory degradation
    const memoryIncrease = ((current.memory.usagePercent - baseline.memory.usagePercent) / baseline.memory.usagePercent) * 100;
    if (memoryIncrease > 50) {
      degradation.push({
        type: 'memory_degradation',
        baseline: baseline.memory.usagePercent,
        current: current.memory.usagePercent,
        increase: memoryIncrease,
        severity: PRIORITY_LEVELS.MEDIUM
      });
    }
    
    return degradation;
  }

  /**
   * Profile a specific operation
   */
  async profileOperation(name, operation) {
    const startMark = `${name}_start`;
    const endMark = `${name}_end`;
    const measureName = `${name}_duration`;
    
    performance.mark(startMark);
    const startMemory = process.memoryUsage();
    const startCPU = process.cpuUsage();
    
    try {
      const result = await operation();
      
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);
      
      const endMemory = process.memoryUsage();
      const endCPU = process.cpuUsage();
      
      const profile = {
        name,
        duration: performance.getEntriesByName(measureName)[0].duration,
        memory: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external
        },
        cpu: {
          user: (endCPU.user - startCPU.user) / 1000, // Convert to ms
          system: (endCPU.system - startCPU.system) / 1000
        },
        timestamp: Date.now()
      };
      
      // Store profile
      this.performanceMarks.set(name, profile);
      
      // Clean up marks
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(measureName);
      
      return { result, profile };
      
    } catch (error) {
      performance.clearMarks(startMark);
      throw error;
    }
  }

  /**
   * Get performance bottlenecks
   */
  getBottlenecks() {
    const bottlenecks = [];
    
    // Analyze response times
    const slowOperations = this.metrics.responseTime
      .filter(rt => rt.duration > this.config.thresholds.responseTimeMs)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    if (slowOperations.length > 0) {
      bottlenecks.push({
        type: 'slow_operations',
        operations: slowOperations,
        recommendation: 'Optimize these operations or add caching'
      });
    }
    
    // Analyze profiled operations
    const profiledOps = Array.from(this.performanceMarks.values())
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
    
    for (const op of profiledOps) {
      if (op.duration > 1000) {
        bottlenecks.push({
          type: 'slow_profiled_operation',
          operation: op.name,
          duration: op.duration,
          memory: op.memory,
          cpu: op.cpu,
          recommendation: `Operation '${op.name}' takes ${op.duration.toFixed(2)}ms`
        });
      }
    }
    
    return bottlenecks;
  }

  /**
   * Send current status
   */
  sendStatus() {
    const currentMetrics = this.getAverageMetrics();
    const bottlenecks = this.getBottlenecks();
    
    const status = {
      metrics: {
        cpu: {
          current: this.metrics.cpu[this.metrics.cpu.length - 1] || 0,
          average: currentMetrics.cpu.usage,
          trend: this.metrics.cpu.length > 10 ? this.calculateTrend(this.metrics.cpu).direction : 'unknown'
        },
        memory: {
          current: this.metrics.memory[this.metrics.memory.length - 1] || 0,
          average: currentMetrics.memory.usagePercent,
          trend: this.metrics.memory.length > 10 ? this.calculateTrend(this.metrics.memory).direction : 'unknown'
        },
        responseTime: {
          count: this.metrics.responseTime.length,
          average: this.metrics.responseTime.length > 0
            ? this.metrics.responseTime.reduce((sum, rt) => sum + rt.duration, 0) / this.metrics.responseTime.length
            : 0
        }
      },
      bottlenecks: bottlenecks.slice(0, 3),
      alerts: []
    };
    
    // Add alerts
    if (status.metrics.cpu.current > this.config.thresholds.cpuUsagePercent) {
      status.alerts.push(`High CPU usage: ${status.metrics.cpu.current.toFixed(1)}%`);
    }
    
    if (status.metrics.memory.current > 80) {
      status.alerts.push(`High memory usage: ${status.metrics.memory.current.toFixed(1)}%`);
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
      case 'profile_operation':
        if (message.data.name && message.data.operation) {
          return await this.profileOperation(message.data.name, message.data.operation);
        }
        break;
        
      case 'get_metrics':
        return {
          current: await this.collectSystemMetrics(),
          history: this.metrics,
          analysis: this.analyzePerformance()
        };
        
      case 'get_bottlenecks':
        return this.getBottlenecks();
        
      case 'reset_baseline':
        this.baselineMetrics = await this.collectSystemMetrics();
        console.log('[PerformanceAgent] Baseline reset');
        break;
    }
  }

  /**
   * Stop the agent
   */
  stop() {
    this.isRunning = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    console.log('[PerformanceAgent] Stopped');
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const stats = {
      monitoring: {
        duration: this.isRunning ? Date.now() - (this.startTime || Date.now()) : 0,
        dataPoints: {
          cpu: this.metrics.cpu.length,
          memory: this.metrics.memory.length,
          responseTime: this.metrics.responseTime.length
        }
      },
      current: this.getAverageMetrics(),
      trends: {
        cpu: this.metrics.cpu.length > 10 ? this.calculateTrend(this.metrics.cpu) : null,
        memory: this.metrics.memory.length > 10 ? this.calculateTrend(this.metrics.memory) : null
      },
      bottlenecks: this.getBottlenecks().length,
      profiledOperations: this.performanceMarks.size
    };
    
    return stats;
  }
}
