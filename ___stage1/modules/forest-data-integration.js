/**
 * Forest.Data Integration Module
 * Unified interface for vectorized and traditional data operations
 * Implements the hybrid approach for optimal performance
 */

import { ForestDataVectorization } from './forest-data-vectorization.js';
import { DataPersistence } from './data-persistence.js';
import { HTAVectorStore } from './hta-vector-store.js';
import path from 'path';
import os from 'os';

// Operation routing rules - determines when to use vectors vs JSON
const OPERATION_ROUTING = {
  // Always use vectors for semantic operations
  ALWAYS_VECTOR: [
    'semantic_search', 'similarity_matching', 'breakthrough_discovery',
    'cross_project_insights', 'adaptive_recommendations'
  ],
  
  // Always use JSON for fast metadata operations
  ALWAYS_JSON: [
    'simple_lookups', 'status_updates', 'completion_tracking',
    'basic_filtering', 'metadata_access'
  ],
  
  // Use hybrid approach (JSON first, then vector enhancement)
  HYBRID: [
    'task_recommendation', 'progress_analysis', 'learning_path_optimization'
  ]
};

class ForestDataIntegration {
  constructor(dataDir) {
    this.dataDir = dataDir || path.join(os.homedir(), '.forest-data');
    this.vectorization = new ForestDataVectorization(this.dataDir);
    this.dataPersistence = new DataPersistence(this.dataDir);
    this.vectorStore = new HTAVectorStore(this.dataDir);
    this.initialized = false;
    
    // Performance tracking
    this.operationMetrics = {
      vector_ops: { count: 0, total_time: 0 },
      json_ops: { count: 0, total_time: 0 },
      hybrid_ops: { count: 0, total_time: 0 }
    };
  }

  async initialize() {
    if (this.initialized) return;
    
    await this.vectorization.initialize();
    await this.dataPersistence.ensureDataDir();
    this.initialized = true;
    
    console.error('[ForestDataIntegration] Unified data layer initialized');
  }

  // ===== UNIFIED PROJECT OPERATIONS =====
  
  async createProject(projectData) {
    if (!this.initialized) await this.initialize();
    const startTime = Date.now();
    
    try {
      // Save core project data in JSON
      await this.dataPersistence.saveProjectData(projectData.id, 'config.json', {
        id: projectData.id,
        goal: projectData.goal,
        created_at: projectData.created_at || new Date().toISOString(),
        progress: 0,
        complexity: projectData.complexity,
        domain: projectData.domain
      });

      // Vectorize the project goal for semantic operations
      if (projectData.goal) {
        await this.vectorization.vectorizeProjectGoal(projectData.id, projectData);
      }

      this._trackOperation('hybrid_ops', startTime);
      return { success: true, project_id: projectData.id, vectorized: !!projectData.goal };

    } catch (error) {
      console.error('[ForestDataIntegration] Failed to create project:', error.message);
      throw error;
    }
  }

  async loadProject(projectId) {
    if (!this.initialized) await this.initialize();
    const startTime = Date.now();
    
    try {
      // Load basic project metadata from JSON (fast)
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
      if (!config) return null;

      // Load HTA data
      const htaData = await this.dataPersistence.loadProjectData(projectId, 'hta.json');
      
      // Check if project has been vectorized
      const goalMetadata = await this.dataPersistence.loadProjectData(projectId, 'goal_metadata.json');
      const isVectorized = goalMetadata?.vectorized || false;

      this._trackOperation('json_ops', startTime);
      
      return {
        ...config,
        hta_data: htaData,
        vectorized: isVectorized,
        last_vectorized: goalMetadata?.last_vectorized
      };

    } catch (error) {
      console.error(`[ForestDataIntegration] Failed to load project ${projectId}:`, error.message);
      throw error;
    }
  }

