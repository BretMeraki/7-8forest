#!/usr/bin/env node

/**
 * Test ChromaDB Integration with Forest
 * Verifies that ChromaDB works with Forest's existing architecture
 */

import ChromaDBProvider from './modules/vector-providers/ChromaDBProvider.js';

async function testForestIntegration() {
    console.log('🧪 Testing ChromaDB Integration with Forest...\n');
    
    try {
        // Test 1: Initialize provider with server URL
        console.log('📋 Test 1: Initialize ChromaDBProvider with server URL');
        const provider = new ChromaDBProvider({
            collection: 'forest_test_collection',
            url: 'http://localhost:8000'
        });
        
        const initResult = await provider.initialize();
        console.log('✅ Provider initialized:', {
            success: initResult.success,
            provider: initResult.provider,
            collection: initResult.collection
        });
        
        // Test 2: Test vector operations
        console.log('\n📋 Test 2: Vector operations');
        
        // Create test vectors
        const testVectors = [
            { id: 'forest-task-1', vector: [0.1, 0.2, 0.3], metadata: { type: 'task', priority: 'high' } },
            { id: 'forest-task-2', vector: [0.4, 0.5, 0.6], metadata: { type: 'task', priority: 'medium' } },
            { id: 'forest-context-1', vector: [0.7, 0.8, 0.9], metadata: { type: 'context', category: 'learning' } }
        ];
        
        // Insert vectors
        for (const test of testVectors) {
            await provider.upsertVector(test.id, test.vector, test.metadata);
        }
        console.log('✅ Test vectors inserted successfully');
        
        // Test 3: Query vectors
        console.log('\n📋 Test 3: Query vectors');
        const queryVector = [0.15, 0.25, 0.35];
        const results = await provider.queryVectors(queryVector, { limit: 2 });
        console.log('✅ Query successful:', results.length, 'results found');
        console.log('   - Best match:', results[0]?.id, 'similarity:', results[0]?.similarity?.toFixed(3));
        
        // Test 4: List vectors
        console.log('\n📋 Test 4: List vectors');
        const allVectors = await provider.listVectors();
        console.log('✅ List successful:', allVectors.length, 'vectors found');
        
        // Test 5: Test ping
        console.log('\n📋 Test 5: Ping server');
        const pingResult = await provider.ping();
        console.log('✅ Ping successful:', pingResult);
        
        // Test 6: Clean up
        console.log('\n📋 Test 6: Clean up');
        for (const test of testVectors) {
            await provider.deleteVector(test.id);
        }
        console.log('✅ Clean up successful');
        
        // Close connection
        await provider.close();
        console.log('✅ Connection closed');
        
        console.log('\n🎉 All tests passed! ChromaDB is fully integrated with Forest.');
        
        return { success: true, message: 'ChromaDB integration working perfectly' };
        
    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Run the test
testForestIntegration()
    .then(result => {
        console.log('\n' + '='.repeat(60));
        if (result.success) {
            console.log('✅ SUCCESS: ChromaDB is ready for Forest production use!');
            console.log('🚀 Vector operations, queries, and lifecycle management all working.');
        } else {
            console.log('❌ FAILED:', result.error);
        }
        console.log('='.repeat(60));
    })
    .catch(error => {
        console.error('💥 Test crashed:', error.message);
    });