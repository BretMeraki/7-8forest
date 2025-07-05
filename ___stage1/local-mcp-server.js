/**
 * Local MCP Server implementation
 * Bypasses the problematic MCP SDK import issues
 */

export class Server {
  constructor(serverInfo = {}, capabilities = {}) {
    this.serverInfo = serverInfo;
    this.capabilities = capabilities;
    this.tools = new Map();
    this.resources = new Map();
    this.prompts = new Map();
    
    console.error('[LocalServer] Initialized with', serverInfo.name || 'forest-mcp-server');
  }

  // Tool registration
  registerTool(name, definition) {
    this.tools.set(name, definition);
    console.error(`[LocalServer] Registered tool: ${name}`);
  }

  addTool(name, definition) {
    this.registerTool(name, definition);
  }

  // Resource registration
  registerResource(name, definition) {
    this.resources.set(name, definition);
    console.error(`[LocalServer] Registered resource: ${name}`);
  }

  // Prompt registration
  registerPrompt(name, definition) {
    this.prompts.set(name, definition);
    console.error(`[LocalServer] Registered prompt: ${name}`);
  }

  // Get tool list
  getTools() {
    return Array.from(this.tools.entries()).map(([name, def]) => ({
      name,
      ...def
    }));
  }

  // Get resource list
  getResources() {
    return Array.from(this.resources.entries()).map(([name, def]) => ({
      name,
      ...def
    }));
  }

  // Get prompt list
  getPrompts() {
    return Array.from(this.prompts.entries()).map(([name, def]) => ({
      name,
      ...def
    }));
  }

  // Handle tool calls
  async handleToolCall(name, args) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    if (typeof tool.handler === 'function') {
      return await tool.handler(args);
    }

    throw new Error(`Tool ${name} has no handler`);
  }

  // Request handlers registration (used by mcp-core)
  setRequestHandler(schema, handler) {
    if (!this.requestHandlers) {
      this.requestHandlers = [];
    }
    this.requestHandlers.push({ schema, handler });
    const name = schema?.name || schema?.constructor?.name || 'unknown';
    console.error(`[LocalServer] Registered request handler: ${name}`);
  }

  // Server lifecycle
  listen() {
    console.error('[LocalServer] Server is listening');
  }

  close() {
    console.error('[LocalServer] Server closed');
  }

  // Get server info
  getServerInfo() {
    return this.serverInfo;
  }

  getCapabilities() {
    return this.capabilities;
  }
}
