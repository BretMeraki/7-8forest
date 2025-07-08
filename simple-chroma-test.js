#!/usr/bin/env node

/**
 * Simple ChromaDB v3.x API Test
 */

async function testChromaAPI() {
  console.log('🔬 Testing ChromaDB v3.x API\n');
  
  try {
    // Import ChromaDB
    const chromaModule = await import('chromadb');
    console.log('📦 ChromaDB module imported');
    console.log('📄 Available exports:', Object.keys(chromaModule));
    
    // Try different client initialization methods
    console.log('\n🚀 Testing client initialization methods...');
    
    // Method 1: Default constructor
    try {
      const client1 = new chromaModule.ChromaClient();
      console.log('✅ Method 1: new ChromaClient() - works');
      
      // Test basic operation
      const heartbeat = await client1.heartbeat();
      console.log('✅ Heartbeat successful:', heartbeat);
      
      const collections = await client1.listCollections();
      console.log('✅ List collections successful:', collections.length, 'collections');
      
    } catch (error) {
      console.log('❌ Method 1 failed:', error.message);
    }
    
    // Method 2: With configuration
    try {
      const client2 = new chromaModule.ChromaClient({
        path: "http://localhost:8000"
      });
      console.log('✅ Method 2: ChromaClient({path}) - works');
    } catch (error) {
      console.log('❌ Method 2 failed:', error.message);
    }
    
    // Method 3: CloudClient (if available)
    if (chromaModule.CloudClient) {
      try {
        console.log('📡 CloudClient available');
      } catch (error) {
        console.log('❌ CloudClient failed:', error.message);
      }
    }
    
    // Check for OpenAI embedding function
    if (chromaModule.OpenAIEmbeddingFunction) {
      console.log('✅ OpenAI embedding function available');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testChromaAPI();
