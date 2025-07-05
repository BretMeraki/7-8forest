/**
 * Core Handlers Module - Consolidated 12-Tool Handler System
 * Uses the new MCP Core module for tool definitions and routing
 */

import { McpCore } from './modules/mcp-core.js';
import { logger } from '../modules/utils/logger.js';

export class CoreHandlers {
  constructor(server) {
    this.mcpCore = new McpCore(server);
    this.logger = logger;

    logger.info('[CoreHandlers] Initialized with consolidated MCP Core');
  }

  async setupHandlers() {
    try {
      logger.info('[CoreHandlers] Setting up MCP handlers...');

      await this.mcpCore.setupHandlers();

      logger.info('[CoreHandlers] MCP handlers setup complete');
      return true;
    } catch (error) {
      logger.error('[CoreHandlers] Handler setup failed', {
        error: error.message,
      });
      throw error;
    }
  }

  async handleToolCall(toolName, args) {
    try {
      return await this.mcpCore.handleToolCall(toolName, args);
    } catch (error) {
      logger.error('[CoreHandlers] Tool call failed', {
        toolName,
        error: error.message,
      });
      throw error;
    }
  }

  getToolDefinitions() {
    return this.mcpCore.getToolDefinitions();
  }

  getMcpCore() {
    return this.mcpCore;
  }

  /**
   * The 12 core tools consolidated in MCP Core:
   * 1. create_project_forest - Project creation with validation
   * 2. switch_project_forest - Project switching with state management
   * 3. list_projects_forest - Project listing with metadata
   * 4. get_active_project_forest - Active project status
   * 5. build_hta_tree_forest - HTA tree building with complexity analysis
   * 6. get_hta_status_forest - HTA status with progress tracking
   * 7. get_next_task_forest - Task selection with intelligence
   * 8. complete_block_forest - Block completion with learning capture
   * 9. evolve_strategy_forest - Strategy evolution with event handling
   * 10. current_status_forest - Status reporting with context
   * 11. generate_daily_schedule_forest - Schedule generation with optimization
   * 12. sync_forest_memory_forest - Memory synchronization with context
   */
}
