// embedding-service.js
// Deterministic embedding service for Forest vector operations
// Uses mathematical functions to generate consistent vector representations

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import vectorConfig from '../config/vector-config.js';
import fsPromises from 'fs/promises';

const EMBEDDING_CACHE_DIR = vectorConfig.embedding.cacheDir || '.embedding-cache';

class EmbeddingService {
  constructor() {
    this.provider = 'deterministic';
    this.cacheDir = EMBEDDING_CACHE_DIR;
    this.cache = new Map();
    
    // LRU cache management for embeddings
    this.maxCacheSize = parseInt(process.env.EMBEDDING_CACHE_MAX) || 1000;
    this.cacheAccessOrder = new Map();
    this.accessCounter = 0;
    
    this._ensureCacheDir();
  }

  async _ensureCacheDir() {
    try {
      await fsPromises.mkdir(this.cacheDir, { recursive: true });
    } catch (err) {
      // Ignore if already exists
    }
  }

  _getCachePath(text) {
    // Use hash to create short, unique filenames
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    return path.join(this.cacheDir, `${hash}.json`);
  }

  async embed(text) {
    if (!text || typeof text !== 'string') throw new Error('EmbeddingService: text must be a string');
    
    // Check in-memory cache
    if (this.cache.has(text)) {
      this._updateAccess(text);
      return this.cache.get(text);
    }
    // Check disk cache
    const cachePath = this._getCachePath(text);
    try {
      const cached = await fsPromises.readFile(cachePath, 'utf8');
      const parsed = JSON.parse(cached);
      this.cache.set(text, parsed);
      return parsed;
    } catch (err) {
      // Not cached, continue
    }
    // Generate embedding
    let embedding;
    if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
      try {
        embedding = await this._embedOpenAI(text);
      } catch (err) {
        console.warn('[EmbeddingService] OpenAI failed, falling back to deterministic:', err.message);
        embedding = this._deterministicVector(text, 1536);
      }
    } else {
      // Use deterministic embedding for all other cases
      embedding = this._deterministicVector(text, 1536);
    }
    
    // Cache result
    this._evictIfNeeded();
    this.cache.set(text, embedding);
    this._updateAccess(text);
    
    try {
      await fsPromises.writeFile(cachePath, JSON.stringify(embedding), 'utf8');
    } catch (err) {
      // Ignore cache write errors
    }
    return embedding;
  }

  async _embedOpenAI(text) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('EmbeddingService: OPENAI_API_KEY not set');
    const fetch = (await import('node-fetch')).default;
    const url = 'https://api.openai.com/v1/embeddings';
    const body = {
      input: text,
      model: this.model,
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`EmbeddingService: OpenAI API error: ${res.status} ${errText}`);
    }
    const data = await res.json();
    if (!data || !data.data || !Array.isArray(data.data) || !data.data[0]?.embedding) {
      throw new Error('EmbeddingService: Invalid OpenAI API response');
    }
    return data.data[0].embedding;
  }

  _hash(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  async embedText(text, dimension = 1536) {
    if (!text) return new Array(dimension).fill(0);
    const key = this._hash(`${this.model}:${text}`);
    const cacheFile = this._getCachePath(text);
    if (fs.existsSync(cacheFile)) {
      try {
        const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        if (Array.isArray(cached) && cached.length === dimension) return cached;
      } catch (_) {}
    }

    let vector;

    if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
      try {
        const res = await fetch(OPENAI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            input: text,
            model: this.model,
          }),
        });
        const data = await res.json();
        vector = data?.data?.[0]?.embedding;
      } catch (err) {
        console.error('[Embedding] OpenAI request failed, falling back to deterministic embedding:', err?.message || err);
      }
    }

    if (!vector) {
      // Deterministic fallback: simple hashed vector
      vector = this._deterministicVector(text, dimension);
    }

    fs.writeFileSync(cacheFile, JSON.stringify(vector));
    return vector;
  }

  _deterministicVector(text, dimension) {
    let seed = 0;
    for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
    const vec = new Array(dimension);
    for (let i = 0; i < dimension; i++) {
      const val = Math.sin(seed + i) * Math.cos(seed * (i + 1));
      vec[i] = val;
    }
    // normalize
    const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vec.map(v => v / mag);
  }

  // LRU Cache Management Methods
  _evictIfNeeded() {
    if (this.cache.size >= this.maxCacheSize) {
      // Find least recently used item
      let oldestText = null;
      let oldestAccess = Infinity;
      
      for (const [text, accessTime] of this.cacheAccessOrder.entries()) {
        if (accessTime < oldestAccess) {
          oldestAccess = accessTime;
          oldestText = text;
        }
      }
      
      if (oldestText) {
        this.cache.delete(oldestText);
        this.cacheAccessOrder.delete(oldestText);
        console.warn(`[EmbeddingService] Evicted embedding from cache (LRU): ${oldestText.substring(0, 50)}...`);
      }
    }
  }

  _updateAccess(text) {
    this.cacheAccessOrder.set(text, ++this.accessCounter);
  }

  clearCache() {
    this.cache.clear();
    this.cacheAccessOrder.clear();
    this.accessCounter = 0;
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      utilization: (this.cache.size / this.maxCacheSize * 100).toFixed(2) + '%',
      accessCounter: this.accessCounter,
      oldestAccess: this.cacheAccessOrder.size > 0 ? Math.min(...this.cacheAccessOrder.values()) : null,
      newestAccess: this.cacheAccessOrder.size > 0 ? Math.max(...this.cacheAccessOrder.values()) : null,
    };
  }
}

export const embeddingService = new EmbeddingService();
export default embeddingService;
