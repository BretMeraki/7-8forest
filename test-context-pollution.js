#!/usr/bin/env node

/**
 * Context Pollution Detection Tool
 * Tests if Claude can see unwanted files that should be filtered out
 */

import fs from 'fs';
import path from 'path';
import ContextFilter from './context-filter.js';

class ContextPollutionTester {
    constructor() {
        this.filter = new ContextFilter();
        this.testResults = [];
    }

    /**
     * Create test files that should be filtered out
     */
    async createTestPollutionFiles() {
        const pollutionFiles = [
            'test-pollution-marker.test.js',
            'debug-pollution-marker.js', 
            'backup-pollution-marker.backup',
            'log-pollution-marker.log',
            'temp-pollution-marker.tmp',
            'node_modules/pollution-package/index.js'
        ];

        console.log('🧪 Creating test pollution files...');
        
        for (const file of pollutionFiles) {
            const filePath = path.join(process.cwd(), file);
            const dir = path.dirname(filePath);
            
            // Create directory if needed
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Create test file with distinctive content
            const content = `// POLLUTION TEST FILE - ${file}
// This file should NOT be visible to Claude
// If Claude can see this, filtering has failed
const POLLUTION_MARKER = 'CONTEXT_POLLUTION_DETECTED_${Date.now()}';
console.log('If you see this, filtering failed!');
`;
            
            fs.writeFileSync(filePath, content);
            console.log(`  Created: ${file}`);
        }
        
        return pollutionFiles;
    }

    /**
     * Test if context filter correctly excludes pollution files
     */
    async testFilterEffectiveness() {
        console.log('\\n🔍 Testing filter effectiveness...');
        
        const exposedFiles = await this.filter.getExposedFiles();
        const validation = await this.filter.validateContext();
        
        console.log(`📊 Exposed files: ${exposedFiles.length}`);
        console.log(`⚠️  Unwanted files: ${validation.unwantedFiles.length}`);
        
        if (validation.unwantedFiles.length > 0) {
            console.log('\\n🚨 POLLUTION DETECTED:');
            validation.unwantedFiles.forEach(file => {
                console.log(`  - ${file}`);
            });
            return false;
        }
        
        console.log('✅ Filter working correctly - no pollution detected');
        return true;
    }

    /**
     * Create a validation report for Claude to verify
     */
    async createValidationReport() {
        const exposedFiles = await this.filter.getExposedFiles();
        const validation = await this.filter.validateContext();
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalExposedFiles: exposedFiles.length,
                unwantedFiles: validation.unwantedFiles.length,
                isClean: validation.isClean,
                coreModules: validation.coreModules.length
            },
            exposedFiles: exposedFiles.sort(),
            unwantedFiles: validation.unwantedFiles,
            testResults: this.testResults,
            filteringRules: await this.getFilteringRulesCount()
        };
        
        const reportPath = 'context-validation-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`\\n📋 Validation report saved to: ${reportPath}`);
        return report;
    }

    async getFilteringRulesCount() {
        const rules = this.filter.forestIgnoreRules;
        return {
            totalRules: rules.length,
            exclusionRules: rules.filter(r => !r.startsWith('!')).length,
            inclusionRules: rules.filter(r => r.startsWith('!')).length
        };
    }

    /**
     * Test that Claude cannot see specific pollution markers
     */
    async testSpecificPollutionMarkers() {
        console.log('\\n🎯 Testing specific pollution markers...');
        
        // Test for specific pollution patterns, not just substring matches
        const pollutionPatterns = [
            /\.test\./,           // .test. files
            /\.spec\./,           // .spec. files  
            /-test\./,            // -test. files
            /-debug\./,           // -debug. files
            /\.backup$/,          // .backup files
            /\.log$/,             // .log files
            /\.tmp$/,             // .tmp files
            /node_modules\//,     // node_modules directory
            /debug-/,             // debug- prefix
            /test-.*\.js$/        // test-*.js files
        ];
        
        const exposedFiles = await this.filter.getExposedFiles();
        let foundPollution = [];
        
        for (const file of exposedFiles) {
            for (const pattern of pollutionPatterns) {
                if (pattern.test(file)) {
                    foundPollution.push({ file, pattern: pattern.toString() });
                    break;
                }
            }
        }
        
        if (foundPollution.length > 0) {
            console.log('🚨 Found pollution patterns:');
            foundPollution.forEach(p => {
                console.log(`  - ${p.file} (matches ${p.pattern})`);
            });
            return false;
        }
        
        console.log('✅ No pollution patterns found in exposed files');
        return true;
    }

    /**
     * Cleanup test pollution files
     */
    async cleanup() {
        console.log('\\n🧹 Cleaning up test files...');
        
        const filesToClean = [
            'test-pollution-marker.test.js',
            'debug-pollution-marker.js',
            'backup-pollution-marker.backup', 
            'log-pollution-marker.log',
            'temp-pollution-marker.tmp',
            'node_modules'
        ];
        
        for (const file of filesToClean) {
            const filePath = path.join(process.cwd(), file);
            try {
                if (fs.existsSync(filePath)) {
                    if (fs.statSync(filePath).isDirectory()) {
                        fs.rmSync(filePath, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(filePath);
                    }
                    console.log(`  Removed: ${file}`);
                }
            } catch (error) {
                console.log(`  Failed to remove ${file}: ${error.message}`);
            }
        }
    }

    /**
     * Run complete context pollution test suite
     */
    async runCompleteTest() {
        console.log('🧪 Starting Context Pollution Test Suite\\n');
        
        try {
            // Create test pollution files
            await this.createTestPollutionFiles();
            
            // Test filter effectiveness
            const filterTest = await this.testFilterEffectiveness();
            this.testResults.push({ test: 'filter_effectiveness', passed: filterTest });
            
            // Test specific markers
            const markerTest = await this.testSpecificPollutionMarkers(); 
            this.testResults.push({ test: 'pollution_markers', passed: markerTest });
            
            // Generate validation report
            const report = await this.createValidationReport();
            
            // Summary
            const allTestsPassed = this.testResults.every(t => t.passed);
            console.log(`\\n${allTestsPassed ? '✅' : '❌'} Test Suite Complete`);
            console.log(`Passed: ${this.testResults.filter(t => t.passed).length}/${this.testResults.length}`);
            
            if (!allTestsPassed) {
                console.log('\\n🚨 CONTEXT POLLUTION DETECTED - Filtering may not be working properly');
                process.exit(1);
            }
            
            console.log('\\n🎉 Context filtering is working correctly!');
            
        } finally {
            // Always cleanup
            await this.cleanup();
        }
    }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new ContextPollutionTester();
    
    const command = process.argv[2];
    switch (command) {
        case 'test':
            tester.runCompleteTest();
            break;
        case 'report':
            tester.createValidationReport();
            break;
        case 'clean':
            tester.cleanup();
            break;
        default:
            console.log('Usage: node test-context-pollution.js <command>');
            console.log('Commands:');
            console.log('  test    - Run complete pollution test suite');
            console.log('  report  - Generate validation report only');
            console.log('  clean   - Clean up test files');
    }
}

export default ContextPollutionTester;
