#!/usr/bin/env node

/**
 * Validation script to verify diagnostic implementation prevents false positives
 */

import { ClaudeDiagnosticHelper } from './utils/claude-diagnostic-helper.js';
import path from 'path';

async function validateDiagnosticImplementation() {
  console.log('🔍 Validating Diagnostic Implementation...\n');
  
  const helper = new ClaudeDiagnosticHelper();
  
  // Test 1: Known function that exists (previously reported as false positive)
  console.log('📋 Test 1: Verify analyzeGoalComplexity exists');
  const functionVerification = await helper.verifyFunctionIssue(
    'analyzeGoalComplexity',
    '___stage1/modules/hta-complexity-analyzer.js',
    'Function analyzeGoalComplexity missing'
  );
  
  console.log(`Result: ${functionVerification.recommendation}`);
  console.log(`Severity: ${functionVerification.severity}`);
  console.log(`Function Exists: ${functionVerification.verificationResults.functionExists}\n`);
  
  // Test 2: System Health Check
  console.log('🏥 Test 2: System Health Verification');
  const systemVerification = await helper.verifySystemIssue('System appears broken');
  console.log(`Result: ${systemVerification.recommendation}`);
  console.log(`Severity: ${systemVerification.severity}\n`);
  
  // Test 3: Comprehensive Report with Mixed Issues
  console.log('📊 Test 3: Comprehensive Report with Known Issues');
  const reportedIssues = [
    {
      type: 'function',
      functionName: 'analyzeGoalComplexity',
      filePath: '___stage1/modules/hta-complexity-analyzer.js',
      description: 'Function missing'
    },
    {
      type: 'function', 
      functionName: 'nonExistentFunction',
      filePath: '___stage1/modules/fake-file.js',
      description: 'Fake function missing'
    }
  ];
  
  const report = await helper.generateDiagnosticReport(reportedIssues);
  
  console.log(`Total Issues Reported: ${report.summary.total_issues_reported}`);
  console.log(`False Positives Detected: ${report.summary.false_positives}`);
  console.log(`Verified Real Issues: ${report.summary.verified_issues}`);
  console.log(`Needs Investigation: ${report.summary.needs_investigation}\n`);
  
  // Test 4: False Positive Rate Calculation
  const falsePositiveRate = report.summary.false_positives / Math.max(1, report.summary.total_issues_reported);
  console.log(`False Positive Rate: ${(falsePositiveRate * 100).toFixed(1)}%`);
  
  // Results Summary
  console.log('\n✅ VALIDATION RESULTS:');
  console.log(`- Diagnostic Helper: Working`);
  console.log(`- Function Verification: ${functionVerification.severity === 'LOW' ? 'PASSED' : 'FAILED'}`);
  console.log(`- System Health: ${systemVerification.severity === 'LOW' ? 'PASSED' : 'NEEDS_ATTENTION'}`);
  console.log(`- False Positive Detection: ${report.summary.false_positives > 0 ? 'WORKING' : 'NEEDS_IMPROVEMENT'}`);
  
  if (functionVerification.severity === 'LOW' && report.summary.false_positives > 0) {
    console.log('\n🎯 SUCCESS: Implementation successfully prevents false positives!');
  } else {
    console.log('\n⚠️ WARNING: Implementation may need adjustment');
  }
}

// Run validation
validateDiagnosticImplementation().catch(error => {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
}); 