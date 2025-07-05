/**
 * Stage1 Core Server - Consolidated Forest MCP Server
 * Uses the new consolidated module architecture
 */

// @ts-nocheck

import { Server } from './local-mcp-server.js';
import { StdioServerTransport } from './local-stdio-transport.js';
import { HtaCore } from './modules/hta-core.js';
import { BackgroundProcessor } from '../modules/utils/background-processor.js';
import HTAExpansionAgent from '../modules/utils/hta-expansion-agent.js';
import { TaskStrategyCore } from './modules/task-strategy-core.js';
import { CoreIntelligence } from './modules/core-intelligence.js';
import { McpCore } from './modules/mcp-core.js';
import { DataPersistence } from './modules/data-persistence.js';
import { ProjectManagement } from './modules/project-management.js';
import { MemorySync } from './modules/memory-sync.js';
import { buildClaudeContext } from './utils/claude-context-builder.js';
import { validateToolCall } from './utils/tool-schemas.js';
import { AmbiguousDesiresManager } from './modules/ambiguous-desires/index.js';

// Replaced pino with simple stderr console logger to avoid JSON log leakage


// Structured logger – level controlled via LOG_LEVEL env var
const logger = {
  info: (...args) => console.error('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => console.error('[DEBUG]', ...args),
};
const debugLogger = logger;

class Stage1CoreServer {
  constructor(options = {}) {
    this.options = options;
    this.server = new Server(
      {
        name: 'forest-mcp-server',
        version: '1.0.0',
      },
      {
        tools: {},
        resources: {},
        prompts: {},
      }
    );

    // Initialize consolidated modules
    this.dataPersistence = new DataPersistence(options.dataDir);
    this.projectManagement = new ProjectManagement(this.dataPersistence);
    this.htaCore = new HtaCore(this.dataPersistence, this.projectManagement);
    this.coreIntelligence = new CoreIntelligence(this.dataPersistence);
    
    // Initialize Ambiguous Desires Architecture first
    this.ambiguousDesiresManager = new AmbiguousDesiresManager(
      this.dataPersistence,
      this.projectManagement,
      null, // Will be set after TaskStrategyCore is initialized
      this.coreIntelligence,
      null // Will be set after HTA vector store is initialized
    );
    
    this.taskStrategyCore = new TaskStrategyCore(
      this.dataPersistence,
      this.projectManagement,
      null,
      null,
      this.ambiguousDesiresManager
    );

    // Initialize background processing utilities
    this.backgroundProcessor = new BackgroundProcessor();
    // Expansion agent monitors HTA and auto-expands when tasks run low
    this.htaExpansionAgent = new HTAExpansionAgent({
      htaCore: this.htaCore,
      projectManagement: this.projectManagement,
      backgroundProcessor: this.backgroundProcessor,
      // Default configuration – can be overridden via env vars later
      options: {
        intervalMs: Number(process.env.HTA_EXPANSION_INTERVAL_MS) || 5 * 60 * 1000,
        minAvailableTasks: Number(process.env.HTA_EXPANSION_MIN_TASKS) || 3,
        debug: process.env.HTA_EXPANSION_DEBUG === 'true',
      },
    });
    this.memorySync = new MemorySync(this.dataPersistence);
    this.mcpCore = new McpCore(this.server);
    
    // Connect TaskStrategyCore to AmbiguousDesiresManager
    this.ambiguousDesiresManager.taskStrategyCore = this.taskStrategyCore;

    this.logger = logger;
    this.debugLogger = debugLogger;

    // Use console.error to avoid stdout contamination
    console.error('[Stage1CoreServer] Initialized with consolidated modules');
  }

  async initialize() {
    try {
      console.error('🚀 Initializing Stage1 Core Server...');
      
      // Initialize core modules with vector support

      
      // Set up enhanced tool routing with vector intelligence
      this.setupToolRouter();

      // Start background processor & expansion agent
      this.backgroundProcessor.start();
      this.htaExpansionAgent.start();

      // Connect MCP core to tool router and register JSON-RPC handlers
      await this.mcpCore.setupHandlers();
      this.mcpCore.setToolRouter(this.toolRouter);
      console.error(`✅ MCP handlers configured with ${this.mcpCore.getToolDefinitions().length} tools`);
      
      // Ensure vector store is properly initialized
      console.error('📊 Initializing vector intelligence...');
      const htaCore = this.htaCore;
      if (htaCore && htaCore.vectorStore && typeof htaCore.vectorStore.initialize === 'function') {
        try {
          await htaCore.vectorStore.initialize();
          console.error('✅ Vector intelligence ready');
          
          // Connect vector store to ambiguous desires manager
          this.ambiguousDesiresManager.vectorStore = htaCore.vectorStore;
          this.ambiguousDesiresManager.adaptiveEvolution.vectorStore = htaCore.vectorStore;
          this.ambiguousDesiresManager.clarificationDialogue.vectorStore = htaCore.vectorStore;
        } catch (vectorError) {
          console.error('⚠️ Vector store initialization failed, continuing without vector support:', vectorError.message);
        }
      }
      
      // Continue with tool router and vector intelligence initialization
      if (this.toolRouter && typeof this.toolRouter.initialize === 'function') {
        try {
          await this.toolRouter.initialize();
        } catch (routerError) {
          console.error('⚠️ Tool router initialization failed:', routerError.message);
        }
      }
      if (this.vectorIntelligence && typeof this.vectorIntelligence.initialize === 'function') {
        try {
          await this.vectorIntelligence.initialize();
        } catch (vectorIntelError) {
          console.error('⚠️ Vector intelligence initialization failed:', vectorIntelError.message);
        }
      }
      
      console.error('✅ Stage1 Core Server initialized successfully');
      this.initialized = true;
      
      return this.server;
    } catch (error) {
      console.error('❌ Failed to initialize Stage1 Core Server:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  setupToolRouter() {
    if (this.toolRouter) return this.toolRouter;
    // Create a simple tool router that delegates to the appropriate modules
    this.toolRouter = {
      handleToolCall: async (toolName, args) => {
        console.error(`[ToolRouter] Received tool call for: ${toolName}`);
        // Validate payload against schema before dispatch
        try {
          validateToolCall(toolName, args);
        } catch (validationErr) {
          return {
            error: `ValidationError: ${validationErr.message}`,
          };
        }
        try {
          let result;
          switch (toolName) {
            case 'create_project_forest':
              result = await this.projectManagement.createProject(args); break;
            case 'switch_project_forest':
              result = await this.projectManagement.switchProject(args.project_id); break;
            case 'list_projects_forest':
              result = await this.projectManagement.listProjects(); break;
            case 'get_active_project_forest':
              result = await this.projectManagement.getActiveProject(); break;
            case 'build_hta_tree_forest':
              console.error('[forest-log] [ToolRouter] About to call htaCore.buildHTATree');
              console.error('[forest-log] [ToolRouter] htaCore is:', this.htaCore);
              result = await this.htaCore.buildHTATree(args); break;
            case 'get_hta_status_forest':
              result = await this.htaCore.getHTAStatus(); break;
            case 'get_next_task_forest':
              result = await this.taskStrategyCore.getNextTask(args); break;
            case 'complete_block_forest':
              result = await this.taskStrategyCore.handleBlockCompletion(args); break;
            case 'evolve_strategy_forest':
              result = await this.taskStrategyCore.evolveStrategy(args); break;
            case 'current_status_forest':
              result = await this.getCurrentStatus(); break;
            case 'generate_daily_schedule_forest':
              result = await this.generateDailySchedule(args); break;
            case 'sync_forest_memory_forest': {
              const activeProjectSync = await this.projectManagement.getActiveProject();
              if (!activeProjectSync || !activeProjectSync.project_id) {
                result = {
                  content: [{
                    type: 'text',
                    text: '**No Active Project** ❌\n\nCreate or switch to a project first to sync memory.'
                  }]
                };
                break;
              }
              result = await this.memorySync.syncForestMemory(activeProjectSync.project_id); break;
            }
            case 'ask_truthful_claude_forest':
              result = await this.askTruthfulClaude(args.prompt); break;
            case 'get_health_status_forest':
              result = await this.getHealthStatus(); break;
            // Ambiguous Desires Architecture Tools
            case 'start_clarification_dialogue_forest':
              result = await this.ambiguousDesiresManager.clarificationDialogue.startClarificationDialogue(args); break;
            case 'continue_clarification_dialogue_forest':
              result = await this.ambiguousDesiresManager.clarificationDialogue.continueDialogue(args); break;
            case 'analyze_goal_convergence_forest': {
              const activeProjectConvergence = await this.projectManagement.getActiveProject();
              if (!activeProjectConvergence || !activeProjectConvergence.project_id) {
                result = {
                  content: [{
                    type: 'text',
                    text: '**No Active Project** ❌\n\nCreate or switch to a project first to analyze goal convergence.'
                  }]
                };
                break;
              }
              result = await this.ambiguousDesiresManager.convergenceDetector.analyzeGoalConvergence({
                project_id: activeProjectConvergence.project_id,
                detailed: args.detailed || false
              }); break;
            }
            case 'adaptive_evolution_forest':
              result = await this.ambiguousDesiresManager.adaptiveEvolution.adaptiveEvolution(args); break;
            case 'smart_evolution_forest':
              result = await this.ambiguousDesiresManager.smartEvolution(args); break;
            case 'assess_goal_clarity_forest':
              result = await this.assessGoalClarity(args); break;
            case 'get_ambiguous_desire_status_forest': {
              const currentProject = await this.projectManagement.getActiveProject();
              if (!currentProject || !currentProject.project_id) {
                result = {
                  content: [{
                    type: 'text',
                    text: '**No Active Project** ❌\n\nCreate or switch to a project first to check ambiguous desire status.'
                  }]
                };
                break;
              }
              result = await this.ambiguousDesiresManager.getAmbiguousDesireStatus(currentProject.project_id); break;
            }
            default:
              throw new Error(`Unknown tool: ${toolName}`);
          }
          console.error(`[ToolRouter] Handler for ${toolName} returned result`);
          return result;
        } catch (error) {
          this.logger.error?.('[Stage1CoreServer] Tool call failed', {
            toolName,
            error: error.message,
          });
          throw error;
        }
      },
    };
    return this.toolRouter;
  }

  async getCurrentStatus() {
    try {
      const activeProjectId = this.projectManagement.getActiveProjectId();
      if (!activeProjectId) {
        return {
          content: [
            {
              type: 'text',
              text: '**No Active Project** ❌\n\nCreate or switch to a project first.',
            },
          ],
        };
      }

      const projectConfig = await this.dataPersistence.loadProjectData(
        activeProjectId,
        'config.json'
      );
      const htaData = await this.dataPersistence.loadPathData(activeProjectId, 'general', 'hta.json');

      const availableTasks = htaData?.frontierNodes?.length || 0;
      const progress = projectConfig?.progress || 0;

      return {
        content: [
          {
            type: 'text',
            text:
              `**Current Status** 📊\n\n` +
              `**Project**: ${projectConfig?.goal || 'Unknown'}\n` +
              `**Progress**: ${progress}%\n` +
              `**Available Tasks**: ${availableTasks}\n` +
              `**Active Path**: ${projectConfig?.activePath || 'general'}\n\n` +
              `Use \`get_next_task_forest\` to continue learning!`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `**Status Error**: ${error.message}`,
          },
        ],
      };
    }
  }

  async generateDailySchedule(args) {
    // Simple daily schedule generation - can be enhanced later
    const activeProjectId = this.projectManagement.getActiveProjectId();
    if (!activeProjectId) {
      return {
        content: [
          {
            type: 'text',
            text: '**No Active Project** ❌\n\nCreate or switch to a project first.',
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text:
            `**Daily Schedule Generation** 📅\n\n` +
            `Schedule generation is available but simplified in Stage1.\n` +
            `Use \`get_next_task_forest\` for immediate task recommendations.`,
        },
      ],
    };
  }

  /**
   * askTruthfulClaude – Experimental Stage-1 RAG integration.
   *   1. Collects live HTA frontier summary and current project context.
   *   2. Pulls static blueprint slice of functions that *write* HTA nodes.
   *   3. Feeds both into Claude (placeholder – simply echoes context for now).
   */
  async askTruthfulClaude(rawPrompt = '') {
    try {
      const activeProjectId = this.projectManagement.getActiveProjectId();
      if (!activeProjectId) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ No active project. Please create or switch to a project first.',
            },
          ],
        };
      }

      // Live HTA slice
      const htaData = await this.dataPersistence.loadProjectData(
        activeProjectId,
        'hta.json'
      );
      const frontierPreview = (htaData?.frontierNodes || []).slice(0, 5).map(n => n.title);

      // Static blueprint slice – list writer fns
      const { getBlueprint } = await import('./utils/blueprint-loader.js');
      const bp = getBlueprint();

      const writers = Object.entries(bp)
        .filter(([, meta]) => (meta.writes || []).length > 0)
        .map(([fn]) => fn)
        .slice(0, 10);

      // Build vector-derived context for Claude
      await this.htaCore.ensureVectorStore();
      let claudeContextSnippet = '';
      try {
        claudeContextSnippet = await buildClaudeContext(
          this.htaCore.vectorStore,
          activeProjectId,
          rawPrompt || '',
          8,
        );
      } catch (ctxErr) {
        console.warn('[askTruthfulClaude] buildClaudeContext failed:', ctxErr.message);
      }

      // Compose hidden context for Claude
      const hiddenContext = {
        frontier_preview: frontierPreview,
        writer_functions: writers,
        claude_context: claudeContextSnippet,
      };

      // Placeholder response – in future this will be replaced by a real Claude call
      const assistantReply =
        rawPrompt
          ? `I've generated an informed reply based on your latest progress.\n\n${claudeContextSnippet}`
          : `I'm ready for your question whenever you are.\n\n${claudeContextSnippet}`;

      // Log hidden context for debugging when enabled
      if (process.env.DEBUG_CONTEXT === 'true') {
        console.error('[askTruthfulClaude] Hidden context:', JSON.stringify(hiddenContext, null, 2));
      }

      return {
        content: [
          {
            type: 'text',
            text: assistantReply,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          { type: 'text', text: `askTruthfulClaude error: ${err.message}` },
        ],
      };
    }
  }

  async getHealthStatus() {
    // Basic health checks: data directory access, vector store ping, memory usage
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

      // Vector store ping
      let vectorStoreHealthy = true;
      if (this.htaCore?.vectorStore?.ping) {
        try {
          await this.htaCore.vectorStore.ping();
          vectorStoreHealthy = true;
        } catch {
          vectorStoreHealthy = false;
        }
      }

      const memory = process.memoryUsage();

      return {
        content: [
          {
            type: 'json',
            json: {
              status: 'ok',
              dataDirWritable,
              vectorStoreHealthy,
              memory,
              timestamp: new Date().toISOString(),
            },
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'json',
            json: {
              status: 'error',
              message: err.message,
              timestamp: new Date().toISOString(),
            },
          },
        ],
      };
    }
  }

  async assessGoalClarity(args) {
    try {
      const goal = args.goal || '';
      const context = args.context || '';
      
      if (!goal) {
        return {
          content: [
            {
              type: 'text',
              text: '**Goal Required** ❌\n\nPlease provide a goal to assess clarity.',
            },
          ],
        };
      }

      const clarityAssessment = await this.ambiguousDesiresManager.assessGoalClarity(goal, context);
      
      return {
        success: true,
        content: [
          {
            type: 'text',
            text: `**🎯 Goal Clarity Assessment**\n\n**Goal**: ${goal}\n\n**Clarity Level**: ${clarityAssessment.needsClarification ? 'NEEDS CLARIFICATION' : 'CLEAR'}\n**Uncertainty**: ${Math.round(clarityAssessment.uncertaintyLevel * 100)}%\n\n**Uncertain Areas**: ${clarityAssessment.uncertainAreas.join(', ') || 'None identified'}\n\n**Summary**: ${clarityAssessment.summary}\n\n**Recommendation**: ${clarityAssessment.recommendation}\n\n${clarityAssessment.needsClarification ? '*Consider using `start_clarification_dialogue_forest` to refine your goal.*' : '*Your goal is clear! Ready to build your HTA tree.*'}`,
          },
        ],
        clarity_assessment: clarityAssessment,
      };
    } catch (error) {
      console.error('Stage1CoreServer.assessGoalClarity failed:', error);
      return {
        success: false,
        content: [
          {
            type: 'text',
            text: `**Goal Clarity Assessment Failed**\n\nError: ${error.message}`,
          },
        ],
        error: error.message,
      };
    }
  }

  getServer() {
    return this.server;
  }

  getServerInfo() {
    return {
      name: 'forest-mcp-server',
      version: '1.0.0'
    };
  }

  async cleanup() {
    try {
      this.logger.info?.('[Stage1CoreServer] Starting cleanup...');

      // Stop background services
      try {
        this.htaExpansionAgent?.stop();
        this.backgroundProcessor?.stop();
      } catch (_) { /* ignore */ }

      // Clear caches
      this.dataPersistence.clearCache();

      // Clear memory sync queue
      this.memorySync.clearQueue();

      this.logger.info?.('[Stage1CoreServer] Cleanup complete');
    } catch (error) {
      this.logger.error?.('[Stage1CoreServer] Cleanup failed', {
        error: error.message,
      });
    }
  }
}

// Lowercase default export for compatibility with case-sensitive loaders
export default Stage1CoreServer;
export const stage1CoreServer = Stage1CoreServer;
export { Stage1CoreServer };

// Re-export existing server for backward compatibility during transition
// import { CleanForestServer } from '../server-modular.js';
// export { CleanForestServer };

// Note: MCP server startup is handled by dedicated entry points:
// - forest-mcp-server.js (direct entry point)  
// - start-server.js (with core-initialization.js)
