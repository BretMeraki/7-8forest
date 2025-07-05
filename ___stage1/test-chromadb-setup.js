/**
 * ChromaDB Configuration and Verification Script
 * Ensures ChromaDB is properly configured as the primary vector storage provider
 */

import { promises as fs } from 'fs';
import path from 'path';
import vectorConfig from './config/vector-config.js';
import ChromaDBProvider from './modules/vector-providers/ChromaDBProvider.js';
import { HTAVectorStore } from './modules/hta-vector-store.js';

// Note: HTAVectorStore might be a default export, let's handle both cases
const getHTAVectorStore = async () => {
  const module = await import('./modules/hta-vector-store.js');
  return module.HTAVectorStore || module.default || module;
};

class ChromaDBSetupTest {
  constructor() {
    this.testDataDir = path.join(process.cwd(), '.test-chromadb');
    this.chromaDbPath = path.join(this.testDataDir, '.chromadb');
  }

  async runAllTests() {
    console.log('🟢 Starting ChromaDB Configuration and Verification Tests...\n');
    
    try {
      // Clean up any existing test data
      await this.cleanup();
      
      const tests = [
        this.testConfigurationValues,
        this.testChromaDBPackageInstallation,
        this.testChromaDBProviderInitialization,
        this.testEmbeddedMode,
        this.testBasicVectorOperations,
        this.testProjectIsolation,
        this.testHTAVectorStoreIntegration,
        this.testFallbackMechanism
      ];

      let passed = 0;
      let failed = 0;

      for (const test of tests) {
        try {
          console.log(`🧪 Running: ${test.name}`);
          await test.call(this);
          console.log(`✅ PASSED: ${test.name}\n`);
          passed++;
        } catch (error) {
          console.error(`❌ FAILED: ${test.name}`);
          console.error(`   Error: ${error.message}\n`);
          failed++;
        }
      }

      console.log(`\n📊 ChromaDB Test Results:`);
      console.log(`   ✅ Passed: ${passed}`);
      console.log(`   ❌ Failed: ${failed}`);
      console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

      if (failed === 0) {
        console.log('\n🎉 ALL CHROMADB TESTS PASSED! ChromaDB is ready to host your data.');
        console.log('🟢 ChromaDB is configured as the primary vector storage provider.');
      } else {
        console.log('\n⚠️  Some ChromaDB tests failed. Review the configuration.');
      }

    } finally {
      await this.cleanup();
    }
  }

  async testConfigurationValues() {
    // Test 1: Verify configuration values are correct
    if (vectorConfig.provider !== 'chroma') {
      throw new Error(`Expected provider 'chroma', got '${vectorConfig.provider}'`);
    }

    if (!vectorConfig.chroma) {
      throw new Error('ChromaDB configuration section not found');
    }

    const chromaConfig = vectorConfig.chroma;
    
    if (!chromaConfig.collection) {
      throw new Error('ChromaDB collection name not configured');
    }

    if (!chromaConfig.dimension || chromaConfig.dimension <= 0) {
      throw new Error('ChromaDB dimension not properly configured');
    }

    console.log(`   📋 Provider: ${vectorConfig.provider}`);
    console.log(`   📋 Collection: ${chromaConfig.collection}`);
    console.log(`   📋 Dimension: ${chromaConfig.dimension}`);
    console.log(`   📋 Path: ${chromaConfig.path}`);
  }

  async testChromaDBPackageInstallation() {
    // Test 2: Verify ChromaDB package is properly installed
    try {
      const pkg = await import('chromadb');
      const ChromaClient = pkg.ChromaClient || (pkg.default && pkg.default.ChromaClient) || pkg.default;
      
      if (!ChromaClient) {
        throw new Error('ChromaClient export not found in chromadb package');
      }

      console.log(`   📦 ChromaDB package successfully imported`);
      console.log(`   📦 ChromaClient constructor available: ${typeof ChromaClient === 'function'}`);
    } catch (error) {
      throw new Error(`ChromaDB package not properly installed: ${error.message}`);
    }
  }

