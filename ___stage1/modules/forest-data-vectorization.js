/**
 * Forest.Data Vectorization Manager
 * Implements selective vectorization strategy for semantic operations
 * while maintaining JSON for fast metadata access
 */

import { HTAVectorStore } from './hta-vector-store.js';
import { DataPersistence } from './data-persistence.js';
import embeddingService from '../utils/embedding-service.js';
import vectorConfig from '../config/vector-config.js';
import { buildPrompt } from '../utils/hta-graph-enricher.js';
import path from 'path';
import os from 'os';

// Vector processing utilities
const VectorUtils = {
  normalize: (vector) => {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  },
  
  ensureArray: (data) => {
    if (Array.isArray(data)) return data;
    if (data.constructor === Float32Array || data.constructor === Float64Array) {
      return Array.from(data);
    }
    return Array.from(data);
  }
};

// Vectorization categories and their priorities
// Updated to use consistent dimensions for SQLite vector store
const VECTORIZATION_TYPES = {
  PROJECT_GOAL: { priority: 1, dimension: 1536, cache: true },
  HTA_BRANCH: { priority: 2, dimension: 1536, cache: true },
  TASK_CONTENT: { priority: 3, dimension: 1536, cache: true },
  LEARNING_HISTORY: { priority: 4, dimension: 1536, cache: false },
  USER_CONTEXT: { priority: 5, dimension: 1536, cache: false },
  BREAKTHROUGH_INSIGHT: { priority: 1, dimension: 1536, cache: true }
};

// Items to keep in JSON for fast access
const JSON_ONLY_FIELDS = [
  'id', 'created_at', 'updated_at', 'completed', 'priority',
  'difficulty', 'duration', 'prerequisites', 'progress',
  'status', 'path', 'configuration'
];

