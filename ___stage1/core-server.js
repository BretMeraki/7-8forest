/**
 * Stage1 Core Server - Consolidated Forest MCP Server
 * Uses the new consolidated module architecture
 */

// @ts-nocheck

import { Server } from './local-mcp-server.js';
import { StdioServerTransport } from './local-stdio-transport.js';
import { EnhancedHTACore } from './modules/enhanced-hta-core.js';
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
import { GatedOnboardingFlow } from './modules/gated-onboarding-flow.js';
import { NextPipelinePresenter } from './modules/next-pipeline-presenter.js';

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
    this.coreIntelligence = new CoreIntelligence(this.dataPersistence);
    this.htaCore = new EnhancedHTACore(this.dataPersistence, this.projectManagement, this.coreIntelligence);
    
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

    // Initialize gated onboarding flow and Next + Pipeline presenter
    this.gatedOnboarding = new GatedOnboardingFlow(
      this.dataPersistence,
      this.projectManagement,
      this.htaCore,
      this.coreIntelligence,
      null // Will be set after vector store is initialized
    );
    
    this.pipelinePresenter = new NextPipelinePresenter(
      this.dataPersistence,
      null, // Will be set after vector store is initialized
      this.taskStrategyCore,
      this.htaCore
    );

    this.logger = logger;
    this.debugLogger = debugLogger;
    
    // Landing page tracking - ensures first interaction always shows landing page
    this.hasShownLandingPage = false;

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
      if (htaCore && typeof htaCore.initializeVectorStore === 'function') {
        try {
          const vectorStore = await htaCore.initializeVectorStore();
          if (vectorStore) {
            console.error('✅ Vector intelligence ready');
            
            // Connect vector store to ambiguous desires manager
            this.ambiguousDesiresManager.vectorStore = vectorStore;
            this.ambiguousDesiresManager.adaptiveEvolution.vectorStore = vectorStore;
            this.ambiguousDesiresManager.clarificationDialogue.vectorStore = vectorStore;
            
            // Connect vector store to gated onboarding and pipeline presenter
            this.gatedOnboarding.vectorStore = vectorStore;
            this.pipelinePresenter.vectorStore = vectorStore;
          } else {
            console.error('⚠️ Vector store initialization returned null, continuing without vector support');
          }
        } catch (vectorError) {
          console.error('⚠️ Vector store initialization failed, continuing without vector support:', vectorError.message);
        }
      } else {
        console.error('⚠️ HTA Core does not support vector store initialization');
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
        
        // FIRST INTERACTION: Always show landing page first, unless explicitly requesting it
        if (!this.hasShownLandingPage && toolName !== 'get_landing_page_forest') {
          this.hasShownLandingPage = true;
          console.error('[ToolRouter] First interaction detected - showing landing page first');
          const landingPageResult = await this.generateLandingPage();
          
          // Return landing page with a note about the original request
          return {
            content: [
              ...landingPageResult.content,
              {
                type: 'text',
                text: `\n\n---\n\n**Note**: You requested \`${toolName}\`. After reviewing the options above, you can try that command again or use any of the suggested actions.`
              }
            ]
          };
        }
        
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
            case 'factory_reset_forest':
              result = await this.handleFactoryReset(args); break;
            case 'get_landing_page_forest':
              result = await this.generateLandingPage(); break;
            case 'debug_cache_forest':
              result = await this.debugCacheState(args); break;
            case 'emergency_clear_cache_forest':
              result = await this.emergencyClearCache(args); break;
            
            // Gated Onboarding Flow Tools
            case 'start_learning_journey_forest':
              result = await this.startLearningJourney(args); break;
            case 'continue_onboarding_forest':
              result = await this.continueOnboarding(args); break;
            case 'get_onboarding_status_forest':
              result = await this.getOnboardingStatus(args); break;
            
            // Next + Pipeline Presentation Tools
            case 'get_next_pipeline_forest':
              result = await this.getNextPipeline(args); break;
            case 'evolve_pipeline_forest':
              result = await this.evolvePipeline(args); break;
            
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

  /**
   * generateLandingPage – Dynamically generates a landing page using Claude/LLM
   * with a specific schema: title, motto, three core actions, and tool explanations.
   */
  async generateLandingPage() {
    try {
      // Get list of existing projects for context
      const projectsList = await this.projectManagement.listProjects();
      const projects = projectsList.projects || [];
      const activeProjectId = this.projectManagement.getActiveProjectId();
      
      // Build context for LLM generation
      const userContext = {
        hasExistingProjects: projects.length > 0,
        projectCount: projects.length,
        hasActiveProject: !!activeProjectId,
        projectNames: projects.map(p => p.name)
      };
      
      // Build detailed project information for LLM context
      let projectDetails = '';
      if (userContext.hasExistingProjects) {
        projectDetails = '\n\nEXISTING PROJECTS TO DISPLAY:\n';
        for (let i = 0; i < projects.length; i++) {
          const project = projects[i];
          const isActive = project.id === activeProjectId;
          const lastActivity = project.lastActivity ? ` (Last activity: ${new Date(project.lastActivity).toLocaleDateString()})` : ' (No recent activity)';
          const activeStatus = isActive ? ' [CURRENTLY ACTIVE]' : '';
          projectDetails += `${i + 1}. "${project.name}"${activeStatus}${lastActivity}\n`;
          if (project.description) {
            projectDetails += `   Description: ${project.description}\n`;
          }
        }
        projectDetails += '\nMake sure to display ALL these projects in an organized, easy-to-read format in the "LOAD EXISTING PROJECT" section.';
      }
      
      // Generate landing page using LLM with specific schema
      const landingPagePrompt = `Generate a landing page for the Forest Suite with this exact structure:

**Title**: "Codename: Forest"
**Subtitle**: "May no dream be too out of reach, no problem too difficult to solve, and no goal unachievable"

Then provide exactly three main action sections:

1. **START NEW PROJECT** - Guide for creating a new project
2. **LOAD EXISTING PROJECT** - Options for continuing previous work ${userContext.hasExistingProjects ? `(User has ${userContext.projectCount} existing projects - SHOW THEM ALL IN ORGANIZED LIST)` : '(User has no existing projects yet)'}
3. **LEARN ABOUT FOREST** - Invitation to ask about the suite's purpose and tools

For each section, provide:
- A clear action header
- Brief description of what this option does
- Specific instructions or commands to use
${userContext.hasExistingProjects ? '- For LOAD EXISTING PROJECT: Display ALL projects in a numbered, organized list with status and activity info' : ''}

End with a brief explanation of how the Forest Suite tools work together to break down complex goals into manageable tasks.

Use engaging, inspiring language that matches the motto. Keep it concise but motivational.${projectDetails}`;
      
      // Generate landing page content (skip project-specific LLM generation for landing pages)
      // Landing pages don't need project-specific analysis, so use fallback directly
      const generatedContent = await this.generateFallbackLandingPage(userContext);
      
      return {
        content: [
          {
            type: 'text',
            text: generatedContent,
          },
        ],
      };
    } catch (err) {
      console.error('[LandingPage] Generation failed:', err.message);
      const fallbackContent = await this.generateFallbackLandingPage({ hasExistingProjects: false, projectCount: 0 });
      return {
        content: [
          {
            type: 'text',
            text: fallbackContent,
          },
        ],
      };
    }
  }
  
  /**
   * Fallback landing page with the required schema when LLM generation fails
   */
  async generateFallbackLandingPage(userContext) {
    let content = `# **Codename: Forest**\n\n*May no dream be too out of reach, no problem too difficult to solve, and no goal unachievable*\n\n---\n\n`;
    
    // Action 1: Start New Project
    content += `## 🚀 **START NEW PROJECT**\n\n`;
    content += `Transform any ambitious goal into a clear, step-by-step journey. Whether you're learning a new skill, building something amazing, or solving a complex challenge - every great achievement starts with a single project.\n\n`;
    content += `**Ready to begin?** Use: \`create_project_forest\`\n\n`;
    
    // Action 2: Load Existing Project
    content += `## 📂 **LOAD EXISTING PROJECT**\n\n`;
    if (userContext.hasExistingProjects) {
      content += `Welcome back! You have ${userContext.projectCount} project${userContext.projectCount > 1 ? 's' : ''} waiting for you. Every step forward brings you closer to your goals.\n\n`;
      
      // Get the actual projects list for the fallback
      const projectsList = await this.projectManagement.listProjects();
      const projects = projectsList.projects || [];
      const activeProjectId = this.projectManagement.getActiveProjectId();
      
      content += `**Your Projects:**\n`;
      for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const isActive = project.id === activeProjectId;
        const activeMarker = isActive ? ' ✅ **(CURRENTLY ACTIVE)**' : '';
        const lastActivity = project.lastActivity ? ` - Last activity: ${new Date(project.lastActivity).toLocaleDateString()}` : ' - No recent activity';
        content += `\n**${i + 1}. ${project.name}**${activeMarker}\n`;
        if (project.description) {
          content += `   📝 *${project.description}*\n`;
        }
        content += `   📅 ${lastActivity}\n`;
      }
      
      content += `\n**Continue your journey:**\n`;
      content += `• \`switch_project_forest\` + project name - Activate a specific project\n`;
      content += `• \`current_status_forest\` - Check your current progress\n`;
      content += `• \`get_next_task_forest\` - Get next task for active project\n\n`;
    } else {
      content += `No existing projects yet - but that's about to change! Your first project will be the foundation for achieving something extraordinary.\n\n`;
      content += `**Once you have projects:** Use \`list_projects_forest\` and \`switch_project_forest\`\n\n`;
    }
    
    // Action 3: Learn About Forest
    content += `## 🌲 **LEARN ABOUT FOREST**\n\n`;
    content += `New to the Forest Suite? Curious about how it works? I'm here to guide you through everything - from the philosophy behind goal achievement to the practical tools that make it happen.\n\n`;
    content += `**Ask me anything:**\n`;
    content += `• "What does the Forest Suite do?"\n`;
    content += `• "How do the tools work together?"\n`;
    content += `• "What is Hierarchical Task Analysis?"\n`;
    content += `• "How can this help me achieve my goals?"\n\n`;
    
    // How it works section
    content += `---\n\n**How Forest Works:**\n\n`;
    content += `The Forest Suite uses **Hierarchical Task Analysis (HTA)** to break down any complex goal into manageable, actionable tasks. Think of it as a GPS for your ambitions - it takes you from "I want to achieve X" to "Here's exactly what to do next."\n\n`;
    content += `🎯 **Goal Clarity** → 🌳 **Task Breakdown** → 📋 **Next Actions** → 🏆 **Achievement**\n\n`;
    content += `Every tool in the suite works together to keep you moving forward, one meaningful step at a time.`;
    
    return content;
  }

  /**
   * GATED ONBOARDING FLOW METHODS
   */

  async startLearningJourney(args) {
    try {
      const { initial_goal, goal, user_context = {} } = args;
      const actualGoal = initial_goal || goal;
      
      if (!actualGoal) {
        return {
          content: [{
            type: 'text',
            text: '**Goal Required** ❌\n\nPlease provide a learning goal to start your journey.\n\nExample: `start_learning_journey_forest` with goal "Learn React development"'
          }]
        };
      }

      const result = await this.gatedOnboarding.startNewProject(actualGoal, user_context);
      
      if (!result.success) {
        return {
          content: [{
            type: 'text',
            text: `**Onboarding Issue** ⚠️\n\n${result.message}\n\n**Suggestions**:\n${(result.suggestions || []).map(s => `• ${s}`).join('\n')}`
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: `**🎯 Learning Journey Started!**\n\n${result.message}\n\n**Project ID**: ${result.projectId}\n**Goal**: ${actualGoal}\n\n**Next Step**: ${result.next_action?.description || 'Continue with context gathering'}\n\nUse \`continue_onboarding_forest\` to proceed through the guided setup process.`
        }],
        success: true,
        project_id: result.projectId,
        onboarding_stage: result.stage
      };

    } catch (error) {
      console.error('Stage1CoreServer.startLearningJourney failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**Learning Journey Failed** ❌\n\nError: ${error.message}\n\nPlease try again with a clear learning goal.`
        }],
        error: error.message
      };
    }
  }

  async continueOnboarding(args) {
    try {
      const activeProject = await this.projectManagement.getActiveProject();
      if (!activeProject || !activeProject.project_id) {
        return {
          content: [{
            type: 'text',
            text: '**No Active Project** ❌\n\nStart a learning journey first with \`start_learning_journey_forest\`'
          }]
        };
      }

      const projectId = activeProject.project_id;
      const { stage, input_data = {} } = args;

      const result = await this.gatedOnboarding.continueOnboarding(projectId, stage, input_data);
      
      let responseText = `**🚀 Onboarding Progress**\n\n${result.message}\n\n`;
      
      if (result.gate_status === 'passed') {
        responseText += `✅ **${stage}** stage completed!\n\n`;
      } else if (result.gate_status === 'blocked') {
        responseText += `⛔ **${stage}** stage blocked - action required\n\n`;
      } else if (result.gate_status === 'in_progress') {
        responseText += `⏳ **${stage}** stage in progress\n\n`;
      }

      if (result.next_action) {
        responseText += `**Next Action**: ${result.next_action.description}\n`;
        responseText += `**Command**: ${result.next_action.command}\n\n`;
      }

      if (result.onboarding_complete) {
        responseText += `🎉 **Onboarding Complete!** Your personalized learning system is ready.\n\nUse \`get_next_pipeline_forest\` to see your learning pipeline.`;
      }

      return {
        content: [{ type: 'text', text: responseText }],
        success: result.success,
        project_id: projectId,
        onboarding_stage: result.stage,
        gate_status: result.gate_status
      };

    } catch (error) {
      console.error('Stage1CoreServer.continueOnboarding failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**Onboarding Error** ❌\n\nError: ${error.message}\n\nUse \`get_onboarding_status_forest\` to check current status.`
        }],
        error: error.message
      };
    }
  }

  async getOnboardingStatus(args) {
    try {
      const activeProject = await this.projectManagement.getActiveProject();
      if (!activeProject || !activeProject.project_id) {
        return {
          content: [{
            type: 'text',
            text: '**No Active Project** ❌\n\nStart a learning journey first with \`start_learning_journey_forest\`'
          }]
        };
      }

      const projectId = activeProject.project_id;
      const result = await this.gatedOnboarding.getOnboardingStatus(projectId);
      
      if (!result.success) {
        return {
          content: [{
            type: 'text',
            text: `**No Onboarding Found** 📭\n\nNo onboarding process found for this project.\n\nStart with \`start_learning_journey_forest\``
          }]
        };
      }

      let statusText = `**📊 Onboarding Status**\n\n`;
      statusText += `**Project**: ${projectId}\n`;
      statusText += `**Current Stage**: ${result.onboarding_status.current_stage}\n`;
      statusText += `**Progress**: ${result.onboarding_status.progress}%\n\n`;
      
      statusText += `**Gates Progress**:\n`;
      result.gates_progress.forEach(gate => {
        statusText += `${gate.status} ${gate.name}\n`;
      });
      
      statusText += `\n**Next Action**: ${result.next_action.description}\n`;
      statusText += `**Command**: ${result.next_action.command}`;

      return {
        content: [{ type: 'text', text: statusText }],
        success: true,
        project_id: projectId,
        onboarding_status: result.onboarding_status
      };

    } catch (error) {
      console.error('Stage1CoreServer.getOnboardingStatus failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**Status Check Failed** ❌\n\nError: ${error.message}`
        }],
        error: error.message
      };
    }
  }

  /**
   * NEXT + PIPELINE PRESENTATION METHODS
   */

  async getNextPipeline(args) {
    try {
      const activeProject = await this.projectManagement.getActiveProject();
      if (!activeProject || !activeProject.project_id) {
        return {
          content: [{
            type: 'text',
            text: '**No Active Project** ❌\n\nCreate or switch to a project first to see your learning pipeline.'
          }]
        };
      }

      const projectId = activeProject.project_id;
      const userContext = {
        energyLevel: args.energy_level || 3,
        timeAvailable: args.time_available || '30 minutes',
        ...args.context
      };

      const result = await this.pipelinePresenter.generateNextPipeline(projectId, userContext);
      
      return {
        content: result.content,
        success: true,
        project_id: projectId,
        pipeline_info: {
          total_tasks: result.total_pipeline_tasks,
          presentation_type: result.presentation_type
        }
      };

    } catch (error) {
      console.error('Stage1CoreServer.getNextPipeline failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**Pipeline Generation Failed** ❌\n\nError: ${error.message}\n\nTry using \`get_next_task_forest\` for a single task recommendation.`
        }],
        error: error.message
      };
    }
  }

  async evolvePipeline(args) {
    try {
      const activeProject = await this.projectManagement.getActiveProject();
      if (!activeProject || !activeProject.project_id) {
        return {
          content: [{
            type: 'text',
            text: '**No Active Project** ❌\n\nCreate or switch to a project first to evolve your pipeline.'
          }]
        };
      }

      const projectId = activeProject.project_id;
      
      // Determine if this was auto-triggered
      const isAutoTriggered = args.auto_triggered || false;
      const evolutionReason = args.evolution_reason || 'Manual evolution requested';
      
      // Trigger strategy evolution first
      const evolutionResult = await this.taskStrategyCore.evolveStrategy({
        project_id: projectId,
        evolution_triggers: args.triggers || {},
        context: args.context || {},
        auto_triggered: isAutoTriggered,
        pipeline_focus: true
      });

      // Generate fresh pipeline with evolved strategy
      const pipelineResult = await this.pipelinePresenter.generateNextPipeline(projectId, {
        energyLevel: args.energy_level || 3,
        timeAvailable: args.time_available || '30 minutes',
        ...args.context
      });

      const autoIndicator = isAutoTriggered ? '🤖 **Auto-Evolution Triggered**\n\n' : '';
      const reasonText = isAutoTriggered ? `**Reason**: ${evolutionReason}\n\n` : '';

      return {
        content: [{
          type: 'text',
          text: `${autoIndicator}**🔄 Pipeline Evolved!**\n\n${reasonText}Your learning pipeline has been updated based on your progress and changing patterns.\n\n**Evolution Summary**: ${evolutionResult.summary || 'Strategy adapted to current context'}\n\n**Fresh Pipeline Generated**: ${pipelineResult.total_pipeline_tasks || 0} tasks ready\n\n---\n\n${pipelineResult.content[0]?.text || 'Pipeline updated successfully'}`
        }],
        success: true,
        project_id: projectId,
        evolution_result: evolutionResult,
        fresh_pipeline: pipelineResult,
        auto_triggered: isAutoTriggered
      };

    } catch (error) {
      console.error('Stage1CoreServer.evolvePipeline failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**Pipeline Evolution Failed** ❌\n\nError: ${error.message}\n\nYour existing pipeline remains available.`
        }],
        error: error.message
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

  /**
   * Handle factory reset - delete project(s) with confirmation
   */
  async handleFactoryReset(args) {
    try {
      const { project_id, confirm_deletion, confirmation_message } = args;
      
      // Safety check - require explicit confirmation
      if (!confirm_deletion) {
        return {
          content: [{
            type: 'text',
            text: '**⚠️ Factory Reset Cancelled**\n\nFor safety, factory reset requires explicit confirmation.\n\n' +
                  'To proceed, you must set `confirm_deletion: true` and provide a confirmation message.\n\n' +
                  '**WARNING**: This will permanently delete project data that cannot be recovered.'
          }]
        };
      }
      
      if (!confirmation_message || confirmation_message.trim().length < 10) {
        return {
          content: [{
            type: 'text',
            text: '**⚠️ Confirmation Required**\n\nPlease provide a meaningful confirmation message (at least 10 characters) ' +
                  'acknowledging that you understand this will permanently delete data.'
          }]
        };
      }
      
      let resetResult;
      
      if (project_id) {
        // Single project reset
        const projectExists = await this.dataPersistence.projectExists(project_id);
        if (!projectExists) {
          return {
            content: [{
              type: 'text',
              text: `**❌ Project Not Found**\n\nProject '${project_id}' does not exist.`
            }]
          };
        }
        
        // Delete the project
        await this.dataPersistence.deleteProject(project_id);
        
        // Clear active project if it was the deleted one
        const activeProject = await this.projectManagement.getActiveProject();
        if (activeProject.project_id === project_id) {
          // Clear active project by updating global config
          const globalData = (await this.dataPersistence.loadGlobalData('config.json')) || { projects: [] };
          globalData.activeProject = null;
          await this.dataPersistence.saveGlobalData('config.json', globalData);
          this.projectManagement.activeProjectId = null;
        }
        
        resetResult = {
          type: 'single_project',
          projectId: project_id,
          message: `Project '${project_id}' has been permanently deleted.`,
          timestamp: new Date().toISOString()
        };
        
      } else {
        // All projects reset
        const allProjects = await this.projectManagement.listProjects();
        const deletedProjects = [];
        const errors = [];
        
        for (const project of allProjects.projects) {
          try {
            await this.dataPersistence.deleteProject(project.id);
            deletedProjects.push(project.id);
          } catch (error) {
            errors.push({
              projectId: project.id,
              error: error.message
            });
          }
        }
        
        // Clear active project by updating global config
        const globalData = (await this.dataPersistence.loadGlobalData('config.json')) || { projects: [] };
        globalData.activeProject = null;
        globalData.projects = []; // Clear project list too since all are deleted
        await this.dataPersistence.saveGlobalData('config.json', globalData);
        this.projectManagement.activeProjectId = null;
        
        resetResult = {
          type: 'all_projects',
          deletedProjects: deletedProjects,
          errors: errors,
          message: `Factory reset completed. ${deletedProjects.length} projects deleted${errors.length > 0 ? ` with ${errors.length} errors` : ''}.`,
          timestamp: new Date().toISOString()
        };
      }
      
      // Clear caches after deletion
      this.dataPersistence.clearCache();
      
      return {
        content: [{
          type: 'text',
          text: `**🔄 Factory Reset Complete**\n\n` +
                `**Type**: ${resetResult.type === 'single_project' ? 'Single Project' : 'All Projects'}\n` +
                `**Result**: ${resetResult.message}\n` +
                `**Timestamp**: ${resetResult.timestamp}\n\n` +
                `**Confirmation**: ${confirmation_message}\n\n` +
                (resetResult.errors && resetResult.errors.length > 0 ? 
                  `**Errors**: ${resetResult.errors.map(e => `${e.projectId}: ${e.error}`).join(', ')}\n\n` : '') +
                '**Next Steps**: Create a new project to continue using Forest.'
        }],
        success: true,
        resetResult: resetResult
      };
      
    } catch (error) {
      console.error('Stage1CoreServer.handleFactoryReset failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**❌ Factory Reset Failed**\n\nError: ${error.message}\n\nPlease try again or contact support if the issue persists.`
        }],
        success: false,
        error: error.message
      };
    }
  }

  async debugCacheState(args) {
    try {
      const projectId = args.project_id || this.projectManagement.getActiveProjectId();
      
      const cacheDebugResult = this.dataPersistence.debugCacheState(projectId);
      
      return {
        content: [{
          type: 'text',
          text: `**🔍 Cache Debug State Report**\n\n` +
                `**Timestamp**: ${cacheDebugResult.timestamp}\n` +
                `**Cache Size**: ${cacheDebugResult.cacheStats.size} entries\n` +
                `**Hit Rate**: ${(cacheDebugResult.cacheStats.hitRate * 100).toFixed(2)}%\n` +
                `**Memory Usage**: ${(cacheDebugResult.cacheStats.memoryUsage / 1024).toFixed(2)} KB\n\n` +
                (projectId ? 
                  `**Project**: ${projectId}\n` +
                  `**Project Cache Keys**: ${cacheDebugResult.projectKeyCount || 0}\n` +
                  `**Project Keys**: ${JSON.stringify(cacheDebugResult.projectKeys || [], null, 2)}\n\n` : '') +
                `**All Cache Keys**:\n\`\`\`json\n${JSON.stringify(cacheDebugResult.allKeys, null, 2)}\n\`\`\`\n\n` +
                `*Use \`emergency_clear_cache_forest\` if cache needs to be cleared.*`
        }],
        debug_data: cacheDebugResult
      };
    } catch (error) {
      console.error('Stage1CoreServer.debugCacheState failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**❌ Cache Debug Failed**\n\nError: ${error.message}`
        }],
        error: error.message
      };
    }
  }
  
  async emergencyClearCache(args) {
    try {
      const projectId = args.project_id;
      const clearAll = args.clear_all === true;
      
      if (clearAll) {
        // Clear entire cache
        await this.dataPersistence.clearCache();
        return {
          content: [{
            type: 'text',
            text: `**🚨 EMERGENCY CACHE CLEARED**\n\n` +
                  `**Action**: Full cache clear\n` +
                  `**Timestamp**: ${new Date().toISOString()}\n\n` +
                  `All cached data has been cleared. Next data access will reload from disk.`
          }]
        };
      } else if (projectId) {
        // Clear specific project cache
        const result = this.dataPersistence.emergencyClearProjectCache(projectId);
        return {
          content: [{
            type: 'text',
            text: `**🚨 EMERGENCY PROJECT CACHE CLEARED**\n\n` +
                  `**Project**: ${projectId}\n` +
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
      console.error('Stage1CoreServer.emergencyClearCache failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**❌ Emergency Cache Clear Failed**\n\nError: ${error.message}`
        }],
        error: error.message
      };
    }
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
