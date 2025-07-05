/**
 * Task Strategy Core Module - Lightweight Orchestrator
 * Coordinates between focused task selection and strategy evolution engines
 */

import { TaskStrategyOrchestrator } from './task-strategy-orchestrator.js';
import { guard } from '../utils/hta-guard.js';

export class TaskStrategyCore {
  constructor(dataPersistence, projectManagement = null, llmInterface = null, eventBus = null, ambiguousDesiresManager = null) {
    // Delegate to the orchestrator for all functionality
    this.orchestrator = new TaskStrategyOrchestrator(dataPersistence, projectManagement, llmInterface, eventBus);
    
    // Apply HTA guards for compatibility
    this.evolveHTABasedOnLearning = guard('evolveHTABasedOnLearning', this.evolveHTABasedOnLearning.bind(this));
  }

  // ===== PUBLIC API - Delegate to Orchestrator =====

  async getNextTask(args) {
    return this.orchestrator.getNextTask(args);
  }

  async handleBlockCompletion(data) {
    return this.orchestrator.handleBlockCompletion(data);
  }

  async evolveHTABasedOnLearning(feedback, projectId, options = {}) {
    return this.orchestrator.evolveHTABasedOnLearning(feedback, projectId, options);
  }

  async handleBreakthrough(data) {
    return this.orchestrator.handleBreakthrough(data);
  }

  async handleOpportunityDetection(data) {
    return this.orchestrator.handleOpportunityDetection(data);
  }

  async handleEvolutionRequest(data) {
    return this.orchestrator.handleEvolutionRequest(data);
  }

  // ===== SCALABILITY OPTIMIZATIONS - Delegate =====
  
  get batchProcess() {
    return this.orchestrator.batchProcess;
  }
  
  async batchProcessTasks(tasks, batchSize = 50) {
    return this.orchestrator.batchProcessTasks(tasks, batchSize);
  }
  
  get indexedSearch() {
    return this.orchestrator.indexedSearch;
  }
  
  buildSearchIndex(tasks) {
    return this.orchestrator.buildSearchIndex(tasks);
  }
  
  extractKeywords(task) {
    return this.orchestrator.extractKeywords(task);
  }
}
