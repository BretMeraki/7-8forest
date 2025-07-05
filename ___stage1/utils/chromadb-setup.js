#!/usr/bin/env node

/**
 * ChromaDB Setup and Testing Utility
 * 
 * Ensures ChromaDB is properly configured and operational for the Forest MCP Server.
 * Tests connectivity, collection operations, and vector storage/retrieval.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import ChromaDBProvider from '../modules/vector-providers/ChromaDBProvider.js';
import vectorConfig from '../config/vector-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test ChromaDB connectivity and basic operations
 * @param {object} config - ChromaDB configuration
 * @returns {object} - Test results
 */
async function testChromaDBConnection(config = {}) {
  const testConfig = {
    url: config.url || 'http://localhost:8000',
    collection: config.collection || 'forest_test_vectors',
    dimension: config.dimension || 1536,
    ...config
  };

  console.log(`🔗 Testing ChromaDB connection to ${testConfig.url}...`);

  const results = {
    connection: false,
    initialization: false,
    operations: false,
    performance: {},
    errors: []
  };

  try {
    // Test 1: Basic connection and initialization
    console.log('  📡 Testing connection...');
    const provider = new ChromaDBProvider(testConfig);
    
    const startTime = Date.now();
    const initResult = await provider.initialize(testConfig);
    const initTime = Date.now() - startTime;
    
    results.connection = true;
    results.initialization = true;
    results.performance.initialization = `${initTime}ms`;
    
    console.log(`  ✅ Connected successfully (${initTime}ms)`);
    console.log(`  📋 Collection: ${initResult.collection}`);
    console.log(`  🌐 URL: ${initResult.url}`);

    // Test 2: Vector operations
    console.log('  📊 Testing vector operations...');
    
    // Create test vectors
    const testVectors = [
      {
        id: 'test_vector_1',
        vector: Array.from({ length: testConfig.dimension }, () => Math.random()),
        metadata: { type: 'test', content: 'Test vector 1', timestamp: new Date().toISOString() }
      },
      {
        id: 'test_vector_2', 
        vector: Array.from({ length: testConfig.dimension }, () => Math.random()),
        metadata: { type: 'test', content: 'Test vector 2', timestamp: new Date().toISOString() }
      }
    ];

    // Test upsert
    const upsertStart = Date.now();
    for (const testVec of testVectors) {
      await provider.upsertVector(testVec.id, testVec.vector, testVec.metadata);
    }
    const upsertTime = Date.now() - upsertStart;
    results.performance.upsert = `${upsertTime}ms`;
    console.log(`  ✅ Vector upsert successful (${upsertTime}ms)`);

    // Test query
    const queryStart = Date.now();
    const queryResults = await provider.queryVectors(testVectors[0].vector, {
      limit: 5,
      threshold: 0.0
    });
    const queryTime = Date.now() - queryStart;
    results.performance.query = `${queryTime}ms`;
    
    console.log(`  ✅ Vector query successful (${queryTime}ms)`);
    console.log(`  📊 Query returned ${queryResults.length} results`);

    // Test list vectors
    const listStart = Date.now();
    const listResults = await provider.listVectors('test_');
    const listTime = Date.now() - listStart;
    results.performance.list = `${listTime}ms`;
    
    console.log(`  ✅ Vector listing successful (${listTime}ms)`);
    console.log(`  📋 Found ${listResults.length} test vectors`);

    // Cleanup test vectors
    try {
      await provider.deleteNamespace('test_');
      console.log('  🧹 Test vectors cleaned up');
    } catch (cleanupError) {
      console.log('  ⚠️  Cleanup warning:', cleanupError.message);
    }

    results.operations = true;
    
  } catch (error) {
    results.errors.push({
      stage: 'connection_test',
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });
    console.log(`  ❌ Test failed: ${error.message}`);
  }

  return results;
}

/**
 * Check if ChromaDB server is running
 * @param {string} url - ChromaDB server URL
 * @returns {boolean} - True if server is responding
 */
async function checkChromaDBServer(url = 'http://localhost:8000') {
  try {
    console.log(`🏥 Checking ChromaDB server health at ${url}...`);
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${url}/api/v1/heartbeat`, {
      method: 'GET',
      timeout: 5000
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Server is healthy`);
      console.log(`  📊 Response:`, data);
      return true;
    } else {
      console.log(`  ❌ Server responded with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Server check failed: ${error.message}`);
    return false;
  }
}

/**
 * Setup ChromaDB for Forest MCP Server
 * @param {object} options - Setup options
 */
