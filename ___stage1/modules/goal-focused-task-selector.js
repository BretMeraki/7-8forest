/**
 * Goal-Focused Task Selector - Intelligent task selection with goal alignment
 * Handles vector-based task selection and goal achievement context
 */

import { FILE_NAMES } from './memory-sync.js';

export class GoalFocusedTaskSelector {
  constructor(dataPersistence, vectorStore, goalContext) {
    this.dataPersistence = dataPersistence;
    this.vectorStore = vectorStore;
    this.goalContext = goalContext;
  }

  // === GOAL-FOCUSED TASK SELECTION ===

  async selectGoalFocusedTaskBatch(projectId, htaData, goalContext, config) {
    try {
      // Use goal achievement context to select optimal task batch
      const recommendations = goalContext.recommendations;
      const alignment = goalContext.alignment;
      
      // Build goal-focused query based on context
      const goalFocusedQuery = this.buildGoalFocusedQuery(goalContext, config);
      console.error('[GoalFocusedTaskSelector] Goal-focused query:', goalFocusedQuery.substr(0, 100) + '...');
      
      // Get batch of goal-focused tasks (5-7 tasks, optimal learning batch)
      const taskBatch = await this.vectorStore.findGoalFocusedTaskBatch(
        projectId,
        goalFocusedQuery,
        recommendations,
        alignment,
        { 
          batchSize: 6, // Sweet spot: enough to see progression, not overwhelming
          maxBatchSize: 7,
          minBatchSize: 5
        }
      );
      
      if (taskBatch && taskBatch.length > 0) {
        // Order batch by dependencies and goal progression
        const orderedBatch = this.orderTasksByDependencyAndGoalProgression(
          taskBatch, 
          goalContext, 
          config
        );
        
        // Format response with goal achievement context
        const batchResponse = this.formatGoalFocusedTaskBatch(
          orderedBatch, 
          goalContext, 
          config
        );
        
        return {
          content: [{ type: 'text', text: batchResponse }],
          task_batch: orderedBatch,
          goal_context: goalContext,
          goal_focused: true,
          project_context: config,
          goal_achievement_potential: alignment?.goal_advancement_potential || 'medium',
          batch_size: orderedBatch.length
        };
      }
      
    } catch (error) {
      console.error('[GoalFocusedTaskSelector] Goal-focused task batch selection failed:', error.message);
    }
    
    return null;
  }
  
  buildGoalFocusedQuery(goalContext, config) {
    const parts = [];
    
    // Add goal information
    parts.push(`goal:${config.goal}`);
    
    // Add context from goal achievement analysis
    const alignment = goalContext.alignment;
    if (alignment?.optimal_focus_area) {
      parts.push(`focus:${alignment.optimal_focus_area}`);
    }
    
    // Add momentum information
    const momentum = goalContext.momentum;
    if (momentum?.velocity?.current) {
      parts.push(`momentum:${momentum.velocity.current}`);
    }
    
    // Add readiness information
    const readiness = goalContext.readiness;
    if (readiness?.immediate_potential?.can_advance_goal) {
      parts.push('goal_advancement_ready');
    }
    
    // Add breakthrough information
    const breakthrough = goalContext.breakthrough;
    if (breakthrough?.breakthrough_window?.conditions_aligned) {
      parts.push('breakthrough_opportunity');
    }
    
    // Add recommended task characteristics
    const recommendations = goalContext.recommendations;
    if (recommendations?.immediate_action?.optimal_task_type) {
      parts.push(`task_type:${recommendations.immediate_action.optimal_task_type.type}`);
    }
    
    return parts.join(' ');
  }
  