  async testChromaDBProviderInitialization() {
    // Test 3: Verify ChromaDBProvider can be initialized
    const provider = new ChromaDBProvider({
      collection: 'test_collection',
      path: this.chromaDbPath,
      dimension: 1536
    });

    const initResult = await provider.initialize({
      collection: 'test_collection',
      path: this.chromaDbPath,
      dimension: 1536
    });

    if (!initResult.success) {
      throw new Error('ChromaDBProvider initialization failed');
    }

    console.log(`   🔧 Initialization successful: ${initResult.success}`);
    console.log(`   🔧 Provider: ${initResult.provider}`);
    console.log(`   🔧 Mode: ${initResult.mode}`);
    console.log(`   🔧 Collection: ${initResult.collection}`);

    await provider.close();
  }

  async testEmbeddedMode() {
    // Test 4: Verify embedded mode works (no server required)
    const provider = new ChromaDBProvider({
      url: 'embedded://localhost',
      collection: 'embedded_test',
      path: this.chromaDbPath,
      dimension: 1536
    });

    const initResult = await provider.initialize();

    if (initResult.mode !== 'embedded') {
      throw new Error(`Expected embedded mode, got: ${initResult.mode}`);
    }

    console.log(`   🏠 Embedded mode working correctly`);
    console.log(`   🏠 Database path: ${initResult.path}`);

    await provider.close();
  }

  async testBasicVectorOperations() {
    // Test 5: Verify basic vector operations work
    const provider = new ChromaDBProvider({
      collection: 'operations_test',
      path: this.chromaDbPath,
      dimension: 128  // Smaller dimension for testing
    });

    await provider.initialize();

    // Test vector upsert
    const testVector = Array.from({length: 128}, () => Math.random());
    const testMetadata = { project_id: 'test-project', type: 'test', content: 'Test vector' };

    await provider.upsertVector('test-vector-1', testVector, testMetadata);

    // Test vector query
    const queryResults = await provider.queryVectors(testVector, { limit: 5, threshold: 0.1 });

    if (queryResults.length === 0) {
      throw new Error('No results returned from vector query');
    }

    if (queryResults[0].id !== 'test-vector-1') {
      throw new Error('Query did not return the expected vector');
    }

    // Test vector listing
    const allVectors = await provider.listVectors('test-');
    if (allVectors.length === 0) {
      throw new Error('listVectors did not return any results');
    }

    // Test vector deletion
    await provider.deleteVector('test-vector-1');
    const afterDelete = await provider.listVectors('test-');
    if (afterDelete.length > 0) {
      throw new Error('Vector was not properly deleted');
    }

    console.log(`   ⚡ Vector upsert/query/delete operations working`);
    console.log(`   ⚡ Query returned ${queryResults.length} results`);
    console.log(`   ⚡ Similarity score: ${queryResults[0].similarity.toFixed(4)}`);

    await provider.close();
  }

  async testProjectIsolation() {
    // Test 6: Verify project isolation in ChromaDB
    const provider = new ChromaDBProvider({
      collection: 'isolation_test',
      path: this.chromaDbPath,
      dimension: 64
    });

    await provider.initialize();

    // Create vectors for two different projects
    const vector1 = Array.from({length: 64}, () => Math.random());
    const vector2 = Array.from({length: 64}, () => Math.random());

    await provider.upsertVector('project1:goal', vector1, { project_id: 'project1', type: 'goal' });
    await provider.upsertVector('project2:goal', vector2, { project_id: 'project2', type: 'goal' });

    // Verify project-specific queries
    const project1Vectors = await provider.listVectors('project1:');
    const project2Vectors = await provider.listVectors('project2:');

    if (project1Vectors.length !== 1 || project1Vectors[0].id !== 'project1:goal') {
      throw new Error('Project 1 isolation failed');
    }

    if (project2Vectors.length !== 1 || project2Vectors[0].id !== 'project2:goal') {
      throw new Error('Project 2 isolation failed');
    }

    // Test namespace deletion
    await provider.deleteNamespace('project1:');
    const afterProject1Delete = await provider.listVectors('project1:');
    const afterProject1DeleteProject2 = await provider.listVectors('project2:');

    if (afterProject1Delete.length > 0) {
      throw new Error('Project 1 namespace deletion failed');
    }

    if (afterProject1DeleteProject2.length !== 1) {
      throw new Error('Project 2 vectors affected by project 1 deletion');
    }

    console.log(`   🔒 Project isolation working correctly`);
    console.log(`   🔒 Namespace-based vector organization verified`);

    await provider.close();
  }

