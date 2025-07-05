#!/usr/bin/env node

console.error('Debug server starting...');

try {
  // Test basic imports first
  console.error('Testing basic imports...');
  
  // Avoid complex initialization - just test if the modules can be imported
  import('./___stage1/modules/data-persistence.js').then(module => {
    console.error('✅ DataPersistence module imported successfully');
    
    // Test simple instantiation
    const { DataPersistence } = module;
    const dp = new DataPersistence();
    console.error('✅ DataPersistence instantiated successfully');
    
    console.error('🎉 Debug test passed - basic module loading works');
    process.exit(0);
    
  }).catch(error => {
    console.error('❌ Failed to import DataPersistence:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Critical error in debug server:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

// Add timeout to prevent hanging
setTimeout(() => {
  console.error('⏰ Debug server timeout - forcing exit');
  process.exit(1);
}, 10000); // 10 second timeout