  async saveProjectData(projectId, data) {
    if (!this.initialized) await this.initialize();
    const startTime = Date.now();
    
    try {
      // Save HTA data to JSON
      if (data.hta_data) {
        await this.dataPersistence.saveProjectData(projectId, 'hta.json', data.hta_data);
      }

      // Update project config
      if (data.config) {
        await this.dataPersistence.saveProjectData(projectId, 'config.json', data.config);
      }

      // Auto-vectorize if data has changed significantly
      if (data.auto_vectorize !== false && data.hta_data) {
        await this.vectorization.bulkVectorizeProject(projectId);
      }

      this._trackOperation('hybrid_ops', startTime);
      return { success: true };

    } catch (error) {
      console.error(`[ForestDataIntegration] Failed to save project data for ${projectId}:`, error.message);
      throw error;
    }
  }

  // ===== INTELLIGENT TASK OPERATIONS =====
  
  async findNextTask(projectId, context = {}) {
    if (!this.initialized) await this.initialize();
    const startTime = Date.now();
    
    try {
      // Check if we have vectorized data for smart recommendations
      const goalMetadata = await this.dataPersistence.loadProjectData(projectId, 'goal_metadata.json');
      
      if (goalMetadata?.vectorized) {
        // Use adaptive vector-based recommendation
        const results = await this.vectorization.adaptiveTaskRecommendation(
          projectId,
          context.description || '',
          context.energy_level || 3,
          context.time_available || '30 minutes'
        );
        
        if (results.length > 0) {
          this._trackOperation('vector_ops', startTime);
          return this._formatTaskResult(results[0]);
        }
      }

      // Fallback to traditional approach
      const htaData = await this.dataPersistence.loadProjectData(projectId, 'hta.json');
      if (!htaData?.frontierNodes) return null;

      const availableTasks = htaData.frontierNodes.filter(task => !task.completed);
      if (availableTasks.length === 0) return null;

      // Simple heuristic: lowest priority, then lowest difficulty
      availableTasks.sort((a, b) => {
        const priorityDiff = (a.priority || 100) - (b.priority || 100);
        if (priorityDiff !== 0) return priorityDiff;
        return (a.difficulty || 3) - (b.difficulty || 3);
      });

      this._trackOperation('json_ops', startTime);
      return this._formatTaskResult({ metadata: availableTasks[0], enriched_metadata: availableTasks[0] });

    } catch (error) {
      console.error(`[ForestDataIntegration] Failed to find next task for ${projectId}:`, error.message);
      return null;
    }
  }

  async findSimilarTasks(projectId, query, options = {}) {
    if (!this.initialized) await this.initialize();
    const startTime = Date.now();
    
    try {
      const results = await this.vectorization.findSimilarTasks(projectId, query, options);
      this._trackOperation('vector_ops', startTime);
      
      return results.map(result => this._formatTaskResult(result));

    } catch (error) {
      console.error(`[ForestDataIntegration] Failed to find similar tasks:`, error.message);
      return [];
    }
  }

  async updateTaskCompletion(projectId, taskId, completed = true, learningOutcome = '') {
    if (!this.initialized) await this.initialize();
    const startTime = Date.now();
    
    try {
      // Update in JSON first (fast)
      const htaData = await this.dataPersistence.loadProjectData(projectId, 'hta.json');
      if (htaData?.frontierNodes) {
        const task = htaData.frontierNodes.find(t => t.id === taskId);
        if (task) {
          task.completed = completed;
          task.learning_outcome = learningOutcome;
          task.completed_at = completed ? new Date().toISOString() : null;
          
          await this.dataPersistence.saveProjectData(projectId, 'hta.json', htaData);
        }
      }

      // Update task metadata JSON
      const taskMetadata = await this.dataPersistence.loadProjectData(projectId, 'task_metadata.json');
      if (taskMetadata?.tasks) {
        const taskMeta = taskMetadata.tasks.find(t => t.id === taskId);
        if (taskMeta) {
          taskMeta.completed = completed;
          await this.dataPersistence.saveProjectData(projectId, 'task_metadata.json', taskMetadata);
        }
      }

      // Update vector store
      await this.vectorStore.updateTaskCompletion(projectId, taskId, completed, learningOutcome);

      this._trackOperation('hybrid_ops', startTime);
      return { success: true };

    } catch (error) {
      console.error(`[ForestDataIntegration] Failed to update task completion:`, error.message);
      throw error;
    }
  }

