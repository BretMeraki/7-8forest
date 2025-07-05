#!/usr/bin/env node

/**
 * Validation Script: Test Vector Store Integration
 * Validates that the HTA vector store is working correctly
 */

import { Stage1CoreServer } from '../core-server.js';

class VectorIntegrationValidator {
  constructor() {
    this.server = null;
    this.testResults = {
      initialization: false,
      vectorStore: false,
      htaCreation: false,
      vectorQuery: false,
      taskSelection: false
    };
  }

  async run() {
    console.log('🧪 Validating Vector Store Integration...\n');
    
    try {
      await this.testInitialization();
      await this.testVectorStore();
      await this.testHTACreation();
      await this.testVectorQuery();
      await this.testTaskSelection();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  async testInitialization() {
    console.log('🔄 Testing server initialization...');
    
    try {
      const server = new Stage1CoreServer();
      await server.initialize();
      this.server = server;
      // Use PascalCase method names
      if (server.htaCore && typeof server.htaCore.buildHTATree === 'function') {
        await server.htaCore.buildHTATree();
      }
      if (server.htaCore && typeof server.htaCore.getHTAStatus === 'function') {
        const status = await server.htaCore.getHTAStatus();
        console.log('HTA Status:', status);
      }
      // Validate vector store access
      if (server.htaCore && server.htaCore.vectorStore) {
        console.log('Vector store initialized:', !!server.htaCore.vectorStore.initialized);
      }
      console.log('Initialization test passed.');
      this.testResults.initialization = true;
    } catch (err) {
      console.error('Initialization test failed:', err.message);
      throw err;
    }
  }

  async testVectorStore() {
    console.log('🔄 Testing vector store...');
    
    try {
      const htaCore = this.server?.htaCore;
      if (!htaCore) {
        throw new Error('HTACore not available');
      }
      
      const vectorStore = await htaCore.ensureVectorStore();
      if (!vectorStore) {
        throw new Error('Vector store not available');
      }
      
      console.log('✅ Vector store is available');
      this.testResults.vectorStore = true;
    } catch (error) {
      console.log('❌ Vector store test failed:', error.message);
      throw error;
    }
  }

  async testHTACreation() {
    console.log('🔄 Testing HTA creation with vector storage...');
    
    try {
      const testProjectId = `test_vector_${Date.now()}`;
      
      const result = await this.server.htaCore.buildHTATree({
        goal: 'Learn basic programming concepts',
        context: 'Beginner friendly introduction to coding',
        projectId: testProjectId,
        pathName: 'general'
      });
      
      if (!result?.frontierNodes?.length) {
        throw new Error('No HTA nodes created');
      }
      
      console.log(`✅ HTA created with ${result.frontierNodes.length} nodes`);
      this.testResults.htaCreation = true;
      this.testProjectId = testProjectId;
    } catch (error) {
      console.log('❌ HTA creation test failed:', error.message);
      throw error;
    }
  }

  async testVectorQuery() {
    console.log('🔄 Testing vector query...');
    
    try {
      const htaCore = this.server?.htaCore;
      const vectorStore = await htaCore.ensureVectorStore();
      
      const stats = await vectorStore.getProjectStats(this.testProjectId);
      
      if (stats.taskCount === 0) {
        throw new Error('No tasks found in vector store');
      }
      
      console.log(`✅ Vector query successful (${stats.taskCount} tasks found)`);
      this.testResults.vectorQuery = true;
    } catch (error) {
      console.log('❌ Vector query test failed:', error.message);
      throw error;
    }
  }

  async testTaskSelection() {
    console.log('🔄 Testing vector-based task selection...');
    
    try {
      const htaCore = this.server?.htaCore;
      const vectorStore = await htaCore.ensureVectorStore();
      
      const task = await vectorStore.findNextTask(
        this.testProjectId,
        'programming learning',
        3,
        '30 minutes'
      );
      
      if (!task) {
        throw new Error('No task selected');
      }
      
      console.log(`✅ Task selection successful: "${task.title}"`);
      this.testResults.taskSelection = true;
    } catch (error) {
      console.log('❌ Task selection test failed:', error.message);
      throw error;
    }
  }

  printResults() {
    console.log('\n📊 Validation Results:');
    console.log('=====================================');
    
    for (const [test, passed] of Object.entries(this.testResults)) {
      const status = passed ? '✅' : '❌';
      console.log(`${status} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    }
    
    const totalTests = Object.keys(this.testResults).length;
    const passedTests = Object.values(this.testResults).filter(Boolean).length;
    
    console.log(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Vector integration is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Check the implementation.');
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    try {
      if (this.testProjectId && this.server) {
        const vectorStore = await this.server?.htaCore?.ensureVectorStore();
        if (vectorStore) {
          await vectorStore.deleteProject(this.testProjectId);
        }
      }
      
      if (this.server) {
        await this.server.cleanup();
      }
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.log('⚠️ Cleanup failed:', error.message);
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new VectorIntegrationValidator();
  validator.run().catch(console.error);
}

export { VectorIntegrationValidator }; 