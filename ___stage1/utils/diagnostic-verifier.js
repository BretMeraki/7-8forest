/**
 * Diagnostic Verifier - Prevents false positives in system diagnostics
 * 
 * This module provides automated verification of diagnostic findings
 * to prevent Claude from reporting false positives.
 */

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export class DiagnosticVerifier {
  constructor(projectRoot = process.cwd()) {
    // If running from ___stage1 directory, adjust to project root
    if (projectRoot.endsWith('___stage1')) {
      projectRoot = path.dirname(projectRoot);
    }
    this.projectRoot = projectRoot;
    this.verificationLog = [];
  }

  /**
   * Verify function existence before reporting as missing
   */
  async verifyFunctionExists(functionName, filePath) {
    try {
      const fullPath = path.resolve(this.projectRoot, filePath);
      const fileContent = await fs.readFile(fullPath, 'utf8');
      
      // Check for function declarations, class methods, arrow functions
      const patterns = [
        new RegExp(`function\\s+${functionName}\\s*\\(`),
        new RegExp(`${functionName}\\s*:\\s*function\\s*\\(`),
        new RegExp(`${functionName}\\s*=\\s*function\\s*\\(`),
        new RegExp(`${functionName}\\s*=\\s*\\([^)]*\\)\\s*=>`),
        new RegExp(`${functionName}\\s*\\([^)]*\\)\\s*{`),
        new RegExp(`async\\s+${functionName}\\s*\\(`),
        new RegExp(`${functionName}\\s*\\([^)]*\\)\\s*{`), // method definition
      ];
      
      const exists = patterns.some(pattern => pattern.test(fileContent));
      
      this.verificationLog.push({
        type: 'function_existence',
        functionName,
        filePath,
        exists,
        timestamp: new Date().toISOString()
      });
      
      return exists;
    } catch (error) {
      this.verificationLog.push({
        type: 'function_existence_error',
        functionName,
        filePath,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Verify imports/exports before reporting as missing
   */
  async verifyImportExport(itemName, filePath, type = 'export') {
    try {
      const fullPath = path.resolve(this.projectRoot, filePath);
      const fileContent = await fs.readFile(fullPath, 'utf8');
      
      let patterns = [];
      if (type === 'export') {
        patterns = [
          new RegExp(`export\\s+.*${itemName}`),
          new RegExp(`export\\s*{[^}]*${itemName}[^}]*}`),
          new RegExp(`export\\s+default\\s+${itemName}`),
          new RegExp(`module\\.exports\\s*=\\s*${itemName}`),
          new RegExp(`exports\\.${itemName}\\s*=`),
        ];
      } else {
        patterns = [
          new RegExp(`import\\s+.*${itemName}`),
          new RegExp(`import\\s*{[^}]*${itemName}[^}]*}`),
          new RegExp(`const\\s+${itemName}\\s*=\\s*require\\(`),
          new RegExp(`require\\([^)]*${itemName}[^)]*\\)`),
        ];
      }
      
      const exists = patterns.some(pattern => pattern.test(fileContent));
      
      this.verificationLog.push({
        type: `${type}_verification`,
        itemName,
        filePath,
        exists,
        timestamp: new Date().toISOString()
      });
      
      return exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify file existence before reporting as missing
   */
  async verifyFileExists(filePath) {
    try {
      const fullPath = path.resolve(this.projectRoot, filePath);
      await fs.access(fullPath);
      
      this.verificationLog.push({
        type: 'file_existence',
        filePath,
        exists: true,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      this.verificationLog.push({
        type: 'file_existence',
        filePath,
        exists: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Verify code actually runs before reporting as broken
   */
  async verifyCodeExecution(testCommand, description) {
    try {
      const { stdout, stderr } = await execAsync(testCommand, { 
        cwd: this.projectRoot,
        timeout: 30000 // 30 second timeout
      });
      
      const success = !stderr.includes('Error:') && !stderr.includes('failed');
      
      this.verificationLog.push({
        type: 'code_execution',
        description,
        command: testCommand,
        success,
        stdout: stdout.slice(0, 500), // Limit output
        stderr: stderr.slice(0, 500),
        timestamp: new Date().toISOString()
      });
      
      return success;
    } catch (error) {
      this.verificationLog.push({
        type: 'code_execution_error',
        description,
        command: testCommand,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Verify dependencies before reporting as missing
   */
  async verifyDependencies() {
    try {
      const packageJsonPath = path.resolve(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      const missingDeps = [];
      for (const dep of Object.keys(allDeps)) {
        try {
          const depPath = path.resolve(this.projectRoot, 'node_modules', dep);
          await fs.access(depPath);
        } catch {
          missingDeps.push(dep);
        }
      }
      
      this.verificationLog.push({
        type: 'dependency_verification',
        totalDependencies: Object.keys(allDeps).length,
        missingDependencies: missingDeps,
        timestamp: new Date().toISOString()
      });
      
      return missingDeps.length === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Comprehensive diagnostic verification
   */
  async runComprehensiveVerification() {
    const results = {
      timestamp: new Date().toISOString(),
      verifications: {},
      recommendations: []
    };

    // 1. Verify the specific function that was flagged
    const htaCoreExists = await this.verifyFunctionExists('analyzeGoalComplexityAsync', '___stage1/modules/hta-core.js');
    results.verifications.analyzeGoalComplexityAsync = htaCoreExists;

    // 2. Verify file structure integrity  
    const criticalFiles = [
      '___stage1/modules/hta-core.js',
      '___stage1/modules/enhanced-hta-core.js',
      '___stage1/modules/hta-complexity-analyzer.js',
      '___stage1/modules/project-management.js'
    ];

    for (const file of criticalFiles) {
      const exists = await this.verifyFileExists(file);
      results.verifications[`file_${file.replace(/[^a-zA-Z0-9]/g, '_')}`] = exists;
    }

    // 3. Verify tests pass
    const testsPass = await this.verifyCodeExecution('npm test', 'Full test suite');
    results.verifications.tests_pass = testsPass;

    // 4. Verify dependencies
    const depsOk = await this.verifyDependencies();
    results.verifications.dependencies_ok = depsOk;

    // Generate recommendations
    if (Object.values(results.verifications).every(v => v)) {
      results.recommendations.push("✅ All verifications passed - no issues found");
    } else {
      results.recommendations.push("⚠️ Some verifications failed - investigate further");
    }

    return results;
  }

  /**
   * Generate verification report
   */
  generateReport() {
    return {
      summary: {
        total_verifications: this.verificationLog.length,
        success_rate: this.verificationLog.filter(v => v.exists || v.success).length / this.verificationLog.length,
        timestamp: new Date().toISOString()
      },
      detailed_log: this.verificationLog,
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate recommendations based on verification results
   */
  generateRecommendations() {
    const recommendations = [];
    
    const failures = this.verificationLog.filter(v => !v.exists && !v.success);
    if (failures.length === 0) {
      recommendations.push("✅ No issues detected - system appears healthy");
    } else {
      recommendations.push("⚠️ Issues detected - requires investigation:");
      failures.forEach(failure => {
        recommendations.push(`  - ${failure.type}: ${failure.functionName || failure.filePath || failure.description}`);
      });
    }
    
    return recommendations;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const verifier = new DiagnosticVerifier();
  const results = await verifier.runComprehensiveVerification();
  console.log(JSON.stringify(results, null, 2));
}