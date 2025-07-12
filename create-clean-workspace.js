#!/usr/bin/env node

/**
 * Create Clean Workspace for Claude
 * This script creates a clean working directory with only essential files
 * that should be visible to Claude during operations
 */

import ContextFilter from './context-filter.js';
import fs from 'fs';
import path from 'path';

const CLEAN_WORKSPACE_DIR = './claude-workspace';

async function createCleanWorkspace() {
    console.log('🧹 Creating clean workspace for Claude...');
    
    const filter = new ContextFilter();
    const result = await filter.validateContext();
    
    if (!result.isClean) {
        console.log('⚠️  Context validation failed. Please check the .forestignore rules.');
        return;
    }
    
    // Remove existing workspace if it exists
    if (fs.existsSync(CLEAN_WORKSPACE_DIR)) {
        fs.rmSync(CLEAN_WORKSPACE_DIR, { recursive: true, force: true });
    }
    
    // Create the clean workspace
    await filter.createCleanContext(CLEAN_WORKSPACE_DIR);
    
    console.log('✅ Clean workspace created successfully!');
    console.log(`📁 Location: ${CLEAN_WORKSPACE_DIR}`);
    console.log(`📊 Files included: ${result.exposedFiles.length}`);
    console.log(`🎯 Core modules: ${result.coreModules.length}`);
    
    // Create a README in the workspace
    const workspaceReadme = `# Claude Workspace

This directory contains only the essential files needed for Claude operations.

## What's Included
- Core production modules (${result.coreModules.length} files)
- Essential configuration files
- Vector database (forest_vectors.sqlite)
- Utility functions

## What's Excluded
- All test files and test directories
- Debug and development files
- Log files and temporary files
- Documentation files
- Node modules and build artifacts
- Archive and experimental directories

## Files in this workspace
${result.exposedFiles.map(file => `- ${file}`).join('\\n')}

## Usage
When working with Claude, use this workspace instead of the full project directory
to avoid context pollution and false positives/negatives.

Generated on: ${new Date().toISOString()}
`;
    
    fs.writeFileSync(path.join(CLEAN_WORKSPACE_DIR, 'README.md'), workspaceReadme);
    
    console.log('📝 Workspace README created');
    console.log('\\n🚀 Ready to work with Claude in a clean environment!');
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    createCleanWorkspace().catch(console.error);
}

export default createCleanWorkspace;
