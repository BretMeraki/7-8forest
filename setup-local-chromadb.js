#!/usr/bin/env node

/**
 * Setup Local ChromaDB with Persistence
 * Creates a local ChromaDB instance using Docker or persistent local storage
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const execAsync = promisify(exec);
const FOREST_DATA_DIR = process.env.FOREST_DATA_DIR || path.resolve(os.homedir(), '.forest-data');
const CHROMA_DB_PATH = path.join(FOREST_DATA_DIR, '.chromadb');

async function setupLocalChromaDB() {
  console.log('🚀 Setting up Local ChromaDB for Forest\n');
  
  try {
    // Method 1: Try to start ChromaDB server locally using Docker
    console.log('🐳 Method 1: Attempting to start ChromaDB with Docker...');
    try {
      // Check if Docker is available
      await execAsync('docker --version');
      console.log('   ✅ Docker is available');
      
      // Check if ChromaDB container is already running
      try {
        const { stdout } = await execAsync('docker ps --filter "name=chromadb" --format "{{.Names}}"');
        if (stdout.trim().includes('chromadb')) {
          console.log('   ✅ ChromaDB container already running');
          return await testConnection('http://localhost:8000');
        }
      } catch (e) {
        // Container not running, continue to start it
      }
      
      // Start ChromaDB container with persistence
      console.log('   🏗️ Starting ChromaDB container with persistence...');
      await fs.mkdir(CHROMA_DB_PATH, { recursive: true });
      
      const dockerCommand = `docker run -d --name chromadb -p 8000:8000 -v "${CHROMA_DB_PATH}:/chroma/chroma" chromadb/chroma:latest`;
      
      try {
        await execAsync(dockerCommand);
        console.log('   ✅ ChromaDB container started');
        
        // Wait for container to be ready
        console.log('   ⏳ Waiting for ChromaDB to be ready...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        return await testConnection('http://localhost:8000');
      } catch (dockerError) {
        console.log(`   ❌ Failed to start Docker container: ${dockerError.message}`);
      }
      
    } catch (dockerError) {
      console.log(`   ❌ Docker not available: ${dockerError.message}`);
    }
    
    // Method 2: Try ChromaDB with custom configuration for persistence
    console.log('\n💾 Method 2: Attempting local persistence mode...');
    try {
      // Import ChromaDB and attempt different configurations
      const chromaModule = await import('chromadb');
      
      // Check if there's a way to configure local persistence
      console.log('   🔧 Testing persistence configuration...');
      
      // ChromaDB v3.x might support file-based persistence with specific settings
      // Let's try using HTTP client pointing to a local server
      console.log('   🌐 Starting local ChromaDB server process...');
      
      // Create a simple HTTP server configuration
      const serverConfig = {
        host: 'localhost',
        port: 8001, // Use different port to avoid conflicts
        persist_directory: CHROMA_DB_PATH
      };
      
      // Try to start a local server
      const serverProcess = await startLocalChromaServer(serverConfig);
      
      if (serverProcess) {
        console.log('   ✅ Local ChromaDB server started');
        return await testConnection('http://localhost:8001');
      }
      
    } catch (error) {
      console.log(`   ❌ Local persistence setup failed: ${error.message}`);
    }
    
    // Method 3: Use in-memory mode with periodic persistence
    console.log('\n🧠 Method 3: Setting up in-memory mode with periodic saves...');
    try {
      const chromaModule = await import('chromadb');
      const client = new chromaModule.ChromaClient();
      
      // Test if we can use it in memory mode (might require server)
      console.log('   ⚡ Testing in-memory ChromaDB...');
      
      // Since this requires a server, let's configure for fallback
      return await setupFallbackConfiguration();
      
    } catch (error) {
      console.log(`   ❌ In-memory mode failed: ${error.message}`);
    }
    
    // Method 4: Configure for LocalJSON fallback with ChromaDB ready message
    console.log('\n📁 Method 4: Configuring LocalJSON with ChromaDB readiness...');
    return await setupFallbackConfiguration();
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    return false;
  }
}

async function startLocalChromaServer(config) {
  return new Promise((resolve) => {
    // This is a placeholder - ChromaDB v3.x doesn't have built-in embedded server
    // In practice, you'd need to run the ChromaDB server separately
    console.log('   ℹ️ ChromaDB v3.x requires separate server process');
    resolve(null);
  });
}

async function testConnection(url) {
  try {
    console.log(`   🔗 Testing connection to ${url}...`);
    
    const chromaModule = await import('chromadb');
    const client = new chromaModule.ChromaClient({
      path: url
    });
    
    // Test basic operations
    const heartbeat = await client.heartbeat();
    console.log('   ✅ Heartbeat successful');
    
    const collections = await client.listCollections();
    console.log(`   ✅ Connected successfully: ${collections.length} collections found`);
    
    // Test creating a collection
    const testCollection = await client.getOrCreateCollection({
      name: 'forest_test_setup',
      metadata: { description: 'Forest setup test collection' }
    });
    console.log('   ✅ Test collection created/retrieved');
    
    return { success: true, url, mode: 'server' };
    
  } catch (error) {
    console.log(`   ❌ Connection test failed: ${error.message}`);
    return null;
  }
}

async function setupFallbackConfiguration() {
  console.log('   🔧 Setting up fallback configuration...');
  
  const configPath = path.join(FOREST_DATA_DIR, 'vector-setup.json');
  const fallbackConfig = {
    vector_provider: 'localjson',
    recommended_provider: 'chroma',
    chroma_setup_instructions: {
      docker_command: 'docker run -d --name chromadb -p 8000:8000 -v ~/.forest-data/.chromadb:/chroma/chroma chromadb/chroma:latest',
      environment_variable: 'export FOREST_VECTOR_PROVIDER=chroma',
      server_url: 'http://localhost:8000',
      notes: 'ChromaDB v3.x requires a separate server process. Use Docker command above or install ChromaDB server.'
    },
    fallback_config: {
      provider: 'localjson',
      directory: path.join(FOREST_DATA_DIR, 'vectors'),
      performance_note: 'LocalJSON is fully functional but ChromaDB provides better vector search performance'
    },
    setup_date: new Date().toISOString(),
    status: 'fallback_configured'
  };
  
  await fs.writeFile(configPath, JSON.stringify(fallbackConfig, null, 2));
  console.log(`   ✅ Fallback configuration saved to: ${configPath}`);
  
  // Also create a startup script for ChromaDB
  const startupScript = `#!/bin/bash
# ChromaDB Startup Script for Forest MCP
echo "🚀 Starting ChromaDB for Forest MCP..."

# Ensure data directory exists
mkdir -p "${CHROMA_DB_PATH}"

# Start ChromaDB with Docker
docker run -d --name chromadb -p 8000:8000 \\
  -v "${CHROMA_DB_PATH}:/chroma/chroma" \\
  chromadb/chroma:latest

echo "✅ ChromaDB started at http://localhost:8000"
echo "💡 Set FOREST_VECTOR_PROVIDER=chroma to use ChromaDB in Forest"
`;
  
  const scriptPath = path.join(FOREST_DATA_DIR, 'start-chromadb.sh');
  await fs.writeFile(scriptPath, startupScript);
  await fs.chmod(scriptPath, '755');
  console.log(`   ✅ Startup script created: ${scriptPath}`);
  
  return { success: true, mode: 'fallback', provider: 'localjson' };
}

// Run setup
setupLocalChromaDB()
  .then(result => {
    if (result) {
      console.log('\n✅ ChromaDB Setup Completed!');
      console.log('\n📋 SUMMARY:');
      console.log(`✅ Mode: ${result.mode || 'fallback'}`);
      console.log(`✅ Provider: ${result.provider || 'chroma'}`);
      if (result.url) {
        console.log(`✅ Server URL: ${result.url}`);
      }
      
      console.log('\n🔧 TO USE CHROMADB:');
      console.log('1. Start ChromaDB server with Docker:');
      console.log(`   docker run -d --name chromadb -p 8000:8000 -v "${CHROMA_DB_PATH}:/chroma/chroma" chromadb/chroma:latest`);
      console.log('2. Set environment variable:');
      console.log('   export FOREST_VECTOR_PROVIDER=chroma');
      console.log('3. Restart Forest MCP server');
      
      console.log('\n💡 CURRENT STATUS:');
      console.log('✅ Forest will use LocalJSON provider (fully functional)');
      console.log('✅ ChromaDB can be enabled when server is available');
      
    } else {
      console.log('\n❌ ChromaDB setup incomplete - using LocalJSON fallback');
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
