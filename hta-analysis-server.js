#!/usr/bin/env node
/**
 * HTA Analysis Server (RAG + LLM placeholder)
 * -------------------------------------------
 * A lightweight JSON-RPC server that communicates via STDIN / STDOUT.
 * The only supported method is `generate_hta_structure`.
 *
 * For now it does a heuristic generation so we can verify the plumbing.
 * Later we will swap in real retrieval and LLM calls.
 */
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { HTAVectorStore } from './___stage1/modules/hta-vector-store.js';
import embeddingService from './___stage1/utils/embedding-service.js';
import { globalCircuitBreaker } from './___stage1/utils/llm-circuit-breaker.js';
import { Client as RpcClient, StdioClientTransport } from './___stage1/local-mcp-client.js';

// Cached MCP client
let cachedMcpClient = null;
async function getMcpClient() {
  if (cachedMcpClient) return cachedMcpClient;
  const transport = new StdioClientTransport();
  const client = new RpcClient({ name: 'hta-analysis-client' });
  await client.connect(transport);
  cachedMcpClient = client;
  return client;
}

// Util: send JSON-RPC response
function sendResponse(id, result) {
  const payload = JSON.stringify({ id, result });
  output.write(payload + '\n');
}

// Very simple branch/task generator (placeholder until RAG+LLM is wired)
function createHeuristicStructure({ goal = 'Learning Goal', focus_areas = [], learning_style = 'mixed' } = {}) {
  const branchNames = [
    'Foundation',
    'Research',
    'Capability Building',
    'Implementation',
    'Mastery',
  ];

  // Helper to create tasks for a branch
  const createTasks = (branch) => [
    {
      title: `Intro to ${goal}: ${branch}`,
      description: `Understand key concepts of ${goal} within ${branch.toLowerCase()} phase`,
      difficulty: 1,
      duration: '20 minutes',
    },
    {
      title: `${branch} deep-dive for ${goal}`,
      description: `Apply ${branch.toLowerCase()} principles to ${goal}`,
      difficulty: 3,
      duration: '40 minutes',
    },
  ];

  const strategic_branches = branchNames.map((name, idx) => ({
    name,
    description: `${name} phase for ${goal}`,
    priority: idx + 1,
    tasks: createTasks(name),
  }));

  return {
    goal,
    focus_areas,
    learning_style,
    depth_config: { target_depth: 3 },
    strategic_branches,
    metadata: { source: 'heuristic-generator' },
  };
}

async function generateHTAStructure(params = {}) {
  const { goal = 'Learning Goal', focus_areas = [], learning_style = 'mixed' } = params;

  // -------- 1. Retrieve context snippets via vector store --------
  let contextSnippets = [];
  try {
    const vectorStore = new HTAVectorStore();
    await vectorStore.initialize();
    const queryVec = await embeddingService.embedText(goal, 1536);
    const retrievals = await vectorStore.provider.queryVectors(queryVec, {
      limit: 6,
      threshold: 0.15,
    });
    contextSnippets = retrievals
      .map((r) => {
        const md = r.metadata || {};
        if (md.type === 'task') {
          return `${md.title || 'Task'}: ${(md.description || '').slice(0, 200)}`;
        }
        return md.content || md.description || '';
      })
      .filter(Boolean);
  } catch (err) {
    console.error('[HTA-Server] Retrieval failed:', err.message);
  }

  // -------- 2. Build LLM prompt --------
  const prompt =
    `Generate a personalized HTA (Hierarchical Task Analysis) structure. Return ONLY valid JSON (no markdown).\n` +
    `Goal: ${goal}\n` +
    `Learning Style: ${learning_style}\n` +
    `Focus Areas: ${focus_areas.join(', ') || 'General'}\n` +
    (contextSnippets.length ? `\nRelevant context:\n- ${contextSnippets.join('\n- ')}` : '') +
    `\n\nSchema example:\n{\n  "strategic_branches": [{"name":"Branch","description":"Desc","priority":1,"tasks":[{"title":"Task","description":"Desc","difficulty":2,"duration":"25 minutes"}]}],\n  "depth_config": {"target_depth":3}\n}`;

  // -------- 3. Call LLM via circuit breaker --------
  let llmContent = null;
  try {
    const messages = [
      { role: 'system', content: 'You are an expert instructional designer returning strict JSON.' },
      { role: 'user', content: prompt },
    ];

    llmContent = await globalCircuitBreaker.call(
      async () => {
        const client = await getMcpClient();
        const rpcResponse = await client.callTool('ask_truthful_claude_forest', { prompt: messages.map(m=>m.content).join('\n---\n') });
        // Expecting { result: { content: '...' } }
        return rpcResponse?.result?.content || rpcResponse?.result?.answer || '';
      },
      () => null,
      'hta_generation',
    );
  } catch (err) {
    console.error('[HTA-Server] LLM call failed:', err.message);
  }

  // -------- 4. Parse / validate --------
  if (llmContent) {
    try {
      const parsed = JSON.parse(llmContent.trim());
      if (parsed && Array.isArray(parsed.strategic_branches)) {
        return {
          goal,
          focus_areas,
          learning_style,
          depth_config: parsed.depth_config || { target_depth: 3 },
          strategic_branches: parsed.strategic_branches,
          metadata: { source: 'rag-llm' },
        };
      }
    } catch (err) {
      console.error('[HTA-Server] JSON parse failed:', err.message);
    }
  }

  // -------- 5. Fallback --------
  return createHeuristicStructure({ goal, focus_areas, learning_style });
}

async function main() {
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch (err) {
      // Ignore malformed lines
      continue;
    }

    // Expect JSON-RPC { id, method, params }
    const { id, method, params } = msg;
    if (method === 'generate_hta_structure') {
      const hta_structure = await generateHTAStructure(params || {});
      sendResponse(id, { hta_structure });
    } else {
      sendResponse(id, { error: `Unknown method: ${method}` });
    }
  }
}

main().catch((err) => {
  console.error('HTA Analysis Server fatal error:', err);
  process.exit(1);
});
