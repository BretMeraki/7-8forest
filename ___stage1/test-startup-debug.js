#!/usr/bin/env node

/**
 * Debug Script for Forest Startup Vector Store Issues
 */

import Stage1CoreServer from './core-server.js';

console.error('=== FOREST STARTUP DEBUG ===');

async function testVectorStoreInitialization() {
  console.error('\n1. Testing Forest Data Vectorization...');
  
  const server = new Stage1CoreServer({
    dataDir: '.forest-data'
  });
  
  try {
    // Test ForestDataVectorization initialization
    console.error('   - Testing ForestDataVectorization.initialize()...');
    await server.forestDataVectorization.initialize();
    console.error('   ✅ ForestDataVectorization initialized successfully');
  } catch (error) {
    console.error('   ❌ ForestDataVectorization failed:', error.message);
    console.error('   Stack:', error.stack);
  }
  
  console.error('\n2. Testing HTA Core Vector Store...');
  
  try {
    // Test HTA Core vector store initialization
    console.error('   - Testing HTACore.initializeVectorStore()...');
    const vectorStore = await server.htaCore.initializeVectorStore();
    if (vectorStore) {
      console.error('   ✅ HTA Core vector store initialized successfully');
      console.error('   - Vector store type:', vectorStore.constructor.name);
      console.error('   - Vector store provider:', vectorStore.provider?.constructor?.name);
    } else {
      console.error('   ❌ HTA Core vector store returned null');
    }
  } catch (error) {
    console.error('   ❌ HTA Core vector store failed:', error.message);
    console.error('   Stack:', error.stack);
  }
  
  console.error('\n3. Testing Vector Store Provider...');
  
  try {
    // Test vector store provider directly
    const { HTAVectorStore } = await import('./modules/hta-vector-store.js');
    const vectorStore = new HTAVectorStore('.forest-data');
    
    console.error('   - Testing HTAVectorStore.initialize()...');
    const initResult = await vectorStore.initialize();
    console.error('   - Init result:', initResult);
    
    if (initResult.success) {
      console.error('   ✅ Vector store provider initialized successfully');
      console.error('   - Provider:', initResult.provider);
      console.error('   - Fallback used:', initResult.fallbackUsed);
    } else {
      console.error('   ❌ Vector store provider failed');
    }
  } catch (error) {
    console.error('   ❌ Vector store provider test failed:', error.message);
    console.error('   Stack:', error.stack);
  }
  
  console.error('\n4. Testing SQLite Provider Directly...');
  
  try {
    const { SQLiteVectorProvider } = await import('./modules/vector-providers/SQLiteVectorProvider.js');
    const sqliteProvider = new SQLiteVectorProvider();
    
    console.error('   - Testing SQLiteVectorProvider.initialize()...');
    const config = {
      dbPath: '.forest-data/forest_vectors.sqlite',
      dimension: 1536
    };
    const initResult = await sqliteProvider.initialize(config);
    console.error('   - Init result:', initResult);
    
    if (initResult.success) {
      console.error('   ✅ SQLite provider initialized successfully');
    } else {
      console.error('   ❌ SQLite provider failed:', initResult.error);
    }
  } catch (error) {
    console.error('   ❌ SQLite provider test failed:', error.message);
    console.error('   Stack:', error.stack);
  }
  
  console.error('\n5. Testing Vector Config...');
  
  try {
    const vectorConfig = await import('./config/vector-config.js');
    const config = vectorConfig.default || vectorConfig;
    
    console.error('   - Provider:', config.provider);
    console.error('   - SQLite config:', config.sqlitevec);
    console.error('   - Vector config loaded successfully');
  } catch (error) {
    console.error('   ❌ Vector config test failed:', error.message);
  }
  
  console.error('\n=== DEBUG COMPLETE ===');
}

testVectorStoreInitialization().catch(console.error);