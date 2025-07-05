/**
 * Module Deprecation Script - Mark Non-Essential Modules as Deprecated
 * Provides migration guidance for modules that have been consolidated
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

export class ModuleDeprecator {
  constructor(options = {}) {
    this.options = {
      modulesDir: options.modulesDir || path.join(__dirname, '../modules'),
      dryRun: options.dryRun || false,
      verbose: options.verbose || false,
      ...options,
    };

    // Define which modules have been consolidated and their new locations
    this.consolidationMap = {
      // Consolidated into HTA Core
      'hta-tree-builder.js': {
        newLocation: '___stage1/modules/hta-core.js',
        newClass: 'HtaCore',
        migrationNote: 'HTA tree building functionality moved to HtaCore class',
      },
      'hta-bridge.js': {
        newLocation: '___stage1/modules/hta-core.js',
        newClass: 'HtaCore',
        migrationNote: 'HTA bridge functionality integrated into HtaCore class',
      },

      // Consolidated into Task Strategy Core
      'task-intelligence.js': {
        newLocation: '___stage1/modules/task-strategy-core.js',
        newClass: 'TaskStrategyCore',
        migrationNote: 'Task intelligence moved to TaskStrategyCore class',
      },
      'strategy-evolver.js': {
        newLocation: '___stage1/modules/task-strategy-core.js',
        newClass: 'TaskStrategyCore',
        migrationNote: 'Strategy evolution integrated into TaskStrategyCore class',
      },

      // Consolidated into Core Intelligence
      'reasoning-engine.js': {
        newLocation: '___stage1/modules/core-intelligence.js',
        newClass: 'CoreIntelligence',
        migrationNote: 'Reasoning engine optimized and moved to CoreIntelligence class',
      },

      // Consolidated into MCP Core
      'mcp-handlers.js': {
        newLocation: '___stage1/modules/mcp-core.js',
        newClass: 'McpCore',
        migrationNote: 'MCP handlers consolidated into McpCore class',
      },

      // Consolidated into Memory Sync
      'memory-sync.js': {
        newLocation: '___stage1/modules/memory-sync.js',
        newClass: 'MemorySync',
        migrationNote: 'Memory sync functionality preserved with constants integration',
      },
      'constants.js': {
        newLocation: '___stage1/modules/memory-sync.js',
        newClass: 'MemorySync (constants exported)',
        migrationNote: 'Constants moved to memory-sync.js as named exports',
      },

      // Data Persistence and Project Management are optimized versions
      'data-persistence.js': {
        newLocation: '___stage1/modules/data-persistence.js',
        newClass: 'DataPersistence',
        migrationNote: 'Data persistence optimized but API preserved',
      },
      'project-management.js': {
        newLocation: '___stage1/modules/project-management.js',
        newClass: 'ProjectManagement',
        migrationNote: 'Project management optimized but API preserved',
      },
    };

    // Modules that should be marked as deprecated (non-essential)
    this.deprecatedModules = [
      'analytics-tools.js',
      'cache-cleaner.js',
      'context-guard.js',
      'context-utils.js',
      'core-infrastructure.js',
      'data-archiver.js',
      'error-logger.js',
      'finance-bridge.js',
      'hta-debug-tools.js',
      'hta-status.js',
      'identity-engine.js',
      'integrated-schedule-generator.js',
      'integrated-task-pool.js',
      'llm-integration.js',
      'logger-utils.js',
      'proactive-insights-handler.js',
      'schedule-generator.js',
      'self-heal-manager.js',
      'system-clock.js',
      'task-completion.js',
      'task-quality-verifier.js',
      'tool-router.js',
      'web-context.js',
      'winston-logger.js',
    ];

    this.logger = logger;
    this.deprecationResults = [];
  }

  async deprecateAllModules() {
    const startTime = Date.now();

    try {
      this.logger.info('[ModuleDeprecator] Starting module deprecation process...');

      // Process consolidated modules
      for (const [moduleName, consolidationInfo] of Object.entries(this.consolidationMap)) {
        await this.createConsolidationDeprecation(moduleName, consolidationInfo);
      }

      // Process deprecated modules
      for (const moduleName of this.deprecatedModules) {
        await this.createDeprecationStub(moduleName);
      }

      const duration = Date.now() - startTime;
      const processedCount = this.deprecationResults.length;

      this.logger.info('[ModuleDeprecator] Module deprecation completed', {
        duration: `${duration}ms`,
        processedModules: processedCount,
        dryRun: this.options.dryRun,
      });

      return {
        success: true,
        processedModules: processedCount,
        duration,
        results: this.deprecationResults,
        dryRun: this.options.dryRun,
      };
    } catch (error) {
      this.logger.error('[ModuleDeprecator] Module deprecation failed', {
        error: error.message,
      });
      throw error;
    }
  }

  async createConsolidationDeprecation(moduleName, consolidationInfo) {
    const filePath = path.join(this.options.modulesDir, moduleName);

    try {
      // Check if original file exists
      await fs.access(filePath);

      const deprecationContent = this.generateConsolidationDeprecation(
        moduleName,
        consolidationInfo
      );

      if (!this.options.dryRun) {
        // Backup original file
        const backupPath = `${filePath}.backup`;
        await fs.copyFile(filePath, backupPath);

        // Replace with deprecation stub
        await fs.writeFile(filePath, deprecationContent, 'utf-8');
      }

      this.deprecationResults.push({
        module: moduleName,
        type: 'consolidated',
        newLocation: consolidationInfo.newLocation,
        status: this.options.dryRun ? 'dry_run' : 'deprecated',
      });

      if (this.options.verbose) {
        this.logger.debug(`[ModuleDeprecator] Consolidated module deprecated: ${moduleName}`, {
          newLocation: consolidationInfo.newLocation,
        });
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist - skip
        return;
      }
      throw error;
    }
  }

  async createDeprecationStub(moduleName) {
    const filePath = path.join(this.options.modulesDir, moduleName);

    try {
      // Check if file exists
      await fs.access(filePath);

      const deprecationContent = this.generateDeprecationStub(moduleName);

      if (!this.options.dryRun) {
        // Backup original file
        const backupPath = `${filePath}.backup`;
        await fs.copyFile(filePath, backupPath);

        // Replace with deprecation stub
        await fs.writeFile(filePath, deprecationContent, 'utf-8');
      }

      this.deprecationResults.push({
        module: moduleName,
        type: 'deprecated',
        status: this.options.dryRun ? 'dry_run' : 'deprecated',
      });

      if (this.options.verbose) {
        this.logger.debug(`[ModuleDeprecator] Module deprecated: ${moduleName}`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist - skip
        return;
      }
      throw error;
    }
  }

  generateConsolidationDeprecation(moduleName, consolidationInfo) {
    const className = moduleName
      .replace('.js', '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    return `/**
 * DEPRECATED: ${moduleName}
 * This module has been consolidated into the Stage1 architecture.
 * 
 * Migration Information:
 * - New Location: ${consolidationInfo.newLocation}
 * - New Class: ${consolidationInfo.newClass}
 * - Migration Note: ${consolidationInfo.migrationNote}
 * 
 * @deprecated Use ${consolidationInfo.newClass} from ${consolidationInfo.newLocation} instead
 */

