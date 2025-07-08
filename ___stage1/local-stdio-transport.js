/**
 * Local StdioServerTransport implementation
 * Replaces the problematic MCP SDK import with a working implementation
 */

// Redirect all default console.* methods to stderr with a safe prefix so that
// no raw JSON ever leaks to stdout (which would confuse the JSON-RPC client).
// We do this once at module load time.
import util from 'util';
import { once } from 'events';

// Suppress EPIPE errors on stderr and stdout globally for transport too
const disableWrite = (streamName) => {
  return () => {
    /* no-op after EPIPE */
  };
};

process.stderr.on('error', (err) => {
  if (err && err.code === 'EPIPE') {
    process.stderr.write = disableWrite('stderr');
  }
});

process.stdout.on('error', (err) => {
  if (err && err.code === 'EPIPE') {
    process.stdout.write = disableWrite('stdout');
  }
});

import fs from 'fs';
import path from 'path';

const logFilePath = path.resolve(process.env.FOREST_DATA_DIR || '.forest-data', 'forest-mcp.log');

const originalStderrWrite = process.stderr.write.bind(process.stderr);
function safeLog(...args) {
  // Build a single line; inspect objects so they are printed but never pure JSON.
  const formatted = args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      // util.inspect avoids JSON.stringify returning raw JSON (which may be parsed by client)
      return util.inspect(arg, { depth: 5, colors: false, compact: true });
    })
    .join(' ');
  try {
    originalStderrWrite(`[forest-log] ${formatted}\n`);
  } catch (err) {
    if (err && err.code !== 'EPIPE') throw err;
    // Silently ignore EPIPE once stderr is closed
  }
  // Always persist to file for post-mortem analysis
  try {
    fs.appendFileSync(logFilePath, `${new Date().toISOString()} ${formatted}\n`);
  } catch (_) { /* ignore */ }
}

console.log = safeLog;
console.info = safeLog;
console.debug = safeLog;
console.warn = safeLog;
console.error = safeLog;

// Helper to emit JSON-RPC responses on stdout (console.log is redirected to stderr)
// Adds robust handling for asynchronous EPIPE errors that can occur when the
// client disconnects before the response is flushed.
let stdoutClosed = false;
const writeJsonResponse = (obj) => {
  if (stdoutClosed) return; // Skip once stdout is known to be broken

  // Fast-fail if the underlying stream has already been destroyed or closed
  if (process.stdout.destroyed || process.stdout.writable === false) {
    stdoutClosed = true;
    console.error('[StdioTransport] Stdout not writable – further responses suppressed');
    return;
  }

  const jsonString = JSON.stringify(obj) + '\n';

  // One-time error handler in case an asynchronous EPIPE is emitted
  const onError = (err) => {
    if (err && err.code === 'EPIPE') {
      stdoutClosed = true;
      process.stdout.write = disableWrite('stdout'); // permanently silence stdout
      console.error('[StdioTransport] Stdout closed (async EPIPE) – further responses suppressed');
    } else if (err) {
      console.error('[StdioTransport] Error writing JSON response:', err.message || err);
    }
  };

  // Attach temporary listener to capture any async write errors
  process.stdout.once('error', onError);

  try {
    // Use callback form so that errors surfaced via callback are caught
    process.stdout.write(jsonString, (err) => {
      if (process.stdout.off) {
        process.stdout.off('error', onError);
      } else {
        process.stdout.removeListener('error', onError);
      } // cleanup listener
      if (err) onError(err);
    });
  } catch (err) {
    if (process.stdout.off) {
        process.stdout.off('error', onError);
      } else {
        process.stdout.removeListener('error', onError);
      }
    onError(err); // handle synchronous errors
  }
};

export class StdioServerTransport {
  constructor() {
    this.server = null;
  }

  connect(server) {
    this.server = server;
    console.error('[StdioTransport] Connected to server');
    
    // Set up basic MCP communication
    this.setupStdioHandling();
  }

