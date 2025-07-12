#!/usr/bin/env node

import FilteredFilesystemServer from './filtered-filesystem-server.js';
import { promises as fs } from 'fs';
import path from 'path';

async function testLogExclusion() {
    console.log('🧪 Testing log file exclusion...\n');
    
    // Create test log files
    const testLogFiles = [
        '.forest-data/test-server.log',
        '.forest-data/debug.log',
        '.forest-data/forest-mcp.log',
        '.forest-data/combined.log'
    ];
    
    console.log('📁 Creating test log files...');
    for (const logFile of testLogFiles) {
        const dir = path.dirname(logFile);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(logFile, `Test log content - Claude should NOT see this!\\nTime: ${new Date().toISOString()}`);
        console.log(`  Created: ${logFile}`);
    }
    
    // Create a legitimate file
    await fs.writeFile('.forest-data/test-config.json', JSON.stringify({
        message: "Claude SHOULD see this file"
    }, null, 2));
    console.log('  Created: .forest-data/test-config.json');
    
    // Test the filter
    const server = new FilteredFilesystemServer(['.forest-data']);
    
    console.log('\\n🔍 Testing file filtering...');
    
    const allItems = await server.listDirectoryFiltered('.forest-data');
    console.log(`\\nTotal items found: ${allItems.length}`);
    
    // Check for log files (should be 0)
    const logFiles = allItems.filter(item => server.isLogFile(item.path));
    console.log(`Log files visible: ${logFiles.length} (should be 0)`);
    
    if (logFiles.length > 0) {
        console.log('🚨 ERROR: Log files are still visible:');
        logFiles.forEach(file => console.log(`  - ${file.path}`));
    } else {
        console.log('✅ SUCCESS: No log files visible to Claude');
    }
    
    // Check for config file (should be 1)
    const configFiles = allItems.filter(item => item.name.includes('config'));
    console.log(`Config files visible: ${configFiles.length} (should be 1)`);
    
    console.log('\\n📋 Visible files:');
    allItems.forEach(item => {
        console.log(`  ${item.type === 'directory' ? '📁' : '📄'} ${path.relative('.forest-data', item.path)}`);
    });
    
    // Cleanup test files
    console.log('\\n🧹 Cleaning up test files...');
    for (const logFile of testLogFiles) {
        try {
            await fs.unlink(logFile);
            console.log(`  Removed: ${logFile}`);
        } catch (err) {
            // File might not exist
        }
    }
    await fs.unlink('.forest-data/test-config.json');
    console.log('  Removed: .forest-data/test-config.json');
    
    console.log('\\n🎯 Test complete!');
    console.log(logFiles.length === 0 ? '✅ Log exclusion working properly' : '❌ Log exclusion failed');
}

testLogExclusion().catch(console.error);
