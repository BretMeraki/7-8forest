// Quick sanity test for HTAVectorStore write/verify pipeline
// Run with: node test-vector-store.mjs

import { HTAVectorStore } from './modules/hta-vector-store.js';

const vectorStore = new HTAVectorStore();

// Minimal mock HTA tree
const mockHTA = {
  goal: 'Learn to play guitar',
  complexity: 3,
  strategicBranches: [
    {
      name: 'Chords',
      description: 'Master basic chords',
      priority: 1,
      tasks: [],
    },
  ],
  frontierNodes: [
    {
      id: 'task1',
      title: 'Practice C chord',
      description: 'Practice transitioning to C major chord',
      branch: 'Chords',
      priority: 1,
      difficulty: 1,
      duration: '15m',
      prerequisites: [],
      completed: false,
      generated: false,
    },
    {
      id: 'task2',
      title: 'Practice G chord',
      description: 'Practice transitioning to G major chord',
      branch: 'Chords',
      priority: 1,
      difficulty: 1,
      duration: '15m',
      prerequisites: [],
      completed: false,
      generated: false,
    },
  ],
};

async function run() {
  try {
    await vectorStore.initialize();
    const result = await vectorStore.storeHTATree('demo_project', mockHTA);
    console.log('storeHTATree result:', JSON.stringify(result, null, 2));

    const stats = await vectorStore.getProjectStats('demo_project');
    console.log('Project stats:', JSON.stringify(stats, null, 2));

    const retrieved = await vectorStore.retrieveHTATree('demo_project');
    console.log('Retrieved tree summary:', {
      goal: retrieved.goal,
      frontierNodeCount: retrieved.frontierNodes.length,
      branchCount: retrieved.strategicBranches.length,
    });
  } catch (err) {
    console.error('Test failed:', err);
  }
}

run();