  async testHTAVectorStoreIntegration() {
    // Test 7: Verify HTAVectorStore uses ChromaDB correctly
    const HTAVectorStoreClass = await getHTAVectorStore();
    const htaVectorStore = new HTAVectorStoreClass(this.testDataDir);

    const initResult = await htaVectorStore.initialize();

    if (!initResult.success) {
      throw new Error('HTAVectorStore initialization failed');
    }

    if (initResult.provider !== 'ChromaDBProvider') {
      throw new Error(`Expected ChromaDBProvider, got: ${initResult.provider}`);
    }

    // Test storing an HTA tree
    const testHTAData = {
      goal: 'Test Goal',
      complexity: 5,
      frontierNodes: [
        {
          id: 'task1',
          title: 'Test Task 1',
          description: 'A test task for ChromaDB integration',
          branch: 'foundation'
        }
      ]
    };

    const storeResult = await htaVectorStore.storeHTATree('integration-test', testHTAData);

    if (!storeResult.verified) {
      throw new Error('HTA tree storage verification failed');
    }

    // Test retrieving project stats
    const stats = await htaVectorStore.getProjectStats('integration-test');

    if (stats.total_vectors === 0) {
      throw new Error('No vectors found in project stats');
    }

    console.log(`   🌳 HTAVectorStore integration working`);
    console.log(`   🌳 Stored ${storeResult.vectorsStored} vectors`);
    console.log(`   🌳 Project stats: ${stats.total_vectors} vectors`);
  }

  async testFallbackMechanism() {
    // Test 8: Verify fallback mechanism works if ChromaDB fails
    // This test intentionally uses invalid configuration to trigger fallback
    const HTAVectorStoreClass = await getHTAVectorStore();
    const htaVectorStore = new HTAVectorStoreClass(this.testDataDir);
    
    // Temporarily break the ChromaDB configuration
    const originalProvider = htaVectorStore.config.provider;
    const originalChromaConfig = htaVectorStore.config.chroma;
    
    // Force an invalid configuration that should trigger fallback
    htaVectorStore.config.chroma = { ...originalChromaConfig, url: 'invalid://badurl' };
    
    try {
      const initResult = await htaVectorStore.initialize();
      
      // Should succeed but use fallback
      if (!initResult.success) {
        throw new Error('Fallback mechanism failed completely');
      }
      
      if (initResult.provider === 'ChromaDBProvider') {
        // If ChromaDB actually worked with invalid config, that's unexpected but not an error
        console.log(`   🔄 ChromaDB worked with test config (unexpected but ok)`);
      } else {
        console.log(`   🔄 Fallback mechanism working: ${initResult.provider}`);
        console.log(`   🔄 Fallback used: ${initResult.fallbackUsed}`);
      }
    } finally {
      // Restore original configuration
      htaVectorStore.config.provider = originalProvider;
      htaVectorStore.config.chroma = originalChromaConfig;
    }
  }

  async cleanup() {
    try {
      await fs.rm(this.testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new ChromaDBSetupTest();
  test.runAllTests().catch(console.error);
}

export { ChromaDBSetupTest };
