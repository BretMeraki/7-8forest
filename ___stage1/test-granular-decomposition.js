/**
 * Test Granular HTA Decomposition
 * 
 * Demonstrates how "HTML Fundamentals" becomes specific, actionable micro-tasks
 */

import { GranularHTADecomposer } from './modules/granular-hta-decomposer.js';

async function testGranularDecomposition() {
  console.log('🔍 Testing Granular HTA Decomposition\n');

  const decomposer = new GranularHTADecomposer();

  console.log('='.repeat(80));
  console.log('BEFORE: Generic High-Level Task');
  console.log('='.repeat(80));
  console.log('Title: HTML Fundamentals');
  console.log('Description: Learn basic HTML structure and elements');
  console.log('Duration: 60 minutes');
  console.log('Action: Study HTML basics');
  console.log('Validation: Understand HTML');
  
  console.log('\n' + '='.repeat(80));
  console.log('AFTER: Granular Micro-Tasks');
  console.log('='.repeat(80));

  // Test HTML decomposition
  const htmlMicroTasks = decomposer.decomposeTask(
    'HTML Fundamentals',
    'Learn basic HTML structure and elements',
    2, // difficulty
    'hands-on' // learning style
  );

  htmlMicroTasks.forEach((task, index) => {
    console.log(`\n${index + 1}. 📝 ${task.title}`);
    console.log(`   Description: ${task.description}`);
    console.log(`   🎬 Action: ${task.action}`);
    console.log(`   ✅ Success: ${task.validation}`);
    console.log(`   ⏱️ Duration: ${task.duration}`);
    console.log(`   🔢 Difficulty: ${'★'.repeat(task.difficulty)}`);
    if (task.prerequisites.length > 0) {
      console.log(`   📋 Prerequisites: ${task.prerequisites.join(', ')}`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('CSS Styling Example');
  console.log('='.repeat(80));

  const cssMicroTasks = decomposer.decomposeTask(
    'CSS Styling Basics',
    'Learn how to style HTML elements with CSS',
    3,
    'hands-on'
  );

  cssMicroTasks.forEach((task, index) => {
    console.log(`\n${index + 1}. 🎨 ${task.title}`);
    console.log(`   🎬 Action: ${task.action}`);
    console.log(`   ✅ Success: ${task.validation}`);
    console.log(`   ⏱️ Duration: ${task.duration}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('JavaScript Variables Example');
  console.log('='.repeat(80));

  const jsMicroTasks = decomposer.decomposeTask(
    'JavaScript Variables',
    'Understanding variables and data types in JavaScript',
    2,
    'hands-on'
  );

  jsMicroTasks.forEach((task, index) => {
    console.log(`\n${index + 1}. 💻 ${task.title}`);
    console.log(`   🎬 Action: ${task.action}`);
    console.log(`   ✅ Success: ${task.validation}`);
    console.log(`   ⏱️ Duration: ${task.duration}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('React Components Example');
  console.log('='.repeat(80));

  const reactMicroTasks = decomposer.decomposeTask(
    'React Components Introduction',
    'Creating your first React components',
    3,
    'hands-on'
  );

  reactMicroTasks.forEach((task, index) => {
    console.log(`\n${index + 1}. ⚛️ ${task.title}`);
    console.log(`   🎬 Action: ${task.action}`);
    console.log(`   ✅ Success: ${task.validation}`);
    console.log(`   ⏱️ Duration: ${task.duration}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('Validation Test');
  console.log('='.repeat(80));

  const validation = decomposer.validateGranularity(htmlMicroTasks);
  console.log('Validation Results:');
  console.log(`✅ Valid: ${validation.valid}`);
  console.log(`📝 Issues: ${validation.issues.length}`);
  validation.issues.forEach(issue => console.log(`   - ${issue}`));
  
  if (validation.recommendations.length > 0) {
    console.log('📋 Recommendations:');
    validation.recommendations.forEach(rec => console.log(`   - ${rec}`));
  }

  console.log('\n' + '='.repeat(80));
  console.log('Key Improvements with Granular Decomposition');
  console.log('='.repeat(80));
  console.log('✅ Specific Actions: Each task tells you EXACTLY what to do');
  console.log('✅ Clear Success Criteria: You know when you\'ve completed it');
  console.log('✅ Short Durations: 3-15 minutes each - no overwhelm');
  console.log('✅ Progressive Building: Each task builds on the previous');
  console.log('✅ Immediate Feedback: Quick wins and visible progress');
  console.log('✅ Concrete Learning: No vague "understand" or "learn" tasks');

  console.log('\nCompare:');
  console.log('❌ OLD: "Learn HTML Fundamentals" (vague, overwhelming)');
  console.log('✅ NEW: "Create your first HTML file" → "Write HTML5 doctype" → "Create html element"');
  
  console.log('\n🎯 Result: Users can follow step-by-step, concrete actions');
  console.log('   rather than trying to figure out what "fundamentals" means!');
}

// Run the test
testGranularDecomposition();
