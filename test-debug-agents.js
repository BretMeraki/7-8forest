#!/usr/bin/env node

/**
 * Test Debug Agents System
 * Quick test to verify all agents are working correctly
 */

import { orchestrator } from './debug-agents/agent-orchestrator.js';

console.log('🧪 Testing Debug Agents System\n');

async function runTests() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Initialize orchestrator
  try {
    console.log('Test 1: Initializing orchestrator...');
    await orchestrator.initialize();
    results.passed++;
    results.tests.push({ name: 'Initialize orchestrator', status: 'PASSED' });
    console.log('✅ PASSED\n');
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Initialize orchestrator', status: 'FAILED', error: error.message });
    console.log(`❌ FAILED: ${error.message}\n`);
  }

  // Test 2: Start agents
  try {
    console.log('Test 2: Starting agents...');
    await orchestrator.start();
    results.passed++;
    results.tests.push({ name: 'Start agents', status: 'PASSED' });
    console.log('✅ PASSED\n');
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Start agents', status: 'FAILED', error: error.message });
    console.log(`❌ FAILED: ${error.message}\n`);
  }

  // Test 3: Check agent statuses
  try {
    console.log('Test 3: Checking agent statuses...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for agents to initialize
    
    const agentCount = orchestrator.agents.size;
    if (agentCount === 6) {
      results.passed++;
      results.tests.push({ name: 'Agent count', status: 'PASSED', details: `${agentCount} agents loaded` });
      console.log(`✅ PASSED: ${agentCount} agents loaded\n`);
    } else {
      throw new Error(`Expected 6 agents, found ${agentCount}`);
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Agent count', status: 'FAILED', error: error.message });
    console.log(`❌ FAILED: ${error.message}\n`);
  }

  // Test 4: Collect metrics
  try {
    console.log('Test 4: Collecting metrics...');
    await orchestrator.collectMetrics();
    const metrics = orchestrator.systemStatus.metrics;
    
    if (metrics && metrics.agents) {
      results.passed++;
      results.tests.push({ name: 'Collect metrics', status: 'PASSED' });
      console.log('✅ PASSED\n');
    } else {
      throw new Error('No metrics collected');
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Collect metrics', status: 'FAILED', error: error.message });
    console.log(`❌ FAILED: ${error.message}\n`);
  }

  // Test 5: Generate report
  try {
    console.log('Test 5: Generating report...');
    const report = await orchestrator.generateReport();
    
    if (report && report.id && report.summary) {
      results.passed++;
      results.tests.push({ name: 'Generate report', status: 'PASSED', details: `Report ID: ${report.id}` });
      console.log(`✅ PASSED: Report generated with ID ${report.id}\n`);
    } else {
      throw new Error('Invalid report format');
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Generate report', status: 'FAILED', error: error.message });
    console.log(`❌ FAILED: ${error.message}\n`);
  }

  // Test 6: Check individual agents
  const agentTests = [
    { id: 'error_detection', name: 'Error Detection Agent' },
    { id: 'code_analysis', name: 'Code Analysis Agent' },
    { id: 'test_coverage', name: 'Test Coverage Agent' },
    { id: 'performance', name: 'Performance Agent' },
    { id: 'dependency', name: 'Dependency Agent' },
    { id: 'self_healing', name: 'Self-Healing Agent' }
  ];

  for (const agentTest of agentTests) {
    try {
      console.log(`Test: ${agentTest.name}...`);
      const agent = orchestrator.agents.get(agentTest.id);
      
      if (agent && agent.getStatistics) {
        const stats = agent.getStatistics();
        results.passed++;
        results.tests.push({ name: agentTest.name, status: 'PASSED', details: JSON.stringify(stats).substring(0, 50) + '...' });
        console.log('✅ PASSED\n');
      } else {
        throw new Error('Agent not found or no statistics method');
      }
    } catch (error) {
      results.failed++;
      results.tests.push({ name: agentTest.name, status: 'FAILED', error: error.message });
      console.log(`❌ FAILED: ${error.message}\n`);
    }
  }

  // Stop orchestrator
  console.log('Stopping orchestrator...');
  orchestrator.stop();

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\nFailed Tests:');
    results.tests.filter(t => t.status === 'FAILED').forEach(test => {
      console.log(`- ${test.name}: ${test.error}`);
    });
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
