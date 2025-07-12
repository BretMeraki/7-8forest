/**
 * HTA Vector Knowledge Store
 * Persistent vector-based storage for HTA trees that survives data corruption
 * Uses embeddings to maintain task relationships and enable intelligent retrieval
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import * as vectorConfigModule from '../config/vector-config.js';
import IVectorProvider from './vector-providers/IVectorProvider.js';
import QdrantProvider from './vector-providers/QdrantProvider.js';
import ChromaDBProvider from './vector-providers/ChromaDBProvider.js';
import LocalJSONProvider from './vector-providers/LocalJSONProvider.js';
import SQLiteVecProvider from './vector-providers/SQLiteVecProvider.js';
import { enrichHTA, buildPrompt } from '../utils/hta-graph-enricher.js';
import embeddingService from '../utils/embedding-service.js';

const vectorConfig = vectorConfigModule.default || vectorConfigModule;

// Simple vector operations (in production, use a proper vector DB like ChromaDB/Pinecone)
class VectorStore {
  constructor(dataDir, options = {}) {
    this.dataDir = dataDir || path.join(os.homedir(), '.forest-data', 'vectors');
    this.vectors = new Map(); // In-memory cache
    this.metadata = new Map(); // Associated metadata
    this.initialized = false;
    
    // LRU cache management
    this.maxCacheSize = options.maxCacheSize || parseInt(process.env.VECTOR_CACHE_MAX) || 5000;
    this.cacheAccessOrder = new Map(); // Track access order for LRU
    this.accessCounter = 0;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadVectors();
      this.initialized = true;
      console.error('[HTA-Vector] Vector store initialized');
    } catch (error) {
      console.error('[HTA-Vector] Failed to initialize:', error.message);
      throw error;
    }
  }

  // Simple text-to-vector conversion (in production, use proper embeddings)
  textToVector(text, dimension = 512) {
    if (!text) return new Array(dimension).fill(0);
    
    // Simple hash-based vector generation
    const hash = this.simpleHash(text.toLowerCase());
    const vector = [];
    
    for (let i = 0; i < dimension; i++) {
      const seed = hash + i;
      vector.push(Math.sin(seed) * Math.cos(seed * 0.7) * Math.sin(seed * 1.3));
    }
    
    return this.normalize(vector);
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  normalize(vector) {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }
    
    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  async storeVector(id, vector, metadata = {}) {
    // Evict if cache is full
    this._evictIfNeeded();
    
    this.vectors.set(id, vector);
    this.metadata.set(id, {
      ...metadata,
      stored_at: new Date().toISOString(),
      id
    });
    
    // Update access tracking
    this._updateAccess(id);
    
    await this.persistVectors();
  }

  async queryVector(queryVector, limit = 10, threshold = 0.1) {
    const results = [];
    
    for (const [id, vector] of this.vectors.entries()) {
      // Update access tracking for queried vectors
      this._updateAccess(id);
      
      const similarity = this.cosineSimilarity(queryVector, vector);
      if (similarity >= threshold) {
        results.push({
          id,
          similarity,
          metadata: this.metadata.get(id),
          vector
        });
      }
    }
    
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async persistVectors() {
    try {
      const data = {
        vectors: Object.fromEntries(this.vectors),
        metadata: Object.fromEntries(this.metadata),
        version: '1.0.0',
        updated_at: new Date().toISOString()
      };
      
      const filePath = path.join(this.dataDir, 'hta_vectors.json');
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('[HTA-Vector] Failed to persist vectors:', error.message);
    }
  }

  async loadVectors() {
    try {
      const filePath = path.join(this.dataDir, 'hta_vectors.json');
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      
      this.vectors = new Map(Object.entries(data.vectors || {}));
      this.metadata = new Map(Object.entries(data.metadata || {}));
      
      console.error(`[HTA-Vector] Loaded ${this.vectors.size} vectors`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[HTA-Vector] Failed to load vectors:', error.message);
      }
    }
  }

  // LRU Cache Management Methods
  _evictIfNeeded() {
    if (this.vectors.size >= this.maxCacheSize) {
      // Find least recently used item
      let oldestId = null;
      let oldestAccess = Infinity;
      
      for (const [id, accessTime] of this.cacheAccessOrder.entries()) {
        if (accessTime < oldestAccess) {
          oldestAccess = accessTime;
          oldestId = id;
        }
      }
      
      if (oldestId) {
        this.vectors.delete(oldestId);
        this.metadata.delete(oldestId);
        this.cacheAccessOrder.delete(oldestId);
        console.warn(`[HTA-Vector] Evicted vector ${oldestId} from cache (LRU)`);
      }
    }
  }

  _updateAccess(id) {
    this.cacheAccessOrder.set(id, ++this.accessCounter);
  }

  getCacheStats() {
    return {
      size: this.vectors.size,
      maxSize: this.maxCacheSize,
      utilization: (this.vectors.size / this.maxCacheSize * 100).toFixed(2) + '%',
      accessCounter: this.accessCounter,
      oldestAccess: this.cacheAccessOrder.size > 0 ? Math.min(...this.cacheAccessOrder.values()) : null,
      newestAccess: this.cacheAccessOrder.size > 0 ? Math.max(...this.cacheAccessOrder.values()) : null,
    };
  }
}

function getProviderInstance(config) {
  // Try to use the configured primary provider
  if (config.provider === 'chroma') {
    try {
      console.error('[HTA-Vector] Initializing ChromaDB as primary provider');
      return new ChromaDBProvider(config.chroma);
    } catch (e) {
      console.error('[HTA-Vector] ChromaDBProvider init failed:', e && e.message ? e.message : e);
    }
  }
  
  if (config.provider === 'qdrant') {
    try {
      console.error('[HTA-Vector] Initializing Qdrant as primary provider');
      return new QdrantProvider(config.qdrant);
    } catch (e) {
      console.error('[HTA-Vector] QdrantProvider init failed:', e && e.message ? e.message : e);
    }
  }
  
  if (config.provider === 'sqlitevec') {
    try {
      console.error('[HTA-Vector] Initializing SQLite as primary provider');
      return new SQLiteVecProvider(config.sqlitevec);
    } catch (e) {
      console.error('[HTA-Vector] SQLiteVecProvider init failed:', e && e.message ? e.message : e);
    }
  }
  
  // Fallback to LocalJSON provider
  console.error('[HTA-Vector] Using LocalJSON fallback provider');
  return new LocalJSONProvider(config.localjson);
}

class HTAVectorStore {
  /**
   * @param {string} dataDir
   */
  constructor(dataDir) {
    this.config = vectorConfig;
    this.provider = getProviderInstance(this.config);
    this.projectVectors = new Map();
    this.initialized = false;
    this.dataDir = dataDir;
  }

  /**
   * Get the vector dimension for the currently configured provider
   * @returns {number} The dimension size for embeddings
   */
  getDimension() {
    const providerName = this.config.provider || 'sqlitevec';
    const dimension = this.config[providerName]?.dimension || 1536;
    return dimension;
  }

  async initialize() {
    const primaryName = this.provider?.constructor?.name || 'UnknownProvider';
    try {
      const initDetails = await this.provider.initialize(this.config[this.config.provider]);
      this.initialized = true;
      console.error('[HTA-Vector] Provider initialized:', primaryName);
      return {
        success: true,
        provider: primaryName,
        fallbackUsed: false,
        details: initDetails,
      };
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      console.error('[HTA-Vector] Provider failed, falling back to LocalJSONProvider:', msg);
      const fallbackProvider = new LocalJSONProvider(this.config.localjson);
      this.provider = fallbackProvider;
      const fallbackDetails = await fallbackProvider.initialize(this.config.localjson).catch(fallbackErr => {
        console.error('[HTA-Vector] Fallback provider failed as well:', fallbackErr?.message || fallbackErr);
        return { success: false, error: fallbackErr?.message || String(fallbackErr) };
      });
      this.initialized = true;
      return {
        success: true,
        provider: this.provider.constructor.name,
        fallbackUsed: true,
        error: msg,
        details: fallbackDetails,
      };
    }
  }

  /**
   * @param {string} projectId
   * @param {object} htaData
   */
  async storeHTATree(projectId, htaData) {
    if (!htaData || !htaData.frontierNodes) {
      throw new Error('Invalid HTA data structure');
    }

    // ---- constants ----
    const expectedTotal = 1 + // goal
      (htaData.strategicBranches ? htaData.strategicBranches.length : 0) +
      (htaData.frontierNodes ? htaData.frontierNodes.length : 0);
    const MAX_ATTEMPTS = 2;

    // Helper that writes the whole tree using the *current* provider instance
    const writeAllVectors = async () => {
      const vectors = [];

      // 1. Goal vector
      const goalVector = htaData.goal_embedding || await embeddingService.embedText(buildPrompt({
        type: 'goal', depth: 0, sibling_index: 0, prereq_count: 0,
        child_count: (htaData.strategicBranches?.length || htaData.frontierNodes?.length || 0),
        raw: htaData.goal || '',
      }), this.getDimension());

      await this.provider.upsertVector(`${projectId}:goal`, goalVector, {
        type: 'goal', project_id: projectId, content: htaData.goal,
        complexity: htaData.complexity, depth: 0,
      });

      // 2. Task vectors
      for (const task of htaData.frontierNodes) {
        const taskVector = task.embedding || await embeddingService.embedText(buildPrompt({
          type: 'task', depth: 2, sibling_index: 0,
          prereq_count: Array.isArray(task.prerequisites) ? task.prerequisites.length : 0,
          child_count: 0, raw: task.description || task.title || '', branch: task.branch,
        }), this.getDimension());

        await this.provider.upsertVector(`${projectId}:task:${task.id}`, taskVector, {
          type: 'task', project_id: projectId, task_id: task.id, title: task.title,
          description: task.description, branch: task.branch, priority: task.priority,
          difficulty: task.difficulty, duration: task.duration,
          prerequisites: task.prerequisites, prereq_count: Array.isArray(task.prerequisites) ? task.prerequisites.length : 0,
          learning_outcome: task.learningOutcome, completed: task.completed,
          generated: task.generated, depth: 2,
        });
        vectors.push({ id: task.id, vector: taskVector, metadata: { ...task } });
      }

      // 3. Branch vectors
      if (htaData.strategicBranches) {
        for (const branch of htaData.strategicBranches) {
          const branchVector = branch.embedding || await embeddingService.embedText(buildPrompt({
            type: 'branch', depth: 1, sibling_index: 0, prereq_count: 0,
            child_count: branch.tasks ? branch.tasks.length : 0,
            raw: branch.description || branch.name || '', branch: branch.name,
          }), this.getDimension());

          await this.provider.upsertVector(`${projectId}:branch:${branch.name}`, branchVector, {
            type: 'branch', project_id: projectId, name: branch.name,
            description: branch.description, priority: branch.priority,
            task_count: branch.tasks ? branch.tasks.length : 0, depth: 1,
          });
        }
      }

      // Persist if provider supports it
      if (typeof this.provider.flush === 'function') {
        await this.provider.flush();
      }
    };

    // Attempt writes + verification
    let attempts = 0;
    let verified = false;
    let lastError = null;

    while (!verified && attempts < MAX_ATTEMPTS) {
      attempts += 1;
      try {
        await writeAllVectors();
        const stats = await this.getProjectStats(projectId);
        verified = stats.total_vectors === expectedTotal;
        if (verified) {
          console.error(`[HTA-Vector] Stored ${stats.total_vectors}/${expectedTotal} vectors for project ${projectId} (provider ${this.provider.constructor.name})`);
          return { vectorsStored: stats.total_vectors, expected: expectedTotal, verified, attempts, provider: this.provider.constructor.name, fallbackUsed: false };
        }
        console.warn(`[HTA-Vector] Verification failed after attempt ${attempts}. Retrying...`);
      } catch (err) {
        lastError = err;
        console.error('[HTA-Vector] Write attempt failed:', err?.message || err);
      }
    }

    // ---- fallback to LocalJSONProvider ----
    if (!(this.provider instanceof LocalJSONProvider)) {
      console.warn('[HTA-Vector] Switching to fallback LocalJSONProvider');
      try {
        this.provider = new LocalJSONProvider(this.config.localjson);
        await this.provider.initialize(this.config.localjson);
        // Remove any partially written namespace (best-effort)
        await this.provider.deleteNamespace(`${projectId}:`).catch(() => {});

        await writeAllVectors();
        const stats = await this.getProjectStats(projectId);
        verified = stats.total_vectors === expectedTotal;
        if (verified) {
          return { vectorsStored: stats.total_vectors, expected: expectedTotal, verified, attempts: attempts + 1, provider: this.provider.constructor.name, fallbackUsed: true };
        }
      } catch (fallbackErr) {
        lastError = fallbackErr;
        console.error('[HTA-Vector] Fallback provider failed:', fallbackErr?.message || fallbackErr);
      }
    }

    // Final failure – throw with context
    throw new Error('Vector store verification failed: ' + (lastError?.message || 'unknown error'));
  }
