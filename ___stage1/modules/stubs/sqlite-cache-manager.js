import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class SQLiteCacheManager {
  constructor(dbPath = null) {
    // Use provided path or default to cache.db in the same directory
    this.dbPath = dbPath || path.join(__dirname, 'cache.db');
    
    // For now, use an in-memory Map with persistence capability
    // This provides the same interface as the DataPersistence expects
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
    this.metadata = new Map(); // Store metadata for each key
    
    // Initialize persistent storage (future enhancement)
    this.initializeDatabase();
  }

  initializeDatabase() {
    // Future: Initialize SQLite database for persistence
    // For now, this is a placeholder to maintain the same interface
    console.log(`[SQLiteCacheManager] Initialized cache with path: ${this.dbPath}`);
  }

  get(key) {
    const entry = this.cache.get(key);
    const meta = this.metadata.get(key);
    
    if (entry && meta) {
      // Check if entry has expired
      if (meta.expires_at && Date.now() > meta.expires_at) {
        this.delete(key);
        this.misses++;
        return undefined;
      }
      
      this.hits++;
      return entry;
    } else {
      this.misses++;
      return undefined;
    }
  }

  set(key, value, ttlMs = null) {
    const timestamp = Date.now();
    const expires_at = ttlMs ? timestamp + ttlMs : null;
    
    this.cache.set(key, value);
    this.metadata.set(key, {
      timestamp,
      expires_at
    });
  }

  delete(key) {
    const hadKey = this.cache.has(key);
    this.cache.delete(key);
    this.metadata.delete(key);
    return hadKey;
  }

  clear() {
    this.cache.clear();
    this.metadata.clear();
  }

  keys() {
    return Array.from(this.cache.keys());
  }

  get size() {
    return this.cache.size;
  }

  getHitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  async getMemoryUsage() {
    // Estimate memory usage based on cache size
    try {
      const entriesSize = this.cache.size;
      const metadataSize = this.metadata.size;
      // Rough estimate: each entry ~1KB, metadata ~100 bytes
      return entriesSize * 1024 + metadataSize * 100;
    } catch (error) {
      console.error('Error calculating memory usage:', error);
      return this.size * 1024; // Fallback estimate
    }
  }

  // Additional methods for cache-specific functionality
  cleanupExpiredEntries() {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, meta] of this.metadata.entries()) {
      if (meta.expires_at && now > meta.expires_at) {
        this.delete(key);
        removedCount++;
      }
    }
    
    return removedCount;
  }

  getCacheStats() {
    const totalEntries = this.size;
    const hitRate = this.getHitRate();
    const memoryUsage = this.getMemoryUsage();
    
    // Count expired entries
    const now = Date.now();
    let expiredEntries = 0;
    for (const meta of this.metadata.values()) {
      if (meta.expires_at && now > meta.expires_at) {
        expiredEntries++;
      }
    }
    
    return {
      totalEntries,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      memoryUsage,
      expiredEntries,
      dbPath: this.dbPath
    };
  }

  // Method to compact the cache (cleanup expired entries)
  vacuum() {
    this.cleanupExpiredEntries();
  }

  // Method to get all entries (for debugging)
  getAllEntries() {
    const entries = [];
    for (const [key, meta] of this.metadata.entries()) {
      entries.push({
        key,
        timestamp: meta.timestamp,
        expires_at: meta.expires_at
      });
    }
    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Close the connection (cleanup)
  close() {
    this.clear();
  }

  // Method to check if a key exists without affecting hit/miss counters
  has(key) {
    const meta = this.metadata.get(key);
    if (!meta) return false;
    
    // Check if expired
    if (meta.expires_at && Date.now() > meta.expires_at) {
      return false;
    }
    
    return this.cache.has(key);
  }

  // Method to get cache entry metadata
  getEntryMetadata(key) {
    const meta = this.metadata.get(key);
    
    if (meta) {
      return {
        timestamp: meta.timestamp,
        expires_at: meta.expires_at,
        isExpired: meta.expires_at && Date.now() > meta.expires_at
      };
    };
    
    return null;
  }

  // Method to get all cache entries (for Map compatibility)
  entries() {
    return this.cache.entries();
  }

  // Method to get all cache values (for Map compatibility)
  values() {
    return this.cache.values();
  }
}
