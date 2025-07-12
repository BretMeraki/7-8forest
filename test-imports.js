#!/usr/bin/env node

async function testImports() {
    try {
        console.log('Testing core server import...');
        const coreServer = await import('./___stage1/core-server.js');
        console.log('✅ Core server imports OK');
        
        console.log('Testing core initialization import...');
        const coreInit = await import('./___stage1/core-initialization.js');
        console.log('✅ Core initialization imports OK');
        
        console.log('Testing main server import...');
        const mainServer = await import('./___stage1/forest-mcp-server.js');
        console.log('✅ Main server imports OK');
        
        console.log('\n🎉 All critical imports successful!');
        
    } catch (error) {
        console.error('❌ Import error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testImports();