import { logger } from './utils/logger.js';

export function deprecated(functionName = '${className}') {
  const message = \`DEPRECATED: \${functionName} from ${moduleName} has been consolidated.\\n\` +
                 \`Please use ${consolidationInfo.newClass} from ${consolidationInfo.newLocation} instead.\\n\` +
                 \`Migration: ${consolidationInfo.migrationNote}\`;
  
  logger.warn('[DEPRECATED]', { 
    module: '${moduleName}',
    newLocation: '${consolidationInfo.newLocation}',
    newClass: '${consolidationInfo.newClass}'
  });
  
  throw new Error(message);
}

// Export deprecated function as default for backward compatibility
export default deprecated;

// Common class/function names that might be imported
export const ${className} = () => deprecated('${className}');
export { ${className} as default };
`;
  }

  generateDeprecationStub(moduleName) {
    const className = moduleName
      .replace('.js', '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    return `/**
 * DEPRECATED: ${moduleName}
 * This module has been removed in the Stage1 consolidation.
 * 
 * This functionality was determined to be non-essential for the core Forest system.
 * If you need this functionality, please:
 * 1. Check if equivalent functionality exists in the consolidated modules
 * 2. Implement as a custom extension if truly needed
 * 3. Consider if the functionality is actually necessary
 * 
 * @deprecated Module removed in Stage1 consolidation
 */

import { logger } from './utils/logger.js';

export function deprecated(functionName = '${className}') {
  const message = \`DEPRECATED: \${functionName} from ${moduleName} has been removed.\\n\` +
                 \`This module was eliminated during Stage1 consolidation as non-essential.\\n\` +
                 \`Please check consolidated modules for equivalent functionality.\`;
  
  logger.warn('[DEPRECATED]', { 
    module: '${moduleName}',
    reason: 'eliminated_in_stage1_consolidation'
  });
  
  throw new Error(message);
}

// Export deprecated function as default for backward compatibility
export default deprecated;

// Common class/function names that might be imported
export const ${className} = () => deprecated('${className}');
export { ${className} as default };
`;
  }

  async restoreBackups() {
    this.logger.info('[ModuleDeprecator] Restoring module backups...');

    let restoredCount = 0;

    for (const result of this.deprecationResults) {
      const filePath = path.join(this.options.modulesDir, result.module);
      const backupPath = `${filePath}.backup`;

      try {
        await fs.access(backupPath);
        await fs.copyFile(backupPath, filePath);
        await fs.unlink(backupPath);
        restoredCount++;

        if (this.options.verbose) {
          this.logger.debug(`[ModuleDeprecator] Restored: ${result.module}`);
        }
      } catch (error) {
        this.logger.warn(`[ModuleDeprecator] Could not restore ${result.module}`, {
          error: error.message,
        });
      }
    }

    this.logger.info(`[ModuleDeprecator] Restored ${restoredCount} modules from backups`);
    return restoredCount;
  }

  getDeprecationResults() {
    return this.deprecationResults;
  }
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes('--dry-run');
  const verbose = process.argv.includes('--verbose');
  const restore = process.argv.includes('--restore');

  const deprecator = new ModuleDeprecator({ dryRun, verbose });

  if (restore) {
    deprecator
      .restoreBackups()
      .then(count => {
        console.log(`✅ Restored ${count} modules from backups`);
      })
      .catch(error => {
        console.error('❌ Restore failed:', error.message);
        process.exit(1);
      });
  } else {
    deprecator
      .deprecateAllModules()
      .then(results => {
        console.log(`\n📦 Module Deprecation Results:`);
        console.log(`✅ Processed: ${results.processedModules} modules`);
        console.log(`⏱️  Duration: ${results.duration}ms`);
        console.log(`🔄 Dry Run: ${results.dryRun ? 'Yes' : 'No'}`);

        if (results.dryRun) {
          console.log('\n💡 Run without --dry-run to apply changes');
        }
      })
      .catch(error => {
        console.error('❌ Deprecation failed:', error.message);
        process.exit(1);
      });
  }
}
