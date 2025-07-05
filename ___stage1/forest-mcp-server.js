import { CoreInitialization } from './core-initialization.js';
import { StdioServerTransport } from './local-stdio-transport.js';
import fs from 'node:fs';
import path from 'node:path';

// Suppress global EPIPE errors on stderr once the pipe is closed
process.stderr.on('error', (err) => {
  if (err && err.code === 'EPIPE') {
    // Disable further writes to stderr silently
    process.stderr.write = () => {};
  }
});

// Enhanced logging: write to stderr AND dedicated log file
const logDir = process.env.FOREST_DATA_DIR || path.resolve('.', '.forest-data');
const logFile = path.join(logDir, 'forest-mcp.log');
try {
  fs.mkdirSync(logDir, { recursive: true });
} catch (_) { /* ignore */ }

function writeLogLine(line) {
  const str = `${new Date().toISOString()} ${line}\n`;
  // stderr so orchestrator / terminal picks it up
  try {
    process.stderr.write(str);
  } catch (err) {
    // Ignore broken pipe errors (parent process may have closed stderr)
    if (err && err.code !== 'EPIPE') throw err;
  }
  // persist to file for later inspection
  try {
    fs.appendFileSync(logFile, str);
  } catch (err) {
    // intentional no-op – avoid crashing on logging failure
  }
}

console.log = (...args) => writeLogLine(args.map(String).join(' '));
function logError(...args) {
  writeLogLine(args.map(a => (a && a.stack) ? a.stack : String(a)).join(' '));
}

let coreInitInstance = null;

async function main() {
  try {
    logError('Starting Forest MCP server initialization...');
    
    coreInitInstance = new CoreInitialization();
    await coreInitInstance.initialize();
    
    const server = coreInitInstance.server;
    if (!server) {
      logError('Server instance not found after initialization.');
      process.exit(1);
    }
    
    const transport = new StdioServerTransport();
    transport.connect(server);
    logError('Forest MCP server started successfully.');
    
    // Keep the process alive as long as stdin is open
    process.stdin.resume();
    
    // Add a heartbeat to keep the process responsive
    setInterval(() => {
      // Silent heartbeat - just to keep event loop active
    }, 30000);
    
  } catch (err) {
    logError('Fatal error during startup:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

function setupGracefulShutdown() {
  let shutdownInProgress = false;
  
  const shutdown = async (signal) => {
    if (shutdownInProgress) {
      logError(`Shutdown already in progress, ignoring ${signal}`);
      return;
    }
    
    shutdownInProgress = true;
    logError(`Received ${signal}, shutting down Forest MCP server...`);
    
    // Set a timeout to force exit if shutdown takes too long
    const forceExitTimeout = setTimeout(() => {
      logError('Shutdown timeout reached, forcing exit');
      process.exit(1);
    }, 30000); // 30 second timeout
    
    try {
      if (coreInitInstance && typeof coreInitInstance.shutdown === 'function') {
        await Promise.race([
          coreInitInstance.shutdown(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Shutdown timeout')), 25000))
        ]);
        logError('Shutdown complete.');
      }
    } catch (err) {
      logError('Error during shutdown:', err && err.stack ? err.stack : err);
    } finally {
      clearTimeout(forceExitTimeout);
      process.exit(0);
    }
  };

  // Handle uncaught exceptions – treat EPIPE as non-fatal
  process.on('uncaughtException', (error) => {
    const isEpipe = error && (
      error.code === 'EPIPE' ||
      (typeof error.message === 'string' && (error.message.includes('EPIPE') || error.message.toLowerCase().includes('broken pipe')))
    );

    if (isEpipe) {
      // Expected when the client disconnects; log and continue running.
      logError('Non-fatal EPIPE exception caught, continuing operation:', error.message || error);
      return; // do NOT shut down the server
    }

    logError('Uncaught Exception:', error.stack || error);
    shutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}


// Fix for Windows path compatibility with ES modules
const isMainModule = () => {
  const currentFile = import.meta.url;
  const scriptFile = `file:///${process.argv[1].replace(/\\/g, '/')}`;
  return currentFile === scriptFile || process.argv[1].endsWith('forest-mcp-server.js');
};

if (isMainModule()) {
  setupGracefulShutdown();
  main();
}
