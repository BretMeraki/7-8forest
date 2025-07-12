/**
 * Diagnostic Handlers - Extracted from core server
 * 
 * Handles system diagnostics, health checks, and utility functions
 */

export class DiagnosticHandlers {
  constructor(diagnosticHelper, vectorStore, dataPersistence, projectManagement) {
    this.diagnosticHelper = diagnosticHelper;
    this.vectorStore = vectorStore;
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
  }

  /**
   * Verify overall system health to prevent false positive diagnostics
   */
  async verifySystemHealth(args = {}) {
    try {
      const includeTests = args.include_tests !== false;
      const verification = await this.diagnosticHelper.verifier.runComprehensiveVerification();
      
      // Add test results if requested
      if (includeTests) {
        const testsPass = await this.diagnosticHelper.verifier.verifyCodeExecution('npm test', 'Full test suite');
        verification.verifications.tests_pass = testsPass;
      }
      
      const successCount = Object.values(verification.verifications).filter(v => v).length;
      const totalCount = Object.values(verification.verifications).length;
      const successRate = successCount / totalCount;
      
      let healthStatus = 'HEALTHY';
      let statusEmoji = '✅';
      
      if (successRate < 0.5) {
        healthStatus = 'UNHEALTHY';
        statusEmoji = '🔴';
      } else if (successRate < 0.8) {
        healthStatus = 'DEGRADED';
        statusEmoji = '🟡';
      }
      
      return {
        content: [{
          type: 'text',
          text: `**System Health Verification** ${statusEmoji}\n\n` +
                `**Overall Status**: ${healthStatus}\n` +
                `**Success Rate**: ${Math.round(successRate * 100)}% (${successCount}/${totalCount})\n\n` +
                `**Verification Results**:\n` +
                Object.entries(verification.verifications)
                  .map(([key, value]) => `- ${key}: ${value ? '✅' : '❌'}`)
                  .join('\n') +
                `\n\n**Recommendations**:\n` +
                verification.recommendations.join('\n')
        }],
        health_status: healthStatus,
        success_rate: successRate,
        verifications: verification.verifications
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `**System Health Verification Failed** ❌\n\nError: ${error.message}\n\nThis may indicate a genuine system issue.`
        }],
        error: error.message,
        health_status: 'ERROR'
      };
    }
  }

  /**
   * Verify if a specific function exists before reporting it as missing
   */
  async verifyFunctionExists(args) {
    try {
      const { function_name, file_path } = args;
      
      if (!function_name || !file_path) {
        return {
          content: [{
            type: 'text',
            text: '**Function Verification Error** ❌\n\nBoth function_name and file_path are required.'
          }],
          error: 'Missing required parameters'
        };
      }
      
      const verification = await this.diagnosticHelper.verifyFunctionIssue(
        function_name,
        file_path,
        `Function ${function_name} existence check`
      );
      
      return {
        content: [{
          type: 'text',
          text: `**Function Verification: ${function_name}** 📋\n\n` +
                `**File**: ${file_path}\n` +
                `**Status**: ${verification.severity === 'LOW' ? '✅ EXISTS' : verification.severity === 'HIGH' ? '❌ MISSING' : '🟡 INVESTIGATE'}\n\n` +
                `**Verification Results**:\n` +
                Object.entries(verification.verificationResults)
                  .map(([key, value]) => `- ${key}: ${typeof value === 'boolean' ? (value ? '✅' : '❌') : value}`)
                  .join('\n') +
                `\n\n**Recommendation**: ${verification.recommendation}`
        }],
        function_exists: verification.verificationResults.functionExists,
        severity: verification.severity,
        verification_results: verification.verificationResults
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `**Function Verification Failed** ❌\n\nError: ${error.message}`
        }],
        error: error.message
      };
    }
  }

  /**
   * Run comprehensive diagnostic verification for reported issues
   */
  async runDiagnosticVerification(args) {
    try {
      const { reported_issues = [] } = args;
      
      const report = await this.diagnosticHelper.generateDiagnosticReport(reported_issues);
      
      const summary = report.summary;
      const verificationText = report.issue_verifications.map(v => {
        const statusEmoji = v.severity === 'LOW' ? '✅' : v.severity === 'HIGH' ? '❌' : '🟡';
        return `${statusEmoji} **${v.issue}**\n   ${v.recommendation}`;
      }).join('\n\n');
      
      return {
        content: [{
          type: 'text',
          text: `**Diagnostic Verification Report** 📊\n\n` +
                `**Summary**:\n` +
                `- Total Issues Reported: ${summary.total_issues_reported}\n` +
                `- False Positives: ${summary.false_positives}\n` +
                `- Verified Issues: ${summary.verified_issues}\n` +
                `- Needs Investigation: ${summary.needs_investigation}\n\n` +
                `**Issue Verifications**:\n${verificationText}\n\n` +
                `**System Health**: ${report.system_health?.verifications ? 
                  Object.values(report.system_health.verifications).filter(v => v).length + '/' + 
                  Object.values(report.system_health.verifications).length + ' checks passing' : 'Unknown'}\n\n` +
                `**Recommendations**:\n${report.recommendations.join('\n')}`
        }],
        report,
        false_positive_rate: summary.false_positives / Math.max(1, summary.total_issues_reported)
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `**Diagnostic Verification Failed** ❌\n\nError: ${error.message}`
        }],
        error: error.message
      };
    }
  }

  /**
   * Get system health status with comprehensive checks
   */
  async getHealthStatus() {
    try {
      const fs = await import('fs/promises');
      
      // Check data directory writable
      const dataDir = this.dataPersistence?.dataDir || this.dataPersistence?.baseDir;
      let dataDirWritable = false;
      if (dataDir) {
        try {
          await fs.access(dataDir, fs.constants.W_OK);
          dataDirWritable = true;
        } catch {
          dataDirWritable = false;
        }
      }

      // SQLite Vector Store health check
      let vectorStoreHealthy = false;
      let vectorStoreStatus = null;
      if (this.vectorStore) {
        try {
          // Check if vector store is initialized and can perform basic operations
          const isConnected = await this.vectorStore.ping();
          if (isConnected) {
            const stats = await this.vectorStore.getStats();
            vectorStoreStatus = {
              status: 'healthy',
              provider: 'SQLite',
              vectorCount: stats.vectorCount,
              dbPath: this.vectorStore.dbPath,
              cacheUtilization: stats.cacheUtilization
            };
            vectorStoreHealthy = true;
          } else {
            vectorStoreStatus = { status: 'disconnected', reason: 'Unable to ping vector store' };
          }
        } catch (error) {
          vectorStoreStatus = { status: 'error', reason: error.message };
        }
      }

      const memory = process.memoryUsage();

      return {
        content: [{
          type: 'text',
          text: `**🏥 System Health Status**\n\n` +
                `**Data Directory**: ${dataDirWritable ? '✅ Writable' : '❌ Not Writable'}\n` +
                `**Vector Store**: ${vectorStoreHealthy ? '✅ Healthy (SQLite)' : '❌ Unhealthy'}\n` +
                `**Memory Usage**: ${Math.round(memory.heapUsed / 1024 / 1024)}MB / ${Math.round(memory.heapTotal / 1024 / 1024)}MB\n` +
                `**External Memory**: ${Math.round(memory.external / 1024 / 1024)}MB\n` +
                `**Array Buffers**: ${Math.round(memory.arrayBuffers / 1024 / 1024)}MB\n\n` +
                `**Overall**: ${dataDirWritable && vectorStoreHealthy ? '✅ Healthy' : '⚠️ Issues Detected'}\n\n` +
                `**Vector Store Details**: ${vectorStoreStatus ? JSON.stringify(vectorStoreStatus, null, 2) : 'Not configured'}`
        }],
        health_summary: {
          overall_healthy: dataDirWritable && vectorStoreHealthy,
          data_directory: dataDirWritable,
          vector_store: vectorStoreHealthy,
          memory_usage: memory,
          vector_store_status: vectorStoreStatus
        }
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `**❌ Health Check Failed**\n\nError: ${error.message}`
        }],
        error: error.message
      };
    }
  }

  /**
   * Debug cache state for troubleshooting
   */
  async debugCacheState(args) {
    try {
      const { project_id, cache_type = 'all' } = args;
      
      let targetProjectId = project_id;
      if (!targetProjectId) {
        const activeProject = await this.projectManagement.getActiveProject();
        if (activeProject && activeProject.project_id) {
          targetProjectId = activeProject.project_id;
        }
      }

      const cacheState = this.dataPersistence.debugCacheState(targetProjectId, cache_type);
      
      return {
        content: [{
          type: 'text',
          text: `**🔍 Cache Debug Information**\n\n` +
                `**Project**: ${targetProjectId || 'All projects'}\n` +
                `**Cache Type**: ${cache_type}\n` +
                `**Timestamp**: ${new Date().toISOString()}\n\n` +
                `**Cache State**:\n` +
                `• Total Entries: ${cacheState.totalEntries}\n` +
                `• Filtered Entries: ${cacheState.filteredEntries}\n` +
                `• Memory Usage: ${cacheState.memoryUsage}\n` +
                `• Hit Rate: ${cacheState.hitRate}%\n` +
                `• Most Recent: ${cacheState.mostRecent || 'None'}\n\n` +
                `**Cache Contents** (showing first 10 entries):\n` +
                Object.entries(cacheState.contents || {})
                  .map(([key, value]) => `• ${key}: ${value}`)
                  .join('\n') +
                `\n\n**Actions**:\n` +
                `• Use \`emergency_clear_cache_forest\` to clear cache if needed\n` +
                `• Cache is automatically managed but can be cleared for troubleshooting`
        }],
        cache_state: cacheState
      };
    } catch (error) {
      console.error('DiagnosticHandlers.debugCacheState failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**❌ Cache Debug Failed**\n\nError: ${error.message}`
        }],
        error: error.message
      };
    }
  }

  /**
   * Emergency cache clear for troubleshooting
   */
  async emergencyClearCache(args) {
    try {
      const { project_id, clear_all = false } = args;
      
      if (clear_all) {
        // Clear entire cache
        const result = this.dataPersistence.emergencyClearCache();
        return {
          content: [{
            type: 'text',
            text: `**🚨 EMERGENCY CACHE CLEARED**\n\n` +
                  `**Scope**: All cached data\n` +
                  `**Action**: Full cache clear\n` +
                  `**Timestamp**: ${new Date().toISOString()}\n\n` +
                  `All cached data has been cleared. Next data access will reload from disk.`
          }]
        };
      } else if (project_id) {
        // Clear specific project cache
        const result = this.dataPersistence.emergencyClearProjectCache(project_id);
        return {
          content: [{
            type: 'text',
            text: `**🚨 EMERGENCY PROJECT CACHE CLEARED**\n\n` +
                  `**Project**: ${project_id}\n` +
                  `**Timestamp**: ${new Date().toISOString()}\n` +
                  `**Success**: ${result}\n\n` +
                  `Project cache has been cleared. Next access will reload from disk.`
          }]
        };
      } else {
        return {
          content: [{
            type: 'text',
            text: `**⚠️ Emergency Cache Clear Usage**\n\n` +
                  `**Options**:\n` +
                  `• \`emergency_clear_cache_forest\` with \`{"project_id": "PROJECT_ID"}\` - Clear specific project\n` +
                  `• \`emergency_clear_cache_forest\` with \`{"clear_all": true}\` - Clear entire cache\n\n` +
                  `Use \`debug_cache_forest\` first to inspect cache state.`
          }]
        };
      }
    } catch (error) {
      console.error('DiagnosticHandlers.emergencyClearCache failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**❌ Emergency Cache Clear Failed**\n\nError: ${error.message}`
        }],
        error: error.message
      };
    }
  }

  /**
   * Get Vector Store status (SQLite-based)
   */
  async getVectorStoreStatus(args) {
    try {
      if (!this.vectorStore) {
        return {
          content: [{
            type: 'text',
            text: '**Vector Store Not Configured** ℹ️\n\nVector store is not initialized for this Forest instance.\n\nCurrent provider: ' + (process.env.FOREST_VECTOR_PROVIDER || 'sqlitevec')
          }],
          vector_store_enabled: false
        };
      }

      const isConnected = await this.vectorStore.ping();
      const stats = await this.vectorStore.getStats();
      const cacheStats = this.vectorStore.getCacheStats();
      
      let statusText = `**🗃️ SQLite Vector Store Status**\n\n`;
      
      // Connection status
      statusText += `**Connection**: ${isConnected ? '✅ Connected' : '❌ Disconnected'}\n`;
      statusText += `**Database Path**: ${this.vectorStore.dbPath}\n`;
      statusText += `**Dimension**: ${this.vectorStore.dimension}\n`;
      statusText += `**Initialized**: ${this.vectorStore.initialized ? '✅ Yes' : '❌ No'}\n\n`;
      
      // Statistics
      statusText += `**Statistics**\n`;
      statusText += `• Vector Count: ${stats.vectorCount}\n`;
      statusText += `• Average Vector Size: ${stats.averageVectorSize ? (stats.averageVectorSize / 1024).toFixed(2) + ' KB' : 'N/A'}\n`;
      statusText += `• Total Database Size: ${stats.totalSize ? (stats.totalSize / 1024).toFixed(2) + ' KB' : 'N/A'}\n\n`;
      
      // Cache information
      statusText += `**Cache Performance**\n`;
      statusText += `• Cache Size: ${cacheStats.size} / ${cacheStats.maxSize} (${cacheStats.utilization})\n`;
      statusText += `• Access Counter: ${cacheStats.accessCounter}\n`;
      statusText += `• Oldest Access: ${cacheStats.oldestAccess || 'N/A'}\n`;
      statusText += `• Newest Access: ${cacheStats.newestAccess || 'N/A'}\n\n`;
      
      // Status summary
      const overallHealthy = isConnected && this.vectorStore.initialized;
      statusText += `**Overall Status**: ${overallHealthy ? '✅ Healthy' : '⚠️ Issues Detected'}\n\n`;
      
      // Instructions
      statusText += `**Management**\n`;
      statusText += `• SQLite vector store requires no server management\n`;
      statusText += `• Database file is automatically created and managed\n`;
      statusText += `• Use \`get_vectorization_status_forest\` to check vectorization capabilities\n`;
      statusText += `• Cache is automatically managed with LRU eviction`;
      
      return {
        content: [{ type: 'text', text: statusText }],
        vector_store_status: {
          connected: isConnected,
          initialized: this.vectorStore.initialized,
          dbPath: this.vectorStore.dbPath,
          dimension: this.vectorStore.dimension,
          stats,
          cacheStats
        },
        success: true
      };
    } catch (error) {
      console.error('DiagnosticHandlers.getVectorStoreStatus failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**❌ Vector Store Status Check Failed**\n\nError: ${error.message}\n\nVector store may not be properly initialized.`
        }],
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Get ChromaDB status (Legacy - provides migration info)
   */
  async getChromaDBStatus(args) {
    return {
      content: [{
        type: 'text',
        text: '**📢 ChromaDB Migration Notice**\n\n' +
              '**Forest has migrated to SQLite vector storage!**\n\n' +
              '**Benefits of SQLite Vector Store:**\n' +
              '• ✅ No external dependencies or server management\n' +
              '• ✅ Faster startup and more reliable\n' +
              '• ✅ File-based storage for easier backup\n' +
              '• ✅ Built-in caching for better performance\n\n' +
              '**Current Setup:**\n' +
              '• Vector Provider: SQLite\n' +
              '• Database Path: ' + (process.env.SQLITEVEC_PATH || 'forest_vectors.sqlite') + '\n' +
              '• Dimension: ' + (process.env.SQLITEVEC_DIMENSION || '1536') + '\n\n' +
              '**Available Commands:**\n' +
              '• Use `get_vector_store_status_forest` for current vector store status\n' +
              '• Use `get_vectorization_status_forest` for vectorization capabilities\n' +
              '• Use `get_health_status_forest` for overall system health\n\n' +
              '🎉 **No action needed** - your vector operations continue to work seamlessly!'
      }],
      chromadb_enabled: false,
      migration_complete: true,
      current_provider: 'sqlitevec'
    };
  }

  /**
   * Restart ChromaDB server (Legacy - provides migration info)
   */
  async restartChromaDB(args) {
    return {
      content: [{
        type: 'text',
        text: '**📢 ChromaDB Migration Notice**\n\n' +
              '**No restart needed!** Forest now uses SQLite vector storage.\n\n' +
              '**SQLite Vector Store Benefits:**\n' +
              '• ✅ No server to restart or manage\n' +
              '• ✅ Always available and ready\n' +
              '• ✅ Automatic recovery and reliability\n' +
              '• ✅ File-based storage with built-in caching\n\n' +
              '**Current Status:**\n' +
              '• Vector Provider: SQLite\n' +
              '• Status: Always running (no server required)\n' +
              '• Database: ' + (process.env.SQLITEVEC_PATH || 'forest_vectors.sqlite') + '\n\n' +
              '**Available Commands:**\n' +
              '• Use `get_vector_store_status_forest` for current status\n' +
              '• Use `get_vectorization_status_forest` for vectorization info\n' +
              '• Use `get_health_status_forest` for overall system health\n\n' +
              '🎉 **Your vector operations are working seamlessly!**'
      }],
      chromadb_enabled: false,
      migration_complete: true,
      restart_needed: false,
      current_provider: 'sqlitevec'
    };
  }

  /**
   * Optimize SQLite Vector Store
   */
  async optimizeVectorStore(args) {
    try {
      if (!this.vectorStore) {
        return {
          content: [{
            type: 'text',
            text: '**Vector Store Not Available** ❌\n\nVector store is not initialized.'
          }],
          success: false
        };
      }

      let statusText = `**🔧 Optimizing SQLite Vector Store...**\n\n`;
      
      // Get initial stats
      const initialStats = await this.vectorStore.getStats();
      statusText += `**Initial Stats:**\n`;
      statusText += `• Vectors: ${initialStats.vectorCount}\n`;
      statusText += `• Database size: ${(initialStats.totalSize / 1024).toFixed(2)} KB\n\n`;
      
      // Perform optimization
      statusText += `**Optimization Steps:**\n`;
      
      // 1. Flush and checkpoint WAL
      await this.vectorStore.flush();
      statusText += `• ✅ WAL checkpoint completed\n`;
      
      // 2. Get final stats
      const finalStats = await this.vectorStore.getStats();
      statusText += `• ✅ Statistics updated\n\n`;
      
      statusText += `**Final Stats:**\n`;
      statusText += `• Vectors: ${finalStats.vectorCount}\n`;
      statusText += `• Database size: ${(finalStats.totalSize / 1024).toFixed(2)} KB\n`;
      
      // Size comparison
      const sizeDiff = initialStats.totalSize - finalStats.totalSize;
      if (sizeDiff > 0) {
        statusText += `• Space recovered: ${(sizeDiff / 1024).toFixed(2)} KB\n`;
      }
      
      statusText += `\n**Optimization Complete!** ✅\n`;
      statusText += `The vector store has been optimized and is ready for use.`;
      
      return {
        content: [{ type: 'text', text: statusText }],
        initial_stats: initialStats,
        final_stats: finalStats,
        space_recovered: sizeDiff,
        success: true
      };
    } catch (error) {
      console.error('DiagnosticHandlers.optimizeVectorStore failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**❌ Vector Store Optimization Failed**\n\nError: ${error.message}`
        }],
        error: error.message,
        success: false
      };
    }
  }
}
