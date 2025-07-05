/**
 * Task Strategy Core Module - Intelligent Task Strategy Management
 * Coordinates task selection, strategy evolution, and goal achievement with specialized engines
 */

import { GoalFocusedTaskSelector } from './goal-focused-task-selector.js';
import { TaskGeneratorEvolution } from './task-generator-evolution.js';
import { TaskBatchOptimizer } from './task-batch-optimizer.js';
import { HTAVectorStore } from './hta-vector-store.js';
import { GoalAchievementContext } from './goal-achievement-context.js';
import { TaskSelector } from './task-selection-engine.js';
import { TaskFormatter } from './task-formatter.js';
import { FILE_NAMES } from './memory-sync.js';
import { guard } from '../utils/hta-guard.js';

export class TaskStrategyCore {
  constructor(dataPersistence, projectManagement = null, llmInterface = null, eventBus = null, ambiguousDesiresManager = null) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.llmInterface = llmInterface;
    this.eventBus = eventBus;
    this.ambiguousDesiresManager = ambiguousDesiresManager;
    
    // Initialize specialized engines
    this.goalFocusedSelector = new GoalFocusedTaskSelector(dataPersistence);
    this.taskGenerator = new TaskGeneratorEvolution(dataPersistence, projectManagement, llmInterface, eventBus);
    this.batchOptimizer = new TaskBatchOptimizer();
    
    // Initialize vector store and goal context
    this.vectorStore = new HTAVectorStore();
    this.goalContext = new GoalAchievementContext(dataPersistence?.dataDir, llmInterface);
    this.vectorStoreInitialized = false;
    this.goalContextInitialized = false;
    
    // Initialize web context (stub for now)
    this.webContext = { refreshIfNeeded: async () => null };
    
    // Apply HTA guards for compatibility
    this.evolveHTABasedOnLearning = guard('evolveHTABasedOnLearning', this.evolveHTABasedOnLearning.bind(this));
    
    // Register event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    if (!this.eventBus) return;
    
    this.eventBus.on('block:completed', this.handleBlockCompletion.bind(this), 'TaskStrategyCore');
    this.eventBus.on('learning:breakthrough', this.handleBreakthrough.bind(this), 'TaskStrategyCore');
    this.eventBus.on('opportunity:detected', this.handleOpportunityDetection.bind(this), 'TaskStrategyCore');
    this.eventBus.on('strategy:evolve_requested', this.handleEvolutionRequest.bind(this), 'TaskStrategyCore');

