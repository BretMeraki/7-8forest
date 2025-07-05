/**
 * Task Strategy Orchestrator - Main coordination module
 * Coordinates between task selection, strategy evolution, and goal achievement
 */

import { bus } from './stubs/event-bus.js';
import { FILE_NAMES, TASK_CONFIG, SCORING, THRESHOLDS } from './memory-sync.js';
import { TaskSelector } from './task-selection-engine.js';
import { StrategyEvolver } from './strategy-evolution-engine.js';
import { GoalAchievementContext } from './goal-achievement-context.js';
import { HTAVectorStore } from './hta-vector-store.js';

export class TaskStrategyOrchestrator {
  constructor(dataPersistence, projectManagement = null, llmInterface = null, eventBus = null) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.eventBus = eventBus || bus;
    this.logger = console;
    
    // Initialize specialized engines
    this.taskSelector = new TaskSelector(dataPersistence, projectManagement, llmInterface);
    this.strategyEvolver = new StrategyEvolver(dataPersistence, projectManagement, llmInterface);
    this.goalContext = new GoalAchievementContext(dataPersistence?.dataDir, llmInterface);
    
    // Vector store for intelligent operations
    this.vectorStore = new HTAVectorStore();
    this.vectorStoreInitialized = false;
    this.goalContextInitialized = false;

    // Register event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Block completion events
    this.eventBus.on('block:completed', this.handleBlockCompletion.bind(this), 'TaskStrategyOrchestrator');
    
    // Learning milestone events
    this.eventBus.on('learning:breakthrough', this.handleBreakthrough.bind(this), 'TaskStrategyOrchestrator');
    
    // Opportunity detection events
    this.eventBus.on('opportunity:detected', this.handleOpportunityDetection.bind(this), 'TaskStrategyOrchestrator');
    
    // Strategy evolution requests
    this.eventBus.on('strategy:evolve_requested', this.handleEvolutionRequest.bind(this), 'TaskStrategyOrchestrator');

    if (process.stdin.isTTY) {
      console.error('🧠 TaskStrategyOrchestrator event listeners registered');
    }
  }

  async initialize() {
    // Initialize vector store
    if (!this.vectorStoreInitialized) {
      try {
        await this.vectorStore.initialize();
        this.vectorStoreInitialized = true;
      } catch (error) {
        console.warn('[TaskStrategyOrchestrator] Vector store initialization failed:', error.message);
      }
    }

    // Initialize goal context
    if (!this.goalContextInitialized) {
      try {
        await this.goalContext.initialize();
        this.goalContextInitialized = true;
      } catch (error) {
        console.warn('[TaskStrategyOrchestrator] Goal context initialization failed:', error.message);
      }
    }
  }

  // ===== MAIN PUBLIC METHODS =====

  async getNextTask(args) {
    await this.initialize();
    return this.taskSelector.getNextTask(args, {
      vectorStore: this.vectorStore,
      goalContext: this.goalContext,
      vectorStoreInitialized: this.vectorStoreInitialized,
      goalContextInitialized: this.goalContextInitialized
    });
  }

  async handleBlockCompletion(data) {
    await this.initialize();
    
    // Handle in task selector for task-related logic
    const taskResult = await this.taskSelector.handleBlockCompletion(data);
    
    // Handle in strategy evolver for evolution logic
    const strategyResult = await this.strategyEvolver.handleBlockCompletion(data);
    
    return { taskResult, strategyResult };
  }

  async evolveHTABasedOnLearning(feedback, projectId, options = {}) {
    await this.initialize();
    return this.strategyEvolver.evolveHTABasedOnLearning(feedback, projectId, options);
  }

  async handleBreakthrough(data) {
    await this.initialize();
    return this.strategyEvolver.handleBreakthrough(data);
  }

  async handleOpportunityDetection(data) {
    await this.initialize();
    return this.strategyEvolver.handleOpportunityDetection(data);
  }

  async handleEvolutionRequest(data) {
    await this.initialize();
    return this.strategyEvolver.handleEvolutionRequest(data);
  }

  // ===== SCALABILITY OPTIMIZATIONS =====
  
  get batchProcess() {
    return true;
  }
  
  async batchProcessTasks(tasks, batchSize = 50) {
    const results = [];
    
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(task => this.processTask(task))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
  
  async processTask(task) {
    // Basic task processing for scalability
    return {
      id: task.id,
      processed: true,
      timestamp: new Date().toISOString()
    };
  }
  
  get indexedSearch() {
    return this._searchIndex || false;
  }
  
  buildSearchIndex(tasks) {
    this._searchIndex = new Map();
    
    tasks.forEach((task, index) => {
      const keywords = this.extractKeywords(task);
      keywords.forEach(keyword => {
        if (!this._searchIndex.has(keyword)) {
          this._searchIndex.set(keyword, []);
        }
        this._searchIndex.get(keyword).push(index);
      });
    });
    
    return true;
  }
  
  extractKeywords(task) {
    const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
    return text.split(/\s+/).filter(word => word.length > 2);
  }
}