  // ===== LEARNING AND BREAKTHROUGH OPERATIONS =====
  
  async recordBreakthrough(projectId, breakthrough) {
    if (!this.initialized) await this.initialize();
    const startTime = Date.now();
    
    try {
      // Save to learning history (JSON)
      const learningHistory = await this.dataPersistence.loadProjectData(projectId, 'learning_history.json') || { events: [] };
      learningHistory.events.push({
        id: `breakthrough_${Date.now()}`,
        type: 'breakthrough',
        description: breakthrough.description,
        context: breakthrough.context,
        outcome: breakthrough.outcome,
        insights: breakthrough.insights,
        timestamp: new Date().toISOString(),
        breakthroughLevel: breakthrough.level || 'medium'
      });
      
      await this.dataPersistence.saveProjectData(projectId, 'learning_history.json', learningHistory);

      // Vectorize for future discovery
      await this.vectorization.vectorizeBreakthroughInsight(projectId, {
        id: learningHistory.events[learningHistory.events.length - 1].id,
        description: breakthrough.description,
        context: breakthrough.context,
        impact: breakthrough.outcome,
        impactLevel: breakthrough.level || 'medium',
        relatedTasks: breakthrough.relatedTasks || [],
        knowledgeDomain: breakthrough.domain || 'general',
        timestamp: new Date().toISOString()
      });

      this._trackOperation('hybrid_ops', startTime);
      return { success: true, breakthrough_id: learningHistory.events[learningHistory.events.length - 1].id };

    } catch (error) {
      console.error(`[ForestDataIntegration] Failed to record breakthrough:`, error.message);
      throw error;
    }
  }

  async findRelatedBreakthroughs(projectId, context, options = {}) {
    if (!this.initialized) await this.initialize();
    const startTime = Date.now();
    
    try {
      const results = await this.vectorization.findRelatedBreakthroughs(projectId, context, options);
      this._trackOperation('vector_ops', startTime);
      
      return results.map(result => ({
        id: result.metadata.insight_id,
        description: result.metadata.description,
        context: result.metadata.context,
        impact_level: result.metadata.impact_level,
        similarity: result.similarity,
        timestamp: result.metadata.timestamp
      }));

    } catch (error) {
      console.error(`[ForestDataIntegration] Failed to find related breakthroughs:`, error.message);
      return [];
    }
  }

  async findCrossProjectInsights(sourceProjectId, targetContext, options = {}) {
    if (!this.initialized) await this.initialize();
    const startTime = Date.now();
    
    try {
      const results = await this.vectorization.findCrossProjectInsights(sourceProjectId, targetContext, options);
      this._trackOperation('vector_ops', startTime);
      
      return results.map(result => ({
        project_id: result.metadata.project_id,
        description: result.metadata.description,
        context: result.metadata.context,
        impact_level: result.metadata.impact_level,
        similarity: result.similarity,
        knowledge_domain: result.metadata.knowledge_domain
      }));

    } catch (error) {
      console.error(`[ForestDataIntegration] Failed to find cross-project insights:`, error.message);
      return [];
    }
  }

  // ===== BULK OPERATIONS =====
  
  async migrateProjectToVector(projectId) {
    if (!this.initialized) await this.initialize();
    
    try {
      console.error(`[ForestDataIntegration] Migrating project ${projectId} to vectorized storage`);
      
      const results = await this.vectorization.bulkVectorizeProject(projectId);
      
      console.error(`[ForestDataIntegration] Migration completed for ${projectId}:`, results);
      return results;

    } catch (error) {
      console.error(`[ForestDataIntegration] Migration failed for ${projectId}:`, error.message);
      throw error;
    }
  }

