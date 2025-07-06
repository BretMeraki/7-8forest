/**
 * Consolidated MCP Core Module
 * Clean implementation with single-purpose tools only
 */

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { 
  FOREST_TOOLS, 
  getToolList, 
  isDeprecatedTool,
  DEPRECATED_TOOLS 
} from './consolidated-tool-definitions.js';

import { DeprecatedToolRedirects } from './deprecated-tool-redirects.js';
import { debugLogger } from '../../modules/utils/debug-logger.js';

export class ConsolidatedMcpCore {
  constructor(server) {
    this.server = server;
    this.toolRouter = null;
  }

  async setupHandlers() {
    console.error('[ConsolidatedMCP] Setting up handlers...');

    // List tools handler - only show non-deprecated tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = getToolList();
      console.error(`[ConsolidatedMCP] Returning ${tools.length} active tools`);
      return { tools };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;
      
      try {
        // Check if tool is deprecated and redirect
        if (isDeprecatedTool(name)) {
          console.error(`[ConsolidatedMCP] Deprecated tool called: ${name}`);
          return DeprecatedToolRedirects.handleDeprecatedOnboardingTool(name, args || {});
        }

        // Check if tool exists in our consolidated set
        if (!FOREST_TOOLS[name]) {
          console.error(`[ConsolidatedMCP] Unknown tool: ${name}`);
          return {
            content: [{
              type: 'text',
              text: `# Unknown Tool: ${name}

This tool doesn't exist in Forest Suite. 

**Available tools:**
${this.formatAvailableTools()}

Need help? Use \`get_landing_page_forest\` to see what you can do.`
            }],
            isError: true
          };
        }

        // Route to handler
        const result = await this.handleToolCall(name, args || {});
        return result;
        
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`[ConsolidatedMCP] Tool error for ${name}:`, err.message);
        
        return {
          content: [{
            type: 'text',
            text: `# Tool Error: ${name}

${err.message}

**Quick Help:**
- Check your parameters match the tool requirements
- Use \`get_current_config\` to check system status
- Use \`get_landing_page_forest\` for guidance`
          }],
          isError: true
        };
      }
    });

    // Required MCP handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return { resources: [] };
    });

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return { prompts: [] };
    });

    console.error('[ConsolidatedMCP] Setup complete');
  }

  setToolRouter(toolRouter) {
    this.toolRouter = toolRouter;
  }

  async handleToolCall(toolName, args) {
    if (!this.toolRouter) {
      throw new Error('Tool router not set. Server may not be fully initialized.');
    }
    
    // Simplify arguments for create_project_forest
    if (toolName === 'create_project_forest') {
      args = this.simplifyCreateProjectArgs(args);
    }
    
    return await this.toolRouter.handleToolCall(toolName, args);
  }

  /**
   * Simplify create_project_forest arguments
   * Accept many variations but normalize to simple format
   */
  simplifyCreateProjectArgs(args) {
    // Extract goal from various possible fields
    const goal = args.goal || 
                 args.name || 
                 args.project_name || 
                 args.description || 
                 args.project_id || 
                 '';
    
    // Generate project_id if not provided
    const project_id = args.project_id || this.generateProjectId(goal);
    
    // Keep only essential fields
    return {
      goal,
      project_id,
      context: args.context || `User wants to achieve: ${goal}`,
      learning_style: args.learning_style || 'mixed'
    };
  }

  /**
   * Generate simple project ID from goal
   */
  generateProjectId(goal) {
    const words = goal.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 3);
    
    return words.join('_') || `project_${Date.now()}`;
  }

  /**
   * Format available tools for display
   */
  formatAvailableTools() {
    const categories = {
      'Getting Started': [
        '• `create_project_forest` - Create a new project',
        '• `list_projects_forest` - See all your projects',
        '• `get_landing_page_forest` - Get helpful guidance'
      ],
      'Daily Work': [
        '• `get_next_task_forest` - Get your next task',
        '• `complete_block_forest` - Mark task complete',
        '• `current_status_forest` - Check today\'s progress'
      ],
      'Project Management': [
        '• `switch_project_forest` - Switch projects',
        '• `get_hta_status_forest` - View learning strategy',
        '• `evolve_strategy_forest` - Adapt your approach'
      ]
    };

    let output = '';
    for (const [category, tools] of Object.entries(categories)) {
      output += `\n**${category}:**\n${tools.join('\n')}\n`;
    }
    return output;
  }

  /**
   * Get clean tool definitions without deprecated ones
   */
  getToolDefinitions() {
    return getToolList();
  }

  /**
   * Log deprecated tool usage for analytics
   */
  logDeprecatedToolUsage(toolName) {
    debugLogger.logEvent('DEPRECATED_TOOL_USED', {
      tool: toolName,
      timestamp: new Date().toISOString(),
      alternative: DeprecatedToolRedirects.getSimplifiedAlternative(toolName)
    });
  }
}

// Export a factory function for consistency
export function createConsolidatedMcpCore(server) {
  return new ConsolidatedMcpCore(server);
}
