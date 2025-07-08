/**
 * HTA Hierarchy Utility Functions
 * --------------------------------
 * Standalone hierarchy intelligence utility as specified in PRD Section 3.1
 * 
 * These lightweight helpers make it easier for other modules to work with
 * hierarchical HTA structures without duplicating traversal logic.
 * 
 * All functions are written in plain JavaScript and avoid any domain-specific
 * assumptions so they remain fully domain-agnostic.
 */

// HTA Level Constants
export const HTA_LEVELS = {
  GOAL: 'goal',
  STRATEGY: 'strategy',
  BRANCH: 'branch',
  TASK: 'task',
  ACTION: 'action'
};

/**
 * Build a parent→children lookup map for quick ancestry traversal.
 * @param {object} hta - HTA structure with frontierNodes
 * @returns {object} Map where keys are node IDs and values are arrays of prerequisite IDs
 */
export function buildParentChildMap(hta) {
  if (!hta || !hta.frontierNodes || !Array.isArray(hta.frontierNodes)) {
    return {};
  }
  
  const map = {};
  
  function processNode(node) {
    if (node && node.id) {
      map[node.id] = Array.isArray(node.prerequisites) ? [...node.prerequisites] : [];
      
      // Recursively process subtasks if they exist
      if (node.subtasks && Array.isArray(node.subtasks)) {
        for (const subtask of node.subtasks) {
          processNode(subtask);
        }
      }
    }
  }
  
  // Process all frontierNodes
  for (const node of hta.frontierNodes) {
    processNode(node);
  }
  
  return map;
}

/**
 * Get direct children of a parent node.
 * @param {string} nodeId - ID of the node to get children for
 * @param {object} map - Parent-child map from buildParentChildMap
 * @returns {Array<string>} Array of child node IDs (prerequisites)
 */
export function getChildren(nodeId, map) {
  if (!nodeId || !map || typeof map !== 'object') {
    return [];
  }
  
  return map[nodeId] || [];
}

/**
 * Extract actionable leaf-level tasks from HTA structure.
 * @param {object} hta - HTA structure with frontierNodes
 * @returns {Array<object>} Array of leaf tasks
 */
export function getLeafTasks(hta) {
  if (!hta || !hta.frontierNodes || !Array.isArray(hta.frontierNodes)) {
    return [];
  }
  
  const leafTasks = [];
  
  function extractTasks(node) {
    if (node && typeof node === 'object' && node.id) {
      leafTasks.push(node);
      
      // Recursively add subtasks if they exist
      if (node.subtasks && Array.isArray(node.subtasks)) {
        for (const subtask of node.subtasks) {
          extractTasks(subtask);
        }
      }
    }
  }
  
  for (const node of hta.frontierNodes) {
    extractTasks(node);
  }
  
  return leafTasks;
}

/**
 * Detect common hierarchy problems such as orphaned nodes or cycles.
 * @param {object} hta - HTA structure with frontierNodes
 * @returns {{valid:boolean, errors:string[], orphans:string[], cycles:Array<string[]>}}
 */
export function validateHierarchy(hta) {
  const errors = [];
  const orphans = [];
  const cycles = [];
  
  if (!hta || !hta.frontierNodes || !Array.isArray(hta.frontierNodes)) {
    return { valid: true, errors, orphans, cycles };
  }
  
  // Get all task IDs
  const allTasks = getLeafTasks(hta);
  const taskIds = new Set(allTasks.map(t => t.id));
  
  // Check for orphaned tasks (prerequisites that don't exist)
  for (const task of allTasks) {
    if (task.prerequisites && Array.isArray(task.prerequisites)) {
      for (const prereq of task.prerequisites) {
        if (!taskIds.has(prereq)) {
          orphans.push(task.id);
          break;
        }
      }
    }
  }
  
  // Check for cycles using DFS
  const visited = new Set();
  const recursionStack = new Set();
  
  function hasCycle(taskId, currentPath = []) {
    if (recursionStack.has(taskId)) {
      // Found a cycle
      const cycleStart = currentPath.indexOf(taskId);
      const cycle = currentPath.slice(cycleStart).concat([taskId]);
      cycles.push(cycle);
      return true;
    }
    
    if (visited.has(taskId)) {
      return false;
    }
    
    visited.add(taskId);
    recursionStack.add(taskId);
    currentPath.push(taskId);
    
    const task = allTasks.find(t => t.id === taskId);
    if (task && task.prerequisites && Array.isArray(task.prerequisites)) {
      for (const prereq of task.prerequisites) {
        if (hasCycle(prereq, [...currentPath])) {
          return true;
        }
      }
    }
    
    recursionStack.delete(taskId);
    currentPath.pop();
    return false;
  }
  
  for (const task of allTasks) {
    if (!visited.has(task.id)) {
      hasCycle(task.id);
    }
  }
  
  return {
    valid: errors.length === 0 && orphans.length === 0 && cycles.length === 0,
    errors,
    orphans,
    cycles
  };
}

