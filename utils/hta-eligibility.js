/**
 * HTA Task Eligibility Checker
 * Determines if a task is eligible for selection based on various criteria
 */

export function isTaskEligible(task, context = {}) {
  if (!task || typeof task !== 'object') {
    return false;
  }
  
  // Check if task is already completed
  if (task.completed === true) {
    return false;
  }
  
  // Check prerequisites
  if (task.prerequisites && task.prerequisites.length > 0) {
    // For now, assume all prerequisites are met
    // In a real implementation, this would check against completed tasks
    return true;
  }
  
  // Check difficulty vs energy level
  const energyLevel = context.energyLevel || 3;
  const taskDifficulty = task.difficulty || 1;
  
  // Task is eligible if difficulty doesn't exceed energy level by more than 2
  if (taskDifficulty > energyLevel + 2) {
    return false;
  }
  
  return true;
}

export function filterEligibleTasks(tasks, context = {}) {
  if (!Array.isArray(tasks)) {
    return [];
  }
  
  return tasks.filter(task => isTaskEligible(task, context));
}

export function checkPrerequisites(task, completedTasks = []) {
  if (!task.prerequisites || task.prerequisites.length === 0) {
    return true;
  }
  
  const completedIds = new Set(completedTasks.map(t => t.id));
  return task.prerequisites.every(prereqId => completedIds.has(prereqId));
}

export function isNodeReady(task, context = {}) {
  // Alias for isTaskEligible for compatibility
  return isTaskEligible(task, context);
} 