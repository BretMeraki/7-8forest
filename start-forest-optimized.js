#!/usr/bin/env node

/**
 * Memory-Optimized Forest MCP Server Startup
 * 
 * This script addresses OOM (Out of Memory) errors during startup by:
 * 1. Setting optimal memory limits
 * 2. Enabling garbage collection optimization
 * 3. Implementing lazy initialization patterns
 * 4. Monitoring memory usage during startup
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Memory optimization settings
const MEMORY_LIMIT = process.env.FOREST_MEMORY_LIMIT || '2048';
const OPTIMIZE_FOR_SIZE = process.env.FOREST_OPTIMIZE_SIZE !== 'false';
const ENABLE_GC_LOGGING = process.env.FOREST_GC_LOG === 'true';

// Build optimized Node.js arguments
const nodeArgs = [
    `--max-old-space-size=${MEMORY_LIMIT}`,
    '--max-semi-space-size=32',
];

if (OPTIMIZE_FOR_SIZE) {
    nodeArgs.push('--optimize-for-size');
}

if (ENABLE_GC_LOGGING) {
    nodeArgs.push('--trace-gc');
    nodeArgs.push('--trace-gc-verbose');
}

// Add the main server file
nodeArgs.push(join(__dirname, '___stage1', 'forest-mcp-server.js'));

console.error('🚀 Starting Forest MCP Server with optimized memory settings...');
console.error(`📊 Memory limit: ${MEMORY_LIMIT}MB`);
console.error(`⚡ Optimizations: ${OPTIMIZE_FOR_SIZE ? 'Size-optimized' : 'Performance-optimized'}`);
console.error(`🔧 Args: ${nodeArgs.join(' ')}`);

// Set environment variables for memory-conscious initialization
process.env.FOREST_LAZY_INIT = 'true';
process.env.FOREST_MEMORY_OPTIMIZED = 'true';
process.env.FOREST_STARTUP_MODE = 'optimized';

// Monitor memory usage
const memoryMonitor = setInterval(() => {
    const usage = process.memoryUsage();
    const mbUsed = Math.round(usage.heapUsed / 1024 / 1024);
    const mbTotal = Math.round(usage.heapTotal / 1024 / 1024);
    
    if (mbUsed > 1500) {
        console.error(`⚠️  High memory usage: ${mbUsed}MB / ${mbTotal}MB`);
    }
}, 5000);

// Start the server
const server = spawn('node', nodeArgs, {
    stdio: 'inherit',
    env: { ...process.env }
});

server.on('error', (error) => {
    console.error('❌ Failed to start Forest MCP Server:', error.message);
    clearInterval(memoryMonitor);
    process.exit(1);
});

server.on('exit', (code, signal) => {
    clearInterval(memoryMonitor);
    if (code !== 0) {
        console.error(`❌ Forest MCP Server exited with code ${code}${signal ? ` (${signal})` : ''}`);
        process.exit(code || 1);
    }
    console.error('✅ Forest MCP Server stopped gracefully');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.error('🛑 Received SIGINT, shutting down Forest MCP Server...');
    server.kill('SIGINT');
});

process.on('SIGTERM', () => {
    console.error('🛑 Received SIGTERM, shutting down Forest MCP Server...');
    server.kill('SIGTERM');
});
