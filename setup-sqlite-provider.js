#!/usr/bin/env node

/**
 * SQLiteVecProvider Setup Script
 * 
 * This script ensures SQLiteVecProvider is configured as the primary vector provider
 * and cleans up ChromaDB data directories.
 */

import { promises as fs } from 'fs';
import path from 'path';

async function main() {
  console.log('🚀 Setting up SQLiteVecProvider as primary vector provider...');
  
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }
  
  try {
    // Step 1: Check current configuration
    await checkCurrentConfiguration();
    
    // Step 2: Update vector configuration
    await updateVectorConfiguration(isDryRun);
    
    // Step 3: Clean up ChromaDB data directories
    await cleanupChromaData(isDryRun);
    
    console.log('✅ Setup completed successfully!');
    console.log('');
    console.log('SQLiteVecProvider is now configured as the primary vector provider.');
    console.log('The system will use forest_vectors.sqlite for vector storage.');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

async function checkCurrentConfiguration() {
  console.log('🔍 Checking current configuration...');
  
  const configPath = path.join(process.cwd(), '___stage1/config/vector-config.js');
  
  try {
    const configContent = await fs.readFile(configPath, 'utf8');
    
    // Check current provider
    const providerMatch = configContent.match(/provider:\s*process\.env\.FOREST_VECTOR_PROVIDER\s*\|\|\s*['"](\w+)['"]/);
    const currentProvider = providerMatch ? providerMatch[1] : 'unknown';
    
    console.log(`📊 Current provider: ${currentProvider}`);
    
    // Check if SQLiteVecProvider is already configured
    if (currentProvider === 'sqlitevec') {
      console.log('✅ SQLiteVecProvider is already configured as primary');
    } else {
      console.log(`⚠️  Primary provider is ${currentProvider}, will update to sqlitevec`);
    }
    
    // Check if SQLite database exists
    const sqliteDbPath = path.join(process.cwd(), 'forest_vectors.sqlite');
    try {
      await fs.access(sqliteDbPath);
      const stats = await fs.stat(sqliteDbPath);
      console.log(`📄 SQLite database exists: ${sqliteDbPath} (${Math.round(stats.size / 1024)}KB)`);
    } catch {
      console.log('📄 SQLite database does not exist yet - will be created on first use');
    }
    
  } catch (error) {
    throw new Error(`Failed to check configuration: ${error.message}`);
  }
}

async function updateVectorConfiguration(isDryRun) {
  console.log('⚙️  Updating vector configuration...');
  
  const configPath = path.join(process.cwd(), '___stage1/config/vector-config.js');
  
  try {
    let configContent = await fs.readFile(configPath, 'utf8');
    
    // Create backup
    const backupPath = configPath + '.backup-' + Date.now();
    if (!isDryRun) {
      await fs.copyFile(configPath, backupPath);
      console.log(`💾 Configuration backed up to: ${backupPath}`);
    }
    
    // Update provider to sqlitevec
    const updatedContent = configContent.replace(
      /provider:\s*process\.env\.FOREST_VECTOR_PROVIDER\s*\|\|\s*['"](\w+)['"]/,
      "provider: process.env.FOREST_VECTOR_PROVIDER || 'sqlitevec'"
    );
    
    if (isDryRun) {
      console.log('🔍 [DRY RUN] Would update vector-config.js to use SQLiteVecProvider');
    } else {
      await fs.writeFile(configPath, updatedContent, 'utf8');
      console.log('✅ Updated vector-config.js to use SQLiteVecProvider');
    }
    
    // Set environment variable for current session
    process.env.FOREST_VECTOR_PROVIDER = 'sqlitevec';
    console.log('✅ Set FOREST_VECTOR_PROVIDER=sqlitevec for current session');
    
  } catch (error) {
    throw new Error(`Failed to update configuration: ${error.message}`);  
  }
}

async function cleanupChromaData(isDryRun) {
  console.log('🧹 Cleaning up ChromaDB data directories...');
  
  const chromaDirectories = [
    '.forest-data/chroma-data',
    '.forest-data/.chromadb',
    '.chromadb'
  ];
  
  for (const chromaDir of chromaDirectories) {
    const chromaPath = path.join(process.cwd(), chromaDir);
    
    try {
      await fs.access(chromaPath);
      const stats = await fs.stat(chromaPath);
      
      if (stats.isDirectory()) {
        if (isDryRun) {
          console.log(`🔍 [DRY RUN] Would remove ChromaDB directory: ${chromaPath}`);
        } else {
          await fs.rmdir(chromaPath, { recursive: true });
          console.log(`✅ Removed ChromaDB directory: ${chromaPath}`);
        }
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`ℹ️  ChromaDB directory not found: ${chromaPath}`);
      } else {
        console.warn(`⚠️  Failed to clean up ${chromaPath}: ${error.message}`);
      }
    }
  }
}

// Show help
if (process.argv.includes('--help')) {
  console.log(`
SQLiteVecProvider Setup Tool

Usage: node setup-sqlite-provider.js [options]

Options:
  --dry-run    Show what would be done without making changes
  --help       Show this help message

This script:
1. Configures SQLiteVecProvider as the primary vector provider
2. Cleans up ChromaDB data directories
3. Sets up the system to use SQLite for vector storage
`);
  process.exit(0);
}

// Run the setup
main();
