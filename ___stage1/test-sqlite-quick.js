#!/usr/bin/env node

/**
 * Quick SQLite Vector Store Test
 * Tests if SQLite vector provider is working correctly
 */

import { HTAVectorStore } from './modules/hta-vector-store.js';
import path from 'path';
import os from 'os';

console.log('🧪 Testing SQLite Vector Store Integration...\n');

async function testSQLiteVectors() {
    try {
        // Create HTA vector store instance
        const store = new HTAVectorStore(path.join(os.tmpdir(), 'test_vectors'));
        
        console.log('1. Initializing HTA Vector Store...');
        const initResult = await store.initialize();
        console.log(`   ✅ Provider: ${initResult.provider}`);
        console.log(`   ✅ Fallback used: ${initResult.fallbackUsed}`);
        console.log(`   ✅ Success: ${initResult.success}`);
        
        if (initResult.details) {
            console.log(`   📊 Details:`, initResult.details);
        }
        
        console.log('\n2. Testing vector storage...');
        
        // Create sample HTA data
        const sampleHTA = {
            project_id: 'sqlite_test',
            goal: 'Test SQLite vector functionality',
            complexity: 'simple',
            frontierNodes: [
                {
                    id: 'test_task_1',
                    title: 'Initialize SQLite database',
                    description: 'Set up SQLite vector storage',
                    branch: 'Setup',
                    priority: 1,
                    difficulty: 2,
                    duration: '15 minutes',
                    prerequisites: [],
                    learningOutcome: 'SQLite database is ready',
                    completed: false,
                    generated: true
                },
                {
                    id: 'test_task_2',
                    title: 'Store test vectors',
                    description: 'Insert sample vectors into database',
                    branch: 'Testing',
                    priority: 2,
                    difficulty: 3,
                    duration: '20 minutes',
                    prerequisites: ['test_task_1'],
                    learningOutcome: 'Vectors stored successfully',
                    completed: false,
                    generated: true
                }
            ],
            strategicBranches: [
                {
                    name: 'Setup',
                    description: 'Database setup tasks',
                    priority: 1,
                    tasks: []
                },
                {
                    name: 'Testing',
                    description: 'Testing functionality',
                    priority: 2,
                    tasks: []
                }
            ]
        };
        
        // Test storing HTA tree
        const storeResult = await store.storeHTATree('sqlite_test', sampleHTA);
        console.log(`   ✅ Vectors stored: ${storeResult.vectorsStored}`);
        console.log(`   ✅ Expected: ${storeResult.expected}`);
        console.log(`   ✅ Verified: ${storeResult.verified}`);
        console.log(`   ✅ Provider: ${storeResult.provider}`);
        
        console.log('\n3. Testing vector retrieval...');
        
        // Test retrieving HTA tree
        const retrieved = await store.retrieveHTATree('sqlite_test');
        if (retrieved) {
            console.log(`   ✅ Goal: ${retrieved.goal}`);
            console.log(`   ✅ Tasks: ${retrieved.frontierNodes.length}`);
            console.log(`   ✅ Branches: ${retrieved.strategicBranches.length}`);
        } else {
            console.log('   ❌ Failed to retrieve HTA tree');
        }
        
        console.log('\n4. Testing vector similarity search...');
        
        // Test finding next task
        const nextTask = await store.findNextTask('sqlite_test', 'database setup initialization', 3, '20 minutes');
        if (nextTask) {
            console.log(`   ✅ Found task: ${nextTask.title}`);
            console.log(`   ✅ Similarity: ${nextTask.similarity?.toFixed(4) || 'N/A'}`);
            console.log(`   ✅ Description: ${nextTask.description}`);
        } else {
            console.log('   ⚠️  No task found (might be using fallback selection)');
        }
        
        console.log('\n5. Getting vector store statistics...');
        
        // Get stats
        const stats = await store.getProjectStats('sqlite_test');
        console.log(`   📊 Total vectors: ${stats.total_vectors}`);
        console.log(`   📊 Completed tasks: ${stats.completed_tasks}`);
        
        // Check if we can get provider stats
        if (store.provider && typeof store.provider.getStats === 'function') {
            const providerStats = await store.provider.getStats();
            console.log(`   📊 Provider stats:`, providerStats);
        }
        
        console.log('\n🎉 SQLite Vector Store Test Complete!');
        
        // Cleanup
        await store.deleteProject('sqlite_test');
        console.log('   🧹 Test data cleaned up');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ SQLite Vector Store Test Failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run the test
const success = await testSQLiteVectors();
process.exit(success ? 0 : 1);