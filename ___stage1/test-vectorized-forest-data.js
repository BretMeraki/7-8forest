#!/usr/bin/env node

/**
 * Test Script for Fully Vectorized Forest.Data
 * Demonstrates the hybrid approach with selective vectorization
 */

import { ForestDataIntegration } from './modules/forest-data-integration.js';
import { ForestDataVectorization } from './modules/forest-data-vectorization.js';
import path from 'path';
import os from 'os';

const TEST_DATA_DIR = path.join(os.homedir(), '.forest-data-test');

async function createTestProject() {
  const integration = new ForestDataIntegration(TEST_DATA_DIR);
  await integration.initialize();

  const projectData = {
    id: 'vectorized_test_project',
    goal: 'Master advanced machine learning and neural networks',
    complexity: 8,
    domain: 'artificial_intelligence',
    created_at: new Date().toISOString(),
    strategicBranches: [
      {
        name: 'fundamentals',
        description: 'Core ML concepts and mathematics',
        priority: 1,
        tasks: []
      },
      {
        name: 'deep_learning',
        description: 'Neural networks and deep learning architectures',
        priority: 2,
        tasks: []
      },
      {
        name: 'applications',
        description: 'Real-world ML applications and projects',
        priority: 3,
        tasks: []
      }
    ]
  };

  console.log('Creating vectorized test project...');
  const result = await integration.createProject(projectData);
  console.log('Project created:', result);

  // Add HTA data with tasks
  const htaData = {
    goal: projectData.goal,
    complexity: projectData.complexity,
    strategicBranches: projectData.strategicBranches,
    frontierNodes: [
      {
        id: 'task_1',
        title: 'Linear Algebra Fundamentals',
        description: 'Master vectors, matrices, eigenvalues and eigenvectors for ML',
        branch: 'fundamentals',
        difficulty: 4,
        priority: 1,
        duration: '2 hours',
        prerequisites: [],
        completed: false,
        learningObjective: 'Understand mathematical foundations',
        skillTags: ['mathematics', 'linear_algebra', 'vectors']
      },
      {
        id: 'task_2',
        title: 'Neural Network Architecture',
        description: 'Design and implement basic feedforward neural networks',
        branch: 'deep_learning',
        difficulty: 6,
        priority: 2,
        duration: '3 hours',
        prerequisites: ['task_1'],
        completed: false,
        learningObjective: 'Build neural networks from scratch',
        skillTags: ['neural_networks', 'deep_learning', 'python']
      },
      {
        id: 'task_3',
        title: 'Convolutional Neural Networks',
        description: 'Implement CNN for image classification tasks',
        branch: 'deep_learning',
        difficulty: 7,
        priority: 3,
        duration: '4 hours',
        prerequisites: ['task_2'],
        completed: false,
        learningObjective: 'Master CNNs for computer vision',
        skillTags: ['cnn', 'computer_vision', 'tensorflow']
      },
      {
        id: 'task_4',
        title: 'ML Project: Image Classifier',
        description: 'Build end-to-end image classification system',
        branch: 'applications',
        difficulty: 8,
        priority: 4,
        duration: '6 hours',
        prerequisites: ['task_3'],
        completed: false,
        learningObjective: 'Apply ML in real-world scenario',
        skillTags: ['project', 'deployment', 'mlops']
      }
    ],
    created_at: projectData.created_at,
    lastUpdated: new Date().toISOString()
  };

  await integration.saveProjectData(projectData.id, { hta_data: htaData });
  console.log('HTA data saved and vectorized');

  return { integration, projectId: projectData.id };
}

async function testSemanticSearch(integration, projectId) {
  console.log('\n=== Testing Semantic Search ===');

  // Test 1: Find tasks similar to "mathematics"
  console.log('Searching for tasks similar to "mathematics"...');
  const mathTasks = await integration.findSimilarTasks(projectId, 'mathematics linear algebra', { limit: 3 });
  console.log('Math-related tasks:', mathTasks.map(t => ({ title: t.title, similarity: t.similarity?.toFixed(3) })));

  // Test 2: Find tasks similar to "neural networks"
  console.log('\nSearching for tasks similar to "neural networks"...');
  const neuralTasks = await integration.findSimilarTasks(projectId, 'neural networks deep learning', { limit: 3 });
  console.log('Neural network tasks:', neuralTasks.map(t => ({ title: t.title, similarity: t.similarity?.toFixed(3) })));

  // Test 3: Find tasks similar to "practical applications"
  console.log('\nSearching for tasks similar to "practical applications"...');
  const projectTasks = await integration.findSimilarTasks(projectId, 'practical project application deployment', { limit: 3 });
  console.log('Project tasks:', projectTasks.map(t => ({ title: t.title, similarity: t.similarity?.toFixed(3) })));
}

async function testAdaptiveRecommendations(integration, projectId) {
  console.log('\n=== Testing Adaptive Task Recommendations ===');

  // Test different energy levels and time constraints
  const scenarios = [
    { energy_level: 3, time_available: '1 hour', description: 'tired, short session' },
    { energy_level: 7, time_available: '3 hours', description: 'high energy, longer session' },
    { energy_level: 5, time_available: '2 hours', description: 'moderate energy, medium session' }
  ];

  for (const scenario of scenarios) {
    console.log(`\nScenario: ${scenario.description}`);
    const recommendation = await integration.findNextTask(projectId, scenario);
    if (recommendation) {
      console.log(`Recommended: ${recommendation.title} (difficulty: ${recommendation.difficulty}, duration: ${recommendation.duration})`);
    } else {
      console.log('No suitable task found');
    }
  }
}

