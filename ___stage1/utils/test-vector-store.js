#!/usr/bin/env node

/**
 * Vector Store Test Utility
 * 
 * Tests the complete vector storage system including HTA vector operations,
 * embedding service, and fallback providers.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { HTAVectorStore } from '../modules/hta-vector-store.js';
import vectorConfig from '../config/vector-config.js';
import embeddingService from '../utils/embedding-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test HTA Vector Store operations
 */
async function testHTAVectorStore() {
  console.log('🧪 Testing HTA Vector Store');
  console.log('============================\n');

  const dataDir = '.forest-test-data';
  const vectorStore = new HTAVectorStore(dataDir);

  const results = {
    initialization: false,
    storage: false,
    retrieval: false,
    query: false,
    performance: {}
  };

  try {
    // Test 1: Initialization
    console.log('📡 Testing vector store initialization...');
    const startTime = Date.now();
    const initResult = await vectorStore.initialize();
    const initTime = Date.now() - startTime;
    
    results.initialization = true;
    results.performance.initialization = `${initTime}ms`;
    
    console.log(`✅ Initialization successful (${initTime}ms)`);
    console.log(`   Provider: ${initResult.provider}`);
    console.log(`   Fallback used: ${initResult.fallbackUsed ? 'Yes' : 'No'}`);
    
    // Test 2: Store HTA Tree
    console.log('\n📊 Testing HTA tree storage...');
    const testProject = 'test_project_' + Date.now();
    const testHTAData = {
      goal: 'Learn Vector Databases',
      frontierNodes: [
        {
          id: 'task_1',
          title: 'Understand Vector Concepts',
          description: 'Learn the fundamentals of vector databases and embeddings',
          branch: 'Foundation',
          priority: 100,
          difficulty: 2,
          duration: '30 minutes',
          prerequisites: [],
          learningOutcome: 'Understanding of vector database basics',
          completed: false,
          generated: true
        },
        {
          id: 'task_2', 
          title: 'Practice Vector Operations',
          description: 'Hands-on practice with vector storage and retrieval',
          branch: 'Practice',
          priority: 200,
          difficulty: 3,
          duration: '45 minutes',
          prerequisites: ['task_1'],
          learningOutcome: 'Practical vector database skills',
          completed: false,
          generated: true
        }
      ],
      strategicBranches: [
        { name: 'Foundation', description: 'Build fundamental knowledge', priority: 1 },
        { name: 'Practice', description: 'Apply knowledge practically', priority: 2 }
      ],
      complexity: { score: 5, level: 'moderate' }
    };

    const storeStart = Date.now();
    const storeResult = await vectorStore.storeHTATree(testProject, testHTAData);
    const storeTime = Date.now() - storeStart;
    
    results.storage = true;
    results.performance.storage = `${storeTime}ms`;
    
    console.log(`✅ HTA tree storage successful (${storeTime}ms)`);
    console.log(`   Vectors stored: ${storeResult.vectorsStored}`);
    console.log(`   Provider: ${storeResult.provider}`);

    // Test 3: Retrieve HTA Tree
    console.log('\n📋 Testing HTA tree retrieval...');
    const retrieveStart = Date.now();
    const retrievedHTA = await vectorStore.retrieveHTATree(testProject);
    const retrieveTime = Date.now() - retrieveStart;
    
    if (retrievedHTA && retrievedHTA.frontierNodes.length === testHTAData.frontierNodes.length) {
      results.retrieval = true;
      results.performance.retrieval = `${retrieveTime}ms`;
      
      console.log(`✅ HTA tree retrieval successful (${retrieveTime}ms)`);
      console.log(`   Tasks retrieved: ${retrievedHTA.frontierNodes.length}`);
      console.log(`   Goal: ${retrievedHTA.goal}`);
    } else {
      console.log('❌ HTA tree retrieval failed or incomplete');
    }

    // Test 4: Vector Query (Find Next Task)
    console.log('\n🎯 Testing intelligent task selection...');
    const queryStart = Date.now();
    const nextTask = await vectorStore.findNextTask(testProject, 'beginner level', 3, '30 minutes');
    const queryTime = Date.now() - queryStart;
    
    if (nextTask) {
      results.query = true;
      results.performance.query = `${queryTime}ms`;
      
      console.log(`✅ Task selection successful (${queryTime}ms)`);
      console.log(`   Selected task: ${nextTask.title}`);
      console.log(`   Difficulty: ${nextTask.difficulty}`);
      console.log(`   Duration: ${nextTask.duration}`);
    } else {
      console.log('❌ Task selection failed');
    }

    // Test 5: Vector Statistics
    console.log('\n📊 Testing vector statistics...');
    const stats = await vectorStore.getProjectStats(testProject);
    console.log(`   Total vectors: ${stats.total_vectors}`);
    console.log(`   Completed tasks: ${stats.completed_tasks}`);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    try {
      await vectorStore.deleteProject(testProject);
      console.log('✅ Test data cleaned up');
    } catch (cleanupError) {
      console.log('⚠️  Cleanup warning:', cleanupError.message);
    }

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log('Stack trace:', error.stack);
    return results;
  }

  return results;
}

