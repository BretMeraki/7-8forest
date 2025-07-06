#!/usr/bin/env node

/**
 * Forest System Health Check
 * Diagnoses common issues with stuck processes and tools
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

console.log('🏥 Forest System Health Check\n');

async function checkProcess(command, args = [], name) {
  console.log(`\n📍 Checking ${name}...`);
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    
    const proc = spawn(command, args, { 
      shell: true,
      timeout: 10000 // 10 second timeout
    });
    
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
    }, 10000);
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      clearTimeout(timeout);
      const elapsed = Date.now() - startTime;
      
      if (timedOut) {
        console.log(`  ❌ TIMEOUT after ${elapsed}ms - Process might be stuck!`);
        resolve({ name, status: 'timeout', elapsed });
      } else if (code === 0) {
        console.log(`  ✅ OK (${elapsed}ms)`);
        resolve({ name, status: 'ok', elapsed });
      } else {
        console.log(`  ⚠️  Failed with code ${code} (${elapsed}ms)`);
        if (stderr) console.log(`     Error: ${stderr.slice(0, 200)}`);
        resolve({ name, status: 'error', code, elapsed });
      }
    });
    
    proc.on('error', (err) => {
      clearTimeout(timeout);
      console.log(`  ❌ Error: ${err.message}`);
      resolve({ name, status: 'error', error: err.message });
    });
  });
}

async function checkFile(filePath, description) {
  console.log(`\n📄 Checking ${description}...`);
  try {
    const stats = await fs.stat(filePath);
    const size = (stats.size / 1024).toFixed(2);
    console.log(`  ✅ Found (${size} KB)`);
    
    // Check if file is too large (might indicate runaway logging)
    if (stats.size > 50 * 1024 * 1024) { // 50MB
      console.log(`  ⚠️  File is very large! This might indicate a problem.`);
    }
    
    return { path: filePath, exists: true, size: stats.size };
  } catch (err) {
    console.log(`  ❌ Not found`);
    return { path: filePath, exists: false };
  }
}

async function checkPort(port, service) {
  console.log(`\n🔌 Checking ${service} on port ${port}...`);
  
  return new Promise((resolve) => {
    const net = require('net');
    const client = new net.Socket();
    
    const timeout = setTimeout(() => {
      client.destroy();
      console.log(`  ❌ Not responding (timeout)`);
      resolve({ port, service, status: 'timeout' });
    }, 5000);
    
    client.connect(port, 'localhost', () => {
      clearTimeout(timeout);
      client.destroy();
      console.log(`  ✅ Responding`);
      resolve({ port, service, status: 'ok' });
    });
    
    client.on('error', (err) => {
      clearTimeout(timeout);
      if (err.code === 'ECONNREFUSED') {
        console.log(`  ℹ️  Not running (connection refused)`);
      } else {
        console.log(`  ❌ Error: ${err.message}`);
      }
      resolve({ port, service, status: 'error', error: err.code });
    });
  });
}

async function checkMemory() {
  console.log('\n💾 Memory Usage:');
  const usage = process.memoryUsage();
  console.log(`  Heap Used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Total: ${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  RSS: ${(usage.rss / 1024 / 1024).toFixed(2)} MB`);
  
  if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB
    console.log('  ⚠️  High memory usage detected!');
  }
}

async function runHealthCheck() {
  const results = {
    timestamp: new Date().toISOString(),
    checks: []
  };
  
  // Check critical processes
  results.checks.push(await checkProcess('node', ['--version'], 'Node.js'));
  results.checks.push(await checkProcess('npm', ['--version'], 'NPM'));
  
  // Check important files
  results.checks.push(await checkFile('.forest-data/forest-mcp.log', 'MCP Log'));
  results.checks.push(await checkFile('.forest-data/projects.json', 'Projects Data'));
  
  // Check ChromaDB if configured
  results.checks.push(await checkPort(8000, 'ChromaDB'));
  
  // Check memory
  await checkMemory();
  
  // Check for zombie processes
  console.log('\n🧟 Checking for zombie processes...');
  const processes = await checkProcess('powershell', ['-Command', 'Get-Process node | Select-Object Id,CPU,WorkingSet'], 'Node processes');
  
  // Summary
  console.log('\n📊 Summary:');
  const failed = results.checks.filter(c => c.status !== 'ok' && c.status !== undefined);
  if (failed.length === 0) {
    console.log('  ✅ All checks passed!');
  } else {
    console.log(`  ⚠️  ${failed.length} checks failed or timed out`);
    failed.forEach(f => {
      console.log(`     - ${f.name || f.service || f.path}`);
    });
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (failed.some(f => f.status === 'timeout')) {
    console.log('  • Some processes are timing out. Check for infinite loops or stuck operations.');
    console.log('  • Run: node debug-monitor.js to track stuck operations in real-time.');
  }
  
  console.log('  • To kill all Node processes: taskkill /F /IM node.exe');
  console.log('  • To clear logs: del .forest-data\\*.log');
  console.log('  • To reset data: del .forest-data\\*.json');
}

// Run the health check
runHealthCheck().catch(console.error);