  orderTasksByDependencyAndGoalProgression(taskBatch, goalContext, config) {
    // Create a dependency graph and sort tasks for optimal learning progression
    const tasks = [...taskBatch];
    
    // Step 1: Identify task dependencies and prerequisites
    const dependencyMap = this.buildTaskDependencyMap(tasks);
    
    // Step 2: Group tasks by difficulty/complexity for progressive learning
    const complexityGroups = this.groupTasksByComplexity(tasks, goalContext);
    
    // Step 3: Order within groups by goal advancement potential
    const orderedTasks = [];
    
    // Start with foundational tasks (lower difficulty, fewer dependencies)
    const foundationalTasks = complexityGroups.foundational || [];
    const intermediateTasks = complexityGroups.intermediate || [];
    const advancedTasks = complexityGroups.advanced || [];
    
    // Add foundational tasks first (dependency order)
    orderedTasks.push(...this.orderByDependencies(foundationalTasks, dependencyMap));
    
    // Add intermediate tasks
    orderedTasks.push(...this.orderByDependencies(intermediateTasks, dependencyMap));
    
    // Add advanced tasks last
    orderedTasks.push(...this.orderByDependencies(advancedTasks, dependencyMap));
    
    // Ensure optimal batch size (5-7 tasks) and prioritize by goal alignment
    const targetSize = Math.min(orderedTasks.length, 6); // Aim for 6, max 7
    const finalBatch = orderedTasks.slice(0, targetSize);
    
    // Add batch metadata for context with optimized progression
    return finalBatch.map((task, index) => ({
      ...task,
      batch_position: index + 1,
      progression_type: this.getOptimalProgressionType(index, finalBatch.length),
      estimated_completion_time: this.calculateCumulativeTime(finalBatch.slice(0, index + 1)),
      is_next_recommended: index === 0, // Highlight the immediate next task
      batch_total: finalBatch.length
    }));
  }
  
  buildTaskDependencyMap(tasks) {
    const dependencyMap = new Map();
    
    tasks.forEach(task => {
      const prerequisites = task.prerequisites || [];
      dependencyMap.set(task.id, {
        task: task,
        prerequisites: prerequisites,
        dependents: []
      });
    });
    
    // Build reverse dependencies
    tasks.forEach(task => {
      const prerequisites = task.prerequisites || [];
      prerequisites.forEach(prereqId => {
        const prereqNode = dependencyMap.get(prereqId);
        if (prereqNode) {
          prereqNode.dependents.push(task.id);
        }
      });
    });
    
    return dependencyMap;
  }
  
  groupTasksByComplexity(tasks, goalContext) {
    const groups = {
      foundational: [],
      intermediate: [],
      advanced: []
    };
    
    tasks.forEach(task => {
      const difficulty = task.difficulty || 3;
      const hasPrerequisites = (task.prerequisites || []).length > 0;
      
      if (difficulty <= 2 && !hasPrerequisites) {
        groups.foundational.push(task);
      } else if (difficulty <= 4 || hasPrerequisites) {
        groups.intermediate.push(task);
      } else {
        groups.advanced.push(task);
      }
    });
    
    return groups;
  }
  
  orderByDependencies(tasks, dependencyMap) {
    // Simple topological sort for dependency ordering
    const visited = new Set();
    const result = [];
    
    const visit = (taskId) => {
      if (visited.has(taskId)) return;
      
      const node = dependencyMap.get(taskId);
      if (!node) return;
      
      // Visit prerequisites first
      node.prerequisites.forEach(prereqId => {
        if (tasks.find(t => t.id === prereqId)) {
          visit(prereqId);
        }
      });
      
      visited.add(taskId);
      result.push(node.task);
    };
    
    tasks.forEach(task => visit(task.id));
    
    return result;
  }
  
