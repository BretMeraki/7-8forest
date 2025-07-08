#!/usr/bin/env node

/**
 * Simple ChromaDB Connectivity Test
 * Tests if we can establish a basic connection
 */

async function testSimpleChromaDB() {
  console.error('🧪 Testing Simple ChromaDB Connectivity...\n');

  try {
    // Import ChromaDB
    const { ChromaClient } = await import('chromadb');
    console.error('✅ ChromaDB npm package imported successfully');

    // Try to create a client with different configurations
    const configs = [
      { name: 'Default (auto-detect)', config: {} },
      { name: 'Localhost:8000', config: { path: 'http://localhost:8000' } },
      { name: 'Localhost:8001', config: { path: 'http://localhost:8001' } },
      { name: 'Host/Port 8000', config: { host: 'localhost', port: 8000 } },
      { name: 'Host/Port 8001', config: { host: 'localhost', port: 8001 } }
    ];

    for (const { name, config } of configs) {
      console.error(`\n📋 Testing: ${name}`);
      try {
        const client = new ChromaClient(config);
        console.error(`✅ Client created: ${name}`);
        
        // Try to ping the client
        const heartbeat = await client.heartbeat();
        console.error(`✅ Heartbeat successful: ${JSON.stringify(heartbeat)}`);
        
        // Try to list collections
        const collections = await client.listCollections();
        console.error(`✅ Collections listed: ${collections.length} found`);
        
        return { success: true, config: name };
        
      } catch (error) {
        console.error(`❌ Failed (${name}): ${error.message}`);
      }
    }

    return { success: false, error: 'No working configuration found' };

  } catch (error) {
    console.error(`❌ ChromaDB import/test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run test
testSimpleChromaDB()
  .then(result => {
    console.error('\n' + '='.repeat(50));
    if (result.success) {
      console.error(`✅ SUCCESS: ChromaDB is working with ${result.config}`);
      console.error('🎯 Ready for Forest integration!');
    } else {
      console.error(`❌ FAILED: ${result.error}`);
      console.error('💡 Need to start ChromaDB server or fix configuration');
    }
  })
  .catch(error => {
    console.error(`\n💥 Test crashed: ${error.message}`);
  });