async function setupChromaDB(options = {}) {
  const {
    url = vectorConfig.chroma.url,
    collection = vectorConfig.chroma.collection,
    dimension = vectorConfig.chroma.dimension,
    force = false,
    test = true
  } = options;

  console.log('🚀 ChromaDB Setup for Forest MCP Server');
  console.log('========================================\n');

  const config = { 
    url, 
    collection, 
    dimension,
    path: options.path || vectorConfig.chroma.path
  };
  
  // Step 1: Determine mode and check availability
  const useEmbedded = !url || url.includes('embedded');
  
  if (useEmbedded) {
    console.log('🔧 Using ChromaDB in embedded mode (no server required)');
    console.log(`📁 Data will be stored in: ${config.path || '.chromadb'}`);
  } else {
    const serverHealthy = await checkChromaDBServer(url);
    
    if (!serverHealthy) {
      console.log('\n💡 ChromaDB Server Setup Instructions:');
      console.log('=====================================');
      console.log('1. Install ChromaDB server:');
      console.log('   pip install chromadb');
      console.log('2. Start ChromaDB server:');
      console.log('   chroma run --host localhost --port 8000');
      console.log('3. Or using Docker:');
      console.log('   docker run -p 8000:8000 chromadb/chroma');
      console.log('\nAlternatively, use embedded mode by setting CHROMA_URL=embedded://localhost');
      return { success: false, reason: 'server_not_available' };
    }
  }

  // Step 2: Test connection and operations
  if (test) {
    console.log('\n🧪 Testing ChromaDB Operations:');
    console.log('===============================');
    
    const testResults = await testChromaDBConnection(config);
    
    if (!testResults.connection || !testResults.operations) {
      console.log('\n❌ ChromaDB tests failed!');
      console.log('Errors:', testResults.errors);
      return { success: false, reason: 'tests_failed', results: testResults };
    }
    
    console.log('\n✅ All ChromaDB tests passed!');
    console.log('Performance metrics:', testResults.performance);
  }

  // Step 3: Configure for production use
  console.log('\n⚙️  Production Configuration:');
  console.log('============================');
  
  const productionConfig = {
    url,
    collection: 'forest_vectors', // Production collection
    dimension
  };

  try {
    const provider = new ChromaDBProvider(productionConfig);
    await provider.initialize(productionConfig);
    console.log(`✅ Production collection '${productionConfig.collection}' ready`);
    
    // Test with a sample HTA vector
    const sampleVector = Array.from({ length: dimension }, () => Math.random());
    await provider.upsertVector('forest_health_check', sampleVector, {
      type: 'health_check',
      content: 'Forest MCP Server health check vector',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
    console.log('✅ Sample vector stored successfully');
    
    // Verify retrieval
    const retrieved = await provider.listVectors('forest_health_check');
    if (retrieved.length > 0) {
      console.log('✅ Vector retrieval confirmed');
    }
    
  } catch (error) {
    console.log(`❌ Production setup failed: ${error.message}`);
    return { success: false, reason: 'production_setup_failed', error: error.message };
  }

  // Step 4: Generate environment configuration
  console.log('\n🔧 Environment Configuration:');
  console.log('=============================');
  console.log('Add these environment variables to enable ChromaDB:');
  console.log('');
  console.log(`export FOREST_VECTOR_PROVIDER=chroma`);
  console.log(`export CHROMA_URL=${url}`);
  console.log(`export CHROMA_COLLECTION=${collection}`);
  console.log(`export CHROMA_DIMENSION=${dimension}`);
  console.log('');
  console.log('Or in .env file:');
  console.log(`FOREST_VECTOR_PROVIDER=chroma`);
  console.log(`CHROMA_URL=${url}`);
  console.log(`CHROMA_COLLECTION=${collection}`);
  console.log(`CHROMA_DIMENSION=${dimension}`);

  return { 
    success: true, 
    config: productionConfig,
    serverUrl: url,
    ready: true
  };
}

/**
 * Run ChromaDB diagnostics
 */
async function runDiagnostics() {
  console.log('🔍 ChromaDB Diagnostics');
  console.log('=======================\n');

  // Check package installation
  try {
    const chromadb = await import('chromadb');
    console.log('✅ ChromaDB package is installed');
    console.log(`   Version: ${chromadb.version || 'unknown'}`);
  } catch (error) {
    console.log('❌ ChromaDB package not found');
    console.log('   Install with: npm install chromadb');
    return;
  }

  // Test different server URLs
  const testUrls = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://0.0.0.0:8000'
  ];

  for (const url of testUrls) {
    await checkChromaDBServer(url);
  }

  // Test with current configuration
  console.log('\n📋 Testing with current vector configuration:');
  const testResults = await testChromaDBConnection(vectorConfig.chroma);
  
  if (testResults.operations) {
    console.log('\n🎉 ChromaDB is ready for Forest MCP Server!');
  } else {
    console.log('\n⚠️  ChromaDB needs attention before use.');
  }
}

// CLI interface
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const command = args[0] || 'setup';

  switch (command) {
    case 'setup':
      setupChromaDB({
        force: args.includes('--force'),
        test: !args.includes('--no-test')
      }).then(result => {
        if (result.success) {
          console.log('\n🎉 ChromaDB setup completed successfully!');
          console.log('The Forest MCP Server is ready to use ChromaDB for vector operations.');
        } else {
          console.log(`\n❌ Setup failed: ${result.reason}`);
          process.exit(1);
        }
      }).catch(error => {
        console.error('Setup error:', error);
        process.exit(1);
      });
      break;

    case 'test':
      testChromaDBConnection(vectorConfig.chroma).then(results => {
        if (results.operations) {
          console.log('\n✅ ChromaDB tests passed!');
        } else {
          console.log('\n❌ ChromaDB tests failed!');
          process.exit(1);
        }
      });
      break;

    case 'diagnose':
      runDiagnostics();
      break;

    case 'server-check':
      const url = args[1] || 'http://localhost:8000';
      checkChromaDBServer(url).then(healthy => {
        process.exit(healthy ? 0 : 1);
      });
      break;

    default:
      console.log('ChromaDB Setup Utility');
      console.log('======================');
      console.log('');
      console.log('Usage:');
      console.log('  node chromadb-setup.js setup [--force] [--no-test]');
      console.log('  node chromadb-setup.js test');
      console.log('  node chromadb-setup.js diagnose');
      console.log('  node chromadb-setup.js server-check [url]');
      console.log('');
      console.log('Commands:');
      console.log('  setup     - Complete ChromaDB setup and configuration');
      console.log('  test      - Test ChromaDB operations');
      console.log('  diagnose  - Run comprehensive diagnostics');
      console.log('  server-check - Check if ChromaDB server is running');
  }
}

export { setupChromaDB, testChromaDBConnection, checkChromaDBServer, runDiagnostics };
