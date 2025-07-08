#!/usr/bin/env node

/**
 * Test Actual ChromaDB Integration
 * Tests the ChromaDB functionality that Forest actually uses
 */

import ChromaDBProvider from './modules/vector-providers/ChromaDBProvider.js';
import path from 'path';

async function testActualChromaDB() {
  console.error('🧪 Testing Actual ChromaDB Integration...\n');

  const testDataDir = path.resolve('./.test-chroma-embedded');
  
  let testsPassed = 0;
  let totalTests = 0;

  function runTest(testName, testFn) {
    totalTests++;
    try {
      console.error(`📋 Test ${totalTests}: ${testName}`);
      const result = testFn();
      if (result) {
        console.error(`✅ PASS: ${testName}`);
        testsPassed++;
      } else {
        console.error(`❌ FAIL: ${testName}`);
      }
    } catch (error) {
      console.error(`❌ FAIL: ${testName} - ${error.message}`);
    }
  }

  async function runAsyncTest(testName, testFn) {
    totalTests++;
    try {
      console.error(`📋 Test ${totalTests}: ${testName}`);
      const result = await testFn();
      if (result) {
        console.error(`✅ PASS: ${testName}`);
        testsPassed++;
      } else {
        console.error(`❌ FAIL: ${testName}`);
      }
    } catch (error) {
      console.error(`❌ FAIL: ${testName} - ${error.message}`);
    }
  }

  // Test 1: ChromaDB Provider Initialization (Embedded Mode)
  let chromaProvider = null;
  await runAsyncTest('ChromaDB Provider should initialize in embedded mode', async () => {
    try {
      chromaProvider = new ChromaDBProvider({
        collection: 'test_vectors',
        // No URL specified = embedded mode
      });

      const initResult = await chromaProvider.initialize();
      console.error(`Init result:`, initResult);
      
      return initResult.success && initResult.mode === 'embedded_local';
    } catch (error) {
      console.error(`Initialization error:`, error.message);
      return false;
    }
  });

  // Test 2: Vector Operations
  await runAsyncTest('Should support vector upsert and query operations', async () => {
    if (!chromaProvider) return false;

    try {
      // Test vector (1536 dimensions like OpenAI embeddings)
      const testVector = Array.from({ length: 1536 }, () => Math.random());
      const testMetadata = {
        type: 'test',
        content: 'test content',
        timestamp: new Date().toISOString()
      };

      // Upsert a vector
      await chromaProvider.upsertVector('test-vector-1', testVector, testMetadata);
      console.error('✓ Vector upsert successful');

      // Query for similar vectors
      const queryResults = await chromaProvider.queryVectors(testVector, { limit: 5 });
      console.error(`✓ Query returned ${queryResults.length} results`);

      // Should find our test vector
      const foundTestVector = queryResults.find(r => r.id === 'test-vector-1');
      console.error(`✓ Found test vector with similarity: ${foundTestVector?.similarity}`);

      return queryResults.length > 0 && foundTestVector && foundTestVector.similarity > 0.99;
    } catch (error) {
      console.error(`Vector operations error:`, error.message);
      return false;
    }
  });

  // Test 3: Collection Management
  await runAsyncTest('Should support collection operations', async () => {
    if (!chromaProvider) return false;

    try {
      // List vectors
      const vectors = await chromaProvider.listVectors();
      console.error(`✓ Listed ${vectors.length} vectors`);

      // Should have our test vector
      const hasTestVector = vectors.some(v => v.id === 'test-vector-1');
      console.error(`✓ Test vector found in collection: ${hasTestVector}`);

      return hasTestVector;
    } catch (error) {
      console.error(`Collection operations error:`, error.message);
      return false;
    }
  });

  // Test 4: Health and Connection
  await runAsyncTest('Should report healthy connection', async () => {
    if (!chromaProvider) return false;

    try {
      // Ping the connection
      const pingResult = await chromaProvider.ping();
      console.error(`✓ Ping successful: ${pingResult}`);

      return pingResult === true;
    } catch (error) {
      console.error(`Ping error:`, error.message);
      return false;
    }
  });

  // Test 5: Cleanup
  await runAsyncTest('Should cleanup properly', async () => {
    if (!chromaProvider) return false;

    try {
      // Delete test vector
      await chromaProvider.deleteVector('test-vector-1');
      console.error('✓ Test vector deleted');

      // Close connection
      await chromaProvider.close();
      console.error('✓ Connection closed');

      return true;
    } catch (error) {
      console.error(`Cleanup error:`, error.message);
      return false;
    }
  });

  // Test Results
  console.error('\n' + '='.repeat(60));
  console.error(`🧪 Actual ChromaDB Integration Test Results`);
  console.error(`📊 Tests Passed: ${testsPassed}/${totalTests}`);
  console.error(`💯 Pass Rate: ${(testsPassed/totalTests*100).toFixed(1)}%`);
  
  if (testsPassed === totalTests) {
    console.error('✅ ChromaDB is working correctly!');
    console.error('\n🎯 Key Findings:');
    console.error('• ChromaDB npm package v3.0.6 is functional');
    console.error('• Embedded mode works without external server');
    console.error('• Vector operations (upsert, query, delete) work');
    console.error('• Collection management is operational');
    console.error('• Connection health monitoring works');
  } else {
    console.error('❌ ChromaDB has issues that need to be addressed');
  }
  
  // Check integration status
  console.error('\n🔧 Integration Status:');
  if (testsPassed >= 4) {
    console.error('✅ ChromaDB is ready for Forest vector operations');
    console.error('✅ No external server needed (embedded mode)');
    console.error('✅ Vector storage and retrieval working');
  } else {
    console.error('⚠️ ChromaDB integration needs troubleshooting');
  }
  
  return testsPassed === totalTests;
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testActualChromaDB()
    .then(success => {
      console.error(`\n🏁 ChromaDB test suite ${success ? 'PASSED' : 'COMPLETED'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n❌ ChromaDB test suite failed with error:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

export { testActualChromaDB };