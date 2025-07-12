#!/usr/bin/env node

// =======================
// COMPLETE HTA PIPELINE TEST
// =======================
// This test validates the complete HTA (Hierarchical Task Analysis) pipeline
// including generation, validation, task creation, completion, and evolution

import { Stage1CoreServer } from './core-server.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize server
const server = new Stage1CoreServer();

// Test configuration
const TEST_CONFIG = {
    project: {
        name: 'HTA Pipeline Test Project',
        description: 'A comprehensive test project for validating HTA pipeline functionality',
        domain: 'software development',
        complexity: 'medium'
    },
    simulation: {
        maxTasks: 10,
        completionRate: 0.8,
        errorRate: 0.1
    }
};

// Test state tracking
let testState = {
    phase: 'initialization',
    progress: 0,
    projectData: null,
    htaTree: null,
    strategicBranches: [],
    generatedTasks: [],
    completedTasks: [],
    errors: [],
    logs: []
};

// Logging functions
function logPhase(phase, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${phase.toUpperCase()}: ${message}`;
    console.log(logEntry);
    testState.logs.push(logEntry);
}

function logError(phase, error) {
    const timestamp = new Date().toISOString();
    const errorEntry = `[${timestamp}] ERROR in ${phase}: ${error.message || error}`;
    console.error(errorEntry);
    testState.errors.push({ phase, error: errorEntry, timestamp });
}

function updateProgress(newProgress, phase) {
    testState.progress = newProgress;
    testState.phase = phase;
    logPhase(phase, `Progress: ${newProgress}%`);
}

// Main test execution
async function runCompleteHtaPipelineTest() {
    try {
        console.log('\n=== STARTING COMPLETE HTA PIPELINE TEST ===\n');
        
        // Debug: Check server methods
        console.log('\n=== SERVER METHODS AVAILABLE ===');
        console.log('Server methods:', Object.getOwnPropertyNames(server).filter(prop => typeof server[prop] === 'function'));
        console.log('Server prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(server)).filter(prop => typeof server[prop] === 'function'));
        
        // Phase 1: Project Initialization (0-10%)
        updateProgress(0, 'initialization');
        logPhase('initialization', 'Creating test project...');
        
        testState.projectData = {
            id: `hta-test-${Date.now()}`,
            name: TEST_CONFIG.project.name,
            description: TEST_CONFIG.project.description,
            domain: TEST_CONFIG.project.domain,
            complexity: TEST_CONFIG.project.complexity,
            created: new Date().toISOString(),
            status: 'active'
        };
        
        logPhase('initialization', `Project created: ${testState.projectData.id}`);
        updateProgress(10, 'hta-generation');
        
        // Phase 2: HTA Tree Generation (10-25%)
        logPhase('hta-generation', 'Generating HTA tree structure...');
        
        const htaResult = await server.generate_hta_tree({
            project: testState.projectData,
            analysisDepth: 'comprehensive',
            includeStrategicBranches: true,
            validateStructure: true
        });
        
        if (!htaResult.success) {
            throw new Error(`HTA generation failed: ${htaResult.error}`);
        }
        
        testState.htaTree = htaResult.htaTree;
        logPhase('hta-generation', `HTA tree generated with ${htaResult.htaTree.totalNodes} nodes`);
        updateProgress(25, 'strategic-analysis');
        
        // Phase 3: Strategic Branch Analysis (25-40%)
        logPhase('strategic-analysis', 'Analyzing strategic branches...');
        
        const strategicResult = await server.analyze_strategic_branches({
            htaTree: testState.htaTree,
            projectContext: testState.projectData,
            analysisType: 'comprehensive'
        });
        
        if (!strategicResult.success) {
            throw new Error(`Strategic analysis failed: ${strategicResult.error}`);
        }
        
        testState.strategicBranches = strategicResult.branches;
        logPhase('strategic-analysis', `Found ${strategicResult.branches.length} strategic branches`);
        updateProgress(40, 'task-generation');
        
        // Phase 4: Task Generation (40-55%)
        logPhase('task-generation', 'Generating tasks from HTA tree...');
        
        const taskResult = await server.get_next_task_forest({
            project: testState.projectData,
            htaTree: testState.htaTree,
            maxTasks: TEST_CONFIG.simulation.maxTasks,
            priorityFilter: 'high',
            includeMetadata: true
        });
        
        if (!taskResult.success) {
            throw new Error(`Task generation failed: ${taskResult.error}`);
        }
        
        testState.generatedTasks = taskResult.tasks;
        logPhase('task-generation', `Generated ${taskResult.tasks.length} tasks`);
        updateProgress(55, 'task-validation');
        
        // Phase 5: Task Validation (55-65%)
        logPhase('task-validation', 'Validating generated tasks...');
        
        for (const task of testState.generatedTasks) {
            const validationResult = await server.validate_task({
                task: task,
                htaContext: testState.htaTree,
                projectContext: testState.projectData
            });
            
            if (!validationResult.isValid) {
                logError('task-validation', `Task ${task.id} validation failed: ${validationResult.reasons.join(', ')}`);
            }
        }
        
        logPhase('task-validation', 'Task validation completed');
        updateProgress(65, 'task-completion');
        
        // Phase 6: Task Completion Simulation (65-80%)
        logPhase('task-completion', 'Simulating task completion...');
        
        for (const task of testState.generatedTasks) {
            const shouldComplete = Math.random() < TEST_CONFIG.simulation.completionRate;
            const hasError = Math.random() < TEST_CONFIG.simulation.errorRate;
            
            if (shouldComplete && !hasError) {
                const completionResult = await server.complete_task_forest({
                    taskId: task.id,
                    outcome: 'success',
                    completionData: {
                        completedAt: new Date().toISOString(),
                        quality: 'high',
                        notes: 'Completed successfully in simulation'
                    }
                });
                
                if (completionResult.success) {
                    testState.completedTasks.push(task);
                    logPhase('task-completion', `Task ${task.id} completed successfully`);
                } else {
                    logError('task-completion', `Failed to complete task ${task.id}: ${completionResult.error}`);
                }
            } else if (hasError) {
                logPhase('task-completion', `Task ${task.id} failed with simulated error`);
            } else {
                logPhase('task-completion', `Task ${task.id} not completed in simulation`);
            }
        }
        
        logPhase('task-completion', `Completed ${testState.completedTasks.length}/${testState.generatedTasks.length} tasks`);
        updateProgress(80, 'hta-evolution');
        
        // Phase 7: HTA Evolution (80-90%)
        logPhase('hta-evolution', 'Evolving HTA tree based on completion data...');
        
        const evolutionResult = await server.evolve_strategy_forest({
            htaTree: testState.htaTree,
            completionData: testState.completedTasks,
            projectContext: testState.projectData,
            evolutionType: 'adaptive'
        });
        
        if (!evolutionResult.success) {
            throw new Error(`HTA evolution failed: ${evolutionResult.error}`);
        }
        
        testState.htaTree = evolutionResult.evolvedTree;
        logPhase('hta-evolution', 'HTA tree evolved successfully');
        updateProgress(90, 'validation');
        
        // Phase 8: Final Validation (90-95%)
        logPhase('validation', 'Performing final validation...');
        
        const finalValidation = await server.validate_hta_tree({
            htaTree: testState.htaTree,
            projectContext: testState.projectData,
            validationType: 'comprehensive'
        });
        
        if (!finalValidation.isValid) {
            throw new Error(`Final HTA validation failed: ${finalValidation.issues.join(', ')}`);
        }
        
        logPhase('validation', 'Final validation passed');
        updateProgress(95, 'reporting');
        
        // Phase 9: Test Reporting (95-100%)
        logPhase('reporting', 'Generating test report...');
        
        const report = generateTestReport();
        await saveTestReport(report);
        
        updateProgress(100, 'completed');
        
        console.log('\n=== HTA PIPELINE TEST COMPLETED SUCCESSFULLY ===\n');
        console.log('Final Report:');
        console.log(report);
        
        return { success: true, report };
        
    } catch (error) {
        logError(testState.phase, error);
        console.error('\n=== HTA PIPELINE TEST FAILED ===\n');
        console.error(`Error in phase ${testState.phase}:`, error.message);
        console.error('\nError details:', error);
        
        const errorReport = generateErrorReport(error);
        await saveTestReport(errorReport);
        
        return { success: false, error: error.message, report: errorReport };
    }
}

// Report generation functions
function generateTestReport() {
    const report = {
        testSuite: 'Complete HTA Pipeline Test',
        timestamp: new Date().toISOString(),
        duration: Date.now() - testState.startTime,
        finalProgress: testState.progress,
        finalPhase: testState.phase,
        summary: {
            projectCreated: !!testState.projectData,
            htaTreeGenerated: !!testState.htaTree,
            strategicBranchesAnalyzed: testState.strategicBranches.length,
            tasksGenerated: testState.generatedTasks.length,
            tasksCompleted: testState.completedTasks.length,
            completionRate: testState.generatedTasks.length > 0 ? 
                (testState.completedTasks.length / testState.generatedTasks.length) * 100 : 0,
            errorsEncountered: testState.errors.length
        },
        details: {
            projectData: testState.projectData,
            htaTreeStats: testState.htaTree ? {
                totalNodes: testState.htaTree.totalNodes,
                depth: testState.htaTree.depth,
                branches: testState.htaTree.branches?.length || 0
            } : null,
            strategicBranches: testState.strategicBranches,
            taskStats: {
                generated: testState.generatedTasks.length,
                completed: testState.completedTasks.length,
                pending: testState.generatedTasks.length - testState.completedTasks.length
            }
        },
        logs: testState.logs,
        errors: testState.errors
    };
    
    return JSON.stringify(report, null, 2);
}

function generateErrorReport(error) {
    const report = {
        testSuite: 'Complete HTA Pipeline Test',
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        failurePhase: testState.phase,
        progress: testState.progress,
        error: {
            message: error.message,
            stack: error.stack
        },
        partialResults: {
            projectData: testState.projectData,
            htaTree: testState.htaTree,
            strategicBranches: testState.strategicBranches.length,
            tasksGenerated: testState.generatedTasks.length,
            tasksCompleted: testState.completedTasks.length
        },
        logs: testState.logs,
        errors: testState.errors
    };
    
    return JSON.stringify(report, null, 2);
}

async function saveTestReport(report) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `hta-pipeline-test-report-${timestamp}.json`;
        const filepath = path.join(__dirname, 'test-reports', filename);
        
        // Ensure test-reports directory exists
        const reportsDir = path.join(__dirname, 'test-reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        fs.writeFileSync(filepath, report, 'utf8');
        logPhase('reporting', `Test report saved to: ${filepath}`);
    } catch (error) {
        logError('reporting', `Failed to save test report: ${error.message}`);
    }
}

// Execute the test if run directly
if (import.meta.url === `file://${__filename}`) {
    testState.startTime = Date.now();
    runCompleteHtaPipelineTest()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}

export {
    runCompleteHtaPipelineTest,
    testState,
    TEST_CONFIG
};