/*

      type: 'goal',
      depth: 0,
      sibling_index: 0,
      prereq_count: 0,
      child_count: (htaData.strategicBranches?.length || htaData.frontierNodes?.length || 0),
      raw: htaData.goal || '',
    }), vectorConfig.qdrant.dimension);
    await this.provider.upsertVector(`${projectId}:goal`, goalVector, {
      type: 'goal',
      project_id: projectId,
      content: htaData.goal,
      complexity: htaData.complexity,
      depth: 0
    });
    // Store task vectors
    for (const task of htaData.frontierNodes) {
      const taskVector = task.embedding || await embeddingService.embedText(buildPrompt({
        type: 'task',
        depth: 2,
        sibling_index: 0,
        prereq_count: Array.isArray(task.prerequisites) ? task.prerequisites.length : 0,
        child_count: 0,
        raw: task.description || task.title || '',
        branch: task.branch,
      }), vectorConfig.qdrant.dimension);
      await this.provider.upsertVector(`${projectId}:task:${task.id}`, taskVector, {
        type: 'task',
        project_id: projectId,
        task_id: task.id,
        title: task.title,
        description: task.description,
        branch: task.branch,
        priority: task.priority,
        difficulty: task.difficulty,
        duration: task.duration,
        prerequisites: task.prerequisites,
        prereq_count: Array.isArray(task.prerequisites) ? task.prerequisites.length : 0,
        learning_outcome: task.learningOutcome,
        completed: task.completed,
        generated: task.generated,
        depth: 2
      });
      vectors.push({
        id: task.id,
        vector: taskVector,
        metadata: { ...task }
      });
    }
    // Store branch vectors
    if (htaData.strategicBranches) {
      for (const branch of htaData.strategicBranches) {
        const branchVector = branch.embedding || await embeddingService.embedText(buildPrompt({
          type: 'branch',
          depth: 1,
          sibling_index: 0,
          prereq_count: 0,
          child_count: branch.tasks ? branch.tasks.length : 0,
          raw: branch.description || branch.name || '',
          branch: branch.name,
        }), vectorConfig.qdrant.dimension);
        await this.provider.upsertVector(`${projectId}:branch:${branch.name}`, branchVector, {
          type: 'branch',
          project_id: projectId,
          name: branch.name,
          description: branch.description,
          priority: branch.priority,
          task_count: branch.tasks ? branch.tasks.length : 0,
          depth: 1
        });
      }
    }
*/
  async retrieveHTATree(projectId) {
    if (!projectId) throw new Error('retrieveHTATree: projectId required');
    if (!this.initialized) await this.initialize();

    const vectors = await this.provider.listVectors(`${projectId}:`);
    if (!vectors || vectors.length === 0) {
      return null;
    }

    let goalMeta = null;
    const tasks = [];
    const branchMap = new Map();

    for (const { id, vector, metadata } of vectors) {
      if (!metadata || typeof metadata !== 'object') continue;
      switch (metadata.type) {
        case 'goal':
          goalMeta = { ...metadata, goal_embedding: vector };
          break;
        case 'task': {
          const taskObj = {
            id: metadata.task_id || metadata.id || id.split(':').pop(),
            title: metadata.title,
            description: metadata.description,
            branch: metadata.branch,
            priority: metadata.priority,
            difficulty: metadata.difficulty,
            duration: metadata.duration,
            prerequisites: metadata.prerequisites,
            learningOutcome: metadata.learning_outcome,
            completed: metadata.completed,
            generated: metadata.generated,
            embedding: vector,
          };
          tasks.push(taskObj);
          break;
        }
        case 'branch': {
          branchMap.set(metadata.name, {
            name: metadata.name,
            description: metadata.description,
            priority: metadata.priority,
            task_count: metadata.task_count,
            embedding: vector,
            tasks: [],
          });
          break;
        }
      }
    }

    // Attach tasks to branches
    for (const task of tasks) {
      const branchName = task.branch || 'General';
      if (!branchMap.has(branchName)) {
        branchMap.set(branchName, {
          name: branchName,
          description: `Tasks related to ${branchName}`,
          priority: 1,
          tasks: [],
        });
      }
      branchMap.get(branchName).tasks.push(task);
    }

    const strategicBranches = Array.from(branchMap.values()).sort((a, b) => (a.priority || 0) - (b.priority || 0));

    const htaData = {
      project_id: projectId,
      goal: goalMeta ? goalMeta.content : '',
      complexity: goalMeta ? goalMeta.complexity : undefined,
      goal_embedding: goalMeta ? goalMeta.goal_embedding : undefined,
      frontierNodes: tasks,
      strategicBranches,
      retrieved_at: new Date().toISOString(),
    };

    return htaData;
  }

  async findGoalFocusedTaskBatch(projectId, goalQuery, recommendations, alignment, options = {}) {
    if (!this.initialized) await this.initialize();
    
    const batchSize = options.batchSize || 6;
    const maxBatchSize = options.maxBatchSize || 7;
    const minBatchSize = options.minBatchSize || 5;
    
    try {
      // Embed the goal-focused query
      const queryVector = await embeddingService.embedText(goalQuery, this.getDimension());
      
      // Enhanced filter for goal-focused task selection
      const filter = {
        must: [
          { key: 'project_id', match: { value: projectId } },
          { key: 'type', match: { value: 'task' } },
          { key: 'completed', match: { value: false } }
        ]
      };
      
      // Query vectors with goal-focused parameters - get more candidates for batch selection
      const results = await this.provider.queryVectors(queryVector, {
        limit: maxBatchSize * 3, // Get 3x candidates for better selection
        threshold: 0.03, // Lower threshold for more options
        filter
      });
      
      if (!results || results.length === 0) {
        console.warn('[HTA-Vector] No goal-focused batch results found');
        return [];
      }
      
      // Apply goal achievement filtering and ranking for batch
      const goalFocusedTasks = this.applyGoalAchievementBatchFiltering(
        results, 
        recommendations, 
        alignment,
        batchSize
      );
      
      if (goalFocusedTasks.length === 0) {
        console.warn('[HTA-Vector] No tasks passed goal achievement batch filtering');
        // Fallback to best matches within size constraints
        const fallbackSize = Math.min(results.length, maxBatchSize);
        return results.slice(0, fallbackSize).map(result => this.convertVectorResultToTask(result));
      }
      
      // Ensure we're within optimal batch size range
      const finalBatchSize = Math.max(minBatchSize, Math.min(goalFocusedTasks.length, maxBatchSize));
      const finalBatch = goalFocusedTasks.slice(0, finalBatchSize);
      
      return finalBatch;
      
    } catch (error) {
      console.error('[HTA-Vector] Goal-focused task batch selection failed:', error.message);
      return [];
    }
  }
  
  applyGoalAchievementBatchFiltering(results, recommendations, alignment, batchSize) {
    const candidateTasks = results
      .filter(result => result.metadata && !result.metadata.completed)
      .map(result => this.convertVectorResultToTask(result));
    
    // For batch selection, we want diversity in task types and difficulty levels
    const filteredTasks = this.createDiverseBatch(
      candidateTasks,
      recommendations,
      alignment,
      batchSize
    );
    
    // Rank by goal achievement potential and learning progression
    return filteredTasks.sort((a, b) => {
      // First, prioritize by optimal focus area match
      const aFocusMatch = this.matchesOptimalFocus(a, alignment?.optimal_focus_area);
      const bFocusMatch = this.matchesOptimalFocus(b, alignment?.optimal_focus_area);
      
      if (aFocusMatch && !bFocusMatch) return -1;
      if (!aFocusMatch && bFocusMatch) return 1;
      
      // Then by difficulty for progressive learning (easier first)
      const aDifficulty = a.difficulty || 3;
      const bDifficulty = b.difficulty || 3;
      
      if (Math.abs(aDifficulty - bDifficulty) > 1) {
        return aDifficulty - bDifficulty;
      }
      
      // Finally by similarity score
      return (b.similarity || 0) - (a.similarity || 0);
    }).slice(0, batchSize);
  }
  
  createDiverseBatch(candidateTasks, recommendations, alignment, batchSize) {
    // Create a diverse batch with different difficulty levels and branches
    const batch = [];
    const usedBranches = new Set();
    const difficultyDistribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };
    
    // Target distribution for optimal learning progression (5-7 tasks)
    const targetDistribution = {
      1: Math.max(1, Math.ceil(batchSize * 0.3)), // 30% easy (at least 1)
      2: Math.max(1, Math.ceil(batchSize * 0.3)), // 30% easy-medium (at least 1)
      3: Math.max(1, Math.ceil(batchSize * 0.3)), // 30% medium (at least 1)
      4: Math.ceil(batchSize * 0.1), // 10% hard
      5: Math.ceil(batchSize * 0.1)  // 10% very hard
    };
    
    // Sort candidates by goal alignment and similarity
    const sortedCandidates = candidateTasks.sort((a, b) => {
      const aAlignment = this.calculateTaskGoalAlignment(a, alignment);
      const bAlignment = this.calculateTaskGoalAlignment(b, alignment);
      return bAlignment - aAlignment;
    });
    
    // Select tasks to meet diversity criteria
    for (const task of sortedCandidates) {
      if (batch.length >= batchSize) break;
      
      const difficulty = task.difficulty || 3;
      const branch = task.branch || 'General';
      
      // Check if we need more tasks of this difficulty level
      if (difficultyDistribution[difficulty] < targetDistribution[difficulty]) {
        // Prefer diversity in branches, but don't require it
        if (!usedBranches.has(branch) || batch.length < 3) {
          batch.push(task);
          usedBranches.add(branch);
          difficultyDistribution[difficulty]++;
        }
      }
    }
    
    // Fill remaining spots with best remaining candidates
    for (const task of sortedCandidates) {
      if (batch.length >= batchSize) break;
      if (!batch.find(t => t.id === task.id)) {
        batch.push(task);
      }
    }
    
    return batch;
  }
  
  calculateTaskGoalAlignment(task, alignment) {
    let score = task.similarity || 0;
    
    // Boost score for optimal focus area match
    if (this.matchesOptimalFocus(task, alignment?.optimal_focus_area)) {
      score += 0.3;
    }
    
    // Boost score for goal advancement potential
    if (alignment?.goal_advancement_potential === 'high') {
      score += 0.2;
    }
    
    return score;
  }

  async findGoalFocusedTask(projectId, goalQuery, recommendations, alignment) {
    if (!this.initialized) await this.initialize();
    
    try {
      // Embed the goal-focused query
      const queryVector = await embeddingService.embedText(goalQuery, this.getDimension());
      
      // Enhanced filter for goal-focused task selection
      const filter = {
        must: [
          { key: 'project_id', match: { value: projectId } },
          { key: 'type', match: { value: 'task' } },
          { key: 'completed', match: { value: false } }
        ]
      };
      
      // Query vectors with goal-focused parameters
      const results = await this.provider.queryVectors(queryVector, {
        limit: 30, // More candidates for goal-focused selection
        threshold: 0.05, // Lower threshold for more options
        filter
      });
      
      if (!results || results.length === 0) {
        console.warn('[HTA-Vector] No goal-focused results found');
        return null;
      }
      
      // Apply goal achievement filtering and ranking
      const goalFocusedTasks = this.applyGoalAchievementFiltering(
        results, 
        recommendations, 
        alignment
      );
      
      if (goalFocusedTasks.length === 0) {
        console.warn('[HTA-Vector] No tasks passed goal achievement filtering');
        return this.convertVectorResultToTask(results[0]); // Fallback to best match
      }
      
      // Return top goal-focused task
      return goalFocusedTasks[0];
      
    } catch (error) {
      console.error('[HTA-Vector] Goal-focused task selection failed:', error.message);
      return null;
    }
  }
  
  applyGoalAchievementFiltering(results, recommendations, alignment) {
    const candidateTasks = results
      .filter(result => result.metadata && !result.metadata.completed)
      .map(result => this.convertVectorResultToTask(result));
    
    // Apply goal achievement criteria
    const filteredTasks = candidateTasks.filter(task => {
      // Task type alignment with recommendations
      if (recommendations?.immediate_action?.optimal_task_type) {
        const recommendedType = recommendations.immediate_action.optimal_task_type.type;
        const taskAligned = this.isTaskTypeAligned(task, recommendedType);
        if (!taskAligned) return false;
      }
      
      // Duration alignment with recommendations
      if (recommendations?.immediate_action?.duration) {
        const recommendedDuration = recommendations.immediate_action.duration.duration_minutes;
        const taskDuration = this.parseTimeToMinutes(task.duration || '30 minutes');
        const durationMatch = Math.abs(taskDuration - recommendedDuration) <= 15; // 15 min tolerance
        if (!durationMatch) return false;
      }
      
      // Difficulty/intensity alignment
      if (recommendations?.immediate_action?.intensity) {
        const recommendedIntensity = recommendations.immediate_action.intensity.intensity;
        const taskIntensityAligned = this.isIntensityAligned(task, recommendedIntensity);
        if (!taskIntensityAligned) return false;
      }
      
      return true;
    });
    
    // Rank by goal achievement potential
    return filteredTasks.sort((a, b) => {
      // Prioritize tasks that match optimal focus area
      const aFocusMatch = this.matchesOptimalFocus(a, alignment?.optimal_focus_area);
      const bFocusMatch = this.matchesOptimalFocus(b, alignment?.optimal_focus_area);
      
      if (aFocusMatch && !bFocusMatch) return -1;
      if (!aFocusMatch && bFocusMatch) return 1;
      
      // Then by similarity score
      return (b.similarity || 0) - (a.similarity || 0);
    });
  }
  
  convertVectorResultToTask(result) {
    return {
      id: result.metadata.task_id || result.id.split(':').pop(),
      title: result.metadata.title,
      description: result.metadata.description,
      branch: result.metadata.branch,
      priority: result.metadata.priority,
      difficulty: result.metadata.difficulty,
      duration: result.metadata.duration,
      prerequisites: result.metadata.prerequisites,
      learningOutcome: result.metadata.learning_outcome,
      completed: result.metadata.completed,
      generated: result.metadata.generated,
      similarity: result.similarity,
      embedding: result.vector
    };
  }
  
  isTaskTypeAligned(task, recommendedType) {
    // Map recommended types to task characteristics
    const typeMap = {
      'breakthrough_attempt': ['challenging', 'advanced', 'complex'],
      'momentum_building': ['substantial', 'significant', 'major'],
      'steady_progress': ['basic', 'fundamental', 'practice']
    };
    
    const keywords = typeMap[recommendedType] || [];
    const taskText = (task.title + ' ' + task.description).toLowerCase();
    
    return keywords.some(keyword => taskText.includes(keyword)) || recommendedType === 'steady_progress';
  }
  
  isIntensityAligned(task, recommendedIntensity) {
    const taskDifficulty = task.difficulty || 3;
    
    switch (recommendedIntensity) {
      case 'high':
        return taskDifficulty >= 4;
      case 'moderate':
        return taskDifficulty >= 2 && taskDifficulty <= 4;
      case 'low':
        return taskDifficulty <= 2;
      default:
        return true;
    }
  }
  
  matchesOptimalFocus(task, optimalFocusArea) {
    if (!optimalFocusArea) return false;
    
    const taskText = (task.title + ' ' + task.description + ' ' + (task.branch || 'General')).toLowerCase();
    const focusArea = optimalFocusArea.toLowerCase();
    
    // Check for direct matches or related terms
    return taskText.includes(focusArea) || 
           (task.branch || 'General').toLowerCase().includes(focusArea) ||
           this.areConceptsRelated(taskText, focusArea);
  }
  
  areConceptsRelated(taskText, focusArea) {
    // Simple concept relationship mapping
    const relations = {
      'react': ['component', 'jsx', 'frontend', 'ui'],
      'backend': ['api', 'server', 'database', 'node'],
      'javascript': ['js', 'programming', 'coding', 'development'],
      'frontend': ['ui', 'interface', 'css', 'html', 'react'],
      'database': ['sql', 'data', 'storage', 'query']
    };
    
    const relatedTerms = relations[focusArea] || [];
    return relatedTerms.some(term => taskText.includes(term));
  }

  async findNextTask(projectId, context = '', energy_level = 3, time_available = '30 minutes') {
    if (!this.initialized) await this.initialize();
    
    // Build context query combining user context, energy level, and time constraints
    const contextQuery = `${context} energy_level:${energy_level} time_available:${time_available}`.trim();
    
    // Embed the context into a query vector
    const queryVector = await embeddingService.embedText(contextQuery, this.getDimension());
    
    // Query vectors with filter for this project and non-completed tasks
    const filter = {
      must: [
        { key: 'project_id', match: { value: projectId } },
        { key: 'type', match: { value: 'task' } },
        { key: 'completed', match: { value: false } }
      ]
    };
    
    try {
      // Use vector similarity search to find most relevant tasks
      const results = await this.provider.queryVectors(queryVector, {
        limit: 20, // Get more candidates for better selection
        threshold: 0.1, // Lower threshold to include more potential matches
        filter
      });
      
      if (!results || results.length === 0) {
        // Fallback to traditional approach if no vector results
        const htaData = await this.retrieveHTATree(projectId);
        if (!htaData) return null;
        const available = htaData.frontierNodes.filter(t => !t.completed);
        if (available.length === 0) return null;
        
        // Simple heuristic: lowest priority then lowest difficulty
        available.sort((a, b) => (a.priority || 0) - (b.priority || 0) || (a.difficulty || 0) - (b.difficulty || 0));
        return available[0];
      }
      
      // Convert vector results to task format and apply additional filtering
      const candidateTasks = results
        .filter(result => result.metadata && !result.metadata.completed)
        .map(result => ({
          id: result.metadata.task_id || result.id.split(':').pop(),
          title: result.metadata.title,
          description: result.metadata.description,
          branch: result.metadata.branch,
          priority: result.metadata.priority,
          difficulty: result.metadata.difficulty,
          duration: result.metadata.duration,
          prerequisites: result.metadata.prerequisites,
          learningOutcome: result.metadata.learning_outcome,
          completed: result.metadata.completed,
          generated: result.metadata.generated,
          similarity: result.similarity,
          embedding: result.vector
        }))
        .filter(task => {
          // Apply energy level filtering - match difficulty to energy
          const taskDifficulty = task.difficulty || 1;
          const energyMatch = Math.abs(taskDifficulty - energy_level) <= 2;
          
          // Apply time constraint filtering (rough heuristic)
          const timeMinutes = this.parseTimeToMinutes(time_available);
          const taskDuration = this.parseTimeToMinutes(task.duration || '30 minutes');
          const timeMatch = taskDuration <= timeMinutes * 1.5; // Allow some flexibility
          
          return energyMatch && timeMatch;
        });
      
      if (candidateTasks.length === 0) {
        // If no tasks match energy/time constraints, relax constraints and return best match
        const relaxedTasks = results
          .filter(result => result.metadata && !result.metadata.completed)
          .map(result => ({
            id: result.metadata.task_id || result.id.split(':').pop(),
            title: result.metadata.title,
            description: result.metadata.description,
            branch: result.metadata.branch,
            priority: result.metadata.priority,
            difficulty: result.metadata.difficulty,
            duration: result.metadata.duration,
            prerequisites: result.metadata.prerequisites,
            learningOutcome: result.metadata.learning_outcome,
            completed: result.metadata.completed,
            generated: result.metadata.generated,
            similarity: result.similarity,
            embedding: result.vector
          }));
        
        return relaxedTasks.length > 0 ? relaxedTasks[0] : null;
      }
      
      // Sort by similarity score (highest first) then by priority (lowest first)
      candidateTasks.sort((a, b) => {
        const similarityDiff = b.similarity - a.similarity;
        if (Math.abs(similarityDiff) > 0.05) return similarityDiff; // Prioritize significantly higher similarity
        return (a.priority || 0) - (b.priority || 0); // Then by priority
      });
      
      return candidateTasks[0];
      
    } catch (error) {
      console.error('[HTA-Vector] Vector search failed, falling back to traditional approach:', error.message);
      
      // Fallback to traditional approach
      const htaData = await this.retrieveHTATree(projectId);
      if (!htaData) return null;
      const available = htaData.frontierNodes.filter(t => !t.completed);
      if (available.length === 0) return null;
      
      // Simple heuristic: lowest priority then lowest difficulty
      available.sort((a, b) => (a.priority || 0) - (b.priority || 0) || (a.difficulty || 0) - (b.difficulty || 0));
      return available[0];
    }
  }
  
  // Helper method to parse time strings to minutes
  parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 30; // Default 30 minutes
    
    const timeStr_lower = timeStr.toLowerCase();
    const minuteMatch = timeStr_lower.match(/(\d+)\s*min/);
    if (minuteMatch) return parseInt(minuteMatch[1]);
    
    const hourMatch = timeStr_lower.match(/(\d+)\s*hour/);
    if (hourMatch) return parseInt(hourMatch[1]) * 60;
    
    const dayMatch = timeStr_lower.match(/(\d+)\s*day/);
    if (dayMatch) return parseInt(dayMatch[1]) * 8 * 60; // Assume 8 hour work day
    
    // Try to extract just numbers
    const numberMatch = timeStr_lower.match(/(\d+)/);
    if (numberMatch) return parseInt(numberMatch[1]);
    
    return 30; // Default fallback
  }

  async updateTaskCompletion(projectId, taskId, completed = true, learningOutcome = '') {
    if (!this.initialized) await this.initialize();
    const vectorId = `${projectId}:task:${taskId}`;
    const entries = await this.provider.listVectors(vectorId);
    if (!entries || entries.length === 0) return false;
    const entry = entries[0];
    const newMetadata = {
      ...entry.metadata,
      completed: !!completed,
      learning_outcome: learningOutcome || entry.metadata.learning_outcome,
    };
    await this.provider.upsertVector(vectorId, entry.vector, newMetadata);
    return true;
  }

  async htaExists(projectId) {
    if (!this.initialized) await this.initialize();
    const vectors = await this.provider.listVectors(`${projectId}:`);
    return Array.isArray(vectors) && vectors.length > 0;
  }

  async getProjectStats(projectId) {
    if (!this.initialized) await this.initialize();
    const vectors = await this.provider.listVectors(`${projectId}:`);
    const total = vectors.length;
    const completed = vectors.filter(v => v.metadata && v.metadata.type === 'task' && v.metadata.completed).length;
    return { total_vectors: total, completed_tasks: completed };
  }

  async deleteProject(projectId) {
    if (!this.initialized) await this.initialize();
    await this.provider.deleteNamespace(`${projectId}:`);
    this.projectVectors.delete(projectId);
    return true;
  }
}

export { HTAVectorStore };