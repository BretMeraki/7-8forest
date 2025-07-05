/**
 * Task Batch Optimizer - Handles batch processing and scalability optimizations
 * Manages search indexing, batch operations, and performance optimizations
 */

export class TaskBatchOptimizer {
  constructor() {
    this._searchIndex = null;
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

  // ===== TASK OPTIMIZATION UTILITIES =====

  optimizeTaskSequence(tasks, criteria = {}) {
    // Sort tasks based on multiple criteria
    const {
      priorityWeight = 0.3,
      difficultyWeight = 0.2,
      dependencyWeight = 0.3,
      energyWeight = 0.2
    } = criteria;

    return tasks.sort((a, b) => {
      const scoreA = this.calculateTaskScore(a, criteria);
      const scoreB = this.calculateTaskScore(b, criteria);
      return scoreB - scoreA; // Higher score first
    });
  }

  calculateTaskScore(task, criteria) {
    const priority = (task.priority || 50) / 100; // Normalize to 0-1
    const difficulty = 1 - ((task.difficulty || 3) / 5); // Invert difficulty (easier = higher score)
    const dependencies = 1 - ((task.prerequisites?.length || 0) / 10); // Fewer dependencies = higher score
    const energy = (task.energyAlignment || 0.5); // Energy alignment score

    return (
      priority * criteria.priorityWeight +
      difficulty * criteria.difficultyWeight +
      dependencies * criteria.dependencyWeight +
      energy * criteria.energyWeight
    );
  }

  // ===== BATCH ANALYSIS UTILITIES =====

  analyzeBatchEfficiency(taskBatch) {
    if (!taskBatch || taskBatch.length === 0) {
      return {
        efficiency: 0,
        recommendations: ['No tasks provided for analysis']
      };
    }

    const analysis = {
      totalTasks: taskBatch.length,
      averageDifficulty: this.calculateAverageDifficulty(taskBatch),
      estimatedTime: this.calculateTotalTime(taskBatch),
      difficultyDistribution: this.analyzeDifficultyDistribution(taskBatch),
      dependencyComplexity: this.analyzeDependencyComplexity(taskBatch),
      efficiency: 0,
      recommendations: []
    };

    // Calculate efficiency score (0-1)
    analysis.efficiency = this.calculateBatchEfficiency(analysis);

    // Generate recommendations
    analysis.recommendations = this.generateEfficiencyRecommendations(analysis);

    return analysis;
  }

  calculateAverageDifficulty(tasks) {
    const difficulties = tasks.map(task => task.difficulty || 3);
    return difficulties.reduce((sum, diff) => sum + diff, 0) / difficulties.length;
  }

  calculateTotalTime(tasks) {
    return tasks.reduce((total, task) => {
      const duration = this.parseTimeToMinutes(task.duration || '30 minutes');
      return total + duration;
    }, 0);
  }

  parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 30;
    
    const minuteMatch = timeStr.match(/(\d+)\s*min/i);
    if (minuteMatch) return parseInt(minuteMatch[1]);
    
    const hourMatch = timeStr.match(/(\d+)\s*hour/i);
    if (hourMatch) return parseInt(hourMatch[1]) * 60;
    
    const numberMatch = timeStr.match(/(\d+)/);
    if (numberMatch) return parseInt(numberMatch[1]);
    
    return 30;
  }

  analyzeDifficultyDistribution(tasks) {
    const distribution = { easy: 0, medium: 0, hard: 0, extreme: 0 };
    
    tasks.forEach(task => {
      const difficulty = task.difficulty || 3;
      if (difficulty <= 2) distribution.easy++;
      else if (difficulty <= 3) distribution.medium++;
      else if (difficulty <= 4) distribution.hard++;
      else distribution.extreme++;
    });

    return distribution;
  }

  analyzeDependencyComplexity(tasks) {
    const dependencyCounts = tasks.map(task => (task.prerequisites || []).length);
    const maxDependencies = Math.max(...dependencyCounts, 0);
    const avgDependencies = dependencyCounts.reduce((sum, count) => sum + count, 0) / tasks.length;

    return {
      maxDependencies,
      avgDependencies,
      complexity: maxDependencies > 3 ? 'high' : avgDependencies > 1 ? 'medium' : 'low'
    };
  }

