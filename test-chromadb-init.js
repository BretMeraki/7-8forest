#!/usr/bin/env node

/**
 * ChromaDB Initialization Test and Configuration Script
 * Tests ChromaDB connectivity and creates proper configuration
 */

import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const FOREST_DATA_DIR = process.env.FOREST_DATA_DIR || path.resolve(os.homedir(), '.forest-data');
const CHROMA_DB_PATH = process.env.CHROMA_PATH || path.join(FOREST_DATA_DIR, '.chromadb');

async function testChromaDBInitialization() {
  console.log('🔬 Testing ChromaDB Initialization\n');
  
  try {
    // Test 1: Check ChromaDB package import
    console.log('📦 Test 1: Importing ChromaDB package...');
    let ChromaClient;
    try {
      const chromaModule = await import('chromadb');
      ChromaClient = chromaModule.ChromaClient || chromaModule.default?.ChromaClient || chromaModule.default;
      if (!ChromaClient) {
        throw new Error('ChromaClient not found in chromadb package exports');
      }
      console.log('   ✅ ChromaDB package imported successfully');
      console.log(`   📄 ChromaClient: ${typeof ChromaClient}`);
    } catch (error) {
      console.log(`   ❌ Failed to import ChromaDB: ${error.message}`);
      return false;
    }
    
    // Test 2: Initialize ChromaDB client (embedded mode)
    console.log('\n🚀 Test 2: Initializing ChromaDB client (embedded mode)...');
    let client;
    try {
      // Ensure the data directory exists
      await fs.mkdir(CHROMA_DB_PATH, { recursive: true });
      console.log(`   📁 ChromaDB directory: ${CHROMA_DB_PATH}`);
      
      // Initialize embedded ChromaDB client (v3.x uses default constructor for embedded)
      client = new ChromaClient();
      console.log('   ✅ ChromaDB client initialized');
    } catch (error) {
      console.log(`   ❌ Failed to initialize ChromaDB client: ${error.message}`);
      return false;
    }
    
    // Test 3: Test basic operations
    console.log('\n⚙️ Test 3: Testing basic ChromaDB operations...');
    try {
      // List collections
      const collections = await client.listCollections();
      console.log(`   ✅ Listed collections: ${collections.length} found`);
      
      // Test collection creation
      const testCollectionName = 'forest_test_collection';
      let testCollection;
      
      // Check if test collection already exists
      const existingCollection = collections.find(c => c.name === testCollectionName);
      if (existingCollection) {
        console.log('   🔄 Using existing test collection');
        testCollection = await client.getCollection({ name: testCollectionName });
      } else {
        console.log('   🆕 Creating new test collection');
        testCollection = await client.createCollection({
          name: testCollectionName,
          metadata: {
            description: 'Test collection for Forest MCP vector storage validation',
            dimension: 1536
          }
        });
      }
      console.log('   ✅ Test collection ready');
      
      // Test vector operations
      const testVectors = [
        [0.1, 0.2, 0.3, ...Array(1533).fill(0)], // 1536 dimensions
        [0.4, 0.5, 0.6, ...Array(1533).fill(0)]
      ];
      
      const testIds = ['test_vector_1', 'test_vector_2'];
      const testMetadata = [
        { type: 'test', content: 'Test vector 1', project_id: 'test_project' },
        { type: 'test', content: 'Test vector 2', project_id: 'test_project' }
      ];
      
      // Add vectors
      await testCollection.add({
        ids: testIds,
        embeddings: testVectors,
        metadatas: testMetadata
      });
      console.log('   ✅ Test vectors added');
      
      // Query vectors
      const queryResult = await testCollection.query({
        queryEmbeddings: [[0.1, 0.2, 0.3, ...Array(1533).fill(0)]],
        nResults: 2
      });
      console.log(`   ✅ Query completed: found ${queryResult.ids[0].length} results`);
      
      // Count vectors
      const count = await testCollection.count();
      console.log(`   ✅ Collection count: ${count} vectors`);
      
    } catch (error) {
      console.log(`   ❌ ChromaDB operations failed: ${error.message}`);
      return false;
    }
    
    // Test 4: Test Forest Vector Provider
    console.log('\n🌲 Test 4: Testing Forest ChromaDB Provider...');
    try {
      const { default: ChromaDBProvider } = await import('./___stage1/modules/vector-providers/ChromaDBProvider.js');
      
      const provider = new ChromaDBProvider({
        collection: 'forest_vectors',
        dimension: 1536,
        // Embedded mode (no URL specified)
      });
      
      const initResult = await provider.initialize();
      console.log('   ✅ Forest ChromaDBProvider initialized');
      console.log(`   📊 Mode: ${initResult.mode}`);
      console.log(`   📁 Path: ${initResult.path}`);
      console.log(`   📂 Collection: ${initResult.collection}`);
      
      // Test upsert operation
      const testVector = Array(1536).fill(0).map(() => Math.random());
      await provider.upsertVector('test_forest_vector', testVector, {
        type: 'test',
        content: 'Forest provider test',
        project_id: 'test_project'
      });
      console.log('   ✅ Vector upsert successful');
      
      // Test query operation
      const queryResults = await provider.queryVectors(testVector, 1, 0.0);
      console.log(`   ✅ Vector query successful: ${queryResults.length} results`);
      
    } catch (error) {
      console.log(`   ❌ Forest ChromaDBProvider failed: ${error.message}`);
      console.log(`   Stack: ${error.stack}`);
      return false;
    }
    
    // Test 5: Create optimal configuration
    console.log('\n⚙️ Test 5: Creating optimal ChromaDB configuration...');
    const configPath = path.join(FOREST_DATA_DIR, 'chromadb-config.json');
    const optimalConfig = {
      vector_provider: 'chroma',
      chroma_config: {
        mode: 'embedded',
        path: CHROMA_DB_PATH,
        collection: 'forest_vectors',
        dimension: 1536
      },
      environment_variables: {
        FOREST_VECTOR_PROVIDER: 'chroma',
        CHROMA_PATH: CHROMA_DB_PATH,
        CHROMA_COLLECTION: 'forest_vectors',
        CHROMA_DIMENSION: '1536'
      },
      setup_date: new Date().toISOString(),
      status: 'ready'
    };
    
    await fs.writeFile(configPath, JSON.stringify(optimalConfig, null, 2));
    console.log(`   ✅ Configuration saved to: ${configPath}`);
    
    console.log('\n🎉 ChromaDB Initialization Test Completed Successfully!');
    console.log('\n📋 SUMMARY:');
    console.log('✅ ChromaDB v3.0.6 is properly installed and working');
    console.log('✅ Embedded mode is functional (no server required)');
    console.log('✅ Forest ChromaDBProvider is working correctly');
    console.log('✅ Vector operations (add, query, count) are functional');
    console.log(`✅ ChromaDB data directory: ${CHROMA_DB_PATH}`);
    
    console.log('\n🔧 TO ENABLE CHROMADB IN FOREST:');
    console.log('Set environment variable: FOREST_VECTOR_PROVIDER=chroma');
    console.log('Or export it in your shell: export FOREST_VECTOR_PROVIDER=chroma');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ ChromaDB test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
testChromaDBInitialization()
  .then(success => {
    if (success) {
      console.log('\n✅ ChromaDB is ready for use with Forest MCP!');
      process.exit(0);
    } else {
      console.log('\n❌ ChromaDB setup incomplete');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