    if (process.stdin.isTTY) {
      console.error('🧠 TaskStrategyCore event listeners registered');
    }
  }

  // ===== CORE TASK INTELLIGENCE FUNCTIONALITY =====

  async getNextTask(args) {
    const contextFromMemory = args.context_from_memory || args.contextFromMemory || '';
    const energyLevel = args.energy_level || args.energyLevel || 3;
    const timeAvailable = args.time_available || args.timeAvailable || '30 minutes';
    
    try {
      // Initialize systems
      await this.initializeSystems();
      
      // Get active project
      const { projectId, config } = await this.getActiveProjectInfo();
      
      // Check for ambiguous desires
      const ambiguousCheck = await this.checkAmbiguousDesires(config, contextFromMemory);
      if (ambiguousCheck) return ambiguousCheck;
      
      // Load HTA data
      const htaData = await this.loadHtaData(projectId, config.activePath);
      if (!htaData) {
        return this.handleNoHtaData();
      }
      
      // Try goal-focused task selection first
      const goalFocusedResult = await this.tryGoalFocusedSelection(projectId, htaData, config, args);
      if (goalFocusedResult) return goalFocusedResult;
      
      // Handle breakthrough context evolution
      await this.handleBreakthroughEvolution(contextFromMemory, projectId, config);
      
      // Select task using vector or traditional methods
      const selectedTask = await this.selectOptimalTask(projectId, htaData, energyLevel, timeAvailable, contextFromMemory, config);
      
      if (!selectedTask) {
        return {
          content: [{ type: 'text', text: '🤔 No suitable tasks found for your current energy level and time availability. Try adjusting your parameters or use `evolve_strategy` to generate new tasks.' }]
        };
      }
      
      // Format and return response
      return await this.formatTaskResponse(selectedTask, energyLevel, timeAvailable, config);
      
    } catch (error) {
      console.error('TaskStrategyCore.getNextTask failed:', error);
      return {
        content: [{ type: 'text', text: `**Task Selection Failed**\n\nError: ${error.message}\n\nPlease check your project configuration and try again.` }]
      };
    }
  }

  async initializeSystems() {
    // Initialize goal context
    if (!this.goalContextInitialized) {
      try {
        await this.goalContext.initialize();
        this.goalContextInitialized = true;
      } catch (error) {
        console.warn('[TaskStrategy] Goal context initialization failed:', error.message);
      }
    }
    
    // Initialize vector store
    if (!this.vectorStoreInitialized) {
      try {
        await this.vectorStore.initialize();
        this.vectorStoreInitialized = true;
      } catch (error) {
        console.warn('[TaskStrategy] Vector store initialization failed:', error.message);
      }
    }
  }

  async getActiveProjectInfo() {
    if (!this.projectManagement) {
      throw new Error('ProjectManagement not available in TaskStrategyCore');
    }
    
    const activeProject = await this.projectManagement.getActiveProject();
    if (!activeProject || !activeProject.project_id) {
      throw new Error('No active project found. Please create or switch to a project first.');
    }
    
    const projectId = activeProject.project_id;
    const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);
    if (!config) {
      const { ProjectConfigurationError } = await import('../errors.js');
      throw new ProjectConfigurationError(projectId, FILE_NAMES.CONFIG, null, { operation: 'getNextTask' });
    }
    
    return { projectId, config };
  }

  async checkAmbiguousDesires(config, contextFromMemory) {
    if (!this.ambiguousDesiresManager) return null;
    
    const goal = config.goal;
    const context = contextFromMemory || config.context || '';
    
    const goalClarity = await this.ambiguousDesiresManager.assessGoalClarity(goal, context);
    const evolution = await this.ambiguousDesiresManager.analyzeGoalEvolution(config.project_id);
    
    if (goalClarity.uncertaintyLevel > 0.7) {
      return {
        content: [{
          type: 'suggestion',
          text: "Your recent feedback suggests your goals may be unclear. Would you like to start a clarification dialogue to refine your learning path?",
          action: 'start_clarification_dialogue_forest',
          details: goalClarity.summary,
          recommendation: goalClarity.recommendation
        }],
        proactive: true
      };
    }
    
    if (evolution.pivotAnalysis?.recentPivots?.length > 0) {
      return {
        content: [{
          type: 'suggestion',
          text: "I've noticed you're exploring several new topics. To help focus your efforts, I recommend we evolve your strategy. Shall I proceed?",
          action: 'evolve_strategy_forest',
          details: evolution.pivotAnalysis,
          recommendation: evolution.recommendations?.[0] || ''
        }],
        proactive: true
      };
    }
    
    return null;
  }

  async loadHtaData(projectId, activePath) {
    const pathName = activePath || 'general';
    
    // Try vector store first
    if (this.vectorStoreInitialized && await this.vectorStore.htaExists(projectId)) {
      const htaData = await this.vectorStore.retrieveHTATree(projectId);
      console.error(`[TaskStrategy] Retrieved HTA from vector store for project ${projectId}`);
      return htaData;
    }
    
    // Fallback to traditional storage
    try {
      const htaData = await this.dataPersistence.loadPathData(projectId, pathName, FILE_NAMES.HTA);
      if (htaData) {
        console.error(`[TaskStrategy] Retrieved HTA from traditional storage for project ${projectId}`);
      }
      return htaData;
    } catch (error) {
      return null;
    }
  }

  handleNoHtaData() {
    return {
      content: [{
        type: 'text',
        text: 'ℹ️ Roadmap is in place but no actionable tasks were found. Use `generate_hta_tasks` to populate tasks from the roadmap, or run `evolve_strategy` to let the system suggest next steps.'
      }]
    };
  }

  async tryGoalFocusedSelection(projectId, htaData, config, args) {
    if (!this.goalContextInitialized) return null;
    
    try {
      const goalAchievementContext = await this.goalContext.buildGoalAchievementContext({
        project_id: projectId,
        context_from_memory: args.context_from_memory || '',
        energy_level: args.energy_level || 3,
        time_available: args.time_available || '30 minutes',
        ...args
      });
      
      if (goalAchievementContext && this.vectorStoreInitialized) {
        this.goalFocusedSelector.vectorStore = this.vectorStore;
        const goalFocusedResult = await this.goalFocusedSelector.selectGoalFocusedTaskBatch(
          projectId,
          htaData,
          goalAchievementContext,
          config
        );
        
        if (goalFocusedResult) {
          console.error('[TaskStrategy] Using goal-focused task batch selection');
          return goalFocusedResult;
        }
      }
    } catch (error) {
      console.warn('[TaskStrategy] Goal-focused selection failed:', error.message);
    }
    
    return null;
  }

  async handleBreakthroughEvolution(contextFromMemory, projectId, config) {
    const contextAnalysis = this.analyzeEvolutionContext(contextFromMemory);
    if (contextAnalysis.breakthrough) {
      try {
        await this.taskGenerator.evolveStrategy({
          feedback: `BREAKTHROUGH_CONTEXT: ${contextFromMemory}`,
          projectId,
          pathName: config.activePath
        });
      } catch (error) {
        console.warn('[TaskStrategy] Breakthrough evolution failed:', error.message);
      }
    }
  }

  async selectOptimalTask(projectId, htaData, energyLevel, timeAvailable, contextFromMemory, config) {
    // Try vector-based selection first
    if (this.vectorStoreInitialized && await this.vectorStore.htaExists(projectId)) {
      try {
        const selectedTask = await this.vectorStore.findNextTask(
          projectId,
          contextFromMemory,
          energyLevel,
          timeAvailable
        );
        
        if (selectedTask) {
          selectedTask.selection_method = 'vector';
          selectedTask.context_similarity = selectedTask.similarity;
          console.error(`[TaskStrategy] Selected task via vector intelligence: ${selectedTask.title || selectedTask.id}`);
          return selectedTask;
        }
      } catch (error) {
        console.error('[TaskStrategy] Vector task selection failed:', error.message);
      }
    }
    
    // Fallback to traditional selection
    const selectedTask = TaskSelector.selectOptimalTask(
      htaData,
      energyLevel,
      timeAvailable,
      contextFromMemory,
      config,
      config,
      null // reasoningAnalysis skipped for Stage1
    );
    
    if (selectedTask) {
      selectedTask.selection_method = 'traditional';
      console.error(`[TaskStrategy] Selected task via traditional selection: ${selectedTask.title}`);
    }
    
    return selectedTask;
  }

  async formatTaskResponse(selectedTask, energyLevel, timeAvailable, config) {
    const extSummary = await this.webContext.refreshIfNeeded(config.goal, selectedTask.title || '');
    const taskText = TaskFormatter.formatTaskResponse(selectedTask, energyLevel, timeAvailable);
    
    let selectionInfo = '';
    if (selectedTask.selection_method === 'vector') {
      const similarityScore = selectedTask.context_similarity ? 
        `(similarity: ${selectedTask.context_similarity.toFixed(3)})` : '';
      selectionInfo = `\n\n🧠 Selected using AI vectorized intelligence ${similarityScore}`;
    } else if (selectedTask.selection_method === 'traditional') {
      selectionInfo = '\n\n📋 Selected using traditional task prioritization';
    }
    
    const finalText = taskText + selectionInfo + (extSummary ? `\n\n🌐 External context used:\n${extSummary}` : '');
    
    return {
      content: [{ type: 'text', text: finalText }],
      selected_task: selectedTask,
      energy_level: energyLevel,
      time_available: timeAvailable,
      context_used: selectedTask.context_from_memory ? 'yes' : 'no',
      project_context: config,
      selection_method: selectedTask.selection_method || 'unknown'
    };
  }

  analyzeEvolutionContext(contextFromMemory) {
    if (!contextFromMemory) return { breakthrough: false, lifeChange: false, opportunity: false };
    
    const contextStr = typeof contextFromMemory === 'string' ? contextFromMemory : '';
    if (!contextStr) return { breakthrough: false, lifeChange: false, opportunity: false };

    const contextLower = contextStr.toLowerCase();

    return {
      breakthrough: contextLower.includes('breakthrough') || contextLower.includes('major insight') || contextLower.includes('significant progress'),
      lifeChange: contextLower.includes('life change') || contextLower.includes('new job') || contextLower.includes('career change'),
      opportunity: contextLower.includes('opportunity') || contextLower.includes('chance') || contextLower.includes('opening')
    };
  }

  // ===== BLOCK COMPLETION AND EVOLUTION =====

  async handleBlockCompletion(data) {
    try {
      const {
        block_id,
        outcome,
        energy_level,
        learned = '',
        next_questions = '',
        difficulty_rating = 3,
        breakthrough = false,
        projectId = null,
        pathName = null
      } = data;
      
      // Get project info if not provided
      let activeProjectId = projectId;
      let activePathName = pathName;
      if (!activeProjectId || !activePathName) {
        const { projectId: id, config } = await this.getActiveProjectInfo();
        activeProjectId = id;
        activePathName = config?.activePath || 'general';
      }
      
      const block = {
        id: block_id,
        title: block_id,
        outcome,
        energyLevel: energy_level,
        learned,
        nextQuestions: next_questions,
        difficulty: difficulty_rating,
        breakthrough: !!breakthrough
      };
      
      console.error(`🔄 TaskStrategyCore processing block completion: ${block.title || 'Unknown Block'}`);
      
      // Only evolve if there's actual learning content
      if (!block.learned && !block.nextQuestions && !block.breakthrough) {
        return {
          success: true,
          content: [{ type: 'text', text: `**Block Completed** ✅\n\nOutcome captured. No new learning items detected, so HTA evolution was skipped.` }]
        };
      }
      
      // Evolve HTA based on learning
      await this.taskGenerator.evolveHTABasedOnLearning(activeProjectId, activePathName, block);
      
      // Emit follow-up events
      if (block.breakthrough && this.eventBus) {
        this.eventBus.emit('learning:breakthrough', {
          projectId: activeProjectId,
          pathName: activePathName,
          block,
          breakthroughContent: block.learned
        }, 'TaskStrategyCore');
      }
      
      return {
        success: true,
        content: [{
          type: 'text',
          text: `**Block Completed** ✅\n\n` +
                `Outcome: ${outcome}\n` +
                `${learned ? `📚 Learned: ${learned}\n` : ''}` +
                `${next_questions ? `❓ Next Questions: ${next_questions}\n` : ''}` +
                `${breakthrough ? '🚀 Breakthrough detected; strategy updated!\n' : ''}` +
                `Use \`get_next_task_forest\` to continue.`
        }]
      };
      
    } catch (error) {
      console.error('❌ TaskStrategyCore failed to handle block completion:', error.message);
      return {
        success: false,
        content: [{ type: 'text', text: `**Block Completion Error** ❌\n\n${error.message}` }]
      };
    }
  }

  // ===== STRATEGY EVOLUTION DELEGATION =====

  async evolveHTABasedOnLearning(feedback, projectId, options = {}) {
    return this.taskGenerator.evolveHTABasedOnLearning(feedback, projectId, options);
  }

  async handleBreakthrough(data) {
    return this.taskGenerator.handleBreakthrough?.(data) || { success: true };
  }

  async handleOpportunityDetection(data) {
    return this.taskGenerator.handleOpportunityDetection?.(data) || { success: true };
  }

  async handleEvolutionRequest(data) {
    return this.taskGenerator.handleEvolutionRequest?.(data) || { success: true };
  }

  async evolveStrategy(args) {
    return this.taskGenerator.evolveStrategy(args);
  }

  // ===== SCALABILITY OPTIMIZATIONS - Delegate to BatchOptimizer =====
  
  get batchProcess() {
    return this.batchOptimizer.batchProcess;
  }
  
  async batchProcessTasks(tasks, batchSize = 50) {
    return this.batchOptimizer.batchProcessTasks(tasks, batchSize);
  }
  
  get indexedSearch() {
    return this.batchOptimizer.indexedSearch;
  }
  
  buildSearchIndex(tasks) {
    return this.batchOptimizer.buildSearchIndex(tasks);
  }
  
  extractKeywords(task) {
    return this.batchOptimizer.extractKeywords(task);
  }
}
