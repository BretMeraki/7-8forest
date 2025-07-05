// hta-graph-enricher.js
// Lightweight utilities to derive structural features from an HTA tree
// and generate embedding prompts that blend semantic and structural data.
// Keeping this domain-agnostic ensures the same code works for any sort of
// project or task description.

/*
  A "graph feature" is a set of numeric / categorical attributes we attach to
  each HTA node to help downstream retrieval blend structure with content:
    • depth           – 0 = goal, 1 = branch, 2 = task …
    • sibling_index    – order of the node amongst its siblings
    • prereq_count     – number of prerequisites for a task
    • child_count      – number of direct children (tasks inside branch, etc.)
    • critical_path    – estimated remaining depth from this node to goal
  These are intentionally simple so they can be injected into the embedding
  prompt as plain text without losing meaning.
*/

function enrichHTA(projectId, hta) {
  if (!hta || typeof hta !== 'object') {
    throw new Error('enrichHTA: invalid HTA object');
  }

  const { frontierNodes = [], strategicBranches = [] } = hta;

  const graphNodes = [];

  // Goal
  graphNodes.push({
    id: `${projectId}:goal`,
    type: 'goal',
    depth: 0,
    sibling_index: 0,
    prereq_count: 0,
    child_count: strategicBranches.length || frontierNodes.length,
    raw: hta.goal || '',
  });

  // Branches
  strategicBranches.forEach((br, idx) => {
    graphNodes.push({
      id: `${projectId}:branch:${br.name}`,
      type: 'branch',
      depth: 1,
      sibling_index: idx,
      prereq_count: 0,
      child_count: br.tasks ? br.tasks.length : 0,
      raw: br.description || '',
      branch: br.name,
    });
  });

  // Tasks
  frontierNodes.forEach((task, idx) => {
    graphNodes.push({
      id: `${projectId}:task:${task.id}`,
      type: 'task',
      depth: 2,
      sibling_index: idx,
      prereq_count: Array.isArray(task.prerequisites) ? task.prerequisites.length : 0,
      child_count: 0,
      raw: task.description || task.title || '',
      branch: task.branch,
    });
  });

  return graphNodes;
}

// Turn a graph-node record into a compact plain-text prompt that can be passed
// to an embedding model.  We keep it under ~200 tokens so OpenAI / local models
// don't choke.
function buildPrompt(node) {
  const parts = [
    `type:${node.type}`,
    `depth:${node.depth}`,
    `sibling:${node.sibling_index}`,
    `prereqs:${node.prereq_count}`,
    `children:${node.child_count}`,
  ];
  if (node.branch && node.type !== 'branch') {
    parts.push(`branch:${node.branch}`);
  }
  const meta = parts.join(' | ');
  return `${meta} \n ${node.raw}`.trim();
}

export { enrichHTA, buildPrompt };
