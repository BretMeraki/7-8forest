#!/usr/bin/env node

/**
 * Test script to verify that TaskSelector import fix resolves the method resolution issue
 */

import { TaskSelector } from './modules/task-logic/task-selector.js';

console.log('Testing TaskSelector import fix...');

// Check if TaskSelector class exists
if (typeof TaskSelector === 'undefined') {
    console.error('❌ TaskSelector class is undefined');
    process.exit(1);
}

console.log('✓ TaskSelector class imported successfully');

// Check if selectOptimalTask static method exists
if (typeof TaskSelector.selectOptimalTask !== 'function') {
    console.error('❌ TaskSelector.selectOptimalTask method is missing or not a function');
    console.log('Available methods:', Object.getOwnPropertyNames(TaskSelector));
    process.exit(1);
}

console.log('✓ TaskSelector.selectOptimalTask method is accessible');

// Test method signature by checking function length (parameter count)
const methodLength = TaskSelector.selectOptimalTask.length;
console.log(`✓ selectOptimalTask method expects ${methodLength} parameters`);

console.log('\n🎉 TaskSelector import fix successful!');
console.log('The selectOptimalTask method is now properly accessible.');
