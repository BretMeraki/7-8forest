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
const HTA_LEVELS = {
  GOAL: 0,
  STRATEGY: 1, 
  BRANCH: 2,
  TASK: 3,
  ACTION: 4
};

/**
 * Build a parent→children lookup map for quick ancestry traversal.
 * @param {Array<{id:string, parent_id?:string|null}>} nodes
 * @returns {Map<string, Array<object>>}
 */
export function buildParentMap(nodes = []) {
  /** @type {Map<string, Array<object>>} */
  const map = new Map();
  if (!Array.isArray(nodes)) return map;
  for (const node of nodes) {
    const parent = node.parent_id ?? '__root__';
    if (!map.has(parent)) map.set(parent, []);
    map.get(parent).push(node);
  }
  return map;
}

/**
 * Get direct children of a parent node.
 * @param {Array<object>} nodes
 * @param {string|null} parentId
 * @returns {Array<object>}
 */
export function getChildren(nodes = [], parentId = null) {
  const map = buildParentMap(nodes);
  return map.get(parentId ?? '__root__') || [];
}

/**
 * Extract actionable leaf-level tasks (level >= ACTION or nodes with no children).
 * Essential for frontier node management and task selection.
 * @param {Array<object>} nodes
 * @returns {Array<object>} Actionable tasks
 */
export function getLeafTasks(nodes = []) {
  if (!Array.isArray(nodes)) return [];
  const map = buildParentMap(nodes);
  return nodes.filter(n => {
    // Explicit action-level flag takes precedence
    if (n.level !== undefined && n.level !== null) {
      return n.level >= HTA_LEVELS.ACTION;
    }
    // Fallback: treat as leaf if no children recorded
    return !(map.get(n.id) && map.get(n.id).length > 0);
  });
}

/**
 * Detect common hierarchy problems such as orphaned nodes or cycles.
 * Critical for maintaining HTA tree structure integrity.
 * The implementation purposefully errs on the side of leniency to avoid
 * false positives at runtime.
 *
 * @param {Array<{id:string,parent_id?:string|null}>} nodes
 * @returns {{valid:boolean, errors:string[]}}
 */
export function validateHierarchy(nodes = []) {
  const errors = [];
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { valid: true, errors }; // nothing to validate
  }

  // 1. Check orphaned nodes (parent not present)
  const ids = new Set(nodes.map(n => n.id));
  for (const n of nodes) {
    if (n.parent_id && !ids.has(n.parent_id)) {
      errors.push(`Orphaned node ${n.id} references missing parent ${n.parent_id}`);
    }
  }

  // 2. Simple cycle detection via DFS (depth limited to avoid blow-ups)
  /** @type {Map<string,string|null>} */
  const parentMap = new Map();
  for (const n of nodes) parentMap.set(n.id, n.parent_id ?? null);
  for (const n of nodes) {
    const visited = new Set();
    let current = n.id;
    let depthGuard = 0;
    while (current !== null && depthGuard < 100) {
      if (visited.has(current)) {
        errors.push(`Cyclic dependency detected starting at ${n.id}`);
        break;
      }
      visited.add(current);
      current = parentMap.get(current) ?? null;
      depthGuard++;
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Flatten only actionable tasks into a single array for schedule generators.
 * Used by daily scheduling and task selection logic.
 * @param {Array<object>} nodes
 * @returns {Array<object>}
 */
export function flattenToActionTasks(nodes = []) {
  return getLeafTasks(nodes);
}

/**
 * Build a prerequisite adjacency list keyed by task ID.
 * Essential for dependency-aware task ordering and scheduling.
 * @param {Array<{id:string, prerequisites?:string[]}>} nodes
 * @returns {Map<string,string[]>}
 */
export function buildDependencyGraph(nodes = []) {
  /** @type {Map<string,string[]>} */
  const graph = new Map();
  if (!Array.isArray(nodes)) return graph;
  for (const n of nodes) {
    graph.set(n.id, Array.isArray(n.prerequisites) ? n.prerequisites : []);
  }
  return graph;
}

/**
 * Get all ancestor nodes for a given node ID.
 * Useful for understanding task context and branch relationships.
 * @param {Array<object>} nodes
 * @param {string} nodeId
 * @returns {Array<object>} Array of ancestor nodes from root to immediate parent
 */
export function getAncestors(nodes = [], nodeId) {
  if (!Array.isArray(nodes) || !nodeId) return [];
  
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const ancestors = [];
  let current = nodeMap.get(nodeId);
  
  while (current && current.parent_id) {
    const parent = nodeMap.get(current.parent_id);
    if (parent) {
      ancestors.unshift(parent); // Add to beginning for root->parent order
      current = parent;
    } else {
      break;
    }
  }
  
  return ancestors;
}

/**
 * Get all descendant nodes for a given node ID.
 * Useful for understanding subtree scope and impact analysis.
 * @param {Array<object>} nodes
 * @param {string} nodeId
 * @returns {Array<object>} Array of all descendant nodes
 */
export function getDescendants(nodes = [], nodeId) {
  if (!Array.isArray(nodes) || !nodeId) return [];
  
  const parentMap = buildParentMap(nodes);
  const descendants = [];
  const stack = [nodeId];
  
  while (stack.length > 0) {
    const current = stack.pop();
    const children = parentMap.get(current) || [];
    
    for (const child of children) {
      descendants.push(child);
      stack.push(child.id);
    }
  }
  
  return descendants;
}

/**
 * Calculate the depth/level of a node in the hierarchy.
 * Useful for understanding tree structure and rendering.
 * @param {Array<object>} nodes
 * @param {string} nodeId
 * @returns {number} Depth level (0 = root, 1 = first level, etc.)
 */
export function getNodeDepth(nodes = [], nodeId) {
  if (!Array.isArray(nodes) || !nodeId) return 0;
  
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  let depth = 0;
  let current = nodeMap.get(nodeId);
  
  while (current && current.parent_id) {
    depth++;
    current = nodeMap.get(current.parent_id);
    
    // Safety guard against infinite loops
    if (depth > 100) break;
  }
  
  return depth;
}

// Export all utilities with HTA_LEVELS constant
export default {
  buildParentMap,
  getChildren,
  getLeafTasks,
  flattenToActionTasks,
  validateHierarchy,
  buildDependencyGraph,
  getAncestors,
  getDescendants,
  getNodeDepth,
  HTA_LEVELS
};