class ForestDataVectorization {
  constructor(dataDir) {
    this.dataDir = dataDir || path.join(os.homedir(), '.forest-data');
    this.vectorStore = new HTAVectorStore(this.dataDir);
    this.dataPersistence = new DataPersistence(this.dataDir);
    this.initialized = false;
    
    // Vector operation cache for performance
    this.operationCache = new Map();
    this.maxCacheSize = 1000;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      await this.vectorStore.initialize();
      await this.dataPersistence.ensureDataDir();
      
      // Test vector store integrity
      await this.testVectorStore();
      
      this.initialized = true;
      console.error('[ForestDataVectorization] Initialized with selective vectorization strategy');
    } catch (error) {
      console.error('[ForestDataVectorization] Initialization failed:', error.message);
      throw error;
    }
  }

  // ===== PROJECT GOAL VECTORIZATION =====
  
  async vectorizeProjectGoal(projectId, goalData) {
    if (!this.initialized) await this.initialize();
    
    const goalVector = await embeddingService.embedText(
      buildPrompt({
        type: 'goal',
        depth: 0,
        sibling_index: 0,
        prereq_count: 0,
        child_count: goalData.strategicBranches?.length || 0,
        raw: goalData.goal || ''
      }),
      VECTORIZATION_TYPES.PROJECT_GOAL.dimension
    );

    await this.vectorStore.provider.upsertVector(
      `${projectId}:goal`,
      goalVector,
      {
        type: 'goal',
        project_id: projectId,
        content: goalData.goal,
        complexity: goalData.complexity,
        domain: goalData.domain,
        estimated_duration: goalData.estimatedDuration,
        created_at: goalData.created_at || new Date().toISOString(),
        vectorization_type: 'PROJECT_GOAL'
      }
    );

    // Keep minimal metadata in JSON
    await this.dataPersistence.saveProjectData(projectId, 'goal_metadata.json', {
      id: projectId,
      goal: goalData.goal,
      complexity: goalData.complexity,
      created_at: goalData.created_at,
      vectorized: true,
      last_vectorized: new Date().toISOString()
    });

    return { vectorized: true, type: 'PROJECT_GOAL' };
  }

  // ===== HTA BRANCH VECTORIZATION =====
  
  async vectorizeHTABranches(projectId, branches) {
    if (!this.initialized) await this.initialize();
    const results = [];

    for (const [index, branch] of branches.entries()) {
      const branchVector = await embeddingService.embedText(
        buildPrompt({
          type: 'branch',
          depth: 1,
          sibling_index: index,
          prereq_count: 0,
          child_count: branch.tasks?.length || 0,
          raw: `${branch.name}: ${branch.description || ''}`,
          branch: branch.name
        }),
        VECTORIZATION_TYPES.HTA_BRANCH.dimension
      );

      await this.vectorStore.provider.upsertVector(
        `${projectId}:branch:${branch.name}`,
        branchVector,
        {
          type: 'branch',
          project_id: projectId,
          name: branch.name,
          description: branch.description,
          priority: branch.priority,
          strategic_importance: branch.strategicImportance,
          estimated_tasks: branch.tasks?.length || 0,
          vectorization_type: 'HTA_BRANCH'
        }
      );

      results.push({ name: branch.name, vectorized: true });
    }

    // Save branch metadata in JSON for fast access
    await this.dataPersistence.saveProjectData(projectId, 'branch_metadata.json', {
      branches: branches.map(b => ({
        name: b.name,
        priority: b.priority,
        task_count: b.tasks?.length || 0,
        vectorized: true
      })),
      last_vectorized: new Date().toISOString()
    });

    return results;
  }

  // ===== TASK CONTENT VECTORIZATION =====
  
  async vectorizeTaskContent(projectId, tasks) {
    if (!this.initialized) await this.initialize();
    const results = [];

    for (const [index, task] of tasks.entries()) {
      const taskVector = await embeddingService.embedText(
        buildPrompt({
          type: 'task',
          depth: 2,
          sibling_index: index,
          prereq_count: task.prerequisites?.length || 0,
          child_count: 0,
          raw: `${task.title}: ${task.description || ''}`,
          branch: task.branch || 'General'
        }),
        VECTORIZATION_TYPES.TASK_CONTENT.dimension
      );

      await this.vectorStore.provider.upsertVector(
        `${projectId}:task:${task.id}`,
        taskVector,
        {
          type: 'task',
          project_id: projectId,
          task_id: task.id,
          title: task.title,
          description: task.description,
          branch: task.branch || 'General',
          learning_objective: task.learningObjective,
          skill_tags: task.skillTags || [],
          vectorization_type: 'TASK_CONTENT'
        }
      );

      results.push({ id: task.id, vectorized: true });
    }

    // Save task metadata in JSON (non-vectorized fields)
    await this.dataPersistence.saveProjectData(projectId, 'task_metadata.json', {
      tasks: tasks.map(t => ({
        id: t.id,
        completed: t.completed,
        priority: t.priority,
        difficulty: t.difficulty,
        duration: t.duration,
        prerequisites: t.prerequisites,
        progress: t.progress,
        vectorized: true
      })),
      last_vectorized: new Date().toISOString()
    });

    return results;
  }

  // ===== LEARNING HISTORY VECTORIZATION =====
  
  async vectorizeLearningHistory(projectId, learningEvents) {
    if (!this.initialized) await this.initialize();
    const results = [];

    for (const event of learningEvents) {
      const eventVector = await embeddingService.embedText(
        `${event.type}: ${event.description} outcome: ${event.outcome}`,
        VECTORIZATION_TYPES.LEARNING_HISTORY.dimension
      );

      await this.vectorStore.provider.upsertVector(
        `${projectId}:learning:${event.id}`,
        eventVector,
        {
          type: 'learning_event',
          project_id: projectId,
          event_id: event.id,
          event_type: event.type,
          task_id: event.taskId,
          outcome: event.outcome,
          insights: event.insights,
          breakthrough_level: event.breakthroughLevel,
          timestamp: event.timestamp,
          vectorization_type: 'LEARNING_HISTORY'
        }
      );

      results.push({ id: event.id, vectorized: true });
    }

    return results;
  }

  // ===== BREAKTHROUGH INSIGHT VECTORIZATION =====
  
  async vectorizeBreakthroughInsight(projectId, insight) {
    if (!this.initialized) await this.initialize();

    const insightVector = await embeddingService.embedText(
      `breakthrough: ${insight.description} context: ${insight.context} impact: ${insight.impact}`,
      VECTORIZATION_TYPES.BREAKTHROUGH_INSIGHT.dimension
    );

    await this.vectorStore.provider.upsertVector(
      `${projectId}:breakthrough:${insight.id}`,
      insightVector,
      {
        type: 'breakthrough',
        project_id: projectId,
        insight_id: insight.id,
        description: insight.description,
        context: insight.context,
        impact_level: insight.impactLevel,
        related_tasks: insight.relatedTasks,
        knowledge_domain: insight.knowledgeDomain,
        timestamp: insight.timestamp,
        vectorization_type: 'BREAKTHROUGH_INSIGHT'
      }
    );

    return { vectorized: true, insight_id: insight.id };
  }

  // ===== SEMANTIC SEARCH OPERATIONS =====
  
  async findSimilarTasks(projectId, queryText, options = {}) {
    if (!this.initialized) await this.initialize();
    
    const cacheKey = `similar_tasks:${projectId}:${queryText}`;
    if (this.operationCache.has(cacheKey)) {
      this.cacheHits++;
      return this.operationCache.get(cacheKey);
    }

    try {
      const queryVector = await embeddingService.embedText(queryText, VECTORIZATION_TYPES.TASK_CONTENT.dimension);
      
      const results = await this.vectorStore.provider.queryVectors(queryVector, {
        limit: options.limit || 10,
        threshold: options.threshold || 0.1,
        filter: {
          must: [
            { key: 'project_id', match: { value: projectId } },
            { key: 'vectorization_type', match: { value: 'TASK_CONTENT' } }
          ]
        }
      });

      // Enrich with JSON metadata
      const enrichedResults = await this.enrichWithMetadata(results, 'task');
      
      this.cacheMisses++;
      this._cacheOperation(cacheKey, enrichedResults);
      return enrichedResults;
      
    } catch (error) {
      console.error('[ForestDataVectorization] Error in findSimilarTasks:', error.message);
      return [];
    }
  }

  async findRelatedBreakthroughs(projectId, context, options = {}) {
    if (!this.initialized) await this.initialize();

    const queryVector = await embeddingService.embedText(context, VECTORIZATION_TYPES.BREAKTHROUGH_INSIGHT.dimension);
    
    const results = await this.vectorStore.provider.queryVectors(queryVector, {
      limit: options.limit || 5,
      threshold: options.threshold || 0.15,
      filter: {
        must: [
          { key: 'project_id', match: { value: projectId } },
          { key: 'vectorization_type', match: { value: 'BREAKTHROUGH_INSIGHT' } }
        ]
      }
    });

    return await this.enrichWithMetadata(results, 'breakthrough');
  }

  async findCrossProjectInsights(sourceProjectId, targetContext, options = {}) {
    if (!this.initialized) await this.initialize();

    const queryVector = await embeddingService.embedText(targetContext, VECTORIZATION_TYPES.BREAKTHROUGH_INSIGHT.dimension);
    
    const results = await this.vectorStore.provider.queryVectors(queryVector, {
      limit: options.limit || 8,
      threshold: options.threshold || 0.2,
      filter: {
        must: [
          { key: 'vectorization_type', match: { value: 'BREAKTHROUGH_INSIGHT' } }
        ]
      }
    });

    // Filter out source project and enrich
    const crossProjectResults = results.filter(r => r.metadata.project_id !== sourceProjectId);
    return await this.enrichWithMetadata(crossProjectResults, 'breakthrough');
  }

  // ===== ADAPTIVE OPERATIONS =====
  
  async adaptiveTaskRecommendation(projectId, userContext, energyLevel, timeAvailable) {
    if (!this.initialized) await this.initialize();

    try {
      // Create context vector
      const contextQuery = `energy:${energyLevel} time:${timeAvailable} context:${userContext}`;
      const contextVector = await embeddingService.embedText(contextQuery, VECTORIZATION_TYPES.TASK_CONTENT.dimension);
      
      // Get project config to find active path
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
      if (!config) return [];
      
      const activePath = config.activePath || 'general';
      
      // Get task metadata for filtering - first try metadata file, then HTA data
      let taskMetadata = await this.dataPersistence.loadProjectData(projectId, 'task_metadata.json');
      if (!taskMetadata) {
        // Fallback: load directly from HTA data
        const htaData = await this.dataPersistence.loadPathData(projectId, activePath, 'hta.json');
        if (htaData && htaData.frontierNodes) {
          taskMetadata = { tasks: htaData.frontierNodes };
        }
      }
      
      if (!taskMetadata || !taskMetadata.tasks) return [];

      // Filter tasks by energy/time constraints first (JSON-based)
      const viableTasks = taskMetadata.tasks.filter(task => {
        if (task.completed) return false;
        
        const taskDifficulty = task.difficulty || 3;
        const energyMatch = Math.abs(taskDifficulty - energyLevel) <= 2;
        
        const timeMinutes = this.parseTimeToMinutes(timeAvailable);
        const taskDuration = this.parseTimeToMinutes(task.duration || '30 minutes');
        const timeMatch = taskDuration <= timeMinutes * 1.2;
        
        return energyMatch && timeMatch;
      });

      if (viableTasks.length === 0) return [];

      // Now use vector search on viable tasks
      const results = await this.vectorStore.provider.queryVectors(contextVector, {
        limit: Math.min(viableTasks.length, 5),
        threshold: 0.05,
        filter: {
          must: [
            { key: 'project_id', match: { value: projectId } },
            { key: 'vectorization_type', match: { value: 'TASK_CONTENT' } }
          ]
        }
      });

      // Filter to only viable tasks and enrich
      const viableTaskIds = new Set(viableTasks.map(t => t.id));
      const filteredResults = results.filter(r => viableTaskIds.has(r.metadata.task_id));
      
      return await this.enrichWithMetadata(filteredResults, 'task');
      
    } catch (error) {
      console.error('[ForestDataVectorization] Error in adaptiveTaskRecommendation:', error.message);
      return [];
    }
  }

  // ===== UTILITY METHODS =====
  
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
  
  async enrichWithMetadata(vectorResults, type) {
    const enriched = [];
    
    for (const result of vectorResults) {
      const projectId = result.metadata.project_id;
      let metadata = {};
      
      try {
        switch (type) {
          case 'task':
            // Try metadata file first, then fallback to HTA data
            let taskMetadata = await this.dataPersistence.loadProjectData(projectId, 'task_metadata.json');
            if (!taskMetadata) {
              // Fallback: load from HTA data
              const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
              if (config) {
                const activePath = config.activePath || 'general';
                const htaData = await this.dataPersistence.loadPathData(projectId, activePath, 'hta.json');
                if (htaData && htaData.frontierNodes) {
                  taskMetadata = { tasks: htaData.frontierNodes };
                }
              }
            }
            const task = taskMetadata?.tasks?.find(t => t.id === result.metadata.task_id);
            metadata = task || {};
            break;
          case 'breakthrough':
            // Breakthrough metadata is primarily in vector store
            metadata = result.metadata;
            break;
        }
      } catch (error) {
        console.error(`[ForestDataVectorization] Failed to enrich metadata for ${type}:`, error.message);
      }
      
      enriched.push({
        ...result,
        enriched_metadata: metadata
      });
    }
    
    return enriched;
  }

  parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 30;
    
    const timeStrLower = timeStr.toLowerCase();
    const minuteMatch = timeStrLower.match(/(\d+)\s*min/);
    if (minuteMatch) return parseInt(minuteMatch[1]);
    
    const hourMatch = timeStrLower.match(/(\d+)\s*hour/);
    if (hourMatch) return parseInt(hourMatch[1]) * 60;
    
    const numberMatch = timeStrLower.match(/(\d+)/);
    if (numberMatch) return parseInt(numberMatch[1]);
    
    return 30;
  }

  _cacheOperation(key, result) {
    if (this.operationCache.size >= this.maxCacheSize) {
      // Simple LRU: delete first entry
      const firstKey = this.operationCache.keys().next().value;
      this.operationCache.delete(firstKey);
    }
    this.operationCache.set(key, result);
  }

  /**
   * Test vector store integrity
   */
  async testVectorStore() {
    try {
      console.error('[ForestDataVectorization] Testing vector store integrity...');
      
      // Test basic operations
      if (this.vectorStore.provider.ping) {
        await this.vectorStore.provider.ping();
      }
      
      // Test vector operations with a simple test vector
      const testVector = new Array(1536).fill(0.1); // Standard dimension test vector
      const testId = `test_${Date.now()}`;
      
      try {
        // Try to add and query a test vector
        await this.vectorStore.provider.upsertVector(testId, testVector, {
          type: 'test',
          test_data: true
        });
        
        await this.vectorStore.provider.queryVectors(testVector, {
          limit: 1,
          threshold: 0.1
        });
        
        // Clean up test data
        await this.vectorStore.provider.deleteVector(testId);
        
        console.error('[ForestDataVectorization] ✅ Vector store integrity test passed');
        
      } catch (testError) {
        console.error('[ForestDataVectorization] ❌ Vector store test failed:', testError.message);
        throw testError;
      }
      
    } catch (error) {
      console.error('[ForestDataVectorization] Vector store test failed:', error.message);
      throw error;
    }
  }

  // ===== BULK OPERATIONS =====
  
  async bulkVectorizeProject(projectId) {
    if (!this.initialized) await this.initialize();
    
    console.error(`[ForestDataVectorization] Starting bulk vectorization for project: ${projectId}`);
    const results = { vectorized: 0, errors: 0, types: {} };

    try {
      // Load project configuration to get active path and goal
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
      if (!config) {
        throw new Error('No project configuration found');
      }

      const activePath = config.activePath || 'general';
      const projectGoal = config.goal;

      if (!projectGoal) {
        throw new Error('No goal found in project configuration');
      }

      // Vectorize project goal from config
      const goalData = {
        goal: projectGoal,
        complexity: this.assessGoalComplexity(projectGoal, config.context || ''),
        domain: this.extractDomain(projectGoal),
        estimatedDuration: config.estimated_duration || '3 months',
        created_at: config.created_at || new Date().toISOString()
      };

      await this.vectorizeProjectGoal(projectId, goalData);
      results.vectorized++;
      results.types.goals = 1;

      // Load HTA data from the active path
      const htaData = await this.dataPersistence.loadPathData(projectId, activePath, 'hta.json');
      if (htaData) {
        console.error(`[ForestDataVectorization] Found HTA data in path: ${activePath}`);

        // Vectorize branches
        if (htaData.strategicBranches?.length > 0) {
          const branchResults = await this.vectorizeHTABranches(projectId, htaData.strategicBranches);
          results.vectorized += branchResults.length;
          results.types.branches = branchResults.length;
        }

        // Vectorize tasks
        if (htaData.frontierNodes?.length > 0) {
          const taskResults = await this.vectorizeTaskContent(projectId, htaData.frontierNodes);
          results.vectorized += taskResults.length;
          results.types.tasks = taskResults.length;
        }
      } else {
        console.error(`[ForestDataVectorization] No HTA data found in path: ${activePath} (this is normal for new projects)`);
      }

      // Load and vectorize learning history if available
      const learningHistory = await this.dataPersistence.loadProjectData(projectId, 'learning_history.json');
      if (learningHistory?.events?.length > 0) {
        const learningResults = await this.vectorizeLearningHistory(projectId, learningHistory.events);
        results.vectorized += learningResults.length;
        results.types.learning_events = learningResults.length;
      }

      console.error(`[ForestDataVectorization] Bulk vectorization completed for ${projectId}:`, results);
      return results;

    } catch (error) {
      console.error(`[ForestDataVectorization] Bulk vectorization failed for ${projectId}:`, error.message);
      results.errors++;
      return results;
    }
  }

  async getVectorizationStats() {
    if (!this.initialized) await this.initialize();
    
    const stats = await this.vectorStore.getProjectStats('all');
    
    return {
      vector_store_stats: stats,
      cache_stats: {
        size: this.operationCache.size,
        max_size: this.maxCacheSize,
        hit_rate: this.cacheHits / (this.cacheHits + this.cacheMisses) * 100,
        hits: this.cacheHits,
        misses: this.cacheMisses
      },
      vectorization_types: VECTORIZATION_TYPES
    };
  }

  async clearVectorCache() {
    this.operationCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.error('[ForestDataVectorization] Vector operation cache cleared');
  }

  /**
   * Get vector store status
   */
  async getVectorStoreStatus() {
    const status = {
      vector_store_status: 'unknown',
      provider_type: this.vectorStore?.provider?.constructor?.name || 'unknown',
      last_test: null
    };
    
    try {
      // Test vector store connection
      await this.testVectorStore();
      status.vector_store_status = 'healthy';
      status.last_test = new Date().toISOString();
      
    } catch (error) {
      status.vector_store_status = 'error';
      status.error_message = error.message;
    }
    
    return status;
  }

  /**
   * Get vectorization status for a specific project
   */
  async getVectorizationStatus(projectId) {
    if (!this.initialized) await this.initialize();
    
    try {
      // Get project stats from vector store
      const vectorStats = await this.vectorStore.getProjectStats(projectId);
      
      // Get metadata from JSON files
      const goalMetadata = await this.dataPersistence.loadProjectData(projectId, 'goal_metadata.json');
      const branchMetadata = await this.dataPersistence.loadProjectData(projectId, 'branch_metadata.json');
      const taskMetadata = await this.dataPersistence.loadProjectData(projectId, 'task_metadata.json');
      
      const isVectorized = vectorStats.vectorCount > 0;
      const lastVectorized = Math.max(
        goalMetadata?.last_vectorized ? new Date(goalMetadata.last_vectorized).getTime() : 0,
        branchMetadata?.last_vectorized ? new Date(branchMetadata.last_vectorized).getTime() : 0,
        taskMetadata?.last_vectorized ? new Date(taskMetadata.last_vectorized).getTime() : 0
      );
      
      return {
        isVectorized,
        vectorCount: vectorStats.vectorCount || 0,
        lastUpdated: lastVectorized > 0 ? new Date(lastVectorized).toISOString() : null,
        breakdown: {
          goals: goalMetadata ? 1 : 0,
          branches: branchMetadata?.branches?.length || 0,
          tasks: taskMetadata?.tasks?.length || 0
        },
        vectorStoreStatus: await this.getVectorStoreStatus()
      };
      
    } catch (error) {
      console.error('[ForestDataVectorization] Error getting vectorization status:', error.message);
      return {
        isVectorized: false,
        vectorCount: 0,
        lastUpdated: null,
        error: error.message
      };
    }
  }

  /**
   * Vectorize project data (wrapper for bulkVectorizeProject)
   */
  async vectorizeProjectData(projectId) {
    if (!this.initialized) await this.initialize();
    
    try {
      const results = await this.bulkVectorizeProject(projectId);
      
      return {
        success: true,
        vectorCount: results.vectorized,
        dataTypes: Object.keys(results.types),
        breakdown: results.types,
        errors: results.errors
      };
      
    } catch (error) {
      console.error('[ForestDataVectorization] Error vectorizing project data:', error.message);
      return {
        success: false,
        error: error.message,
        vectorCount: 0
      };
    }
  }
}

export { ForestDataVectorization, VECTORIZATION_TYPES, JSON_ONLY_FIELDS };
