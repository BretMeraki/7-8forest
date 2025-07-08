/**
 * Task Strategy Core Module - Intelligent Task Strategy Management
 * Coordinates task selection, strategy evolution, and goal achievement with specialized engines
 */

import { GoalFocusedTaskSelector } from './goal-focused-task-selector.js';
import { TaskGeneratorEvolution } from './task-generator-evolution.js';
import { TaskBatchOptimizer } from './task-batch-optimizer.js';
import { HTAVectorStore } from './hta-vector-store.js';
import { GoalAchievementContext } from './goal-achievement-context.js';
import { TaskSelector } from '../../modules/task-logic/task-selector.js';
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
    
    // Initialize goal achievement context
    this.goalAchievementContext = null;
    
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
    // Initialize task formatter
    this.taskFormatter = new TaskFormatter();

  }

  /**
   * Get goal achievement context for pipeline generation
   */
  getGoalAchievementContext() {
    return this.goalAchievementContext || null;
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
      
      // AUTO-TRIGGER: Check if pipeline evolution is needed before task selection
      const shouldEvolvePipeline = await this.checkAutoPipelineEvolutionConditions(projectId, htaData, config);
      
      if (shouldEvolvePipeline.needsPipelineEvolution) {
        console.error('🤖 Auto-triggering pipeline evolution due to:', shouldEvolvePipeline.reason);
        try {
          // Trigger pipeline evolution via strategy evolution
          await this.evolveStrategy({
            feedback: `AUTO_PIPELINE_EVOLUTION: ${shouldEvolvePipeline.reason}`,
            project_id: projectId,
            path_name: config.activePath || 'general',
            auto_triggered: true,
            pipeline_focus: true
          });
          
          // Reload HTA data after evolution
          htaData = await this.loadHtaData(projectId, config.activePath);
        } catch (evolutionError) {
          console.error('Auto pipeline evolution failed:', evolutionError.message);
        }
      }
      
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
        text: 'ℹ️ Roadmap is in place but no actionable tasks were found. Use `build_hta_tree_forest` to generate tasks from the roadmap, or run `evolve_strategy_forest` to let the system suggest next steps.'
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
    let selectedTask = null;
    
    // Try vector-based selection first
    if (this.vectorStoreInitialized && await this.vectorStore.htaExists(projectId)) {
      try {
        selectedTask = await this.vectorStore.findNextTask(
          projectId,
          contextFromMemory,
          energyLevel,
          timeAvailable
        );
        
        if (selectedTask) {
          selectedTask.selection_method = 'vector';
          selectedTask.context_similarity = selectedTask.similarity;
          console.error(`[TaskStrategy] Selected task via vector intelligence: ${selectedTask.title || selectedTask.id}`);
        }
      } catch (error) {
        console.error('[TaskStrategy] Vector task selection failed:', error.message);
      }
    }
    
    // Fallback to traditional selection if vector failed
    if (!selectedTask) {
      selectedTask = TaskSelector.selectOptimalTask(
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
    }
    
    // Track task selection for pipeline evolution analysis
    if (selectedTask) {
      this.trackTaskSelection(projectId, selectedTask);
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

  /**
   * Check if automatic strategy evolution should be triggered
   * Implements Forest's documented evolution conditions for intelligent strategy adaptation
   */
  async checkAutoEvolutionConditions(block, projectId, config) {
    try {
      // Initialize tracking if not exists
      if (!this.evolutionTracking) {
        this.evolutionTracking = new Map();
      }
      
      const tracking = this.evolutionTracking.get(projectId) || {
        completionHistory: [],
        lastEvolution: null,
        patterns: {}
      };
      
      // Add current completion to history with enhanced data
      tracking.completionHistory.push({
        timestamp: Date.now(),
        difficulty: block.difficulty,
        breakthrough: block.breakthrough,
        learned: !!block.learned,
        learnedContent: block.learned || '',
        questions: !!block.nextQuestions,
        questionContent: block.nextQuestions || '',
        outcome: block.outcome || ''
      });
      
      // Keep only last 10 completions for pattern analysis
      if (tracking.completionHistory.length > 10) {
        tracking.completionHistory = tracking.completionHistory.slice(-10);
      }
      
      this.evolutionTracking.set(projectId, tracking);
      
      // CONDITION 1: Breakthrough Detection
      // Triggers when user reports or system detects significant learning breakthrough
      if (block.breakthrough) {
        console.error('🚀 Evolution trigger: Breakthrough detected');
        return {
          needsStrategyEvolution: true,
          reason: 'Breakthrough Detection - Major insight reported, escalating to advanced learning strategies'
        };
      }
      
      // Check for breakthrough keywords in learned content
      const learnedLower = (block.learned || '').toLowerCase();
      const breakthroughKeywords = ['breakthrough', 'major insight', 'significant progress', 'paradigm shift', 'everything clicked'];
      const hasBreakthroughKeywords = breakthroughKeywords.some(keyword => learnedLower.includes(keyword));
      
      if (hasBreakthroughKeywords) {
        console.error('🚀 Evolution trigger: Breakthrough keywords detected');
        return {
          needsStrategyEvolution: true,
          reason: 'Breakthrough Keywords - Learning content indicates significant breakthrough, upgrading strategy'
        };
      }
      
      // CONDITION 2: Rapid Progress Indication  
      // Pattern of 3+ consecutive easy completions with meaningful new learning
      const recentHistory = tracking.completionHistory.slice(-3);
      if (recentHistory.length >= 3) {
        const allEasy = recentHistory.every(h => h.difficulty <= 2);
        const allHaveMeaningfulLearning = recentHistory.every(h => h.learned && h.learnedContent.length > 50);
        
        if (allEasy && allHaveMeaningfulLearning) {
          console.error('📈 Evolution trigger: Rapid progress pattern detected');
          return {
            needsStrategyEvolution: true,
            reason: 'Rapid Progress - 3+ consecutive easy tasks with substantial learning, upgrading difficulty'
          };
        }
      }
      
      // CONDITION 3: Consistent Struggle Pattern
      // Pattern of 3+ consecutive difficult ratings indicates need for simplification
      if (recentHistory.length >= 3) {
        const allHard = recentHistory.every(h => h.difficulty >= 4);
        
        if (allHard) {
          console.error('📉 Evolution trigger: Consistent struggle pattern detected');
          return {
            needsStrategyEvolution: true,
            reason: 'Consistent Struggle - 3+ consecutive difficult tasks, simplifying approach'
          };
        }
      }
      
      // CONDITION 4: New Learning Areas Emerging
      // Multiple substantial "next questions" indicate expanding interests
      const hasSubstantialQuestions = block.nextQuestions && block.nextQuestions.length > 100;
      const recentQuestionsPattern = tracking.completionHistory.slice(-5).filter(h => h.questions && h.questionContent.length > 50).length >= 3;
      
      if (hasSubstantialQuestions && recentQuestionsPattern) {
        console.error('🌿 Evolution trigger: New learning areas emerging');
        return {
          needsStrategyEvolution: true,
          reason: 'New Learning Areas - Multiple substantial questions indicate interest expansion, adding branches'
        };
      }
      
      // CONDITION 5: Periodic Evolution
      // Ensures strategy evolves periodically even without specific triggers
      const now = Date.now();
      const twoWeeks = 14 * 24 * 60 * 60 * 1000;
      const hasRecentActivity = tracking.completionHistory.some(h => (now - h.timestamp) < twoWeeks);
      const lastEvolutionTooOld = !tracking.lastEvolution || (now - tracking.lastEvolution) > twoWeeks;
      
      if (hasRecentActivity && lastEvolutionTooOld && tracking.completionHistory.length >= 5) {
        tracking.lastEvolution = now; // Update to prevent immediate re-trigger
        this.evolutionTracking.set(projectId, tracking);
        
        console.error('⏰ Evolution trigger: Periodic evolution due');
        return {
          needsStrategyEvolution: true,
          reason: 'Periodic Evolution - 2+ weeks of activity without evolution, refreshing strategy'
        };
      }
      
      return { needsStrategyEvolution: false };
      
    } catch (error) {
      console.error('Auto evolution condition check failed:', error.message);
      return { needsStrategyEvolution: false };
    }
  }

  /**
   * Check if automatic pipeline evolution should be triggered
   * Implements Forest's documented pipeline evolution conditions for optimal task variety
   */
  async checkAutoPipelineEvolutionConditions(projectId, htaData, config) {
    try {
      // Initialize pipeline tracking if not exists
      if (!this.pipelineTracking) {
        this.pipelineTracking = new Map();
      }
      
      const tracking = this.pipelineTracking.get(projectId) || {
        taskSelectionHistory: [],
        lastPipelineEvolution: null,
        staleTaskWarnings: 0,
        repetitionCount: 0
      };
      
      const now = Date.now();
      const availableTasks = htaData.frontierNodes || [];
      
      // CONDITION 1: Stale Pipeline Detected
      // Same tasks being recommended repeatedly (repetition ratio > 2.5x)
      const recentSelections = tracking.taskSelectionHistory.slice(-5);
      
      if (recentSelections.length >= 3) {
        const uniqueTasks = new Set(recentSelections.map(s => s.taskId));
        const repetitionRatio = recentSelections.length / uniqueTasks.size;
        
        if (repetitionRatio >= 2.5) {
          console.error('🔄 Pipeline evolution trigger: Stale pipeline detected');
          return {
            needsPipelineEvolution: true,
            reason: 'Stale Pipeline - Same tasks recommended repeatedly (ratio: ' + repetitionRatio.toFixed(1) + 'x)'
          };
        }
      }
      
      // CONDITION 2: Task Variety Low
      // Fewer than 5 available tasks persisting over multiple checks
      if (availableTasks.length < 5 && availableTasks.length > 0) {
        tracking.staleTaskWarnings++;
        
        if (tracking.staleTaskWarnings >= 3) { // 3 consecutive warnings
          tracking.staleTaskWarnings = 0; // Reset counter
          this.pipelineTracking.set(projectId, tracking);
          
          console.error('📊 Pipeline evolution trigger: Low task variety persisting');
          return {
            needsPipelineEvolution: true,
            reason: 'Task Variety Low - Only ' + availableTasks.length + ' tasks available after 3 checks'
          };
        }
      } else {
        tracking.staleTaskWarnings = 0; // Reset if sufficient tasks
      }
      
      // CONDITION 3: Pipeline Aging
      // Pipeline hasn't been evolved in over a week despite sufficient activity
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      const lastEvolutionTooOld = !tracking.lastPipelineEvolution || 
                                  (now - tracking.lastPipelineEvolution) > oneWeek;
      
      if (lastEvolutionTooOld && tracking.taskSelectionHistory.length >= 5) {
        tracking.lastPipelineEvolution = now;
        this.pipelineTracking.set(projectId, tracking);
        
        console.error('⏰ Pipeline evolution trigger: Pipeline aging detected');
        return {
          needsPipelineEvolution: true,
          reason: 'Pipeline Aging - Over 1 week without refresh, ensuring freshness'
        };
      }
      
      // CONDITION 4: All Tasks Too Easy or Too Hard
      // Available tasks are uniformly inappropriate difficulty
      if (availableTasks.length > 0) {
        const taskDifficulties = availableTasks.map(task => task.difficulty || 3);
        const allEasy = taskDifficulties.every(d => d <= 2);
        const allHard = taskDifficulties.every(d => d >= 4);
        const avgDifficulty = taskDifficulties.reduce((sum, d) => sum + d, 0) / taskDifficulties.length;
        
        if (allEasy) {
          console.error('📉 Pipeline evolution trigger: All tasks too easy');
          return {
            needsPipelineEvolution: true,
            reason: 'All Tasks Too Easy - Average difficulty ' + avgDifficulty.toFixed(1) + ', need challenging options'
          };
        }
        
        if (allHard && availableTasks.length < 8) {
          console.error('📈 Pipeline evolution trigger: All tasks too difficult');
          return {
            needsPipelineEvolution: true,
            reason: 'All Tasks Too Hard - Average difficulty ' + avgDifficulty.toFixed(1) + ', need easier stepping stones'
          };
        }
      }
      
      // Update tracking
      this.pipelineTracking.set(projectId, tracking);
      
      return { needsPipelineEvolution: false };
      
    } catch (error) {
      console.error('Auto pipeline evolution condition check failed:', error.message);
      return { needsPipelineEvolution: false };
    }
  }

  /**
   * Track task selection for pipeline evolution analysis
   */
  trackTaskSelection(projectId, selectedTask) {
    if (!this.pipelineTracking) {
      this.pipelineTracking = new Map();
    }
    
    const tracking = this.pipelineTracking.get(projectId) || {
      taskSelectionHistory: [],
      lastPipelineEvolution: null,
      staleTaskWarnings: 0
    };
    
    tracking.taskSelectionHistory.push({
      timestamp: Date.now(),
      taskId: selectedTask.id,
      difficulty: selectedTask.difficulty || 3,
      selectionMethod: selectedTask.selection_method || 'unknown'
    });
    
    // Keep only last 10 selections
    if (tracking.taskSelectionHistory.length > 10) {
      tracking.taskSelectionHistory = tracking.taskSelectionHistory.slice(-10);
    }
    
    this.pipelineTracking.set(projectId, tracking);
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
      let config;
      if (!activeProjectId || !activePathName) {
        const info = await this.getActiveProjectInfo();
        activeProjectId = info.projectId;
        activePathName = info.config?.activePath || 'general';
        config = info.config;
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
      
      // Check for automatic strategy evolution conditions
      const shouldAutoEvolve = await this.checkAutoEvolutionConditions(block, activeProjectId, config);
      
      // Only evolve if there's actual learning content
      if (!block.learned && !block.nextQuestions && !block.breakthrough && !shouldAutoEvolve) {
        return {
          success: true,
          content: [{ type: 'text', text: `**Block Completed** ✅\n\nOutcome captured. No new learning items detected, so HTA evolution was skipped.` }]
        };
      }
      
      // Evolve HTA based on learning
      await this.taskGenerator.evolveHTABasedOnLearning(activeProjectId, activePathName, block);
      
      // AUTO-TRIGGER: Check if strategy evolution is needed
      if (shouldAutoEvolve.needsStrategyEvolution) {
        console.error('🤖 Auto-triggering strategy evolution due to:', shouldAutoEvolve.reason);
        try {
          await this.evolveStrategy({
            feedback: `AUTO_EVOLUTION: ${shouldAutoEvolve.reason}. ${block.learned || block.outcome}`,
            project_id: activeProjectId,
            path_name: activePathName,
            auto_triggered: true
          });
        } catch (evolutionError) {
          console.error('Auto strategy evolution failed:', evolutionError.message);
        }
      }
      
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
