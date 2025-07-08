#!/usr/bin/env node

/**
 * Production Readiness Test
 * Validates all 4 critical blockers have been fixed
 */

import { Stage1CoreServer } from './core-server.js';
import { GatedOnboardingFlow } from './modules/gated-onboarding-flow.js';

async function testProductionReadiness() {
    console.log('🧪 Testing Production Readiness - All Critical Blockers Fixed...\n');
    
    const results = {
        gatedOnboarding: { passed: false, issues: [] },
        vectorization: { passed: false, issues: [] },
        branchMetadata: { passed: false, issues: [] },
        schemaDriven: { passed: false, issues: [] }
    };
    
    try {
        // Initialize server
        const server = new Stage1CoreServer({
            dataPersistence: { dataDir: './.forest-data' },
            vectorProvider: {
                provider: 'ChromaDBProvider',
                config: { 
                    collection: 'forest_vectors',
                    url: 'http://localhost:8000'
                }
            }
        });
        
        await server.initialize();
        console.log('✅ Forest server initialized\n');
        
        // TEST 1: Gated Onboarding System
        console.log('📋 Test 1: Gated Onboarding Stage Progression');
        try {
            const onboarding = new GatedOnboardingFlow();
            
            // Test stage determination
            const stage = await onboarding.determineCorrectStage();
            if (stage !== 'undefined' && stage !== null) {
                results.gatedOnboarding.passed = true;
                console.log(`✅ Stage determination working: ${stage}`);
            } else {
                results.gatedOnboarding.issues.push('Stage determination returns undefined');
            }
            
            // Test context gathering progression
            const contextResult = await onboarding.continueOnboarding('test-session', 'context_gathering', {
                context: 'I am a software engineer with 3 years experience looking to learn AI/ML'
            });
            
            if (contextResult && !contextResult.error && contextResult.stage_complete) {
                results.gatedOnboarding.passed = true;
                console.log('✅ Context gathering progression working');
            } else {
                results.gatedOnboarding.issues.push('Context gathering progression failed');
            }
            
        } catch (error) {
            results.gatedOnboarding.issues.push(`Onboarding error: ${error.message}`);
        }
        
        // TEST 2: Vectorization Integration
        console.log('\n📋 Test 2: Vectorization Integration');
        try {
            // Create test project
            const projectResult = await server.createProject({
                goal: 'Master machine learning for computer vision applications',
                context: 'Software engineer with Python experience, want to work on image recognition'
            });
            
            if (projectResult.success) {
                console.log('✅ Test project created');
                
                // Build HTA tree (should trigger vectorization)
                const htaResult = await server.buildHTATree({});
                if (htaResult.success) {
                    console.log('✅ HTA tree built');
                    
                    // Check vectorization status
                    const vectorStatus = await server.getVectorizationStatus();
                    if (vectorStatus && vectorStatus.success && vectorStatus.total_vectors > 0) {
                        results.vectorization.passed = true;
                        console.log(`✅ Vectorization working: ${vectorStatus.total_vectors} vectors`);
                    } else {
                        results.vectorization.issues.push('No vectors found after HTA build');
                    }
                } else {
                    results.vectorization.issues.push('HTA tree build failed');
                }
            } else {
                results.vectorization.issues.push('Project creation failed');
            }
            
        } catch (error) {
            results.vectorization.issues.push(`Vectorization error: ${error.message}`);
        }
        
        // TEST 3: Branch Metadata Pipeline
        console.log('\n📋 Test 3: Branch Metadata Pipeline');
        try {
            // Get HTA status
            const htaStatus = await server.getHTAStatus();
            if (htaStatus.content && htaStatus.content[0] && htaStatus.content[0].text) {
                const statusText = htaStatus.content[0].text;
                
                // Check for undefined branch names
                if (!statusText.includes('undefined') && statusText.includes('Strategic Branches')) {
                    console.log('✅ HTA status shows proper branch metadata');
                    
                    // Get next task to test pipeline view
                    const taskResult = await server.getNextTask({});
                    if (taskResult.content && taskResult.content[0] && taskResult.content[0].text) {
                        const taskText = taskResult.content[0].text;
                        
                        if (!taskText.includes('undefined') && (taskText.includes('Branch:') || taskText.includes('Phase:'))) {
                            results.branchMetadata.passed = true;
                            console.log('✅ Task pipeline shows proper branch metadata');
                        } else {
                            results.branchMetadata.issues.push('Task pipeline shows undefined branches');
                        }
                    } else {
                        results.branchMetadata.issues.push('Task result empty');
                    }
                } else {
                    results.branchMetadata.issues.push('HTA status contains undefined branches');
                }
            } else {
                results.branchMetadata.issues.push('HTA status empty');
            }
            
        } catch (error) {
            results.branchMetadata.issues.push(`Branch metadata error: ${error.message}`);
        }
        
        // TEST 4: Schema-Driven Approach
        console.log('\n📋 Test 4: Schema-Driven Content Generation');
        try {
            // Test domain-specific branch generation
            const htaStatus = await server.getHTAStatus();
            if (htaStatus.content && htaStatus.content[0] && htaStatus.content[0].text) {
                const statusText = htaStatus.content[0].text;
                
                // Check for domain-specific terms vs generic templates
                const hasGenericTerms = /Foundation.*Core Concepts|Research.*Deep Dive|Capability.*Hands-on Practice/i.test(statusText);
                const hasDomainTerms = /Mathematical|Neural|Model|Training|Vision|Learning|Recognition|Algorithm/i.test(statusText);
                
                if (!hasGenericTerms && hasDomainTerms) {
                    results.schemaDriven.passed = true;
                    console.log('✅ Domain-specific content generation working');
                } else if (hasGenericTerms) {
                    results.schemaDriven.issues.push('Still using generic hardcoded templates');
                } else {
                    results.schemaDriven.issues.push('No clear domain-specific content found');
                }
            } else {
                results.schemaDriven.issues.push('No content to analyze');
            }
            
        } catch (error) {
            results.schemaDriven.issues.push(`Schema-driven error: ${error.message}`);
        }
        
        // Clean up
        await server.cleanup();
        
    } catch (error) {
        console.error('💥 Test setup failed:', error.message);
    }
    
    // RESULTS SUMMARY
    console.log('\n' + '='.repeat(60));
    console.log('🎯 PRODUCTION READINESS RESULTS');
    console.log('='.repeat(60));
    
    const testResults = [
        { name: 'Gated Onboarding System', result: results.gatedOnboarding },
        { name: 'Vectorization Integration', result: results.vectorization },
        { name: 'Branch Metadata Pipeline', result: results.branchMetadata },
        { name: 'Schema-Driven Approach', result: results.schemaDriven }
    ];
    
    let totalPassed = 0;
    testResults.forEach(test => {
        const status = test.result.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status}: ${test.name}`);
        if (test.result.issues.length > 0) {
            test.result.issues.forEach(issue => console.log(`  - ${issue}`));
        }
        if (test.result.passed) totalPassed++;
    });
    
    const productionReadiness = Math.round((totalPassed / testResults.length) * 100);
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 PRODUCTION READINESS: ${productionReadiness}%`);
    console.log(`✅ Critical Blockers Fixed: ${totalPassed}/4`);
    
    if (productionReadiness >= 100) {
        console.log('🎉 ALL CRITICAL BLOCKERS RESOLVED - READY FOR PRODUCTION!');
    } else if (productionReadiness >= 75) {
        console.log('⚡ MOSTLY READY - Minor issues remain');
    } else {
        console.log('⚠️  CRITICAL ISSUES REMAIN - More work needed');
    }
    
    console.log('='.repeat(60));
}

// Run the test
testProductionReadiness().catch(error => {
    console.error('💥 Production readiness test crashed:', error.message);
});