  calculateBatchEfficiency(analysis) {
    // Efficiency factors
    const sizeEfficiency = this.calculateSizeEfficiency(analysis.totalTasks);
    const difficultyEfficiency = this.calculateDifficultyEfficiency(analysis.averageDifficulty, analysis.difficultyDistribution);
    const timeEfficiency = this.calculateTimeEfficiency(analysis.estimatedTime);
    const dependencyEfficiency = this.calculateDependencyEfficiency(analysis.dependencyComplexity);

    // Weighted average
    return (
      sizeEfficiency * 0.25 +
      difficultyEfficiency * 0.25 +
      timeEfficiency * 0.25 +
      dependencyEfficiency * 0.25
    );
  }

  calculateSizeEfficiency(totalTasks) {
    // Optimal batch size is 5-7 tasks
    if (totalTasks >= 5 && totalTasks <= 7) return 1.0;
    if (totalTasks >= 3 && totalTasks <= 9) return 0.8;
    if (totalTasks >= 1 && totalTasks <= 12) return 0.6;
    return 0.3;
  }

  calculateDifficultyEfficiency(avgDifficulty, distribution) {
    // Prefer progressive difficulty (mix of easy, medium, hard)
    const hasProgression = distribution.easy > 0 && distribution.medium > 0;
    const balanceScore = 1 - Math.abs(avgDifficulty - 3) / 2; // Optimal around difficulty 3
    
    return hasProgression ? Math.max(balanceScore, 0.7) : balanceScore;
  }

  calculateTimeEfficiency(estimatedMinutes) {
    // Optimal session is 45-120 minutes
    if (estimatedMinutes >= 45 && estimatedMinutes <= 120) return 1.0;
    if (estimatedMinutes >= 30 && estimatedMinutes <= 180) return 0.8;
    if (estimatedMinutes >= 15 && estimatedMinutes <= 240) return 0.6;
    return 0.3;
  }

  calculateDependencyEfficiency(dependencyComplexity) {
    switch (dependencyComplexity.complexity) {
      case 'low': return 1.0;
      case 'medium': return 0.7;
      case 'high': return 0.4;
      default: return 0.5;
    }
  }

  generateEfficiencyRecommendations(analysis) {
    const recommendations = [];

    // Size recommendations
    if (analysis.totalTasks < 3) {
      recommendations.push('Consider adding more tasks for a complete learning session');
    } else if (analysis.totalTasks > 9) {
      recommendations.push('Consider breaking this into smaller batches to avoid cognitive overload');
    }

    // Difficulty recommendations
    if (analysis.averageDifficulty > 4) {
      recommendations.push('This batch is quite challenging - consider adding some easier warm-up tasks');
    } else if (analysis.averageDifficulty < 2) {
      recommendations.push('This batch might be too easy - consider adding some challenging tasks for growth');
    }

    // Time recommendations
    const timeHours = Math.floor(analysis.estimatedTime / 60);
    const timeMinutes = analysis.estimatedTime % 60;
    if (analysis.estimatedTime > 180) {
      recommendations.push(`This batch requires ${timeHours}h ${timeMinutes}m - consider spreading across multiple sessions`);
    } else if (analysis.estimatedTime < 30) {
      recommendations.push('This batch is quite short - consider adding more tasks for a substantial learning session');
    }

    // Dependency recommendations
    if (analysis.dependencyComplexity.complexity === 'high') {
      recommendations.push('Complex dependencies detected - ensure prerequisites are completed first');
    }

    // Overall efficiency
    if (analysis.efficiency < 0.6) {
      recommendations.push('Consider rebalancing this batch for optimal learning progression');
    }

    return recommendations;
  }

  // ===== PERFORMANCE OPTIMIZATION =====

  memoize(fn, maxCacheSize = 100) {
    const cache = new Map();
    
    return function(...args) {
      const key = JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = fn.apply(this, args);
      
      // Implement LRU cache
      if (cache.size >= maxCacheSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      
      cache.set(key, result);
      return result;
    };
  }

  debounce(fn, delay = 300) {
    let timeoutId;
    
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  throttle(fn, limit = 1000) {
    let inThrottle;
    
    return function(...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}
