#!/usr/bin/env node

/**
 * Start Debug Agents
 * Entry point for the multi-agent debugging system
 */

import { orchestrator } from './debug-agents/agent-orchestrator.js';
import { DebugDashboard } from './debug-agents/debug-dashboard.js';
import { DEBUG_CONFIG } from './debug-agents/config.js';

console.log(`
🌲 Forest Debug Agents System
============================
Starting multi-agent debugging system...
`);

async function startDebugAgents() {
  try {
    // Initialize orchestrator and all agents
    console.log('📦 Initializing agents...');
    await orchestrator.initialize();
    
    // Start all agents
    console.log('🚀 Starting agents...');
    await orchestrator.start();
    
    // Start dashboard if enabled
    if (DEBUG_CONFIG.dashboard.port) {
      console.log('🖥️  Starting dashboard...');
      const dashboard = new DebugDashboard(orchestrator);
      await dashboard.start();
      
      console.log(`
✅ Debug system started successfully!

📊 Dashboard: http://localhost:${DEBUG_CONFIG.dashboard.port}
📁 Reports: ${DEBUG_CONFIG.reporting.outputDir}/

Available Agents:
- 🔍 Error Detection: Monitoring log files for errors
- 📝 Code Analysis: Analyzing code quality and patterns
- 🧪 Test Coverage: Checking test completeness
- ⚡ Performance: Monitoring system performance
- 📦 Dependencies: Validating dependencies
- 🔧 Self-Healing: Auto-fixing common issues

Press Ctrl+C to stop the debug system.
`);
    }
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down debug system...');
      orchestrator.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      orchestrator.stop();
      process.exit(0);
    });
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught exception:', error);
      orchestrator.stop();
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
    });
    
  } catch (error) {
    console.error('❌ Failed to start debug system:', error);
    process.exit(1);
  }
}

// Command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node start-debug-agents.js [options]

Options:
  --help, -h          Show this help message
  --no-dashboard      Start without web dashboard
  --port <port>       Dashboard port (default: ${DEBUG_CONFIG.dashboard.port})
  --report-only       Generate a single report and exit
  --fix-only          Run self-healing fixes and exit
  --agent <name>      Run only specific agent(s)

Examples:
  node start-debug-agents.js
  node start-debug-agents.js --no-dashboard
  node start-debug-agents.js --port 3002
  node start-debug-agents.js --report-only
  node start-debug-agents.js --agent error_detection --agent performance
`);
  process.exit(0);
}

// Handle command line options
if (args.includes('--no-dashboard')) {
  DEBUG_CONFIG.dashboard.port = null;
}

if (args.includes('--port')) {
  const portIndex = args.indexOf('--port');
  if (portIndex < args.length - 1) {
    DEBUG_CONFIG.dashboard.port = parseInt(args[portIndex + 1]);
  }
}

if (args.includes('--report-only')) {
  // Generate single report and exit
  (async () => {
    await orchestrator.initialize();
    await orchestrator.start();
    
    console.log('📊 Generating report...');
    setTimeout(async () => {
      const report = await orchestrator.generateReport();
      console.log(`✅ Report generated: ${report.id}`);
      console.log(`📁 Saved to: ${DEBUG_CONFIG.reporting.outputDir}/`);
      orchestrator.stop();
      process.exit(0);
    }, 5000); // Wait 5 seconds for agents to collect data
  })();
} else if (args.includes('--fix-only')) {
  // Run fixes and exit
  (async () => {
    await orchestrator.initialize();
    await orchestrator.start();
    
    console.log('🔧 Running self-healing fixes...');
    setTimeout(() => {
      console.log('✅ Self-healing complete');
      orchestrator.stop();
      process.exit(0);
    }, 30000); // Run for 30 seconds
  })();
} else {
  // Normal operation
  startDebugAgents();
}
