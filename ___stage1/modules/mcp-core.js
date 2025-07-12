/**
 * MCP Core Module - Consolidated MCP Handlers & Communication
 * Optimized from mcp-handlers.js - Preserves all 12 core tool definitions and handler setup
 */

import { ListToolsRequestSchema, CallToolRequestSchema, ListResourcesRequestSchema, ListPromptsRequestSchema } from '../local-mcp-types.js';
import { FOREST_TOOLS, getToolList } from './consolidated-tool-definitions.js';

class McpCore {
  constructor() {
    this.startTime = Date.now();
  }

  logEvent(type, data = {}) {
    const elapsed = Date.now() - this.startTime;
    console.error(`[DEBUG-${type}] ${JSON.stringify({ elapsed, ...data })}`);
  }

  getAvailableTools() {
    const tools = [
      // Core 12 tools
      'create_project_forest',
      'switch_project_forest', 
      'list_projects_forest',
      'build_hta_tree_forest',
      'get_hta_status_forest',
      'get_next_task_forest',
      'complete_block_forest',
      'evolve_strategy_forest',
      'current_status_forest',
      'generate_daily_schedule_forest',
      'sync_forest_memory_forest',
      'ask_truthful_claude_forest',
      
      // System Management
      'factory_reset_forest',
      'get_landing_page_forest',
      'get_current_config',
      
      // Gated Onboarding & Pipeline Tools
      'start_learning_journey_forest',
      'continue_onboarding_forest',
      'get_onboarding_status_forest',
      'complete_onboarding_forest',
      'get_next_pipeline_forest',
      'evolve_pipeline_forest',
      
      // Ambiguous Desires Tools
      'assess_goal_clarity_forest',
      'start_clarification_dialogue_forest', 
      'continue_clarification_dialogue_forest',
      'analyze_goal_convergence_forest',
      'smart_evolution_forest',
      'adaptive_evolution_forest',
      'get_ambiguous_desire_status_forest',
      
      // Diagnostic Tools
      'verify_system_health_forest',
      'verify_function_exists_forest',
      'run_diagnostic_verification_forest'
    ];
    
    return tools;
  }

  // Tool function placeholders (implemented in handlers)
  create_project_forest() { return this.callHandler('create_project_forest', arguments); }
  switch_project_forest() { return this.callHandler('switch_project_forest', arguments); }
  list_projects_forest() { return this.callHandler('list_projects_forest', arguments); }
  build_hta_tree_forest() { return this.callHandler('build_hta_tree_forest', arguments); }
  get_hta_status_forest() { return this.callHandler('get_hta_status_forest', arguments); }
  get_next_task_forest() { return this.callHandler('get_next_task_forest', arguments); }
  complete_block_forest() { return this.callHandler('complete_block_forest', arguments); }
  evolve_strategy_forest() { return this.callHandler('evolve_strategy_forest', arguments); }
  current_status_forest() { return this.callHandler('current_status_forest', arguments); }
  generate_daily_schedule_forest() { return this.callHandler('generate_daily_schedule_forest', arguments); }
  sync_forest_memory_forest() { return this.callHandler('sync_forest_memory_forest', arguments); }
  ask_truthful_claude_forest() { return this.callHandler('ask_truthful_claude_forest', arguments); }
  factory_reset_forest() { return this.callHandler('factory_reset_forest', arguments); }
  get_current_config() { return this.callHandler('get_current_config', arguments); }

  // ===== AMBIGUOUS DESIRES TOOLS =====
  assess_goal_clarity_forest() { 
    return this.callHandler('assess_goal_clarity_forest', arguments); 
  }
  start_clarification_dialogue_forest() { 
    return this.callHandler('start_clarification_dialogue_forest', arguments); 
  }
  continue_clarification_dialogue_forest() { 
    return this.callHandler('continue_clarification_dialogue_forest', arguments); 
  }
  analyze_goal_convergence_forest() { 
    return this.callHandler('analyze_goal_convergence_forest', arguments); 
  }
  smart_evolution_forest() { 
    return this.callHandler('smart_evolution_forest', arguments); 
  }
  adaptive_evolution_forest() { 
    return this.callHandler('adaptive_evolution_forest', arguments); 
  }
  get_ambiguous_desire_status_forest() { 
    return this.callHandler('get_ambiguous_desire_status_forest', arguments); 
  }

  // ===== DIAGNOSTIC TOOLS =====
  verify_system_health_forest() { 
    return this.callHandler('verify_system_health_forest', arguments); 
  }
  verify_function_exists_forest() { 
    return this.callHandler('verify_function_exists_forest', arguments); 
  }
  run_diagnostic_verification_forest() { 
    return this.callHandler('run_diagnostic_verification_forest', arguments); 
  }

  callHandler(toolName, args) {
    // This would be implemented to call the actual handlers
    return { tool: toolName, args: Array.from(args) };
  }

  async setupHandlers() {
    // Initialize MCP handlers - placeholder implementation
    console.error('[McpCore] Setting up MCP handlers...');
    return true;
  }

  setToolRouter(toolRouter) {
    this.toolRouter = toolRouter;
    console.error('[McpCore] Tool router connected');
  }

  async getToolDefinitions() {
    // Return tool definitions from consolidated definitions as an array
    try {
      const { FOREST_TOOLS } = await import('./consolidated-tool-definitions.js');
      if (FOREST_TOOLS && typeof FOREST_TOOLS === 'object') {
        // Convert object to array of tool definitions
        return Object.values(FOREST_TOOLS);
      }
      return [];
    } catch (error) {
      console.error('[McpCore] Failed to load tool definitions:', error.message);
      return [];
    }
  }

  async handleToolCall(toolName, args) {
    if (this.toolRouter && typeof this.toolRouter.handleToolCall === 'function') {
      return await this.toolRouter.handleToolCall(toolName, args);
    } else {
      console.error('[McpCore] Tool router not available');
      return { error: 'Tool router not initialized' };
    }
  }
}

export { McpCore };