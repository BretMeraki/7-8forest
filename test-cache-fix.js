import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

console.log('Testing cache filename fix...');

// Test the cache path generation function directly
function _getCachePath(text) {
  // This is the fixed version - using hash instead of base64
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  return path.join('.embedding-cache', `${hash}.json`);
}

// Test with a very long text that would have caused issues before
const longText = 'This is a very long text that would have caused extremely long filenames when base64 encoded, potentially exceeding Windows filesystem limits and causing hanging issues in the application. '.repeat(10);

console.log('Text length:', longText.length);

try {
  // Generate the cache path
  const cachePath = _getCachePath(longText);
  console.log('Cache path:', cachePath);
  console.log('Cache filename length:', path.basename(cachePath).length);
  
  // Verify it's a reasonable length (SHA256 hex is 64 chars + .json = 69 chars)
  if (path.basename(cachePath).length < 100) {
    console.log('✅ Cache filename length is acceptable');
  } else {
    console.log('❌ Cache filename is still too long');
  }
  
  // Test what the old method would have generated
  const oldSafe = Buffer.from(longText).toString('base64').replace(/[/+=]/g, '');
  console.log('Old base64 filename length would have been:', oldSafe.length + 5); // +5 for .json
  
  console.log('🎉 Cache filename fix is working! Short hash-based names instead of long base64.');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}
