#!/usr/bin/env node

/**
 * SQLiteVecProvider Verification Script
 * 
 * This script verifies that SQLiteVecProvider is working correctly
 * by testing basic vector operations.
 */

import SQLiteVecProvider from './___stage1/modules/vector-providers/SQLiteVecProvider.js';

async function main() {
  console.log('🔍 Verifying SQLiteVecProvider functionality...');
  
  try {
    // Initialize the provider
    const provider = new SQLiteVecProvider({
      dbPath: 'forest_vectors.sqlite',
      dimension: 1536
    });
    
    console.log('🔧 Initializing SQLiteVecProvider...');
    const initResult = await provider.initialize();
    console.log('✅ SQLiteVecProvider initialized successfully');
    console.log(`📊 Database: ${initResult.dbPath}`);
    console.log(`📊 Dimension: ${initResult.dimension}`);
    
    // Test 1: Basic vector operations
    console.log('\n🧪 Testing basic vector operations...');
    const testVector = new Array(1536).fill(0).map(() => Math.random());
    const testMetadata = { 
      type: 'test', 
      timestamp: new Date().toISOString(),
      description: 'Verification test vector'
    };
    
    await provider.upsertVector('test:verification', testVector, testMetadata);
    console.log('✅ Vector upsert successful');
    
    // Test 2: Query vectors
    const queryResults = await provider.queryVectors(testVector, { limit: 5, threshold: 0.5 });
    console.log(`✅ Vector query successful - found ${queryResults.length} results`);
    
    if (queryResults.length > 0) {
      console.log(`📊 Top result similarity: ${queryResults[0].similarity.toFixed(4)}`);
    }
    
    // Test 3: List vectors
    const vectorList = await provider.listVectors('test:');
    console.log(`✅ Vector listing successful - found ${vectorList.length} vectors with 'test:' prefix`);
    
    // Test 4: Get stats
    const stats = await provider.getStats();
    console.log(`✅ Stats retrieval successful - total vectors: ${stats.vectorCount}`);
    
    // Test 5: Cache functionality
    const cacheStats = provider.getCacheStats();
    console.log(`✅ Cache working - size: ${cacheStats.size}/${cacheStats.maxSize}`);
    
    // Test 6: Ping
    const pingResult = await provider.ping();
    console.log(`✅ Ping successful: ${pingResult}`);
    
    // Clean up test data
    await provider.deleteVector('test:verification');
    console.log('✅ Test vector cleanup successful');
    
    // Close the provider
    await provider.close();
    console.log('✅ Provider closed successfully');
    
    console.log('\n🎉 All tests passed! SQLiteVecProvider is working correctly.');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

main();
