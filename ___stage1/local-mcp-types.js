/**
 * Local MCP Types implementation
 * Bypasses the problematic MCP SDK import issues
 */

// Mock schema objects that match MCP SDK structure
export const ListToolsRequestSchema = {
  type: 'method',
  method: 'tools/list'
};

export const CallToolRequestSchema = {
  type: 'method', 
  method: 'tools/call'
};

export const ListResourcesRequestSchema = {
  type: 'method',
  method: 'resources/list'
};

export const ListPromptsRequestSchema = {
  type: 'method',
  method: 'prompts/list'
};
