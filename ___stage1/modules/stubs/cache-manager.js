export class CacheManager {
  constructor() {
    this.map = new Map();
    this.hits = 0;
    this.misses = 0;
  }
  get(key) {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.hits++;
    } else {
      this.misses++;
    }
    return value;
  }
  set(key, value) {
    this.map.set(key, value);
  }
  delete(key) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
  keys() {
    return this.map.keys();
  }
  get size() {
    return this.map.size;
  }
  getHitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }
  getMemoryUsage() {
    // Simple approximation
    return this.map.size * 1024; // 1KB per entry estimate
  }
}
