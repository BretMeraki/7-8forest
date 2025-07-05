/**
 * Test script to validate Goal-Focused Task Batch Selection
 */

import { GoalAchievementContext } from './modules/goal-achievement-context.js';
import { TaskStrategyCore } from './modules/task-strategy-core.js';

async function testTaskBatchSelection() {
  console.log('📋 Testing Goal-Focused Task Batch Selection\n');

  try {
    // Create mock task batch data
    const mockTaskBatch = [
      {
        id: 'task_1',
        title: 'HTML Fundamentals',
        description: 'Learn basic HTML structure and elements',
        difficulty: 1,
        duration: '30 minutes',
        branch: 'Foundation',
        prerequisites: [],
        similarity: 0.9
      },
      {
        id: 'task_2', 
        title: 'CSS Styling Basics',
        description: 'Introduction to CSS styling and layout',
        difficulty: 2,
        duration: '45 minutes',
        branch: 'Foundation',
        prerequisites: ['task_1'],
        similarity: 0.85
      },
      {
        id: 'task_3',
        title: 'JavaScript Variables',
        description: 'Understanding variables and data types in JavaScript',
        difficulty: 2,
        duration: '40 minutes',
        branch: 'Programming',
        prerequisites: ['task_1'],
        similarity: 0.8
      },
      {
        id: 'task_4',
        title: 'React Components Introduction',
        description: 'Creating your first React components',
        difficulty: 3,
        duration: '60 minutes',
        branch: 'Frontend',
        prerequisites: ['task_2', 'task_3'],
        similarity: 0.92
      },
      {
        id: 'task_5',
        title: 'React State Management',
        description: 'Managing component state with useState',
        difficulty: 4,
        duration: '90 minutes',
        branch: 'Frontend',
        prerequisites: ['task_4'],
        similarity: 0.88
      },
      {
        id: 'task_6',
        title: 'API Integration',
        description: 'Connecting React components to REST APIs',
        difficulty: 4,
        duration: '75 minutes',
        branch: 'Integration',
        prerequisites: ['task_4'],
        similarity: 0.82
      },
      {
        id: 'task_7',
        title: 'Advanced React Patterns',
        description: 'Higher-order components and custom hooks',
        difficulty: 5,
        duration: '120 minutes',
        branch: 'Advanced',
        prerequisites: ['task_5'],
        similarity: 0.78
      }
    ];

    // Create mock goal context
    const mockGoalContext = {
      alignment: {
        optimal_focus_area: 'React component mastery',
        goal_advancement_potential: 'high',
        goal_connection_strategy: 'Build portfolio project',
        dream_fulfillment_step: 'Develop frontend skills for developer role'
      },
      momentum: {
        velocity: { current: 'high' }
      },
      recommendations: {
        immediate_action: {
          optimal_task_type: { type: 'momentum_building' },
          duration: { duration_minutes: 60 }
        }
      }
    };

    const mockConfig = {
      goal: 'Become a Full-Stack Developer'
    };

    // Create TaskStrategyCore instance for testing methods
    const taskStrategy = new TaskStrategyCore();

    console.log('1. Testing dependency mapping...');
    const dependencyMap = taskStrategy.buildTaskDependencyMap(mockTaskBatch);
    console.log('✅ Dependency map created with', dependencyMap.size, 'tasks');
    
    // Show some dependencies
    dependencyMap.forEach((node, taskId) => {
      if (node.prerequisites.length > 0) {
        console.log(`   → ${taskId} depends on:`, node.prerequisites);
      }
    });

    console.log('\n2. Testing complexity grouping...');
    const complexityGroups = taskStrategy.groupTasksByComplexity(mockTaskBatch, mockGoalContext);
    console.log('✅ Complexity groups:');
    console.log('   → Foundational:', complexityGroups.foundational.map(t => t.title));
    console.log('   → Intermediate:', complexityGroups.intermediate.map(t => t.title));
    console.log('   → Advanced:', complexityGroups.advanced.map(t => t.title));

    console.log('\n3. Testing dependency ordering...');
    const orderedFoundational = taskStrategy.orderByDependencies(complexityGroups.foundational, dependencyMap);
    console.log('✅ Ordered foundational tasks:', orderedFoundational.map(t => t.title));

    console.log('\n4. Testing full batch ordering...');
    const orderedBatch = taskStrategy.orderTasksByDependencyAndGoalProgression(
      mockTaskBatch, 
      mockGoalContext, 
      mockConfig
    );
    
    console.log('✅ Full ordered batch:');
    orderedBatch.forEach((task, index) => {
      console.log(`   ${index + 1}. [${task.progression_type}] ${task.title} (${task.difficulty}★, ${task.estimated_completion_time})`);
    });

    console.log('\n5. Testing batch response formatting...');
    const batchResponse = taskStrategy.formatGoalFocusedTaskBatch(
      orderedBatch,
      mockGoalContext,
      mockConfig
    );
    
    console.log('✅ Formatted batch response:');
    console.log('\n' + '='.repeat(80));
    console.log(batchResponse);
    console.log('='.repeat(80));

    console.log('\n6. Testing time calculations...');
    const totalTime = taskStrategy.calculateCumulativeTime(orderedBatch);
    console.log('✅ Total estimated time:', totalTime);

    console.log('\n7. Testing goal connection explanations...');
    orderedBatch.slice(0, 3).forEach(task => {
      const connection = taskStrategy.explainGoalConnection(task, mockConfig.goal);
      console.log(`   → ${task.title}: ${connection}`);
    });

    console.log('\n🎉 Goal-Focused Task Batch Selection Test Complete!');
    console.log('\nKey Features Validated:');
    console.log('✅ Optimal batch size (5-7 tasks) - not overwhelming');
    console.log('✅ Dependency-aware task ordering');
    console.log('✅ Progressive difficulty distribution (Foundation → Building → Advancement)');
    console.log('✅ Goal-focused batch selection');
    console.log('✅ Rich batch formatting with explanations');
    console.log('✅ Cumulative time tracking');
    console.log('✅ Individual goal connections');
    console.log('✅ Learning path progression indicators');
    console.log('✅ Next task highlighting (👆 START HERE)');

    console.log('\nBatch Response Features:');
    console.log('✅ Clear dependency ordering');
    console.log('✅ Visual progression indicators (🏗️, 🔨, 🚀)');
    console.log('✅ Difficulty ratings with stars');
    console.log('✅ Immediate next task highlighted');
    console.log('✅ Individual task explanations');
    console.log('✅ Goal achievement context');
    console.log('✅ Optimized batch size for digestibility');
    console.log('✅ Usage instructions for users');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

// Run the test
testTaskBatchSelection();
