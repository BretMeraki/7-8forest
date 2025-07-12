#!/usr/bin/env node

/**
 * Context Filter Utility
 * Validates and filters files that should be exposed to Claude
 * Ensures only production source code and vectors are accessible
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ContextFilter {
    constructor() {
        this.forestIgnoreRules = this.loadForestIgnoreRules();
    }

    loadForestIgnoreRules() {
        const forestIgnorePath = path.join(__dirname, '.forestignore');
        if (!fs.existsSync(forestIgnorePath)) {
            console.warn('No .forestignore file found');
            return [];
        }

        const content = fs.readFileSync(forestIgnorePath, 'utf8');
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
    }

    /**
     * Check if a file should be excluded based on .forestignore rules
     */
    shouldExclude(filePath) {
        const relativePath = path.relative(__dirname, filePath);
        
        // Check if this file is explicitly whitelisted
        for (const rule of this.forestIgnoreRules) {
            if (rule.startsWith('!')) {
                const pattern = rule.substring(1);
                if (this.matchesPattern(relativePath, pattern)) {
                    return false; // Explicitly included
                }
            }
        }
        
        // Check if this file matches any blacklist pattern
        for (const rule of this.forestIgnoreRules) {
            if (!rule.startsWith('!')) {
                if (this.matchesPattern(relativePath, rule)) {
                    return true; // Excluded by blacklist
                }
            }
        }
        
        // If we have a global exclude rule (**/*), exclude everything not whitelisted
        if (this.forestIgnoreRules.includes('**/*')) {
            return true; // Exclude by default
        }
        
        return false;
    }

    /**
     * Simple pattern matching for file paths
     */
    matchesPattern(filePath, pattern) {
        // Convert glob pattern to regex
        const regexPattern = pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '.');

        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(filePath);
    }

    /**
     * Get all files that should be exposed to Claude
     */
    async getExposedFiles() {
        const allFiles = await glob('**/*', { 
            cwd: __dirname,
            nodir: true,
            dot: false
        });

        const exposedFiles = allFiles.filter(file => {
            const fullPath = path.join(__dirname, file);
            return !this.shouldExclude(fullPath);
        });

        return exposedFiles;
    }

    /**
     * Get core production modules only
     */
    async getCoreModules() {
        const corePatterns = [
            '___stage1/modules/core-*.js',
            '___stage1/modules/mcp-*.js',
            '___stage1/modules/hta-*.js',
            '___stage1/modules/data-*.js',
            '___stage1/modules/context-*.js',
            '___stage1/modules/task-*.js',
            '___stage1/modules/forest-*.js',
            '___stage1/modules/gated-*.js',
            '___stage1/modules/intelligent-*.js',
            '___stage1/modules/next-*.js',
            '___stage1/modules/pure-*.js',
            '___stage1/modules/rich-*.js',
            '___stage1/modules/schema-*.js',
            '___stage1/modules/strategy-*.js',
            '___stage1/modules/streamlined-*.js',
            '___stage1/modules/vector-*.js',
            '___stage1/modules/constants.js',
            '___stage1/modules/errors.js',
            '___stage1/modules/schemas.js'
        ];

        const coreFiles = [];
        for (const pattern of corePatterns) {
            const files = await glob(pattern, { cwd: __dirname });
            coreFiles.push(...files);
        }

        return [...new Set(coreFiles)]; // Remove duplicates
    }

    /**
     * Validate the current context state
     */
    async validateContext() {
        const exposedFiles = await this.getExposedFiles();
        const coreModules = await this.getCoreModules();

        console.log('🔍 Context Validation Report');
        console.log('=' .repeat(50));
        console.log(`Total exposed files: ${exposedFiles.length}`);
        console.log(`Core modules: ${coreModules.length}`);
        
        // Check for unwanted files
        const unwantedPatterns = [
            /test/i,
            /debug/i,
            /spec/i,
            /\.log$/,
            /backup/i,
            /temp/i,
            /tmp/i
        ];

        const unwantedFiles = exposedFiles.filter(file => 
            unwantedPatterns.some(pattern => pattern.test(file))
        );

        if (unwantedFiles.length > 0) {
            console.log('\n⚠️  Unwanted files detected:');
            unwantedFiles.forEach(file => console.log(`  - ${file}`));
        } else {
            console.log('\n✅ No unwanted files detected');
        }

        // Check for essential files
        const essentialFiles = [
            'forest_vectors.sqlite',
            'package.json',
            'mcp-config-working.json'
        ];

        const missingEssential = essentialFiles.filter(file => 
            !exposedFiles.includes(file)
        );

        if (missingEssential.length > 0) {
            console.log('\n⚠️  Missing essential files:');
            missingEssential.forEach(file => console.log(`  - ${file}`));
        } else {
            console.log('\n✅ All essential files present');
        }

        return {
            exposedFiles,
            coreModules,
            unwantedFiles,
            missingEssential,
            isClean: unwantedFiles.length === 0 && missingEssential.length === 0
        };
    }

    /**
     * Create a clean context directory with only essential files
     */
    async createCleanContext(outputDir = './clean-context') {
        const exposedFiles = await this.getExposedFiles();
        
        // Create output directory
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Copy essential files
        for (const file of exposedFiles) {
            const sourcePath = path.join(__dirname, file);
            const destPath = path.join(outputDir, file);
            
            // Create directory structure
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }

            // Copy file
            fs.copyFileSync(sourcePath, destPath);
        }

        console.log(`✅ Clean context created in ${outputDir}`);
        console.log(`📁 ${exposedFiles.length} files copied`);
    }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const filter = new ContextFilter();
    const command = process.argv[2];

    switch (command) {
        case 'validate':
            filter.validateContext().then(result => {
                process.exit(result.isClean ? 0 : 1);
            });
            break;
        case 'list':
            filter.getExposedFiles().then(files => {
                console.log('Exposed files:');
                files.forEach(file => console.log(`  ${file}`));
            });
            break;
        case 'core':
            filter.getCoreModules().then(modules => {
                console.log('Core modules:');
                modules.forEach(module => console.log(`  ${module}`));
            });
            break;
        case 'clean':
            filter.createCleanContext(process.argv[3] || './clean-context');
            break;
        default:
            console.log('Usage: node context-filter.js <command>');
            console.log('Commands:');
            console.log('  validate  - Validate current context');
            console.log('  list      - List all exposed files');
            console.log('  core      - List core modules only');
            console.log('  clean     - Create clean context directory');
    }
}

export default ContextFilter;