  setupStdioHandling() {
    // Basic stdin/stdout handling for MCP protocol
    process.stdin.setEncoding('utf8');
    
    let buffer = '';
    process.stdin.on('data', (chunk) => {
      buffer += chunk;
      
      // Process complete lines
      let lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) {
          this.handleMessage(line.trim());
        }
      }
    });

    process.stdin.on('end', () => {
      if (buffer.trim()) {
        this.handleMessage(buffer.trim());
      }
    });
  }

  async handleMessage(message) {
    try {
      const request = JSON.parse(message);
      console.error('[StdioTransport] Received message:', request.method || 'unknown');

      // Validate basic JSON-RPC structure
      if (!request.jsonrpc || request.jsonrpc !== '2.0') {
        throw new Error('Invalid JSON-RPC version or missing jsonrpc field');
      }

      // For requests, we need either an id or it's a notification
      if (request.method && request.id === undefined && !request.method.startsWith('notifications/')) {
        throw new Error('Missing id field for JSON-RPC request');
      }

      let responsePayload;
      try {
        if (request.method === 'initialize') {
          // Standard MCP initialize response - include tools list for compatibility
          const tools = this.server?.mcpCore?.getToolDefinitions ? await this.server.mcpCore.getToolDefinitions() : [];
          responsePayload = {
            serverInfo: this.server?.getServerInfo?.() || { name: 'forest-mcp-server', version: '1.0.0' },
            capabilities: { tools: {} },
            protocolVersion: '2024-11-05',
            tools
          };
        } else if (request.method === 'tools/list') {
          // Return tools list when specifically requested
          const tools = this.server?.mcpCore?.getToolDefinitions ? await this.server.mcpCore.getToolDefinitions() : [];
          console.error(`[StdioTransport] Returning ${tools.length} tools to client`);
          responsePayload = {
            tools
          };
        } else if (request.method === 'resources/list') {
          // Return empty resources list - we don't support resources yet
          responsePayload = {
            resources: []
          };
        } else if (request.method === 'prompts/list') {
          // Return empty prompts list - we don't support prompts yet
          responsePayload = {
            prompts: []
          };
        } else if (request.method === 'notifications/initialized') {
          // Handle initialized notification - no response needed for notifications
          return;
        } else if (request.method === 'notifications/cancelled') {
          // Handle cancelled notification - no response needed for notifications
          return;
        } else if (request.method && request.method.startsWith('notifications/')) {
          // Handle any other notification - no response needed for notifications
          console.error(`[StdioTransport] Received notification: ${request.method}`);
          return;
        } else if (request.method === 'tools/call') {
          // Standard MCP tools/call request
          const { name, arguments: args } = request.params || {};
          console.error(`[StdioTransport] Tool call: ${name}`);
          const result = await this.server.mcpCore.handleToolCall(name, args || {});
          responsePayload = result;
        } else if (request.method && request.method.startsWith('tool/')) {
          // Backwards compatibility: method is 'tool/<name>'
          const toolName = request.method.slice('tool/'.length);
          console.error(`[StdioTransport] Legacy tool call: ${toolName}`);
          const result = await this.server.mcpCore.handleToolCall(toolName, request.params || {});
          responsePayload = result;
        } else {
          // Unknown method - return error
          throw new Error(`Unknown method: ${request.method}`);
        }
      } catch (err) {
        console.error('[StdioTransport] Error handling request:', err.message);
        
        // Only send error responses for requests with IDs (not notifications)
        if (request.id !== undefined) {
          const errorResponse = {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: err.message || String(err)
            }
          };
          writeJsonResponse(errorResponse);
        }
        return;
      }

      // Only send responses for requests with IDs (not notifications)
      if (request.id !== undefined) {
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: responsePayload,
        };

        writeJsonResponse(response);
      }
    } catch (error) {
      console.error('[StdioTransport] Error processing message:', error.message);
    }
  }

  listen() {
    console.error('[StdioTransport] Listening on stdio');
  }
}
