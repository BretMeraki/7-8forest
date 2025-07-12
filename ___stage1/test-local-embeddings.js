#!/usr/bin/env node

/**
 * Test Deterministic Embeddings (No API Key Required)
 * Tests the local embedding generation and SQLite vector storage
 */

import embeddingService from './utils/embedding-service.js';
import { HTAVectorStore } from './modules/hta-vector-store.js';
import path from 'path';
import os from 'os';

console.log('🧪 Testing Deterministic Embeddings + SQLite Vectors (No API Key)\n');

async function testLocalEmbeddings() {
    try {
        console.log('1. Testing deterministic embedding generation...');
        
        // Test basic embedding generation
        const testTexts = [
            'Learn SQLite database fundamentals',
            'Set up development environment',
            'Practice SQL queries and operations',
            'Build a simple database application'
        ];
        
        const embeddings = [];
        for (const text of testTexts) {
            console.log(`   Generating embedding for: "${text}"`);
            const embedding = await embeddingService.embedText(text, 384); // Smaller dimension for testing
            console.log(`   ✅ Generated ${embedding.length}-dimensional vector`);
            console.log(`   📊 First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
            embeddings.push({ text, embedding });
        }
        
        console.log('\n2. Testing vector similarity...');
        
        // Test similarity between embeddings
        function cosineSimilarity(vec1, vec2) {
            const dot = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
            const mag1 = Math.sqrt(vec1.reduce((sum, a) => sum + a * a, 0));
            const mag2 = Math.sqrt(vec2.reduce((sum, a) => sum + a * a, 0));
            return dot / (mag1 * mag2);
        }
        
        for (let i = 0; i < embeddings.length; i++) {
            for (let j = i + 1; j < embeddings.length; j++) {
                const sim = cosineSimilarity(embeddings[i].embedding, embeddings[j].embedding);
                console.log(`   📊 "${embeddings[i].text}" vs "${embeddings[j].text}": ${sim.toFixed(4)}`);
            }
        }
        
        console.log('\n3. Testing SQLite vector storage with deterministic embeddings...');
        
        // Test with HTA Vector Store
        const store = new HTAVectorStore(path.join(os.tmpdir(), 'test_deterministic'));
        const initResult = await store.initialize();
        
        console.log(`   ✅ Provider: ${initResult.provider}`);
        console.log(`   ✅ Success: ${initResult.success}`);
        console.log(`   ✅ Fallback used: ${initResult.fallbackUsed}`);
        
        // Create test HTA data
        const testHTA = {
            project_id: 'local_embedding_test',
            goal: 'Master local vector embeddings',
            complexity: 'moderate',
            frontierNodes: testTexts.map((text, i) => ({
                id: `task_${i}`,
                title: text,
                description: `Detailed task: ${text}`,
                branch: 'Learning',
                priority: i + 1,
                difficulty: 2 + (i % 3),
                duration: '30 minutes',
                prerequisites: i > 0 ? [`task_${i-1}`] : [],
                learningOutcome: `Complete: ${text}`,
                completed: false,
                generated: true
            })),
            strategicBranches: [{
                name: 'Learning',
                description: 'Core learning tasks',
                priority: 1,
                tasks: []
            }]
        };
        
        // Store HTA tree with vector embeddings
        console.log('   📝 Storing HTA tree with embeddings...');
        const storeResult = await store.storeHTATree('local_embedding_test', testHTA);
        console.log(`   ✅ Vectors stored: ${storeResult.vectorsStored}`);
        console.log(`   ✅ Expected: ${storeResult.expected}`);
        console.log(`   ✅ Provider: ${storeResult.provider}`);
        console.log(`   ✅ Verified: ${storeResult.verified}`);
        
        console.log('\n4. Testing vector-based task retrieval...');
        
        // Test task finding with vector similarity
        const foundTask = await store.findNextTask(
            'local_embedding_test', 
            'database learning setup environment', 
            3, 
            '30 minutes'
        );
        
        if (foundTask) {
            console.log(`   ✅ Found task: "${foundTask.title}"`);
            console.log(`   📊 Similarity: ${foundTask.similarity?.toFixed(4) || 'N/A'}`);
            console.log(`   📋 Description: ${foundTask.description}`);
        } else {
            console.log('   ⚠️  No task found (might still be using fallback mode)');
        }
        
        console.log('\n5. Getting provider statistics...');
        
        if (store.provider && typeof store.provider.getStats === 'function') {
            const stats = await store.provider.getStats();
            console.log('   📊 Provider stats:', stats);
        }
        
        const projectStats = await store.getProjectStats('local_embedding_test');
        console.log(`   📊 Project vectors: ${projectStats.total_vectors}`);
        console.log(`   📊 Completed tasks: ${projectStats.completed_tasks}`);
        
        console.log('\n🎉 Deterministic Embedding + SQLite Test Complete!');
        console.log('✨ No API keys required - everything runs locally!');
        
        // Cleanup
        await store.deleteProject('local_embedding_test');
        console.log('   🧹 Test data cleaned up');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run the test
const success = await testLocalEmbeddings();
console.log(`\n🏁 Test ${success ? 'PASSED' : 'FAILED'}`);
process.exit(success ? 0 : 1);