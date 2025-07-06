/**
 * Global Interval Manager
 * Tracks and manages all intervals to prevent memory leaks and stuck processes
 */

class IntervalManager {
  constructor() {
    this.intervals = new Map();
    this.timeouts = new Map();
  }

  setInterval(name, callback, delay) {
    // Clear existing interval if it exists
    if (this.intervals.has(name)) {
      clearInterval(this.intervals.get(name));
    }
    
    const intervalId = setInterval(callback, delay);
    this.intervals.set(name, intervalId);
    
    console.log(`[IntervalManager] Registered interval: ${name} (every ${delay}ms)`);
    return intervalId;
  }

  setTimeout(name, callback, delay) {
    // Clear existing timeout if it exists
    if (this.timeouts.has(name)) {
      clearTimeout(this.timeouts.get(name));
    }
    
    const timeoutId = setTimeout(() => {
      this.timeouts.delete(name);
      callback();
    }, delay);
    
    this.timeouts.set(name, timeoutId);
    console.log(`[IntervalManager] Registered timeout: ${name} (${delay}ms)`);
    return timeoutId;
  }

  clear(name) {
    if (this.intervals.has(name)) {
      clearInterval(this.intervals.get(name));
      this.intervals.delete(name);
      console.log(`[IntervalManager] Cleared interval: ${name}`);
    }
    
    if (this.timeouts.has(name)) {
      clearTimeout(this.timeouts.get(name));
      this.timeouts.delete(name);
      console.log(`[IntervalManager] Cleared timeout: ${name}`);
    }
  }

  clearAll() {
    console.log(`[IntervalManager] Clearing all intervals (${this.intervals.size}) and timeouts (${this.timeouts.size})`);
    
    for (const [name, intervalId] of this.intervals) {
      clearInterval(intervalId);
    }
    this.intervals.clear();
    
    for (const [name, timeoutId] of this.timeouts) {
      clearTimeout(timeoutId);
    }
    this.timeouts.clear();
  }

  getStatus() {
    return {
      activeIntervals: Array.from(this.intervals.keys()),
      activeTimeouts: Array.from(this.timeouts.keys()),
      intervalCount: this.intervals.size,
      timeoutCount: this.timeouts.size
    };
  }
}

export const globalIntervalManager = new IntervalManager();
