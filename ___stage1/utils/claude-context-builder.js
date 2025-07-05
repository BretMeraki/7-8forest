// claude-context-builder.js
// Build a concise, structure-aware context snippet for Claude.
// Combines semantic similarity (vector search) with live HTA state.

import embeddingService from './embedding-service.js';
import * as vectorConfigModule from '../config/vector-config.js';

const vectorConfig = vectorConfigModule.default || vectorConfigModule;

/**
 * Build a Claude-ready context block.
 * @param {HTAVectorStore} vectorStore – initialised instance
 * @param {string} projectId
 * @param {string} userContext – free-text from the user (e.g. current thought, location, energy)
 * @param {number} limit – how many matching nodes to include
 * @returns {Promise<string>} markdown snippet
 */
export async function buildClaudeContext(vectorStore, projectId, userContext = '', limit = 8) {
  if (!userContext) userContext = '';

  // Step 1: embed the user context
  const queryVec = await embeddingService.embedText(userContext, vectorConfig.qdrant.dimension);

  // Step 2: similarity search (filter to this project & non-completed tasks)
  const filter = {
    must: [
      { key: 'project_id', match: { value: projectId } },
    ],
  };

  // provider.queryVectors supports {limit, threshold, filter}
  const results = await vectorStore.provider.queryVectors(queryVec, {
    limit: limit * 2, // extra for later filtering
    threshold: 0.05,
    filter,
  });

  // Keep unique branches/tasks by ID, prefer higher similarity
  const chosen = [];
  const seen = new Set();
  for (const r of results) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    chosen.push(r);
    if (chosen.length >= limit) break;
  }

  // Group by type for nicer presentation
  const goal = chosen.find((c) => c.metadata?.type === 'goal');
  const branches = chosen.filter((c) => c.metadata?.type === 'branch');
  const tasks = chosen.filter((c) => c.metadata?.type === 'task');

  let md = '## 🌲 Forest HTA Context\n';
  if (goal) {
    md += `\n### 🎯 Goal\n${goal.metadata.content}\n`;
  }

  if (branches.length) {
    md += '\n### 🌳 Strategic Branches\n';
    branches.slice(0, 3).forEach((b) => {
      md += `• **${b.metadata.name}** – ${b.metadata.description}\n`;
    });
  }

  if (tasks.length) {
    md += '\n### 🔧 Candidate Tasks\n';
    tasks.slice(0, 5).forEach((t) => {
      const status = t.metadata.completed ? '✅' : '⬜️';
      md += `${status} [${t.metadata.priority}] ${t.metadata.title} – ${t.metadata.description}\n`;
    });
  }

  return md.trim();
}