  calculateCumulativeTime(tasks) {
    const totalMinutes = tasks.reduce((sum, task) => {
      const duration = this.parseTimeToMinutes(task.duration || '30 minutes');
      return sum + duration;
    }, 0);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${totalMinutes}m`;
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
  
  getOptimalProgressionType(index, totalTasks) {
    // Dynamic progression type based on position and batch size
    const progressRatio = index / (totalTasks - 1);
    
    if (progressRatio <= 0.33) {
      return 'foundation'; // First third: foundation
    } else if (progressRatio <= 0.66) {
      return 'building'; // Middle third: building
    } else {
      return 'advancement'; // Final third: advancement
    }
  }
  
  formatGoalFocusedTaskBatch(taskBatch, goalContext, config) {
    const alignment = goalContext.alignment;
    const recommendations = goalContext.recommendations;
    const momentum = goalContext.momentum;
    
    let response = `🎯 **Goal-Focused Learning Path**\n\n`;
    
    // Show goal connection
    response += `**Your Goal**: ${config.goal}\n\n`;
    
    // Show goal achievement context
    response += `**🚀 Goal Achievement Analysis**\n`;
    
    if (alignment?.goal_advancement_potential) {
      response += `• **Advancement Potential**: ${alignment.goal_advancement_potential}\n`;
    }
    
    if (alignment?.optimal_focus_area) {
      response += `• **Optimal Focus**: ${alignment.optimal_focus_area}\n`;
    }
    
    if (momentum?.velocity?.current) {
      response += `• **Current Momentum**: ${momentum.velocity.current}\n`;
    }
    
    if (recommendations?.immediate_action?.optimal_task_type) {
      const taskType = recommendations.immediate_action.optimal_task_type;
      response += `• **Recommended Approach**: ${taskType.type}\n`;
    }
    
    if (alignment?.dream_fulfillment_step) {
      response += `\n**💫 Dream Connection**: ${alignment.dream_fulfillment_step}\n`;
    }
    
    // Show the learning path
    response += `\n## 📋 Your Goal-Focused Learning Path\n\n`;
    response += `*${taskBatch.length} carefully selected tasks, ordered by dependency and goal progression:*\n\n`;
    
    taskBatch.forEach((task, index) => {
      const position = index + 1;
      const progressIcon = this.getProgressIcon(task.progression_type);
      const difficultyStars = '★'.repeat(task.difficulty || 3);
      const isNext = task.is_next_recommended;
      
      // Highlight the immediate next task
      const titlePrefix = isNext ? '👆 **START HERE** ' : '';
      const taskNumber = isNext ? `**${position}.** ` : `${position}. `;
      
      response += `### ${taskNumber}${titlePrefix}${progressIcon} ${task.title}\n`;
      response += `**Branch**: ${task.branch || 'General'} | **Difficulty**: ${difficultyStars} | **Duration**: ${task.duration || '30 minutes'}\n`;
      response += `${task.description}\n`;
      
      // Show specific action if available (granular tasks)
      if (task.action) {
        response += `**🎤 Action**: ${task.action}\n`;
      }
      
      // Show validation criteria if available (granular tasks)
      if (task.validation) {
        response += `**✅ Success**: ${task.validation}\n`;
      }
      
      if (task.prerequisites && task.prerequisites.length > 0) {
        response += `*Builds on previous tasks*\n`;
      }
      
      response += `**Goal Impact**: ${this.explainGoalConnection(task, config.goal)}\n`;
      
      if (isNext) {
        response += `**🎯 Recommended Next**: This is your optimal starting point based on current momentum\n`;
      }
      
      // Highlight if this is a granular micro-task
      if (task.granular) {
        response += `*🔍 Granular micro-task - specific and actionable*\n`;
      }
      
      response += `*Cumulative time: ${task.estimated_completion_time}*\n\n`;
    });
    
    // Add summary
    const totalTime = taskBatch[taskBatch.length - 1]?.estimated_completion_time || '0m';
    response += `---\n\n`;
    response += `**📊 Path Summary**\n`;
    response += `• **Total Tasks**: ${taskBatch.length}\n`;
    response += `• **Estimated Time**: ${totalTime}\n`;
    response += `• **Progression**: Foundation → Building → Advancement\n`;
    response += `• **Goal Focus**: Each task directly advances your specific goal\n\n`;
    
    response += `**💡 How to Use This Path**:\n`;
    response += `1. **Start with the highlighted task** - Begin where momentum is strongest\n`;
    response += `2. **Follow the sequence** - Each task builds foundation for the next\n`;
    response += `3. **Take breaks between tasks** - ${taskBatch.length} tasks is a full learning session\n`;
    response += `4. **Track your progress** - Use \`complete_block_forest\` after each task\n`;
    response += `5. **Stay goal-focused** - Remember how each step advances your dream\n\n`;
    
    response += `This learning path was designed based on your current goal momentum, achievement readiness, and optimal focus area.`;
    
    return response;
  }
  
  getProgressIcon(progressionType) {
    switch (progressionType) {
      case 'foundation': return '🏗️';
      case 'building': return '🔨';
      case 'advancement': return '🚀';
      default: return '📋';
    }
  }
  
  explainGoalConnection(task, goal) {
    // Simple goal connection explanation
    const taskText = (task.title + ' ' + task.description).toLowerCase();
    const goalText = goal.toLowerCase();
    
    if (goalText.includes('developer') || goalText.includes('programming')) {
      if (taskText.includes('react') || taskText.includes('component')) {
        return 'Builds frontend skills essential for developer roles';
      }
      if (taskText.includes('api') || taskText.includes('backend')) {
        return 'Develops backend capabilities required for full-stack development';
      }
      if (taskText.includes('database') || taskText.includes('data')) {
        return 'Establishes data management skills for complete applications';
      }
    }
    
    // Generic connection
    return `Advances core skills toward achieving: ${goal}`;
  }
}