/**
 * Flatten HTA structure into actionable tasks.
 * @param {object} hta - HTA structure with frontierNodes
 * @returns {Array<object>} Array of actionable tasks
 */
export function flattenToActions(hta) {
  return getLeafTasks(hta);
}

/**
 * Build a dependency graph with nodes and edges.
 * @param {object} hta - HTA structure with frontierNodes
 * @returns {{nodes: Array<object>, edges: Array<{from: string, to: string}>}}
 */
export function buildDependencyGraph(hta) {
  if (!hta || !hta.frontierNodes || !Array.isArray(hta.frontierNodes)) {
    return { nodes: [], edges: [] };
  }
  
  const allTasks = getLeafTasks(hta);
  const nodes = allTasks.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description
  }));
  
  const edges = [];
  
  for (const task of allTasks) {
    if (task.prerequisites && Array.isArray(task.prerequisites)) {
      for (const prereq of task.prerequisites) {
        edges.push({
          from: prereq,
          to: task.id
        });
      }
    }
  }
  
  return { nodes, edges };
}

/**
 * Get all ancestor nodes for a given node ID using prerequisite relationships.
 * @param {string} nodeId - ID of the node to get ancestors for
 * @param {object} map - Parent-child map from buildParentChildMap
 * @returns {Array<string>} Array of ancestor node IDs
 */
export function getAncestors(nodeId, map) {
  if (!nodeId || !map || typeof map !== 'object') {
    return [];
  }
  
  const ancestors = [];
  const visited = new Set();
  const prerequisites = map[nodeId] || [];
  
  function collectAncestors(currentId, path = []) {
    if (visited.has(currentId) || path.includes(currentId)) return;
    visited.add(currentId);
    
    const prereqs = map[currentId] || [];
    for (const prereq of prereqs) {
      if (!ancestors.includes(prereq) && !path.includes(prereq)) {
        ancestors.push(prereq);
        collectAncestors(prereq, [...path, currentId]);
      }
    }
  }
  
  for (const prereq of prerequisites) {
    if (!ancestors.includes(prereq)) {
      ancestors.push(prereq);
      collectAncestors(prereq, [nodeId]);
    }
  }
  
  return ancestors;
}

/**
 * Get all descendant nodes for a given node ID.
 * @param {string} nodeId - ID of the node to get descendants for
 * @param {object} reverseMap - Reverse dependency map (from parent to children)
 * @returns {Array<string>} Array of descendant node IDs
 */
export function getDescendants(nodeId, reverseMap) {
  if (!nodeId || !reverseMap || typeof reverseMap !== 'object') {
    return [];
  }
  
  const descendants = [];
  const visited = new Set();
  
  function collectDescendants(currentId, path = []) {
    if (visited.has(currentId) || path.includes(currentId)) return;
    visited.add(currentId);
    
    const children = reverseMap[currentId] || [];
    for (const child of children) {
      if (!descendants.includes(child) && !path.includes(child)) {
        descendants.push(child);
        collectDescendants(child, [...path, currentId]);
      }
    }
  }
  
  collectDescendants(nodeId);
  
  return descendants;
}

/**
 * Calculate the depth/level of a node in the hierarchy based on prerequisites.
 * @param {string} nodeId - ID of the node to calculate depth for
 * @param {object} map - Parent-child map from buildParentChildMap
 * @returns {number} Depth level (0 = no prerequisites, 1+ = has prerequisites)
 */
export function getNodeDepth(nodeId, map) {
  if (!nodeId || !map || typeof map !== 'object') {
    return -1;
  }
  
  if (!map.hasOwnProperty(nodeId)) {
    return -1;
  }
  
  const prerequisites = map[nodeId] || [];
  if (prerequisites.length === 0) {
    return 0;
  }
  
  const visited = new Set();
  
  function calculateDepth(currentId, currentDepth) {
    if (visited.has(currentId) || currentDepth > 100) {
      return currentDepth;
    }
    
    visited.add(currentId);
    const prereqs = map[currentId] || [];
    
    if (prereqs.length === 0) {
      return currentDepth;
    }
    
    let maxPrereqDepth = currentDepth;
    for (const prereq of prereqs) {
      const depth = calculateDepth(prereq, currentDepth + 1);
      maxPrereqDepth = Math.max(maxPrereqDepth, depth);
    }
    
    return maxPrereqDepth;
  }
  
  return calculateDepth(nodeId, 0);
}

// All functions and constants are exported individually above
