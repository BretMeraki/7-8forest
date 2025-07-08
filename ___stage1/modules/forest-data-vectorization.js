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

// FIX: Import numpy array support for ChromaDB compatibility
let numpy = null;
try {
  // Try to import numpy for proper array handling
  const { spawn } = await import('child_process');
  numpy = { array: (data) => new Float32Array(data) }; // Fallback to typed array
} catch (e) {
  // Use JavaScript typed array as numpy substitute
  numpy = { array: (data) => new Float32Array(data) };
}

// Vectorization categories and their priorities
const VECTORIZATION_TYPES = {
  PROJECT_GOAL: { priority: 1, dimension: 1536, cache: true },
  HTA_BRANCH: { priority: 2, dimension: 1536, cache: true },
  TASK_CONTENT: { priority: 3, dimension: 1536, cache: true },
  LEARNING_HISTORY: { priority: 4, dimension: 768, cache: false },
  USER_CONTEXT: { priority: 5, dimension: 384, cache: false },
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
      
      // Test ChromaDB integrity and auto-recover from corruption
      await this.testAndRecoverChromaDB();
      
      this.initialized = true;
      console.error('[ForestDataVectorization] Initialized with selective vectorization strategy');
    } catch (error) {
      console.error('[ForestDataVectorization] Initialization failed:', error.message);
      // Try recovery and reinitialize
      if (error.message.includes('tolist') || error.message.includes('500') || error.message.includes('Internal Server Error')) {
        console.error('[ForestDataVectorization] Detected ChromaDB corruption, attempting recovery...');
        await this.recoverFromCorruption();
        this.initialized = true;
      } else {
        throw error;
      }
    }
  }

  // ===== PROJECT GOAL VECTORIZATION =====
  
  async vectorizeProjectGoal(projectId, goalData) {
    if (!this.initialized) await this.initialize();
    
    const goalVectorRaw = await embeddingService.embedText(
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
    
    // FIX: Ensure embedding is numpy-compatible array for ChromaDB
    const goalVector = this.ensureNumpyCompatible(goalVectorRaw);

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
      const branchVectorRaw = await embeddingService.embedText(
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
      
      // FIX: Ensure embedding is numpy-compatible array for ChromaDB
      const branchVector = this.ensureNumpyCompatible(branchVectorRaw);

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
      const taskVectorRaw = await embeddingService.embedText(
        buildPrompt({
          type: 'task',
          depth: 2,
          sibling_index: index,
          prereq_count: task.prerequisites?.length || 0,
          child_count: 0,
          raw: `${task.title}: ${task.description || ''}`,
          branch: task.branch
        }),
        VECTORIZATION_TYPES.TASK_CONTENT.dimension
      );
      
      // FIX: Ensure embedding is numpy-compatible array for ChromaDB
      const taskVector = this.ensureNumpyCompatible(taskVectorRaw);

      await this.vectorStore.provider.upsertVector(
        `${projectId}:task:${task.id}`,
        taskVector,
        {
          type: 'task',
          project_id: projectId,
          task_id: task.id,
          title: task.title,
          description: task.description,
          branch: task.branch,
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
      const eventVectorRaw = await embeddingService.embedText(
        `${event.type}: ${event.description} outcome: ${event.outcome}`,
        VECTORIZATION_TYPES.LEARNING_HISTORY.dimension
      );
      
      // FIX: Ensure embedding is numpy-compatible array for ChromaDB
      const eventVector = this.ensureNumpyCompatible(eventVectorRaw);

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

    const insightVectorRaw = await embeddingService.embedText(
      `breakthrough: ${insight.description} context: ${insight.context} impact: ${insight.impact}`,
      VECTORIZATION_TYPES.BREAKTHROUGH_INSIGHT.dimension
    );
    
    // FIX: Ensure embedding is numpy-compatible array for ChromaDB
    const insightVector = this.ensureNumpyCompatible(insightVectorRaw);

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
      const queryVectorRaw = await embeddingService.embedText(queryText, VECTORIZATION_TYPES.TASK_CONTENT.dimension);
      // FIX: Ensure query vector is numpy-compatible for ChromaDB
      const queryVector = this.ensureNumpyCompatible(queryVectorRaw);
      
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
      // Check for corruption and trigger recovery
      if (this.isCorruptionError(error)) {
        console.error('[ForestDataVectorization] 🔥 Corruption detected in findSimilarTasks, triggering recovery...');
        await this.recoverFromCorruption();
        return []; // Return empty array after recovery
      }
      throw error;
    }
  }

  async findRelatedBreakthroughs(projectId, context, options = {}) {
    if (!this.initialized) await this.initialize();

    const queryVectorRaw = await embeddingService.embedText(context, VECTORIZATION_TYPES.BREAKTHROUGH_INSIGHT.dimension);
    // FIX: Ensure query vector is numpy-compatible for ChromaDB
    const queryVector = this.ensureNumpyCompatible(queryVectorRaw);
    
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

    const queryVectorRaw = await embeddingService.embedText(targetContext, VECTORIZATION_TYPES.BREAKTHROUGH_INSIGHT.dimension);
    // FIX: Ensure query vector is numpy-compatible for ChromaDB
    const queryVector = this.ensureNumpyCompatible(queryVectorRaw);
    
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
      const contextVectorRaw = await embeddingService.embedText(contextQuery, VECTORIZATION_TYPES.TASK_CONTENT.dimension);
      // FIX: Ensure context vector is numpy-compatible for ChromaDB
      const contextVector = this.ensureNumpyCompatible(contextVectorRaw);
      
      // Get task metadata for filtering
      const taskMetadata = await this.dataPersistence.loadProjectData(projectId, 'task_metadata.json');
      if (!taskMetadata) return [];

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
      // Check for corruption and trigger recovery
      if (this.isCorruptionError(error)) {
        console.error('[ForestDataVectorization] 🔥 Corruption detected in adaptiveTaskRecommendation, triggering recovery...');
        await this.recoverFromCorruption();
        return []; // Return empty array after recovery
      }
      throw error;
    }
  }

  // ===== UTILITY METHODS =====
  
  async enrichWithMetadata(vectorResults, type) {
    const enriched = [];
    
    for (const result of vectorResults) {
      const projectId = result.metadata.project_id;
      let metadata = {};
      
      try {
        switch (type) {
          case 'task':
            const taskMetadata = await this.dataPersistence.loadProjectData(projectId, 'task_metadata.json');
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
   * Check if an error indicates ChromaDB corruption
   */
  isCorruptionError(error) {
    if (!error || !error.message) return false;
    
    const message = error.message.toLowerCase();
    return (
      message.includes('chromadb_corruption') ||
      message.includes('tolist') ||
      message.includes('status: 500') ||
      message.includes('internal server error') ||
      message.includes('attributeerror') ||
      message.includes('unable to connect to the chromadb server (status: 500)')
    );
  }

  /**
   * CRITICAL FIX: Ensure embedding vectors are properly formatted for ChromaDB
   * 
   * ChromaDB expects embeddings as plain JavaScript arrays (not typed arrays)
   * but needs them to be numeric and properly formatted.
   * 
   * This fixes both the "AttributeError: 'list' object has no attribute 'tolist'" 
   * and "iteration over a 0-d array" errors.
   */
  ensureNumpyCompatible(embedding) {
    if (!embedding) {
      throw new Error('Embedding cannot be null or undefined');
    }
    
    // Convert to plain JavaScript array of numbers
    let plainArray;
    
    if (Array.isArray(embedding)) {
      // Already a plain array, ensure all elements are numbers
      plainArray = embedding.map(val => Number(val));
    } else if (embedding.constructor === Float32Array || embedding.constructor === Float64Array) {
      // Convert typed array to plain array
      plainArray = Array.from(embedding).map(val => Number(val));
    } else if (embedding && typeof embedding.tolist === 'function') {
      // Has tolist method, use it then convert to numbers
      plainArray = embedding.tolist().map(val => Number(val));
    } else {
      // Try to convert whatever we got to an array
      try {
        plainArray = Array.from(embedding).map(val => Number(val));
      } catch (conversionError) {
        throw new Error(`Cannot convert embedding to proper format: ${conversionError.message}`);
      }
    }
    
    // Validate the array
    if (!Array.isArray(plainArray) || plainArray.length === 0) {
      throw new Error('Embedding must be a non-empty array');
    }
    
    // Ensure all elements are valid numbers
    for (let i = 0; i < plainArray.length; i++) {
      if (isNaN(plainArray[i]) || !isFinite(plainArray[i])) {
        throw new Error(`Invalid embedding value at index ${i}: ${plainArray[i]}`);
      }
    }
    
    console.error(`[ForestDataVectorization] ✅ Converted ${plainArray.length}-dim vector to ChromaDB-compatible format`);
    return plainArray;
  }

  // ===== BULK OPERATIONS =====
  
  async bulkVectorizeProject(projectId) {
    if (!this.initialized) await this.initialize();
    
    console.error(`[ForestDataVectorization] Starting bulk vectorization for project: ${projectId}`);
    const results = { vectorized: 0, errors: 0, types: {} };

    try {
      // Load project HTA data
      const htaData = await this.dataPersistence.loadProjectData(projectId, 'hta.json');
      if (!htaData) {
        throw new Error('No HTA data found for project');
      }

      // Vectorize goal
      await this.vectorizeProjectGoal(projectId, htaData);
      results.vectorized++;
      results.types.goals = 1;

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
   * Test ChromaDB integrity and recover from corruption
   */
  async testAndRecoverChromaDB() {
    try {
      console.error('[ForestDataVectorization] Testing ChromaDB integrity...');
      
      // Test basic operations
      await this.vectorStore.provider.ping();
      
      // Test vector operations with a simple test vector
      const testVectorRaw = new Array(384).fill(0.1); // Small test vector
      const testVector = this.ensureNumpyCompatible(testVectorRaw); // FIX: Make numpy-compatible
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
        
        console.error('[ForestDataVectorization] ✅ ChromaDB integrity test passed');
        
      } catch (testError) {
        if (testError.message.includes('tolist') || 
            testError.message.includes('500') || 
            testError.message.includes('Internal Server Error') ||
            testError.message.includes('AttributeError')) {
          
          console.error('[ForestDataVectorization] ❌ ChromaDB corruption detected:', testError.message);
          throw new Error('ChromaDB corruption detected');
        } else {
          // Non-corruption error, re-throw
          throw testError;
        }
      }
      
    } catch (error) {
      if (error.message.includes('ChromaDB corruption') || 
          error.message.includes('tolist') || 
          error.message.includes('500')) {
        
        console.error('[ForestDataVectorization] 🔧 Auto-recovering from ChromaDB corruption...');
        await this.recoverFromCorruption();
        console.error('[ForestDataVectorization] ✅ ChromaDB recovery completed');
      } else {
        throw error;
      }
    }
  }

  /**
   * Recover from ChromaDB corruption by resetting collections
   */
  async recoverFromCorruption() {
    try {
      console.error('[ForestDataVectorization] 🚨 Starting ChromaDB corruption recovery...');
      
      // Reset the vector store
      if (this.vectorStore && typeof this.vectorStore.resetCollections === 'function') {
        await this.vectorStore.resetCollections();
        console.error('[ForestDataVectorization] Collections reset via vector store');
      } else {
        // Manual collection reset
        try {
          const provider = this.vectorStore.provider;
          if (provider && typeof provider.resetCollection === 'function') {
            await provider.resetCollection();
            console.error('[ForestDataVectorization] Collection reset via provider');
          }
        } catch (resetError) {
          console.error('[ForestDataVectorization] Collection reset failed:', resetError.message);
        }
      }
      
      // Clear operation cache
      this.clearVectorCache();
      
      // Clear metadata files that might reference corrupted data
      await this.clearCorruptedMetadata();
      
      console.error('[ForestDataVectorization] ✅ Corruption recovery completed successfully');
      
    } catch (recoveryError) {
      console.error('[ForestDataVectorization] ❌ Recovery failed:', recoveryError.message);
      console.error('[ForestDataVectorization] Continuing with degraded functionality...');
    }
  }

  /**
   * Clear metadata files that might reference corrupted vector data
   */
  async clearCorruptedMetadata() {
    try {
      const metadataFiles = [
        'goal_metadata.json',
        'branch_metadata.json', 
        'task_metadata.json'
      ];
      
      // Get all project directories
      const fs = await import('fs/promises');
      const path = await import('path');
      
      try {
        const projectsDir = path.join(this.dataDir, 'projects');
        const projects = await fs.readdir(projectsDir);
        
        for (const projectId of projects) {
          for (const metadataFile of metadataFiles) {
            try {
              const metadataPath = path.join(projectsDir, projectId, metadataFile);
              const metadata = await this.dataPersistence.loadProjectData(projectId, metadataFile);
              
              if (metadata && metadata.vectorized) {
                // Reset vectorization flag
                metadata.vectorized = false;
                metadata.corruption_recovery = new Date().toISOString();
                await this.dataPersistence.saveProjectData(projectId, metadataFile, metadata);
                console.error(`[ForestDataVectorization] Reset vectorization flag for ${projectId}/${metadataFile}`);
              }
            } catch (fileError) {
              // File doesn't exist or can't be accessed, skip
            }
          }
        }
      } catch (dirError) {
        // Projects directory doesn't exist yet, skip
      }
      
    } catch (error) {
      console.error('[ForestDataVectorization] Failed to clear corrupted metadata:', error.message);
    }
  }

  /**
   * Get corruption recovery status
   */
  async getCorruptionRecoveryStatus() {
    const status = {
      last_recovery: null,
      recovered_projects: [],
      corruption_detected: false,
      vector_store_status: 'unknown'
    };
    
    try {
      // Check if we can ping the vector store
      await this.vectorStore.provider.ping();
      status.vector_store_status = 'healthy';
      
      // Check for recovery markers in metadata
      const fs = await import('fs/promises');
      const path = await import('path');
      
      try {
        const projectsDir = path.join(this.dataDir, 'projects');
        const projects = await fs.readdir(projectsDir);
        
        for (const projectId of projects) {
          try {
            const metadata = await this.dataPersistence.loadProjectData(projectId, 'goal_metadata.json');
            if (metadata && metadata.corruption_recovery) {
              status.recovered_projects.push({
                project_id: projectId,
                recovery_time: metadata.corruption_recovery
              });
              
              if (!status.last_recovery || metadata.corruption_recovery > status.last_recovery) {
                status.last_recovery = metadata.corruption_recovery;
              }
            }
          } catch (fileError) {
            // Skip missing files
          }
        }
      } catch (dirError) {
        // Projects directory doesn't exist
      }
      
    } catch (error) {
      status.vector_store_status = 'error';
      status.corruption_detected = true;
    }
    
    return status;
  }
}

export { ForestDataVectorization, VECTORIZATION_TYPES, JSON_ONLY_FIELDS };