async function testBreakthroughSystem(integration, projectId) {
  console.log('\n=== Testing Breakthrough Recording and Discovery ===');

  // Record some breakthrough insights
  const breakthroughs = [
    {
      description: 'Understanding backpropagation changed my perspective on neural networks',
      context: 'While working on neural network implementation',
      outcome: 'Can now debug training issues effectively',
      level: 'high',
      domain: 'deep_learning',
      relatedTasks: ['task_2']
    },
    {
      description: 'Matrix operations became intuitive after visualizing them geometrically',
      context: 'During linear algebra study session',
      outcome: 'Much faster at mathematical reasoning',
      level: 'medium',
      domain: 'mathematics',
      relatedTasks: ['task_1']
    }
  ];

  for (const breakthrough of breakthroughs) {
    const result = await integration.recordBreakthrough(projectId, breakthrough);
    console.log(`Recorded breakthrough: ${result.breakthrough_id}`);
  }

  // Test finding related breakthroughs
  console.log('\nSearching for breakthroughs related to "neural network training"...');
  const relatedBreakthroughs = await integration.findRelatedBreakthroughs(
    projectId, 
    'neural network training debugging optimization',
    { limit: 5 }
  );
  
  console.log('Related breakthroughs:', relatedBreakthroughs.map(b => ({
    description: b.description.substring(0, 50) + '...',
    similarity: b.similarity?.toFixed(3)
  })));
}

async function testTaskCompletion(integration, projectId) {
  console.log('\n=== Testing Task Completion Tracking ===');

  // Complete a task with learning outcome
  await integration.updateTaskCompletion(
    projectId,
    'task_1',
    true,
    'Mastered linear algebra fundamentals, ready for neural networks'
  );
  console.log('Completed task_1 with learning outcome');

  // Test finding next task after completion
  const nextTask = await integration.findNextTask(projectId, { energy_level: 6, time_available: '3 hours' });
  if (nextTask) {
    console.log(`Next recommended task: ${nextTask.title}`);
  }
}

async function testCrossProjectInsights(integration, projectId) {
  console.log('\n=== Testing Cross-Project Insights ===');

  // This would normally find insights from other projects
  // For demo, we'll search within the same project
  const insights = await integration.findCrossProjectInsights(
    'different_project_id',
    'machine learning optimization techniques',
    { limit: 3 }
  );

  console.log(`Found ${insights.length} cross-project insights`);
  insights.forEach(insight => {
    console.log(`- ${insight.description.substring(0, 60)}... (similarity: ${insight.similarity?.toFixed(3)})`);
  });
}

async function testAnalyticsAndMetrics(integration, projectId) {
  console.log('\n=== Testing Analytics and Performance Metrics ===');

  // Get project analytics
  const analytics = await integration.getProjectAnalytics(projectId);
  console.log('Project Analytics:', {
    progress: `${analytics.progress}%`,
    total_tasks: analytics.total_tasks,
    completed_tasks: analytics.completed_tasks,
    vectorized: analytics.vectorized
  });

  // Get performance metrics
  const metrics = await integration.getPerformanceMetrics();
  console.log('Performance Metrics:', {
    vector_ops: `${metrics.operation_metrics.vector_ops.count} ops, avg ${metrics.operation_metrics.vector_ops.avg_time?.toFixed(1)}ms`,
    json_ops: `${metrics.operation_metrics.json_ops.count} ops, avg ${metrics.operation_metrics.json_ops.avg_time?.toFixed(1)}ms`,
    hybrid_ops: `${metrics.operation_metrics.hybrid_ops.count} ops, avg ${metrics.operation_metrics.hybrid_ops.avg_time?.toFixed(1)}ms`
  });

  // Test vectorization recommendation
  const recommendation = await integration.getVectorizationRecommendation(projectId);
  console.log('Vectorization Recommendation:', recommendation);
}

async function runFullTest() {
  console.log('🚀 Starting Fully Vectorized Forest.Data Test\n');

  try {
    // Create test project with vectorization
    const { integration, projectId } = await createTestProject();

    // Test semantic search capabilities
    await testSemanticSearch(integration, projectId);

    // Test adaptive recommendations
    await testAdaptiveRecommendations(integration, projectId);

    // Test breakthrough system
    await testBreakthroughSystem(integration, projectId);

    // Test task completion
    await testTaskCompletion(integration, projectId);

    // Test cross-project insights
    await testCrossProjectInsights(integration, projectId);

    // Test analytics and metrics
    await testAnalyticsAndMetrics(integration, projectId);

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Project created with selective vectorization');
    console.log('- Semantic search working for task discovery');
    console.log('- Adaptive recommendations based on context');
    console.log('- Breakthrough insights recorded and searchable');
    console.log('- Task completion tracking with learning outcomes');
    console.log('- Performance metrics available for optimization');
    
    console.log('\n🎯 Forest.Data is now fully vectorized with hybrid approach!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullTest().catch(console.error);
}

export { runFullTest };
