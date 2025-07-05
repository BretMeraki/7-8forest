// Stage1 ToolRouter - Delegates to the core server's tool routing
// This router finds the active Stage1CoreServer instance and uses its routing

export class ToolRouter {
  constructor(coreServer = null) {
    this.coreServer = coreServer;
  }

  async handleToolCall(toolName, args) {
    // If we have a direct reference to the core server, use it
    if (this.coreServer && this.coreServer.toolRouter) {
      return await this.coreServer.toolRouter.handleToolCall(toolName, args);
    }

    // Otherwise, try to find the global core server instance
    // This is a fallback for when the tool router is instantiated without a server reference
    if (global.stage1CoreServer && global.stage1CoreServer.toolRouter) {
      return await global.stage1CoreServer.toolRouter.handleToolCall(toolName, args);
    }

    throw new Error(
      `ToolRouter: No core server available to handle ${toolName}. Server may not be fully initialized.`
    );
  }
}
