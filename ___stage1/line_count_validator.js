/**
 * Line Count Validator - CI Gate for Module Size Limits
 * Enforces strict line limits on consolidated modules as CI gates
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
// Simple console logger for validation tools
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  debug: (...args) => console.log('[DEBUG]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class LineCountValidator {
  constructor(options = {}) {
    this.options = {
      stage1Dir: options.stage1Dir || path.join(__dirname),
      verbose: options.verbose || false,
      ...options,
    };

    // Define line limits for each module type
    // Upper limit: 1000 lines (hard limit)
    // Suggested: 750 lines (target but not enforced)
    this.lineLimits = {
      // Core modules - 1000 line upper limit
      'hta-core.js': 1000,
      'task-strategy-core.js': 1000,
      'core-intelligence.js': 1000,
      'mcp-core.js': 1000,
      'data-persistence.js': 1000,
      'project-management.js': 1000,
      'memory-sync.js': 1000,

      // Infrastructure modules
      'core-server.js': 1000,
      'core-handlers.js': 1000,
      'core-initialization.js': 1000,

      // Test and validation modules
      'consolidation_tests.js': 1000,
      'line_count_validator.js': 1000,
    };
    
    // Suggested limits (for warnings)
    this.suggestedLimits = {
      'hta-core.js': 750,
      'task-strategy-core.js': 750,
      'core-intelligence.js': 750,
      'mcp-core.js': 750,
      'data-persistence.js': 750,
      'project-management.js': 750,
      'memory-sync.js': 750,
      'core-server.js': 750,
      'core-handlers.js': 750,
      'core-initialization.js': 750,
    };

    this.logger = logger;
    this.validationResults = [];
  }

  async validateAllModules() {
    const startTime = Date.now();

    try {
      this.logger.info('[LineCountValidator] Starting line count validation...');

      const modulesDir = path.join(this.options.stage1Dir, 'modules');
      const stage1Files = [
        'core-server.js',
        'core-handlers.js',
        'core-initialization.js',
        'consolidation_tests.js',
        'line_count_validator.js',
      ];

      // Validate consolidated modules
      await this.validateModulesInDirectory(modulesDir);

      // Validate Stage1 infrastructure files
      for (const fileName of stage1Files) {
        const filePath = path.join(this.options.stage1Dir, fileName);
        await this.validateFile(filePath, fileName);
      }

      const duration = Date.now() - startTime;
      const passedFiles = this.validationResults.filter(r => r.passed).length;
      const totalFiles = this.validationResults.length;

      this.logger.info('[LineCountValidator] Validation completed', {
        duration: `${duration}ms`,
        passed: passedFiles,
        total: totalFiles,
        success: passedFiles === totalFiles,
      });

      return {
        success: passedFiles === totalFiles,
        passed: passedFiles,
        total: totalFiles,
        duration,
        results: this.validationResults,
        violations: this.validationResults.filter(r => !r.passed),
      };
    } catch (error) {
      this.logger.error('[LineCountValidator] Validation failed', {
        error: error.message,
      });
      throw error;
    }
  }

  async validateModulesInDirectory(modulesDir) {
    try {
      const files = await fs.readdir(modulesDir);
      const jsFiles = files.filter(file => file.endsWith('.js'));

      for (const fileName of jsFiles) {
        const filePath = path.join(modulesDir, fileName);
        await this.validateFile(filePath, fileName);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn('[LineCountValidator] Modules directory not found', {
          path: modulesDir,
        });
        return;
      }
      throw error;
    }
  }

  async validateFile(filePath, fileName) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const lineCount = lines.length;
      const limit = this.lineLimits[fileName];

      if (!limit) {
        // No limit defined - log as info but don't fail
        this.validationResults.push({
          file: fileName,
          lineCount,
          limit: 'undefined',
          passed: true,
          status: 'no_limit_defined',
        });

        if (this.options.verbose) {
          this.logger.debug(`[LineCountValidator] No limit defined for ${fileName}`, {
            lineCount,
          });
        }
        return;
      }

      const passed = lineCount <= limit;
      const violation = lineCount - limit;
      const suggestedLimit = this.suggestedLimits[fileName];
      const overSuggested = suggestedLimit && lineCount > suggestedLimit;

      this.validationResults.push({
        file: fileName,
        lineCount,
        limit,
        suggestedLimit,
        passed,
        violation: violation > 0 ? violation : 0,
        overSuggested,
        suggestedViolation: overSuggested ? lineCount - suggestedLimit : 0,
        status: passed ? (overSuggested ? 'over_suggested' : 'within_limit') : 'exceeds_limit',
      });

      if (this.options.verbose || !passed) {
        const logLevel = passed ? 'debug' : 'error';
        this.logger[logLevel](`[LineCountValidator] ${fileName}`, {
          lineCount,
          limit,
          status: passed ? 'PASS' : 'FAIL',
          violation: violation > 0 ? `+${violation} lines` : undefined,
        });
      }

      if (!passed) {
        throw new Error(
          `Line count violation: ${fileName} has ${lineCount} lines (limit: ${limit}, violation: +${violation})`
        );
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.validationResults.push({
          file: fileName,
          lineCount: 0,
          limit: this.lineLimits[fileName] || 'undefined',
          passed: false,
          status: 'file_not_found',
          error: 'File not found',
        });

        this.logger.error(`[LineCountValidator] File not found: ${fileName}`, {
          path: filePath,
        });
        return;
      }
      throw error;
    }
  }

  generateReport() {
    const report = {
      summary: {
        totalFiles: this.validationResults.length,
        passedFiles: this.validationResults.filter(r => r.passed).length,
        failedFiles: this.validationResults.filter(r => !r.passed).length,
        totalLines: this.validationResults.reduce((sum, r) => sum + r.lineCount, 0),
        averageLines: Math.round(
          this.validationResults.reduce((sum, r) => sum + r.lineCount, 0) /
            this.validationResults.length
        ),
      },
      violations: this.validationResults.filter(r => !r.passed),
      withinLimits: this.validationResults.filter(r => r.passed),
      details: this.validationResults,
    };

    return report;
  }

  printReport() {
    const report = this.generateReport();

    console.log('\n📊 Line Count Validation Report');
    console.log('================================');

    console.log(`\n📈 Summary:`);
    console.log(`  Total Files: ${report.summary.totalFiles}`);
    console.log(`  Passed: ${report.summary.passedFiles}`);
    console.log(`  Failed: ${report.summary.failedFiles}`);
    console.log(`  Total Lines: ${report.summary.totalLines.toLocaleString()}`);
    console.log(`  Average Lines: ${report.summary.averageLines}`);

    if (report.violations.length > 0) {
      console.log(`\n❌ Violations (${report.violations.length}):`);
      report.violations.forEach(violation => {
        console.log(
          `  ${violation.file}: ${violation.lineCount}/${violation.limit} lines (+${violation.violation || 0})`
        );
      });
    }

    if (report.withinLimits.length > 0) {
      console.log(`\n✅ Within Limits (${report.withinLimits.length}):`);
      report.withinLimits.forEach(file => {
        if (file.limit !== 'undefined') {
          const percentage = Math.round((file.lineCount / file.limit) * 100);
          console.log(`  ${file.file}: ${file.lineCount}/${file.limit} lines (${percentage}%)`);
        } else {
          console.log(`  ${file.file}: ${file.lineCount} lines (no limit)`);
        }
      });
    }

    return report;
  }

  async enforceAsCI() {
    const results = await this.validateAllModules();
    const report = this.printReport();

    if (!results.success) {
      console.error(`\n💥 CI GATE FAILURE: ${results.violations.length} files exceed line limits`);
      console.error('Fix line count violations before proceeding.');
      process.exit(1);
    } else {
      console.log(`\n🎉 CI GATE PASSED: All files within line limits`);
      process.exit(0);
    }
  }

  getValidationResults() {
    return this.validationResults;
  }
}

// CLI runner for CI integration
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new LineCountValidator({ verbose: true });

  if (process.argv.includes('--ci')) {
    // Run as CI gate (exits with code)
    validator.enforceAsCI();
  } else {
    // Run as validation report
    validator
      .validateAllModules()
      .then(results => {
        const report = validator.printReport();

        if (!results.success) {
          console.error('\n❌ Line count validation failed');
          process.exit(1);
        } else {
          console.log('\n✅ Line count validation passed');
        }
      })
      .catch(error => {
        console.error('❌ Validation error:', error.message);
        process.exit(1);
      });
  }
}
