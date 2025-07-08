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
import { ForestDataVectorization } from './modules/forest-data-vectorization.js';
import { ChromaDBLifecycleManager } from './modules/ChromaDBLifecycleManager.js';
import { ClaudeDiagnosticHelper } from './utils/claude-diagnostic-helper.js';
import path from 'path';

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
    
    // Initialize diagnostic helper for preventing false positives
    this.diagnosticHelper = new ClaudeDiagnosticHelper();
    
    // Connect TaskStrategyCore to AmbiguousDesiresManager
    this.ambiguousDesiresManager.taskStrategyCore = this.taskStrategyCore;

    // Initialize Forest Data Vectorization FIRST for semantic operations
    this.forestDataVectorization = new ForestDataVectorization(this.dataPersistence.dataDir);
    
    // Initialize ChromaDB Lifecycle Manager for parallel startup and graceful shutdown
    this.chromaDBLifecycle = new ChromaDBLifecycleManager({
      dataDir: path.join(this.dataPersistence.dataDir, '.chromadb'),
      host: process.env.CHROMA_HOST || '0.0.0.0',
      port: parseInt(process.env.CHROMA_PORT) || 8000,
      serverPath: 'python3',
      serverScript: path.join(process.cwd(), 'start-chromadb-server.py'),
      enableAutoRestart: process.env.CHROMA_AUTO_RESTART !== 'false',
      maxRetries: parseInt(process.env.CHROMA_MAX_RETRIES) || 3,
      startupTimeout: parseInt(process.env.CHROMA_STARTUP_TIMEOUT) || 30000
    });
    
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
      
      // Start ChromaDB in parallel (non-blocking)
      console.error('🔄 Starting ChromaDB server in parallel...');
      this.chromaDBLifecycle.startParallel().catch(error => {
        console.error('⚠️ ChromaDB startup failed (non-blocking):', error.message);
      });
      
      // Initialize core modules with vector support

      
      // Set up enhanced tool routing with vector intelligence
      this.setupToolRouter();

      // Start background processor & expansion agent
      this.backgroundProcessor.start();
      this.htaExpansionAgent.start();

      // Connect MCP core to tool router and register JSON-RPC handlers
      await this.mcpCore.setupHandlers();
      this.mcpCore.setToolRouter(this.toolRouter);
      const toolDefinitions = await this.mcpCore.getToolDefinitions();
      console.error(`✅ MCP handlers configured with ${toolDefinitions.length} tools`);
      
      // Ensure vector store is properly initialized
      console.error('📊 Initializing vector intelligence...');
      
      // Initialize ForestDataVectorization first
      try {
        await this.forestDataVectorization.initialize();
        console.error('✅ Forest Data Vectorization ready');
      } catch (vectorizationError) {
        console.error('⚠️ Forest Data Vectorization initialization failed:', vectorizationError.message);
      }
      
      // Check ChromaDB status (non-blocking)
      try {
        const chromaStatus = this.chromaDBLifecycle.getStatus();
        if (chromaStatus.isRunning) {
          console.error('✅ ChromaDB server running', { port: chromaStatus.port, pid: chromaStatus.pid });
        } else if (chromaStatus.isStarting) {
          console.error('🔄 ChromaDB server starting...', { port: chromaStatus.port });
        } else {
          console.error('⚠️ ChromaDB server not available', chromaStatus);
        }
      } catch (chromaError) {
        console.error('⚠️ ChromaDB status check failed:', chromaError.message);
      }
      
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
        if (!this.hasShownLandingPage && !['get_landing_page_forest', 'start_learning_journey_forest', 'list_projects_forest'].includes(toolName)) {
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
              console.error('[forest-log] [ToolRouter] About to call vectorized buildHTATree');
              result = await this.buildHTATreeVectorized(args); break;
            case 'get_hta_status_forest':
              result = await this.htaCore.getHTAStatus(); break;
            case 'get_next_task_forest':
              result = await this.getNextTaskVectorized(args); break;
            case 'complete_block_forest':
              result = await this.completeBlockVectorized(args); break;
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
            
            // Vectorization Status Tools
            case 'get_vectorization_status_forest':
              result = await this.getVectorizationStatus(args); break;
            case 'vectorize_project_data_forest':
              result = await this.vectorizeProjectData(args); break;
            
            // ChromaDB Management Tools
            case 'get_chromadb_status_forest':
              result = await this.getChromaDBStatus(args); break;
            case 'restart_chromadb_forest':
              result = await this.restartChromaDB(args); break;
            
            // Diagnostic Tools
            case 'verify_system_health_forest':
              result = await this.verifySystemHealth(args); break;
            case 'verify_function_exists_forest':
              result = await this.verifyFunctionExists(args); break;
            case 'run_diagnostic_verification_forest':
              result = await this.runDiagnosticVerification(args); break;
            
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
   * VECTORIZED HTA TREE BUILDING - Integrates ForestDataVectorization
   */
  async buildHTATreeVectorized(args) {
    try {
      console.error('[VectorizedHTA] Starting semantic HTA tree building...');
      
      // Get active project
      const activeProject = await this.projectManagement.getActiveProject();
      if (!activeProject || !activeProject.project_id) {
        throw new Error('No active project found. Please create a project first.');
      }
      
      const projectId = activeProject.project_id;
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
      
      if (!config || !config.goal) {
        throw new Error('Project must have a goal defined to build HTA tree');
      }
      
      // Build HTA tree using traditional method first
      const traditionalResult = await this.htaCore.buildHTATree(args);
      
      // Check if we need to vectorize the project data
      try {
        // Get the active path from config
        const activePath = config.activePath || 'general';
        
        // Load HTA data from the correct path
        const htaData = await this.dataPersistence.loadPathData(projectId, activePath, 'hta.json');
        if (htaData) {
          console.error('[VectorizedHTA] Vectorizing project goal and HTA structure...');
          
          // Vectorize project goal
          await this.forestDataVectorization.vectorizeProjectGoal(projectId, {
            goal: config.goal,
            complexity: this.assessGoalComplexity(config.goal, config.context),
            domain: this.extractDomain(config.goal),
            estimatedDuration: config.estimated_duration || '3 months',
            created_at: config.created_at || new Date().toISOString()
          });
          
          // Vectorize strategic branches if they exist
          if (htaData.strategicBranches && htaData.strategicBranches.length > 0) {
            await this.forestDataVectorization.vectorizeHTABranches(projectId, htaData.strategicBranches);
          }
          
          // Vectorize tasks if they exist
          if (htaData.frontierNodes && htaData.frontierNodes.length > 0) {
            await this.forestDataVectorization.vectorizeTaskContent(projectId, htaData.frontierNodes);
          }
          
          console.error('[VectorizedHTA] ✅ Project data successfully vectorized for semantic operations');
        } else {
          console.error(`[VectorizedHTA] No HTA data found in path '${activePath}' yet (normal for new HTA trees)`);
          
          // Still vectorize the project goal even if no HTA data exists yet
          await this.forestDataVectorization.vectorizeProjectGoal(projectId, {
            goal: config.goal,
            complexity: this.assessGoalComplexity(config.goal, config.context),
            domain: this.extractDomain(config.goal),
            estimatedDuration: config.estimated_duration || '3 months',
            created_at: config.created_at || new Date().toISOString()
          });
          console.error('[VectorizedHTA] ✅ Project goal vectorized for semantic operations');
        }
      } catch (vectorError) {
        console.error('[VectorizedHTA] ⚠️ Vectorization failed, continuing with traditional HTA:', vectorError.message);
      }
      
      return traditionalResult;
      
    } catch (error) {
      console.error('[VectorizedHTA] HTA tree building failed:', error);
      return {
        content: [{
          type: 'text',
          text: `❌ **HTA Tree Building Failed**\n\nError: ${error.message}\n\nPlease check your project configuration and try again.`
        }]
      };
    }
  }

  /**
   * VECTORIZED NEXT TASK - Uses semantic search for context-aware task selection
   */
  async getNextTaskVectorized(args) {
    try {
      console.error('[VectorizedTask] Starting context-aware task selection...');
      
      const activeProject = await this.projectManagement.getActiveProject();
      if (!activeProject || !activeProject.project_id) {
        return {
          content: [{ type: 'text', text: '**No Active Project** ❌\n\nCreate or switch to a project first.' }]
        };
      }
      
      const projectId = activeProject.project_id;
      const contextFromMemory = args.context_from_memory || args.contextFromMemory || '';
      const energyLevel = args.energy_level || args.energyLevel || 3;
      const timeAvailable = args.time_available || args.timeAvailable || '30 minutes';
      
      // Try adaptive task recommendation using vectorization first
      try {
        const semanticTasks = await this.forestDataVectorization.adaptiveTaskRecommendation(
          projectId,
          contextFromMemory,
          energyLevel,
          timeAvailable
        );
        
        if (semanticTasks && semanticTasks.length > 0) {
          console.error(`[VectorizedTask] ✅ Found ${semanticTasks.length} context-aware tasks`);
          
          // Format the best semantic match
          const bestMatch = semanticTasks[0];
          const taskMetadata = bestMatch.enriched_metadata || {};
          
          return {
            content: [{
              type: 'text',
              text: `🎯 **Context-Aware Task Selected**\n\n` +
                    `**Task**: ${bestMatch.metadata.title || 'Semantic Task'}\n` +
                    `**Description**: ${bestMatch.metadata.description || 'AI-selected based on your context'}\n` +
                    `**Similarity Score**: ${(bestMatch.score * 100).toFixed(1)}%\n` +
                    `**Difficulty**: ${taskMetadata.difficulty || energyLevel}/5\n` +
                    `**Duration**: ${taskMetadata.duration || timeAvailable}\n\n` +
                    `**Why this task?** Selected using semantic analysis of your context: "${contextFromMemory}"\n\n` +
                    `This task matches your current energy level (${energyLevel}/5) and available time (${timeAvailable}).\n\n` +
                    `**Context Enhancement**: Your specific situation has been considered in this recommendation.`
            }],
            task_info: {
              task_id: bestMatch.metadata.task_id,
              similarity_score: bestMatch.score,
              vectorized: true,
              semantic_match: true
            }
          };
        }
      } catch (vectorError) {
        console.error('[VectorizedTask] ⚠️ Semantic task selection failed, falling back to traditional:', vectorError.message);
        
        // Check if this is a ChromaDB corruption issue
        if (vectorError.message && (
            vectorError.message.includes('status: 500') ||
            vectorError.message.includes('CHROMADB_CORRUPTION') ||
            vectorError.message.includes('tolist') ||
            vectorError.message.includes('Internal Server Error')
        )) {
          console.error('[VectorizedTask] 🔥 ChromaDB corruption detected - automatic recovery should trigger');
        }
      }
      
      // Fallback to traditional task selection
      const traditionalResult = await this.taskStrategyCore.getNextTask(args);
      
      // Enhance traditional result with note about vectorization
      if (traditionalResult && traditionalResult.content && traditionalResult.content[0]) {
        traditionalResult.content[0].text += '\n\n*Note: Using traditional task selection (semantic enhancement available after vectorization)*';
      }
      
      return traditionalResult;
      
    } catch (error) {
      console.error('[VectorizedTask] Task selection failed:', error);
      return {
        content: [{
          type: 'text',
          text: `❌ **Task Selection Failed**\n\nError: ${error.message}\n\nPlease check your project configuration and try again.`
        }]
      };
    }
  }

  // Helper methods for vectorization
  assessGoalComplexity(goal, context) {
    const goalLength = goal.length;
    const contextLength = (context || '').length;
    const complexWords = (goal.toLowerCase().match(/\b(advanced|complex|sophisticated|comprehensive|integrate|analyze|synthesize|optimize)\b/g) || []).length;
    
    if (complexWords >= 3 || goalLength > 200) return 'high';
    if (complexWords >= 1 || goalLength > 100 || contextLength > 200) return 'medium';
    return 'low';
  }
  
  extractDomain(goal) {
    const goalLower = goal.toLowerCase();
    
    if (goalLower.includes('programming') || goalLower.includes('coding') || goalLower.includes('software')) return 'software_development';
    if (goalLower.includes('machine learning') || goalLower.includes('ai') || goalLower.includes('data science')) return 'ai_ml';
    if (goalLower.includes('business') || goalLower.includes('marketing') || goalLower.includes('finance')) return 'business';
    if (goalLower.includes('design') || goalLower.includes('creative') || goalLower.includes('art')) return 'creative';
    if (goalLower.includes('science') || goalLower.includes('research') || goalLower.includes('academic')) return 'academic';
    if (goalLower.includes('language') || goalLower.includes('spanish') || goalLower.includes('french')) return 'language_learning';
    if (goalLower.includes('health') || goalLower.includes('fitness') || goalLower.includes('wellness')) return 'health_wellness';
    
    return 'general';
  }

  /**
   * VECTORIZED BLOCK COMPLETION - Captures learning insights for semantic analysis
   */
  async completeBlockVectorized(args) {
    try {
      // Complete the block using traditional method first
      const traditionalResult = await this.taskStrategyCore.handleBlockCompletion(args);
      
      // Extract learning insights for vectorization
      const activeProject = await this.projectManagement.getActiveProject();
      if (activeProject && activeProject.project_id && args.learned) {
        const projectId = activeProject.project_id;
        
        try {
          // Create learning event for vectorization
          const learningEvent = {
            id: `learning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'task_completion',
            description: `Completed task: ${args.block_id || 'Unknown task'}`,
            outcome: args.outcome || 'Task completed',
            insights: args.learned || '',
            breakthroughLevel: this.assessBreakthroughLevel(args),
            taskId: args.block_id,
            timestamp: new Date().toISOString()
          };
          
          // Vectorize the learning event
          await this.forestDataVectorization.vectorizeLearningHistory(projectId, [learningEvent]);
          
          // Check if this was a breakthrough for special vectorization
          if (args.breakthrough || this.assessBreakthroughLevel(args) >= 4) {
            const breakthroughInsight = {
              id: `breakthrough_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              description: args.learned,
              context: `Task completion: ${args.outcome}`,
              impact: args.breakthrough ? 'high' : 'medium',
              impactLevel: this.assessBreakthroughLevel(args),
              relatedTasks: [args.block_id],
              knowledgeDomain: this.extractDomain(args.learned || args.outcome || ''),
              timestamp: new Date().toISOString()
            };
            
            await this.forestDataVectorization.vectorizeBreakthroughInsight(projectId, breakthroughInsight);
            
            console.error(`[VectorizedCompletion] ✅ Breakthrough insight vectorized for future semantic recommendations`);
          }
          
          console.error(`[VectorizedCompletion] ✅ Learning event vectorized for adaptive recommendations`);
          
          // Enhance traditional result with vectorization note
          if (traditionalResult && traditionalResult.content && traditionalResult.content[0]) {
            traditionalResult.content[0].text += '\n\n*🧠 Learning insights captured for semantic enhancement of future recommendations*';
          }
          
        } catch (vectorError) {
          console.error('[VectorizedCompletion] ⚠️ Learning vectorization failed:', vectorError.message);
        }
      }
      
      return traditionalResult;
      
    } catch (error) {
      console.error('[VectorizedCompletion] Block completion failed:', error);
      return {
        content: [{
          type: 'text',
          text: `❌ **Block Completion Failed**\n\nError: ${error.message}\n\nPlease try again.`
        }]
      };
    }
  }
  
  assessBreakthroughLevel(args) {
    let level = 2; // baseline
    
    if (args.breakthrough) level += 2;
    if (args.learned && args.learned.length > 100) level += 1;
    if (args.difficulty_rating && args.difficulty_rating >= 4) level += 1;
    if (args.outcome && args.outcome.toLowerCase().includes('breakthrough')) level += 1;
    if (args.learned && (args.learned.toLowerCase().includes('insight') || args.learned.toLowerCase().includes('understanding'))) level += 1;
    
    return Math.min(level, 5);
  }

  /**
   * Get vectorization status and analytics
   */
  async getVectorizationStatus(args) {
    try {
      const activeProject = await this.projectManagement.getActiveProject();
      const projectId = activeProject?.project_id;
      
      // Get vectorization stats
      const vectorStats = await this.forestDataVectorization.getVectorizationStats();
      
      // Get corruption recovery status
      const recoveryStatus = await this.forestDataVectorization.getCorruptionRecoveryStatus();
      
      let statusText = `**🧠 Vectorization Intelligence Status**\n\n`;
      
      // System status
      statusText += `**System Status**: ${this.forestDataVectorization.initialized ? '✅ Active' : '❌ Not Initialized'}\n`;
      statusText += `**Vector Store**: ${recoveryStatus.vector_store_status === 'healthy' ? '✅ Healthy' : '❌ Issues Detected'}\n`;
      
      // Corruption recovery info
      if (recoveryStatus.last_recovery) {
        statusText += `**Last Recovery**: ${new Date(recoveryStatus.last_recovery).toLocaleString()}\n`;
      }
      if (recoveryStatus.recovered_projects.length > 0) {
        statusText += `**Recovered Projects**: ${recoveryStatus.recovered_projects.length}\n`;
      }
      statusText += `\n`;
      
      // Cache performance
      const cacheStats = vectorStats.cache_stats;
      statusText += `**Performance Analytics**\n`;
      statusText += `• Cache Size: ${cacheStats.size}/${cacheStats.max_size} entries\n`;
      statusText += `• Hit Rate: ${cacheStats.hit_rate.toFixed(1)}% (${cacheStats.hits} hits, ${cacheStats.misses} misses)\n\n`;
      
      // Project-specific status
      if (projectId) {
        statusText += `**Current Project**: ${projectId}\n`;
        
        // Check if project data is vectorized
        try {
          const goalMetadata = await this.dataPersistence.loadProjectData(projectId, 'goal_metadata.json');
          const branchMetadata = await this.dataPersistence.loadProjectData(projectId, 'branch_metadata.json');
          const taskMetadata = await this.dataPersistence.loadProjectData(projectId, 'task_metadata.json');
          
          statusText += `• Goal Vectorized: ${goalMetadata?.vectorized ? '✅ Yes' : '❌ No'}\n`;
          statusText += `• Branches Vectorized: ${branchMetadata?.vectorized ? `✅ Yes (${branchMetadata.branches?.length || 0} branches)` : '❌ No'}\n`;
          statusText += `• Tasks Vectorized: ${taskMetadata?.vectorized ? `✅ Yes (${taskMetadata.tasks?.length || 0} tasks)` : '❌ No'}\n\n`;
          
          if (goalMetadata?.last_vectorized) {
            statusText += `• Last Vectorization: ${new Date(goalMetadata.last_vectorized).toLocaleString()}\n\n`;
          }
        } catch (metadataError) {
          statusText += `• Vectorization Status: ⚠️ Metadata unavailable\n\n`;
        }
      } else {
        statusText += `**Current Project**: None active\n\n`;
      }
      
      // Available vectorization types
      statusText += `**Available Intelligence Types**\n`;
      statusText += `• **Project Goals**: Semantic goal analysis and comparison\n`;
      statusText += `• **HTA Branches**: Strategic branch similarity and clustering\n`;
      statusText += `• **Task Content**: Context-aware task recommendations\n`;
      statusText += `• **Learning History**: Experience-based learning insights\n`;
      statusText += `• **Breakthrough Insights**: High-impact learning moment capture\n\n`;
      
      // Instructions
      statusText += `**How to Use**\n`;
      statusText += `• Use \`vectorize_project_data_forest\` to enable semantic intelligence for current project\n`;
      statusText += `• All \`get_next_task_forest\` calls now use context-aware recommendations when vectorized\n`;
      statusText += `• Task completions with learning insights are automatically vectorized\n`;
      statusText += `• Project goals and branches are automatically vectorized during HTA tree creation`;
      
      return {
        content: [{ type: 'text', text: statusText }],
        vectorization_stats: vectorStats,
        project_vectorized: projectId ? {
          goal: (await this.dataPersistence.loadProjectData(projectId, 'goal_metadata.json'))?.vectorized || false,
          branches: (await this.dataPersistence.loadProjectData(projectId, 'branch_metadata.json'))?.vectorized || false,
          tasks: (await this.dataPersistence.loadProjectData(projectId, 'task_metadata.json'))?.vectorized || false
        } : null
      };
      
    } catch (error) {
      console.error('Vectorization status check failed:', error);
      return {
        content: [{
          type: 'text',
          text: `❌ **Vectorization Status Check Failed**\n\nError: ${error.message}\n\nVectorization may not be properly initialized.`
        }]
      };
    }
  }

  /**
   * Manually vectorize project data for semantic intelligence
   */
  async vectorizeProjectData(args) {
    try {
      const activeProject = await this.projectManagement.getActiveProject();
      if (!activeProject || !activeProject.project_id) {
        return {
          content: [{
            type: 'text',
            text: '**No Active Project** ❌\n\nCreate or switch to a project first to vectorize data.'
          }]
        };
      }
      
      const projectId = activeProject.project_id;
      
      let statusText = `**🔄 Vectorizing Project Data...**\n\nProject: ${projectId}\n\n`;
      
      // Perform bulk vectorization
      const bulkResult = await this.forestDataVectorization.bulkVectorizeProject(projectId);
      
      statusText += `**Vectorization Results:**\n`;
      statusText += `• Total Items Vectorized: ${bulkResult.vectorized}\n`;
      statusText += `• Errors: ${bulkResult.errors}\n\n`;
      
      if (bulkResult.types) {
        statusText += `**Breakdown by Type:**\n`;
        if (bulkResult.types.goals) statusText += `• Goals: ${bulkResult.types.goals}\n`;
        if (bulkResult.types.branches) statusText += `• Strategic Branches: ${bulkResult.types.branches}\n`;
        if (bulkResult.types.tasks) statusText += `• Tasks: ${bulkResult.types.tasks}\n`;
        if (bulkResult.types.learning_events) statusText += `• Learning Events: ${bulkResult.types.learning_events}\n`;
        statusText += `\n`;
      }
      
      if (bulkResult.vectorized > 0) {
        statusText += `✅ **Semantic Intelligence Activated!**\n\n`;
        statusText += `Your project now benefits from:\n`;
        statusText += `• **Context-Aware Task Recommendations**: Tasks selected based on your specific situation and learning history\n`;
        statusText += `• **Semantic Goal Analysis**: Better understanding of goal complexity and domain\n`;
        statusText += `• **Learning Pattern Recognition**: Insights from your previous breakthroughs and completions\n`;
        statusText += `• **Adaptive Strategy Evolution**: Data-driven strategy improvements\n\n`;
        statusText += `Try \`get_next_task_forest\` with detailed context to experience the improvement!`;
      } else {
        statusText += `⚠️ **Limited Vectorization**\n\n`;
        statusText += `No new data was vectorized. This could mean:\n`;
        statusText += `• Project data is already vectorized\n`;
        statusText += `• HTA tree needs to be built first (\`build_hta_tree_forest\`)\n`;
        statusText += `• No tasks or learning history available yet\n\n`;
        statusText += `Create some content first, then try vectorization again.`;
      }
      
      return {
        content: [{ type: 'text', text: statusText }],
        vectorization_result: bulkResult,
        success: bulkResult.vectorized > 0
      };
      
    } catch (error) {
      console.error('Manual vectorization failed:', error);
      return {
        content: [{
          type: 'text',
          text: `❌ **Vectorization Failed**\n\nError: ${error.message}\n\nPlease check your project data and try again.`
        }],
        error: error.message
      };
    }
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

      // ChromaDB health check
      let chromaDBHealthy = false;
      let chromaDBStatus = null;
      try {
        chromaDBStatus = await this.chromaDBLifecycle.getHealthStatus();
        chromaDBHealthy = chromaDBStatus.status === 'healthy';
      } catch (error) {
        chromaDBStatus = { status: 'error', reason: error.message };
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
              chromaDBHealthy,
              chromaDBStatus,
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
      const { stage, input_data, inputData, context, ...rest } = args;
      // Support both camelCase and snake_case plus direct context field
      let mergedInput = input_data || inputData || {};
      if (context && !mergedInput.context) {
        mergedInput.context = context;
      }
      // Merge any additional top-level props into mergedInput for maximum flexibility
      mergedInput = { ...mergedInput, ...rest };

      const result = await this.gatedOnboarding.continueOnboarding(projectId, stage, mergedInput);
      
      let responseText = `**🚀 Onboarding Progress**\n\n${result.message}\n\n`;
      
      // Use the stage from result instead of potentially undefined input stage
      const currentStage = result.stage || stage || 'unknown';
      
      if (result.gate_status === 'passed') {
        responseText += `✅ **${currentStage}** stage completed!\n\n`;
      } else if (result.gate_status === 'blocked') {
        responseText += `⛔ **${currentStage}** stage blocked - action required\n\n`;
      } else if (result.gate_status === 'in_progress') {
        responseText += `⏳ **${currentStage}** stage in progress\n\n`;
      }
      
      // Add suggestions if provided
      if (result.suggestions && result.suggestions.length > 0) {
        responseText += `**Suggestions**:\n`;
        result.suggestions.forEach(suggestion => {
          responseText += `• ${suggestion}\n`;
        });
        responseText += `\n`;
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

  /**
   * Get ChromaDB server status and health information
   */
  async getChromaDBStatus(args) {
    try {
      const status = this.chromaDBLifecycle.getStatus();
      const healthStatus = await this.chromaDBLifecycle.getHealthStatus();
      
      let statusText = `**🔧 ChromaDB Server Status**\n\n`;
      
      // Server status
      statusText += `**Server Status**: ${status.isRunning ? '✅ Running' : status.isStarting ? '🔄 Starting' : status.isStopping ? '🛑 Stopping' : '❌ Stopped'}\n`;
      statusText += `**Host**: ${status.host}\n`;
      statusText += `**Port**: ${status.port}\n`;
      statusText += `**Data Directory**: ${status.dataDir}\n`;
      
      if (status.pid) {
        statusText += `**Process ID**: ${status.pid}\n`;
      }
      
      if (status.retryCount > 0) {
        statusText += `**Retry Count**: ${status.retryCount}/${status.maxRetries}\n`;
      }
      
      statusText += `\n`;
      
      // Health status
      statusText += `**Health Status**: ${healthStatus.status === 'healthy' ? '✅ Healthy' : healthStatus.status === 'unhealthy' ? '⚠️ Unhealthy' : '❌ Error'}\n`;
      
      if (healthStatus.lastCheck) {
        statusText += `**Last Health Check**: ${healthStatus.lastCheck.timestamp}\n`;
        if (healthStatus.lastCheck.statusCode) {
          statusText += `**HTTP Status**: ${healthStatus.lastCheck.statusCode}\n`;
        }
        if (healthStatus.lastCheck.error) {
          statusText += `**Error**: ${healthStatus.lastCheck.error}\n`;
        }
      }
      
      if (healthStatus.reason) {
        statusText += `**Reason**: ${healthStatus.reason}\n`;
      }
      
      statusText += `\n`;
      
      // Configuration
      statusText += `**Configuration**\n`;
      statusText += `• Auto-restart: ${this.chromaDBLifecycle.options.enableAutoRestart ? 'Enabled' : 'Disabled'}\n`;
      statusText += `• Health check interval: ${this.chromaDBLifecycle.options.healthCheckInterval}ms\n`;
      statusText += `• Startup timeout: ${this.chromaDBLifecycle.options.startupTimeout}ms\n`;
      statusText += `• Max retries: ${this.chromaDBLifecycle.options.maxRetries}\n\n`;
      
      // Instructions
      statusText += `**Management**\n`;
      statusText += `• Use \`restart_chromadb_forest\` to restart the server\n`;
      statusText += `• ChromaDB starts automatically with Forest and shuts down when Forest stops\n`;
      statusText += `• Server will auto-restart on failures if enabled`;
      
      return {
        content: [{ type: 'text', text: statusText }],
        server_status: status,
        health_status: healthStatus,
        success: true
      };
      
    } catch (error) {
      console.error('ChromaDB status check failed:', error);
      return {
        content: [{
          type: 'text',
          text: `❌ **ChromaDB Status Check Failed**\n\nError: ${error.message}\n\nChromaDB may not be properly initialized.`
        }],
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Restart ChromaDB server
   */
  async restartChromaDB(args) {
    try {
      let statusText = `**🔄 Restarting ChromaDB Server...**\n\n`;
      
      const initialStatus = this.chromaDBLifecycle.getStatus();
      statusText += `**Initial Status**: ${initialStatus.isRunning ? 'Running' : 'Stopped'}\n`;
      statusText += `**Port**: ${initialStatus.port}\n\n`;
      
      // Perform restart
      const restartResult = await this.chromaDBLifecycle.restart();
      
      const finalStatus = this.chromaDBLifecycle.getStatus();
      
      statusText += `**Restart Result**: ✅ Success\n`;
      statusText += `**Final Status**: ${finalStatus.isRunning ? '✅ Running' : '⚠️ Not Running'}\n`;
      statusText += `**Process ID**: ${finalStatus.pid || 'Unknown'}\n`;
      statusText += `**Port**: ${finalStatus.port}\n\n`;
      
      if (restartResult && restartResult.status) {
        statusText += `**Details**: ${restartResult.status}\n\n`;
      }
      
      statusText += `**Next Steps**\n`;
      statusText += `• ChromaDB server has been restarted\n`;
      statusText += `• Vector operations should now work normally\n`;
      statusText += `• Use \`get_chromadb_status_forest\` to verify health\n`;
      statusText += `• Use \`get_vectorization_status_forest\` to check vectorization capabilities`;
      
      return {
        content: [{ type: 'text', text: statusText }],
        restart_result: restartResult,
        final_status: finalStatus,
        success: true
      };
      
    } catch (error) {
      console.error('ChromaDB restart failed:', error);
      return {
        content: [{
          type: 'text',
          text: `❌ **ChromaDB Restart Failed**\n\nError: ${error.message}\n\nThe server may need manual intervention or there could be a configuration issue.`
        }],
        error: error.message,
        success: false
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

  // ========== DIAGNOSTIC METHODS ==========

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

  async cleanup() {
    try {
      this.logger.info?.('[Stage1CoreServer] Starting cleanup...');

      // Stop background services
      try {
        this.htaExpansionAgent?.stop();
        this.backgroundProcessor?.stop();
      } catch (_) { /* ignore */ }

      // Gracefully shutdown ChromaDB server
      try {
        if (this.chromaDBLifecycle) {
          console.error('🛑 Stopping ChromaDB server...');
          await this.chromaDBLifecycle.stop();
          console.error('✅ ChromaDB server stopped');
        }
      } catch (error) {
        console.error('⚠️ ChromaDB shutdown failed:', error.message);
      }

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



// Note: MCP server startup is handled by dedicated entry points:
// - forest-mcp-server.js (direct entry point)  
// - start-server.js (with core-initialization.js)
