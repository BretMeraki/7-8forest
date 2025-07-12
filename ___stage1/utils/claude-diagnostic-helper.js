/**
 * Claude Diagnostic Helper - Prevents false positives in Claude diagnostics
 * 
 * This module provides helper functions specifically designed to prevent
 * Claude from reporting false positives when analyzing the codebase.
 */

import { DiagnosticVerifier } from './diagnostic-verifier.js';
import { promises as fs } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export class ClaudeDiagnosticHelper {
  constructor(projectRoot = process.cwd()) {
    // Detect Forest server directory when running through MCP
    if (!projectRoot || projectRoot.includes('Claude') || projectRoot.includes('Anthropic')) {
      // Try to find the Forest server directory
      const possiblePaths = [
        'C:\\Users\\schlansk\\Downloads\\7-3forest-main',
        path.join(process.env.USERPROFILE || '', 'Downloads', '7-3forest-main'),
        // Fallback to current working directory if Forest not found
        process.cwd()
      ];
      
      for (const testPath of possiblePaths) {
        try {
          // Check if this looks like the Forest server directory
          const packageJsonPath = path.join(testPath, 'package.json');
          const stage1Path = path.join(testPath, '___stage1');
          const fs = require('fs');
          if (fs.existsSync(packageJsonPath) && fs.existsSync(stage1Path)) {
            projectRoot = testPath;
            break;
          }
        } catch (error) {
          // Continue to next path
        }
      }
    }
    
    // If running from ___stage1 directory, adjust to project root
    if (projectRoot.endsWith('___stage1')) {
      projectRoot = path.dirname(projectRoot);
    }
    
    this.verifier = new DiagnosticVerifier(projectRoot);
    this.projectRoot = projectRoot;
    
    // Log the resolved project root for debugging
    console.log(`[ClaudeDiagnosticHelper] Using project root: ${this.projectRoot}`);
  }

  /**
   * Verify before reporting function issues
   */
  async verifyFunctionIssue(functionName, filePath, issueDescription) {
    const verification = {
      issue: issueDescription,
      functionName,
      filePath,
      timestamp: new Date().toISOString(),
      verificationResults: {}
    };

    // 1. Check if function exists
    const functionExists = await this.verifier.verifyFunctionExists(functionName, filePath);
    verification.verificationResults.functionExists = functionExists;

    // 2. Check if file exists
    const fileExists = await this.verifier.verifyFileExists(filePath);
    verification.verificationResults.fileExists = fileExists;

    // 3. Try to import and test the function
    try {
      const fullPath = path.resolve(this.projectRoot, filePath);
      const fileUrl = pathToFileURL(fullPath).href;
      const module = await import(fileUrl);
      
      // Check if it's a class method
      const hasClass = Object.keys(module).find(key => 
        typeof module[key] === 'function' && module[key].prototype
      );
      
      if (hasClass) {
        const ClassDef = module[hasClass];
        const instance = new ClassDef();
        verification.verificationResults.methodAccessible = typeof instance[functionName] === 'function';
      }
    } catch (error) {
      verification.verificationResults.importError = error.message;
    }

    // 4. Generate recommendation
    if (functionExists && fileExists) {
      verification.recommendation = "✅ LIKELY FALSE POSITIVE - Function exists and is accessible";
      verification.severity = "LOW";
    } else if (!fileExists) {
      verification.recommendation = "🔴 VALID ISSUE - File does not exist";
      verification.severity = "HIGH";
    } else {
      verification.recommendation = "🟡 INVESTIGATE - Function may exist but not found by verifier";
      verification.severity = "MEDIUM";
    }

    return verification;
  }

  /**
   * Verify before reporting import/export issues
   */
  async verifyImportExportIssue(itemName, filePath, type = 'export') {
    const verification = {
      issue: `${type} '${itemName}' not found`,
      itemName,
      filePath,
      type,
      timestamp: new Date().toISOString(),
      verificationResults: {}
    };

    // 1. Check if item exists in file
    const itemExists = await this.verifier.verifyImportExport(itemName, filePath, type);
    verification.verificationResults.itemExists = itemExists;

    // 2. Try actual import/export
    try {
      const fullPath = path.resolve(this.projectRoot, filePath);
      const fileUrl = pathToFileURL(fullPath).href;
      const module = await import(fileUrl);
      
      if (type === 'export') {
        verification.verificationResults.actuallyExported = itemName in module || 'default' in module;
      }
    } catch (error) {
      verification.verificationResults.importError = error.message;
    }

    // 3. Generate recommendation
    if (itemExists) {
      verification.recommendation = "✅ LIKELY FALSE POSITIVE - Item exists in file";
      verification.severity = "LOW";
    } else {
      verification.recommendation = "🔴 VALID ISSUE - Item not found";
      verification.severity = "HIGH";
    }

    return verification;
  }

  /**
   * Verify before reporting system-wide issues
   */
  async verifySystemIssue(issueDescription) {
    const verification = {
      issue: issueDescription,
      timestamp: new Date().toISOString(),
      verificationResults: {}
    };

    // 1. Run comprehensive verification
    const compVerification = await this.verifier.runComprehensiveVerification();
    verification.verificationResults.comprehensive = compVerification;

    // 2. Check if tests pass
    const testsPass = await this.verifier.verifyCodeExecution('npm test', 'Full test suite');
    verification.verificationResults.testsPass = testsPass;

    // 3. Generate recommendation
    const successRate = Object.values(compVerification.verifications).filter(v => v).length / 
                       Object.values(compVerification.verifications).length;

    if (successRate >= 0.8 && testsPass) {
      verification.recommendation = "✅ LIKELY FALSE POSITIVE - System appears healthy";
      verification.severity = "LOW";
    } else if (successRate < 0.5) {
      verification.recommendation = "🔴 VALID ISSUE - Multiple system problems detected";
      verification.severity = "HIGH";
    } else {
      verification.recommendation = "🟡 INVESTIGATE - Some issues detected";
      verification.severity = "MEDIUM";
    }

    return verification;
  }

  /**
   * Generate a comprehensive diagnostic report
   */
  async generateDiagnosticReport(reportedIssues = []) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_issues_reported: reportedIssues.length,
        verified_issues: 0,
        false_positives: 0,
        needs_investigation: 0
      },
      issue_verifications: [],
      system_health: null,
      recommendations: []
    };

    // Verify each reported issue
    for (const issue of reportedIssues) {
      let verification;
      
      if (issue.type === 'function') {
        verification = await this.verifyFunctionIssue(issue.functionName, issue.filePath, issue.description);
      } else if (issue.type === 'import' || issue.type === 'export') {
        verification = await this.verifyImportExportIssue(issue.itemName, issue.filePath, issue.type);
      } else {
        verification = await this.verifySystemIssue(issue.description);
      }

      report.issue_verifications.push(verification);

      // Update summary
      if (verification.severity === 'LOW') {
        report.summary.false_positives++;
      } else if (verification.severity === 'HIGH') {
        report.summary.verified_issues++;
      } else {
        report.summary.needs_investigation++;
      }
    }

    // Get system health
    report.system_health = await this.verifier.runComprehensiveVerification();

    // Generate recommendations
    if (report.summary.false_positives > report.summary.verified_issues) {
      report.recommendations.push("⚠️ HIGH FALSE POSITIVE RATE - Consider improving diagnostic accuracy");
    }

    if (report.summary.verified_issues > 0) {
      report.recommendations.push("🔴 VALID ISSUES FOUND - Address these immediately");
    }

    if (report.summary.needs_investigation > 0) {
      report.recommendations.push("🟡 SOME ISSUES NEED INVESTIGATION - Review manually");
    }

    return report;
  }
}

// Example usage for the analyzeGoalComplexityAsync issue
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const helper = new ClaudeDiagnosticHelper();
  
  const reportedIssues = [
    {
      type: 'function',
      functionName: 'analyzeGoalComplexityAsync',
      filePath: '___stage1/modules/hta-core.js',
      description: 'analyzeGoalComplexityAsync function missing'
    }
  ];

  const report = await helper.generateDiagnosticReport(reportedIssues);
  console.log(JSON.stringify(report, null, 2));
}