  async getProjectAnalytics(projectId) {
    if (!this.initialized) await this.initialize();
    
    try {
      // Get basic stats from JSON
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
      const htaData = await this.dataPersistence.loadProjectData(projectId, 'hta.json');
      const taskMetadata = await this.dataPersistence.loadProjectData(projectId, 'task_metadata.json');
      
      // Get vector stats
      const vectorStats = await this.vectorStore.getProjectStats(projectId);
      
      // Calculate analytics
      const totalTasks = htaData?.frontierNodes?.length || 0;
      const completedTasks = htaData?.frontierNodes?.filter(t => t.completed)?.length || 0;
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      return {
        project_id: projectId,
        goal: config?.goal,
        created_at: config?.created_at,
        progress: Math.round(progress),
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        vectorized: taskMetadata?.last_vectorized ? true : false,
        vector_stats: vectorStats,
        last_updated: htaData?.lastUpdated
      };

    } catch (error) {
      console.error(`[ForestDataIntegration] Failed to get analytics for ${projectId}:`, error.message);
      return null;
    }
  }

  // ===== UTILITY METHODS =====
  
  _formatTaskResult(vectorResult) {
    const metadata = vectorResult.metadata || {};
    const enriched = vectorResult.enriched_metadata || {};
    
    return {
      id: metadata.task_id || enriched.id,
      title: metadata.title || enriched.title,
      description: metadata.description || enriched.description,
      branch: metadata.branch || enriched.branch,
      priority: enriched.priority || metadata.priority,
      difficulty: enriched.difficulty || metadata.difficulty,
      duration: enriched.duration || metadata.duration,
      prerequisites: enriched.prerequisites || metadata.prerequisites || [],
      completed: enriched.completed || metadata.completed || false,
      similarity: vectorResult.similarity,
      learning_objective: metadata.learning_objective
    };
  }

  _trackOperation(type, startTime) {
    const duration = Date.now() - startTime;
    this.operationMetrics[type].count++;
    this.operationMetrics[type].total_time += duration;
  }

  async getPerformanceMetrics() {
    const metrics = { ...this.operationMetrics };
    
    // Calculate averages
    for (const type of Object.keys(metrics)) {
      const ops = metrics[type];
      ops.avg_time = ops.count > 0 ? ops.total_time / ops.count : 0;
    }
    
    // Add vectorization stats
    const vectorStats = await this.vectorization.getVectorizationStats();
    
    return {
      operation_metrics: metrics,
      vectorization_stats: vectorStats,
      data_directory: this.dataDir
    };
  }

  async clearCaches() {
    await this.vectorization.clearVectorCache();
    await this.dataPersistence.clearCache();
    
    // Reset metrics
    this.operationMetrics = {
      vector_ops: { count: 0, total_time: 0 },
      json_ops: { count: 0, total_time: 0 },
      hybrid_ops: { count: 0, total_time: 0 }
    };
    
    console.error('[ForestDataIntegration] All caches cleared and metrics reset');
  }

  // Check if project is using vectorized storage
  async isProjectVectorized(projectId) {
    try {
      const goalMetadata = await this.dataPersistence.loadProjectData(projectId, 'goal_metadata.json');
      return goalMetadata?.vectorized || false;
    } catch (error) {
      return false;
    }
  }

  // Get recommendation on whether to vectorize a project
  async getVectorizationRecommendation(projectId) {
    try {
      const htaData = await this.dataPersistence.loadProjectData(projectId, 'hta.json');
      if (!htaData) return { recommend: false, reason: 'No HTA data found' };
      
      const taskCount = htaData.frontierNodes?.length || 0;
      const branchCount = htaData.strategicBranches?.length || 0;
      const complexity = htaData.complexity || 1;
      
      const score = taskCount * 0.4 + branchCount * 0.3 + complexity * 0.3;
      
      if (score >= 10) {
        return { recommend: true, reason: 'High complexity project would benefit from semantic search', score };
      } else if (score >= 5) {
        return { recommend: true, reason: 'Medium complexity project suitable for vectorization', score };
      } else {
        return { recommend: false, reason: 'Simple project, JSON operations sufficient', score };
      }
      
    } catch (error) {
      return { recommend: false, reason: `Analysis failed: ${error.message}` };
    }
  }
}

export { ForestDataIntegration, OPERATION_ROUTING };