/**
 * Test embedding service
 */
async function testEmbeddingService() {
  console.log('\n🔤 Testing Embedding Service');
  console.log('=============================\n');

  const results = {
    deterministic: false,
    caching: false,
    performance: {}
  };

  try {
    const testTexts = [
      'Learn JavaScript fundamentals',
      'Practice coding exercises', 
      'Build a web application'
    ];

    // Test deterministic embeddings
    console.log('🧮 Testing deterministic embeddings...');
    const embedStart = Date.now();
    const embeddings = [];
    
    for (const text of testTexts) {
      const embedding = await embeddingService.embedText(text, 1536);
      embeddings.push(embedding);
    }
    
    const embedTime = Date.now() - embedStart;
    results.performance.embedding = `${embedTime}ms`;
    
    // Verify embeddings
    if (embeddings.every(emb => Array.isArray(emb) && emb.length === 1536)) {
      results.deterministic = true;
      console.log(`✅ Deterministic embeddings successful (${embedTime}ms)`);
      console.log(`   Generated ${embeddings.length} embeddings of dimension 1536`);
    } else {
      console.log('❌ Embedding generation failed');
    }

    // Test caching
    console.log('\n💾 Testing embedding caching...');
    const cacheStart = Date.now();
    const cachedEmbedding = await embeddingService.embedText(testTexts[0], 1536);
    const cacheTime = Date.now() - cacheStart;
    
    if (cacheTime < embedTime / testTexts.length) {
      results.caching = true;
      console.log(`✅ Caching working (${cacheTime}ms vs ${Math.round(embedTime / testTexts.length)}ms)`);
    } else {
      console.log('⚠️  Caching may not be working optimally');
    }

    // Test cache stats
    const cacheStats = embeddingService.getCacheStats();
    console.log(`   Cache size: ${cacheStats.size}/${cacheStats.maxSize}`);
    console.log(`   Cache utilization: ${cacheStats.utilization}`);

  } catch (error) {
    console.log(`❌ Embedding test failed: ${error.message}`);
  }

  return results;
}

/**
 * Run complete vector system test
 */
async function runCompleteTest() {
  console.log('🚀 Forest MCP Vector System Test');
  console.log('=================================\n');

  console.log('Configuration:');
  console.log(`  Primary provider: ${vectorConfig.provider}`);
  console.log(`  Fallback provider: ${vectorConfig.fallbackProvider}`);
  console.log(`  Embedding provider: ${vectorConfig.embedding.provider}`);
  console.log(`  Embedding model: ${vectorConfig.embedding.model}`);
  console.log('');

  // Test HTA Vector Store
  const htaResults = await testHTAVectorStore();

  // Test Embedding Service
  const embeddingResults = await testEmbeddingService();

  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  
  const allTests = [
    { name: 'Vector Store Initialization', passed: htaResults.initialization },
    { name: 'HTA Tree Storage', passed: htaResults.storage },
    { name: 'HTA Tree Retrieval', passed: htaResults.retrieval },
    { name: 'Intelligent Task Query', passed: htaResults.query },
    { name: 'Deterministic Embeddings', passed: embeddingResults.deterministic },
    { name: 'Embedding Caching', passed: embeddingResults.caching }
  ];

  const passedTests = allTests.filter(test => test.passed).length;
  const totalTests = allTests.length;

  allTests.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${status} ${test.name}`);
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All vector system tests passed!');
    console.log('The Forest MCP Server is ready for vector operations.');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
    return false;
  }
}

// CLI interface
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCompleteTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export { testHTAVectorStore, testEmbeddingService, runCompleteTest };
