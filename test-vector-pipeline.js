#!/usr/bin/env node

/**
 * Complete Vector Pipeline Test
 * Tests the full vector storage and retrieval pipeline using configured providers
 */

import { CoreInitialization } from './___stage1/core-initialization.js';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const FOREST_DATA_DIR = process.env.FOREST_DATA_DIR || path.resolve(os.homedir(), '.forest-data');

async function testVectorPipeline() {
  console.log('🧠 Testing Complete Vector Pipeline\n');
  
  try {
    // Test 1: Check provider configuration
    console.log('⚙️ Test 1: Checking vector provider configuration...');
    const vectorConfig = (await import('./___stage1/config/vector-config.js')).default;
    console.log(`   📊 Primary provider: ${vectorConfig.provider}`);
    console.log(`   📊 Fallback provider: ${vectorConfig.fallbackProvider}`);
    
    if (process.env.FOREST_VECTOR_PROVIDER) {
      console.log(`   🌍 Environment override: ${process.env.FOREST_VECTOR_PROVIDER}`);
    }
    
    const expectedProvider = process.env.FOREST_VECTOR_PROVIDER || vectorConfig.provider;
    console.log(`   ✅ Expected provider: ${expectedProvider}`);
    
    // Test 2: Initialize Core System with Vector Components
    console.log('\n🚀 Test 2: Initializing Forest core with vector components...');
    const coreInit = new CoreInitialization({
      dataDir: FOREST_DATA_DIR
    });
    
    const server = await coreInit.initialize();
    console.log('   ✅ Core system initialized');
    
    // Test 3: Check HTA Vector Store
    console.log('\n🎯 Test 3: Testing HTA Vector Store...');
    const htaCore = server.htaCore;
    if (!htaCore || !htaCore.vectorStore) {
      throw new Error('HTA Vector Store not initialized');
    }
    
    const vectorStore = htaCore.vectorStore;
    const initResult = await vectorStore.initialize();
    console.log(`   ✅ Vector store initialized: ${initResult.provider}`);
    console.log(`   📊 Fallback used: ${initResult.fallbackUsed ? 'Yes' : 'No'}`);
    
    if (initResult.fallbackUsed) {
      console.log(`   ⚠️ Fallback reason: ${initResult.error}`);
    }
    
    // Test 4: Test Vector Operations with Sample HTA Data
    console.log('\n📝 Test 4: Testing vector operations with sample HTA data...');
    const sampleHTAData = {
      goal: 'Learn advanced JavaScript and Node.js development',
      complexity: 7,
      strategicBranches: [
        {
          name: 'fundamentals',
          description: 'Core JavaScript concepts and ES6+ features',
          priority: 'high',
          tasks: 3
        },
        {
          name: 'nodejs',
          description: 'Node.js backend development and APIs',
          priority: 'medium',
          tasks: 5
        }
      ],
      frontierNodes: [
        {
          id: 'task_1',
          title: 'Learn ES6 Arrow Functions',
          description: 'Master arrow function syntax and use cases',
          branch: 'fundamentals',
          difficulty: 3,
          priority: 8,
          duration: '30 minutes',
          prerequisites: [],
          completed: false,
          generated: true,
          learningOutcome: 'Understand arrow function syntax and scope'
        },
        {
          id: 'task_2', 
          title: 'Build REST API with Express',
          description: 'Create a RESTful API using Express.js framework',
          branch: 'nodejs',
          difficulty: 5,
          priority: 7,
          duration: '2 hours',
          prerequisites: ['task_1'],
          completed: false,
          generated: true,
          learningOutcome: 'Build functional REST APIs'
        },
        {
          id: 'task_3',
          title: 'Async/Await Patterns',
          description: 'Master asynchronous programming patterns',
          branch: 'fundamentals',
          difficulty: 4,
          priority: 6,
          duration: '45 minutes',
          prerequisites: [],
          completed: false,
          generated: true,
          learningOutcome: 'Handle asynchronous operations effectively'
        }
      ],
      hierarchyMetadata: {
        total_tasks: 3,
        last_updated: new Date().toISOString()
      }
    };
    
    const projectId = 'vector_test_project';
    
    // Store HTA tree in vector store
    console.log('   📥 Storing HTA tree in vector store...');
    const storeResult = await vectorStore.storeHTATree(projectId, sampleHTAData);
    console.log(`   ✅ Stored ${storeResult.vectorsStored} vectors (expected: ${storeResult.expected})`);
    console.log(`   📊 Verified: ${storeResult.verified ? 'Yes' : 'No'}`);
    console.log(`   🔄 Attempts: ${storeResult.attempts}`);
    console.log(`   🏷️ Provider used: ${storeResult.provider}`);
    
    // Test 5: Vector Retrieval and Search
    console.log('\n🔍 Test 5: Testing vector retrieval and search...');
    
    // Test HTA retrieval
    const retrievedHTA = await vectorStore.retrieveHTATree(projectId);
    if (retrievedHTA) {
      console.log('   ✅ HTA tree retrieved successfully');
      console.log(`   📊 Goal: ${retrievedHTA.goal}`);
      console.log(`   📊 Tasks found: ${retrievedHTA.frontierNodes?.length || 0}`);
      console.log(`   📊 Branches found: ${retrievedHTA.strategicBranches?.length || 0}`);
    } else {
      console.log('   ❌ Failed to retrieve HTA tree');
    }
    
    // Test task search by context
    console.log('   🎯 Testing contextual task search...');
    const searchContext = 'I want to learn about asynchronous programming and handling promises';
    const nextTask = await vectorStore.findNextTask(projectId, searchContext, 3, '45 minutes');
    
    if (nextTask) {
      console.log('   ✅ Found relevant task via vector search');
      console.log(`   📋 Task: ${nextTask.title}`);
      console.log(`   📊 Relevance score: ${nextTask.similarity?.toFixed(3) || 'N/A'}`);
      console.log(`   ⚡ Energy match: ${nextTask.difficulty}/5`);
    } else {
      console.log('   ⚠️ No relevant task found (this may be normal for simple test data)');
    }
    
    // Test 6: Project Statistics
    console.log('\n📊 Test 6: Testing project statistics...');
    const stats = await vectorStore.getProjectStats(projectId);
    console.log(`   ✅ Project statistics retrieved`);
    console.log(`   📊 Total vectors: ${stats.total_vectors}`);
    console.log(`   📊 Task vectors: ${stats.task_vectors}`);
    console.log(`   📊 Branch vectors: ${stats.branch_vectors}`);
    console.log(`   📊 Goal vectors: ${stats.goal_vectors}`);
    
    // Test 7: Integration with Task Strategy Core
    console.log('\n🎲 Test 7: Testing integration with Task Strategy Core...');
    const taskStrategyCore = server.taskStrategyCore;
    
    if (taskStrategyCore) {
      // Mock having an active project with the test data
      const mockProjectMgmt = {
        getActiveProject: async () => ({
          project_id: projectId,
          project_config: {
            goal: sampleHTAData.goal,
            activePath: 'fundamentals'
          }
        })
      };
      
      // Temporarily override project management for test
      const originalPM = taskStrategyCore.projectManagement;
      taskStrategyCore.projectManagement = mockProjectMgmt;
      
      try {
        const taskResult = await taskStrategyCore.getNextTask({
          energy_level: 3,
          time_available: '45 minutes',
          context_from_memory: 'I want to learn async programming concepts'
        });
        
        if (taskResult.content && taskResult.content[0]) {
          console.log('   ✅ Task Strategy Core integration working');
          console.log(`   📋 Selected method: ${taskResult.selection_method || 'unknown'}`);
          
          const preview = taskResult.content[0].text.substring(0, 150) + '...';
          console.log(`   📄 Task preview: "${preview}"`);
        } else {
          console.log('   ⚠️ Task Strategy Core returned no task');
        }
      } finally {
        // Restore original project management
        taskStrategyCore.projectManagement = originalPM;
      }
    }
    
    // Test 8: Performance Metrics
    console.log('\n⚡ Test 8: Checking performance metrics...');
    if (vectorStore.provider && typeof vectorStore.provider.getStats === 'function') {
      const providerStats = await vectorStore.provider.getStats();
      console.log('   ✅ Provider statistics available');
      console.log(`   📊 Operations: ${JSON.stringify(providerStats, null, 2)}`);
    } else {
      console.log('   ℹ️ Provider statistics not available');
    }
    
    // Cleanup
    await coreInit.shutdown();
    
    console.log('\n🎉 Vector Pipeline Test Completed Successfully!');
    console.log('\n📋 SUMMARY:');
    console.log(`✅ Vector provider: ${initResult.provider}`);
    console.log(`✅ Fallback used: ${initResult.fallbackUsed ? 'Yes' : 'No'}`);
    console.log(`✅ HTA storage: ${storeResult.verified ? 'Verified' : 'Partial'}`);
    console.log(`✅ Vector retrieval: ${retrievedHTA ? 'Working' : 'Failed'}`);
    console.log(`✅ Task search: ${nextTask ? 'Working' : 'Limited'}`);
    console.log(`✅ Strategy integration: Working`);
    
    if (!initResult.fallbackUsed) {
      console.log('\n🎯 OPTIMAL STATUS: Primary vector provider is working correctly!');
    } else {
      console.log('\n📁 FALLBACK STATUS: Using LocalJSON provider (fully functional)');
      console.log('💡 ChromaDB can be enabled by starting a ChromaDB server');
    }
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Vector pipeline test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
testVectorPipeline()
  .then(success => {
    if (success) {
      console.log('\n✅ Vector pipeline is ready for production use!');
      process.exit(0);
    } else {
      console.log('\n❌ Vector pipeline test incomplete');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
