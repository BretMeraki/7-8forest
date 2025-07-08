/**
 * Task Formatter Module - Formats tasks for display and interaction
 * Simple implementation for Stage1 compatibility
 */

export class TaskFormatter {
  constructor() {
    this.defaultFormat = 'structured';
  }

  /**
   * Format a task for display
   * @param {Object} task - Task object to format
   * @param {Object} options - Formatting options
   * @returns {Object} Formatted task response
   */
  formatTask(task, options = {}) {
    if (!task) {
      return {
        content: [{
          type: 'text',
          text: '**No Task Available**\n\nNo suitable task found for your current context.'
        }]
      };
    }

    const {
      energyLevel = 3,
      timeAvailable = '30 minutes',
      format = this.defaultFormat
    } = options;

    try {
      const formattedText = this.buildTaskText(task, energyLevel, timeAvailable);
      
      return {
        content: [{
          type: 'text',
          text: formattedText
        }],
        task_info: {
          task_id: task.id || task.title?.toLowerCase().replace(/\s+/g, '_'),
          title: task.title,
          difficulty: task.difficulty || 'medium',
          estimated_time: timeAvailable,
          energy_match: energyLevel
        }
      };
    } catch (error) {
      console.error('TaskFormatter.formatTask failed:', error);
      return {
        content: [{
          type: 'text',
          text: `**Task Formatting Error**\n\nError: ${error.message}`
        }]
      };
    }
  }

  /**
   * Build the main task text
   * @param {Object} task - Task object
   * @param {number} energyLevel - User's energy level
   * @param {string} timeAvailable - Available time
   * @returns {string} Formatted task text
   */
  buildTaskText(task, energyLevel, timeAvailable) {
    const title = task.title || 'Next Learning Task';
    const description = task.description || task.content || 'Complete this learning task to advance your goals.';
    
    let formattedText = `**🎯 Your Next Task**\n\n`;
    formattedText += `**${title}**\n\n`;
    formattedText += `${description}\n\n`;
    
    // Add context information
    if (task.reasoning) {
      formattedText += `**Why this task now?**\n${task.reasoning}\n\n`;
    }
    
    // Add practical details
    formattedText += `**Details:**\n`;
    formattedText += `• ⚡ Energy Level: ${energyLevel}/5 (${this.getEnergyLabel(energyLevel)})\n`;
    formattedText += `• ⏱️ Time Available: ${timeAvailable}\n`;
    
    if (task.difficulty) {
      formattedText += `• 📊 Difficulty: ${task.difficulty}\n`;
    }
    
    if (task.phase) {
      formattedText += `• 🌱 Learning Phase: ${task.phase}\n`;
    }
    
    // Add completion guidance
    formattedText += `\n**When complete, use:** \`complete_block_forest\` to log your progress and insights.`;
    
    return formattedText;
  }

  /**
   * Get energy level label
   * @param {number} level - Energy level (1-5)
   * @returns {string} Energy label
   */
  getEnergyLabel(level) {
    const labels = {
      1: 'Very Low',
      2: 'Low', 
      3: 'Moderate',
      4: 'High',
      5: 'Very High'
    };
    return labels[level] || 'Moderate';
  }

  /**
   * Format task batch for display
   * @param {Array} tasks - Array of tasks
   * @param {Object} options - Formatting options
   * @returns {Object} Formatted batch response
   */
  formatTaskBatch(tasks, options = {}) {
    if (!tasks || tasks.length === 0) {
      return this.formatTask(null, options);
    }

    if (tasks.length === 1) {
      return this.formatTask(tasks[0], options);
    }

    // Multiple tasks - format as a sequence
    let batchText = `**🎯 Your Task Sequence (${tasks.length} tasks)**\n\n`;
    
    tasks.forEach((task, index) => {
      batchText += `**${index + 1}. ${task.title || `Task ${index + 1}`}**\n`;
      batchText += `${task.description || task.content || 'Complete this task'}\n`;
      if (task.difficulty) {
        batchText += `   📊 Difficulty: ${task.difficulty}\n`;
      }
      batchText += '\n';
    });

    batchText += `**Recommended approach:** Complete tasks in order for optimal learning progression.\n\n`;
    batchText += `**When each task is complete, use:** \`complete_block_forest\` to log progress.`;

    return {
      content: [{
        type: 'text',
        text: batchText
      }],
      batch_info: {
        task_count: tasks.length,
        estimated_total_time: options.timeAvailable || '30 minutes',
        difficulty_range: this.getTaskDifficultyRange(tasks)
      }
    };
  }

  /**
   * Get difficulty range for a batch of tasks
   * @param {Array} tasks - Array of tasks
   * @returns {string} Difficulty range description
   */
  getTaskDifficultyRange(tasks) {
    const difficulties = tasks
      .map(t => t.difficulty)
      .filter(d => d)
      .map(d => d.toLowerCase());
      
    if (difficulties.length === 0) return 'mixed';
    
    const unique = [...new Set(difficulties)];
    if (unique.length === 1) return unique[0];
    
    return `${unique[0]} to ${unique[unique.length - 1]}`;
  }

  /**
   * Static method for compatibility with task-strategy-core.js
   * Format a task into a user-friendly response
   * @param {Object} task - Task to format
   * @param {number} energyLevel - User's current energy level
   * @param {string} timeAvailable - Available time string
   * @returns {string} Formatted task response
   */
  static formatTaskResponse(task, energyLevel, timeAvailable) {
    if (!task) {
      return '**No Task Available**\n\nNo suitable task found for your current context.';
    }
    const title = task.title || 'Next Learning Task';
    const description = task.description || task.content || 'Complete this learning task to advance your goals.';
    const duration = task.duration || timeAvailable || '30 minutes';
    const difficulty = task.difficulty || 3;
    
    let response = `**🎯 Your Next Task**\n\n`;
    response += `**${title}**\n\n`;
    response += `${description}\n\n`;
    
    // Add context information
    if (task.reasoning) {
      response += `**Why this task now?**\n${task.reasoning}\n\n`;
    }
    
    // Add practical details
    response += `**Details:**\n`;
    response += `• ⚡ Energy Level: ${energyLevel}/5 (${TaskFormatter.getEnergyLabel(energyLevel)})\n`;
    response += `• ⏱️ Time Available: ${timeAvailable}\n`;
    response += `• 📊 Difficulty: ${difficulty}/5\n`;
    
    if (task.phase) {
      response += `• 🌱 Learning Phase: ${task.phase}\n`;
    }
    
    if (task.branch) {
      response += `• 🌳 Branch: ${task.branch}\n`;
    }
    
    // Add completion guidance
    response += `\n**When complete, use:** \`complete_block_forest\` with block_id: "${task.id || task.title?.toLowerCase().replace(/\s+/g, '_')}" to log your progress and insights.`;
    
    return response;
  }

  /**
   * Static helper for energy level labels
   * @param {number} level - Energy level (1-5)
   * @returns {string} Energy label
   */
  static getEnergyLabel(level) {
    const labels = {
      1: 'Very Low',
      2: 'Low', 
      3: 'Moderate',
      4: 'High',
      5: 'Very High'
    };
    return labels[level] || 'Moderate';
  }
}
