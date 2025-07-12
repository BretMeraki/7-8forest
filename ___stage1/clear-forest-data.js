#!/usr/bin/env node
/**
 * Forest Data and Cache Cleanup Script
 * Clears all Forest data, caches, and temporary files
 */

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

class ForestDataCleaner {
  constructor() {
    this.projectRoot = process.cwd().endsWith('___stage1') ? path.dirname(process.cwd()) : process.cwd();
    this.clearedItems = [];
    this.errors = [];
  }

  async clearDirectory(dirPath, description = '') {
    try {
      const fullPath = path.resolve(dirPath);
      
      // Check if directory exists
      try {
        await fs.access(fullPath);
      } catch {
        console.log(`⏭️  Skipping ${description || dirPath} (doesn't exist)`);
        return;
      }

      // Remove directory and all contents
      await fs.rm(fullPath, { recursive: true, force: true });
      console.log(`✅ Cleared ${description || dirPath}`);
      this.clearedItems.push(description || dirPath);
    } catch (error) {
      console.error(`❌ Failed to clear ${description || dirPath}: ${error.message}`);
      this.errors.push({ path: dirPath, error: error.message });
    }
  }

  async clearFile(filePath, description = '') {
    try {
      const fullPath = path.resolve(filePath);
      
      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        console.log(`⏭️  Skipping ${description || filePath} (doesn't exist)`);
        return;
      }

      // Remove file
      await fs.unlink(fullPath);
      console.log(`✅ Removed ${description || filePath}`);
      this.clearedItems.push(description || filePath);
    } catch (error) {
      console.error(`❌ Failed to remove ${description || filePath}: ${error.message}`);
      this.errors.push({ path: filePath, error: error.message });
    }
  }

  async clearPattern(pattern, description = '') {
    try {
      console.log(`🔍 Searching for ${description || pattern}...`);
      const { stdout } = await execAsync(`find /Users/bretmeraki -name "${pattern}" -type d 2>/dev/null || true`);
      
      if (stdout.trim()) {
        const dirs = stdout.trim().split('\n').filter(Boolean);
        console.log(`📂 Found ${dirs.length} directories matching ${pattern}`);
        
        for (const dir of dirs) {
          await this.clearDirectory(dir, `${description} (${dir})`);
        }
      } else {
        console.log(`⏭️  No directories found matching ${pattern}`);
      }
    } catch (error) {
      console.error(`❌ Failed to search pattern ${pattern}: ${error.message}`);
      this.errors.push({ pattern, error: error.message });
    }
  }

  async stopServices() {
    console.log('\n🛑 Stopping any running Forest services...');
    
    try {
      // Kill any ChromaDB processes
      await execAsync('pkill -f "chroma" || true');
      console.log('✅ Stopped ChromaDB processes');
    } catch (error) {
      console.log('ℹ️  No ChromaDB processes to stop');
    }

    try {
      // Kill any Forest MCP server processes
      await execAsync('pkill -f "forest-mcp-server" || true');
      console.log('✅ Stopped Forest MCP server processes');
    } catch (error) {
      console.log('ℹ️  No Forest MCP server processes to stop');
    }

    // Wait a moment for processes to stop
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async clearProjectData() {
    console.log('\n📁 Clearing project-specific data...');
    
    // Current project .forest-data directories
    await this.clearDirectory(path.join(this.projectRoot, '.forest-data'), 'Project .forest-data');
    await this.clearDirectory(path.join(this.projectRoot, '___stage1', '.forest-data'), 'Stage1 .forest-data');
    
    // ChromaDB data
    await this.clearDirectory(path.join(this.projectRoot, '___stage1', 'chroma'), 'ChromaDB data');
    await this.clearDirectory(path.join(this.projectRoot, '___stage1', 'chromadb-data'), 'ChromaDB data directory');
    
    // Vector store data
    await this.clearDirectory(path.join(this.projectRoot, '___stage1', 'vector-store'), 'Vector store data');
    
    // Log files
    await this.clearFile(path.join(this.projectRoot, '___stage1', '.forest-data', 'forest-mcp.log'), 'MCP server logs');
    await this.clearFile(path.join(this.projectRoot, '.forest-data', 'forest-mcp.log'), 'Project MCP logs');
  }

  async clearGlobalData() {
    console.log('\n🌍 Clearing global Forest data...');
    
    // Global .forest-data directory
    await this.clearDirectory('/Users/bretmeraki/.forest-data', 'Global .forest-data');
    
    // All .forest-data directories
    await this.clearPattern('.forest-data', '.forest-data directories');
    
    // Claude project caches related to Forest
    const claudeProjectDirs = [
      '/Users/bretmeraki/.claude/projects/-Users-bretmeraki-Downloads-7-3forest-main',
      '/Users/bretmeraki/.claude/projects/-Users-bretmeraki-Downloads-7-2forest-master',
      '/Users/bretmeraki/.claude/projects/-Users-bretmeraki-Downloads-625forest-main',
      '/Users/bretmeraki/.claude/projects/-Users-bretmeraki-claude-mcp-configs-forest-server',
      '/Users/bretmeraki/.claude/projects/-Users-bretmeraki-Downloads-625forest-main-forest-server----stage1',
      '/Users/bretmeraki/.claude/projects/-Users-bretmeraki-Desktop-claude-mcp-configs-forest-server'
    ];
    
    for (const dir of claudeProjectDirs) {
      await this.clearDirectory(dir, `Claude project cache (${path.basename(dir)})`);
    }
    
    // Claude CLI caches
    const claudeCliCaches = [
      '/Users/bretmeraki/Library/Caches/claude-cli-nodejs/-Users-bretmeraki-Downloads-7-2forest-master',
      '/Users/bretmeraki/Library/Caches/claude-cli-nodejs/-Users-bretmeraki-Downloads-625forest-main',
      '/Users/bretmeraki/Library/Caches/claude-cli-nodejs/-Users-bretmeraki-Downloads-7-3forest-main'
    ];
    
    for (const cache of claudeCliCaches) {
      await this.clearDirectory(cache, `Claude CLI cache (${path.basename(cache)})`);
    }
  }

  async clearNodeModulesCache() {
    console.log('\n📦 Clearing Node.js caches...');
    
    // Node modules cache in project
    await this.clearDirectory(path.join(this.projectRoot, 'node_modules'), 'Project node_modules');
    await this.clearDirectory(path.join(this.projectRoot, '___stage1', 'node_modules'), 'Stage1 node_modules');
    
    // Package lock files
    await this.clearFile(path.join(this.projectRoot, 'package-lock.json'), 'package-lock.json');
    await this.clearFile(path.join(this.projectRoot, '___stage1', 'package-lock.json'), 'Stage1 package-lock.json');
  }

  async clearTempFiles() {
    console.log('\n🗂️  Clearing temporary files...');
    
    // Test and temporary files
    const tempPatterns = [
      '*.log',
      'forest-mcp.log',
      'debug-*.js',
      'test-*.js',
      '*.tmp'
    ];
    
    for (const pattern of tempPatterns) {
      try {
        const { stdout } = await execAsync(`find "${this.projectRoot}" -name "${pattern}" -type f 2>/dev/null || true`);
        
        if (stdout.trim()) {
          const files = stdout.trim().split('\n').filter(Boolean);
          for (const file of files) {
            // Skip test files that are part of the codebase
            if (!file.includes('__tests__') && !file.includes('test-production-readiness.js')) {
              await this.clearFile(file, `Temp file (${path.basename(file)})`);
            }
          }
        }
      } catch (error) {
        console.log(`ℹ️  No ${pattern} files found`);
      }
    }
  }

  async reinstallDependencies() {
    console.log('\n📦 Reinstalling dependencies...');
    
    try {
      process.chdir(this.projectRoot);
      await execAsync('npm install');
      console.log('✅ Dependencies reinstalled');
    } catch (error) {
      console.error(`❌ Failed to reinstall dependencies: ${error.message}`);
      this.errors.push({ action: 'npm install', error: error.message });
    }
  }

  async clearAll() {
    console.log('🧹 Forest Data and Cache Cleanup\n');
    console.log(`📂 Project root: ${this.projectRoot}\n`);

    // Stop any running services first
    await this.stopServices();

    // Clear different types of data
    await this.clearProjectData();
    await this.clearGlobalData();
    await this.clearNodeModulesCache();
    await this.clearTempFiles();

    // Reinstall dependencies
    await this.reinstallDependencies();

    // Summary
    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🧹 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`✅ Successfully cleared ${this.clearedItems.length} items:`);
    this.clearedItems.forEach(item => console.log(`   - ${item}`));
    
    if (this.errors.length > 0) {
      console.log(`\n❌ Encountered ${this.errors.length} errors:`);
      this.errors.forEach(error => console.log(`   - ${error.path || error.pattern || error.action}: ${error.error}`));
    }
    
    console.log('\n🎉 Forest data and cache cleanup complete!');
    console.log('💡 The system is now in a clean state.');
    console.log('🚀 You can now start fresh with the Forest MCP server.');
  }
}

// Run cleanup if called directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const cleaner = new ForestDataCleaner();
  await cleaner.clearAll();
}