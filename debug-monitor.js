#!/usr/bin/env node

/**
 * Forest Debug Monitor
 * Tracks system health and identifies stuck processes
 */

import { performance } from 'node:perf_hooks';
import { globalIntervalManager } from './utils/interval-manager.js';

const MONITOR_INTERVAL = 5000; // Check every 5 seconds
const STUCK_THRESHOLD = 30000; // Consider stuck after 30 seconds

class DebugMonitor {
  constructor() {
    this.operations = new Map();
    this.metrics = {
      startTime: Date.now(),
      totalOperations: 0,
      completedOperations: 0,
      stuckOperations: 0,
      averageTime: 0
    };
  }

  startOperation(name, metadata = {}) {
    const id = `${name}_${Date.now()}_${Math.random()}`;
    this.operations.set(id, {
      name,
      startTime: performance.now(),
      metadata,
      status: 'running'
    });
    this.metrics.totalOperations++;
    return id;
  }

  endOperation(id, status = 'completed') {
    const op = this.operations.get(id);
    if (!op) return;
    
    op.endTime = performance.now();
    op.duration = op.endTime - op.startTime;
    op.status = status;
    
    if (status === 'completed') {
      this.metrics.completedOperations++;
      this.updateAverageTime(op.duration);
    }
    
    // Keep last 100 operations for history
    if (this.operations.size > 100) {
      const oldestKey = this.operations.keys().next().value;
      this.operations.delete(oldestKey);
    }
  }

  updateAverageTime(duration) {
    const total = this.metrics.averageTime * (this.metrics.completedOperations - 1) + duration;
    this.metrics.averageTime = total / this.metrics.completedOperations;
  }

  checkStuckOperations() {
    const now = performance.now();
    const stuck = [];
    
    for (const [id, op] of this.operations) {
      if (op.status === 'running') {
        const elapsed = now - op.startTime;
        if (elapsed > STUCK_THRESHOLD) {
          stuck.push({
            id,
            name: op.name,
            elapsed: Math.round(elapsed / 1000),
            metadata: op.metadata
          });
        }
      }
    }
    
    this.metrics.stuckOperations = stuck.length;
    return stuck;
  }

  getReport() {
    const stuck = this.checkStuckOperations();
    const intervals = globalIntervalManager.getStatus();
    
    return {
      uptime: Math.round((Date.now() - this.metrics.startTime) / 1000),
      metrics: this.metrics,
      stuckOperations: stuck,
      runningOperations: Array.from(this.operations.values())
        .filter(op => op.status === 'running')
        .map(op => ({
          name: op.name,
          elapsed: Math.round((performance.now() - op.startTime) / 1000),
          metadata: op.metadata
        })),
      intervals: intervals,
      memoryUsage: process.memoryUsage()
    };
  }

  startMonitoring() {
    globalIntervalManager.setInterval('debug-monitor', () => {
      const report = this.getReport();
      
      if (report.stuckOperations.length > 0) {
        console.error('⚠️  STUCK OPERATIONS DETECTED:');
        report.stuckOperations.forEach(op => {
          console.error(`  - ${op.name}: stuck for ${op.elapsed}s`, op.metadata);
        });
      }
      
      // Log summary
      console.log(`[Monitor] Uptime: ${report.uptime}s | Running: ${report.runningOperations.length} | Stuck: ${report.stuckOperations.length} | Memory: ${Math.round(report.memoryUsage.heapUsed / 1024 / 1024)}MB`);
    }, MONITOR_INTERVAL);
  }

  stopMonitoring() {
    globalIntervalManager.clear('debug-monitor');
  }
}

// Export global monitor instance
export const debugMonitor = new DebugMonitor();

// Start monitoring if run directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  console.log('🔍 Starting Forest Debug Monitor...');
  debugMonitor.startMonitoring();
  
  // Keep process alive
  process.stdin.resume();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down monitor...');
    debugMonitor.stopMonitoring();
    globalIntervalManager.clearAll();
    process.exit(0);
  });
}
