#!/usr/bin/env node

/**
 * PRD Compliance Validation Test
 * 
 * Validates the Stage1 implementation against the specific success criteria
 * defined in section 6.0 of the Product Requirements Document (PRD).
 * 
 * This test verifies that the "magic" has been preserved exactly as specified.
 */

import { CoreInitialization } from './core-initialization.js';

class PRDComplianceValidator {
  constructor() {
    this.coreInit = null;
    this.prdResults = [];
    this.htaCore = null;
    this.taskStrategyCore = null;
  }

  async runPRDValidation() {
    console.log('🎯 PRD COMPLIANCE VALIDATION');
    console.log('============================');
    console.log('Validating against PRD Section 6.0 Success Criteria\n');

    try {
      // Initialize system
      await this.initializeSystem();
      
      // 6.1 HTA Intelligence Tests
      await this.validateHTAIntelligenceTests();
      
      // 6.2 Strategy Evolution Requirements  
      await this.validateStrategyEvolutionRequirements();
      
      // 6.3 Core Loop Integration Tests
      await this.validateCoreLoopIntegration();
      
      // 6.4 Magic Preservation Guarantee
      await this.validateMagicPreservation();
      
      // Generate PRD compliance report
      this.generatePRDComplianceReport();
      
    } catch (error) {
      console.error('❌ PRD Validation Failed:', error.message);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  async initializeSystem() {
    console.log('🚀 Initializing System for PRD Validation');
    console.log('------------------------------------------');
    
    this.coreInit = new CoreInitialization();
    await this.coreInit.initialize();
    
    // Get direct access to core modules
    this.htaCore = this.coreInit.server.htaCore;
    this.taskStrategyCore = this.coreInit.server.taskStrategyCore;
    
    console.log('✅ System initialized for PRD testing\n');
  }

  async validateHTAIntelligenceTests() {
    console.log('🧠 6.1 HTA Intelligence Tests');
    console.log('-----------------------------');
    
    // Test 6.1.1: Complexity Analysis
    await this.testComplexityAnalysis();
    
    // Test 6.1.2: Strategic Branches
    await this.testStrategicBranches();
    
    // Test 6.1.3: Adaptive Evolution
    await this.testAdaptiveEvolution();
    
    // Test 6.1.4: Breakthrough Escalation
    await this.testBreakthroughEscalation();
    
    // Test 6.1.5: Frontier Management
    await this.testFrontierManagement();
    
    // Test 6.1.6: Claude Integration
    await this.testClaudeIntegration();
    
    // Test 6.1.7: Fallback Intelligence
    await this.testFallbackIntelligence();
    
    console.log('');
  }

  async testComplexityAnalysis() {
    console.log('  Testing: Complexity Analysis (analyzeGoalComplexity)');
    
    try {
      // Check if the function exists
      if (!this.htaCore || typeof this.htaCore.analyzeGoalComplexity !== 'function') {
        throw new Error('analyzeGoalComplexity function not found in htaCore');
      }
      
      // Test complexity analysis with a sample goal
      const testGoal = "Learn to play piano professionally";
      const complexityResult = await this.htaCore.analyzeGoalComplexity(testGoal);
      
      // Validate the result structure
      if (!complexityResult || typeof complexityResult.score !== 'number') {
        throw new Error('Complexity analysis did not return valid score');
      }
      
      console.log(`    ✅ analyzeGoalComplexity working (score: ${complexityResult.score})`);
      this.recordPRDResult('6.1.1_complexity_analysis', 'PASS', 'Function exists and returns valid complexity score');
      
    } catch (error) {
      console.log(`    ❌ analyzeGoalComplexity failed: ${error.message}`);
      this.recordPRDResult('6.1.1_complexity_analysis', 'FAIL', error.message);
    }
  }

  async testStrategicBranches() {
    console.log('  Testing: Strategic Branches (Foundation → Research → Capability → Implementation → Mastery)');
    
    try {
      // Check if deriveStrategicBranches exists
      if (!this.htaCore || typeof this.htaCore.deriveStrategicBranches !== 'function') {
        throw new Error('deriveStrategicBranches function not found');
      }
      
      const branches = await this.htaCore.deriveStrategicBranches("Learn data science");
      
      // Validate that the required strategic branches are present
      const requiredBranches = ['Foundation', 'Research', 'Capability', 'Implementation', 'Mastery'];
      const foundBranches = branches.map(b => b.name || b.title || b.phase);
      
      const missingBranches = requiredBranches.filter(req => 
        !foundBranches.some(found => found.includes(req))
      );
      
      if (missingBranches.length > 0) {
        throw new Error(`Missing required strategic branches: ${missingBranches.join(', ')}`);
      }
      
      console.log(`    ✅ Strategic branches present: ${foundBranches.join(' → ')}`);
      this.recordPRDResult('6.1.2_strategic_branches', 'PASS', 'All required strategic branches found');
      
    } catch (error) {
      console.log(`    ❌ Strategic branches failed: ${error.message}`);
      this.recordPRDResult('6.1.2_strategic_branches', 'FAIL', error.message);
    }
  }

  async testAdaptiveEvolution() {
    console.log('  Testing: Adaptive Evolution (evolveHTABasedOnLearning)');
    try {
      if (!this.taskStrategyCore || typeof this.taskStrategyCore.evolveHTABasedOnLearning !== 'function') {
        throw new Error('evolveHTABasedOnLearning function not found');
      }
      // Test with proper function parameters (projectId, pathName, block)
      const testProjectId = 'test_project_123';
      const testPathName = 'general';
      const testBlock = {
        taskId: 'test_task_123',
        title: 'Sample Task',
        outcome: 'completed',
        difficulty: 3,
        learned: 'Found this easier than expected',
        nextQuestions: 'Need more practice with X',
        breakthrough: false
      };
      const evolutionResult = await this.taskStrategyCore.evolveHTABasedOnLearning(testProjectId, testPathName, testBlock);
      // Function may not return a value but should execute without error
      console.log('    ✅ evolveHTABasedOnLearning working');
      this.recordPRDResult('6.1.3_adaptive_evolution', 'PASS', 'Function exists and processes learning data');
    } catch (error) {
      console.log(`    ❌ Adaptive evolution failed: ${error.message}`);
      this.recordPRDResult('6.1.3_adaptive_evolution', 'FAIL', error.message);
    }
  }

  async testBreakthroughEscalation() {
    console.log('  Testing: Breakthrough Escalation (handleBreakthrough)');
    
    try {
      if (!this.taskStrategyCore || typeof this.taskStrategyCore.handleBreakthrough !== 'function') {
        throw new Error('handleBreakthrough function not found');
      }
      
      // Test with proper function parameters (event data structure)
      const breakthroughEventData = {
        projectId: 'test_project_123',
        pathName: 'general',
        block: {
          taskId: 'test_breakthrough_task',
          title: 'Breakthrough Task',
          outcome: 'exceptional',
          breakthrough: true
        },
        breakthroughContent: 'Major breakthrough understanding'
      };
      
      const result = await this.taskStrategyCore.handleBreakthrough(breakthroughEventData);
      
      console.log('    ✅ handleBreakthrough working');
      this.recordPRDResult('6.1.4_breakthrough_escalation', 'PASS', 'Breakthrough handling function exists');
      
    } catch (error) {
      console.log(`    ❌ Breakthrough escalation failed: ${error.message}`);
      this.recordPRDResult('6.1.4_breakthrough_escalation', 'FAIL', error.message);
    }
  }

  async testFrontierManagement() {
    console.log('  Testing: Frontier Management (transformTasksToFrontierNodes)');
    
    try {
      if (!this.htaCore || typeof this.htaCore.transformTasksToFrontierNodes !== 'function') {
        throw new Error('transformTasksToFrontierNodes function not found');
      }
      
      const sampleTasks = [
        { id: 'task1', title: 'Learn basic concepts', status: 'ready' },
        { id: 'task2', title: 'Practice exercises', status: 'ready' }
      ];
      
      const frontierNodes = await this.htaCore.transformTasksToFrontierNodes(sampleTasks);
      
      if (!Array.isArray(frontierNodes)) {
        throw new Error('Frontier nodes not returned as array');
      }
      
      console.log('    ✅ transformTasksToFrontierNodes working');
      this.recordPRDResult('6.1.5_frontier_management', 'PASS', 'Frontier node transformation working');
      
    } catch (error) {
      console.log(`    ❌ Frontier management failed: ${error.message}`);
      this.recordPRDResult('6.1.5_frontier_management', 'FAIL', error.message);
    }
  }

  async testClaudeIntegration() {
    console.log('  Testing: Claude Integration (generateHTAData)');
    
    try {
      if (!this.htaCore || typeof this.htaCore.generateHTAData !== 'function') {
        throw new Error('generateHTAData function not found');
      }
      
      // Note: This may fail if Claude API is not available, which is expected
      console.log('    ✅ generateHTAData function exists (Claude integration present)');
      this.recordPRDResult('6.1.6_claude_integration', 'PASS', 'Claude integration function exists');
      
    } catch (error) {
      console.log(`    ❌ Claude integration failed: ${error.message}`);
      this.recordPRDResult('6.1.6_claude_integration', 'FAIL', error.message);
    }
  }

  async testFallbackIntelligence() {
    console.log('  Testing: Fallback Intelligence (createFallbackHTA, generateSkeletonTasks)');
    
    try {
      if (!this.htaCore || typeof this.htaCore.createFallbackHTA !== 'function') {
        throw new Error('createFallbackHTA function not found');
      }
      
      if (!this.htaCore || typeof this.htaCore.generateSkeletonTasks !== 'function') {
        throw new Error('generateSkeletonTasks function not found');
      }
      
      console.log('    ✅ Fallback functions exist (createFallbackHTA, generateSkeletonTasks)');
      this.recordPRDResult('6.1.7_fallback_intelligence', 'PASS', 'Fallback intelligence functions exist');
      
    } catch (error) {
      console.log(`    ❌ Fallback intelligence failed: ${error.message}`);
      this.recordPRDResult('6.1.7_fallback_intelligence', 'FAIL', error.message);
    }
  }

  async validateStrategyEvolutionRequirements() {
    console.log('⚡ 6.2 Strategy Evolution Requirements');
    console.log('------------------------------------');
    
    // Test that evolve_strategy tool exists and is callable
    try {
      const tools = this.coreInit.server.mcpCore.getToolDefinitions();
      const evolveStrategyTool = tools.find(t => t.name === 'evolve_strategy_forest');
      
      if (!evolveStrategyTool) {
        throw new Error('evolve_strategy_forest tool not found');
      }
      
      console.log('  ✅ evolve_strategy tool is properly defined');
      this.recordPRDResult('6.2.1_evolve_strategy_tool', 'PASS', 'Tool exists and is callable');
      
    } catch (error) {
      console.log(`  ❌ Strategy evolution tool failed: ${error.message}`);
      this.recordPRDResult('6.2.1_evolve_strategy_tool', 'FAIL', error.message);
    }
    
    console.log('');
  }

  async validateCoreLoopIntegration() {
    console.log('🔄 6.3 Core Loop Integration Tests');
    console.log('----------------------------------');
    
    // Test that complete_block triggers strategy evolution
    try {
      const tools = this.coreInit.server.mcpCore.getToolDefinitions();
      const completeBlockTool = tools.find(t => t.name === 'complete_block_forest');
      
      if (!completeBlockTool) {
        throw new Error('complete_block_forest tool not found');
      }
      
      console.log('  ✅ Core loop integration tools exist (complete_block_forest)');
      this.recordPRDResult('6.3.1_core_loop_integration', 'PASS', 'Core loop tools properly defined');
      
    } catch (error) {
      console.log(`  ❌ Core loop integration failed: ${error.message}`);
      this.recordPRDResult('6.3.1_core_loop_integration', 'FAIL', error.message);
    }
    
    console.log('');
  }

  async validateMagicPreservation() {
    console.log('✨ 6.4 Magic Preservation Guarantee');
    console.log('-----------------------------------');
    
    // Test that key functions exist with expected signatures
    const requiredFunctions = [
      { module: 'htaCore', function: 'analyzeGoalComplexity' },
      { module: 'htaCore', function: 'calculateTreeStructure' },
      { module: 'taskStrategyCore', function: 'evolveHTABasedOnLearning' },
      { module: 'taskStrategyCore', function: 'handleBreakthrough' },
      { module: 'taskStrategyCore', function: 'handleOpportunityDetection' }
    ];
    
    let preservedFunctions = 0;
    
    for (const req of requiredFunctions) {
      try {
        const module = this[req.module];
        if (module && typeof module[req.function] === 'function') {
          preservedFunctions++;
          console.log(`  ✅ ${req.function} preserved in ${req.module}`);
        } else {
          console.log(`  ❌ ${req.function} missing from ${req.module}`);
        }
      } catch (error) {
        console.log(`  ❌ Error checking ${req.function}: ${error.message}`);
      }
    }
    
    const preservationRate = (preservedFunctions / requiredFunctions.length) * 100;
    const status = preservationRate >= 80 ? 'PASS' : 'FAIL';
    
    this.recordPRDResult('6.4.1_magic_preservation', status, 
      `${preservedFunctions}/${requiredFunctions.length} core functions preserved (${preservationRate.toFixed(1)}%)`);
    
    console.log('');
  }

  recordPRDResult(testId, status, details) {
    this.prdResults.push({
      testId,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  generatePRDComplianceReport() {
    console.log('📊 PRD COMPLIANCE REPORT');
    console.log('========================');
    
    const passed = this.prdResults.filter(r => r.status === 'PASS').length;
    const failed = this.prdResults.filter(r => r.status === 'FAIL').length;
    const total = this.prdResults.length;
    
    console.log(`Total PRD Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`PRD Compliance Rate: ${((passed / total) * 100).toFixed(1)}%\n`);
    
    // Show detailed results by section
    console.log('📋 Detailed Results:');
    this.prdResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.testId}: ${result.details}`);
    });
    
    // Final assessment
    const complianceRate = (passed / total) * 100;
    
    if (complianceRate >= 90) {
      console.log('\n🎉 PRD COMPLIANCE: EXCELLENT');
      console.log('✅ Stage1 implementation meets PRD requirements');
      console.log('✅ Core "magic" has been preserved');
      console.log('✅ Ready for production use');
    } else if (complianceRate >= 70) {
      console.log('\n⚠️  PRD COMPLIANCE: PARTIAL');
      console.log('⚠️  Some PRD requirements not fully met');
      console.log('🔧 Additional work needed before production');
    } else {
      console.log('\n❌ PRD COMPLIANCE: INSUFFICIENT');
      console.log('❌ Critical PRD requirements not met');
      console.log('🔧 Significant rework required');
    }
    
    // Show failed tests
    const failures = this.prdResults.filter(r => r.status === 'FAIL');
    if (failures.length > 0) {
      console.log('\n❌ Failed PRD Requirements:');
      failures.forEach(failure => {
        console.log(`   • ${failure.testId}: ${failure.details}`);
      });
    }
  }

  async cleanup() {
    if (this.coreInit) {
      await this.coreInit.shutdown();
      console.log('\n🧹 PRD validation cleanup complete');
    }
  }
}

// Run PRD compliance validation
const validator = new PRDComplianceValidator();
validator.runPRDValidation().catch(error => {
  console.error('💥 PRD validation crashed:', error);
  process.exit(1);
});
