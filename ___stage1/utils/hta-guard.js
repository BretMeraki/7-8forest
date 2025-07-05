// @ts-nocheck
import { getFunctionMeta } from './blueprint-loader.js';
import { validateTask } from './hta-validator.js';

/**
 * guard(fnName, fn) – Decorator that validates HTA mutations.
 * 1. Ensures any task objects created/modified respect allowed fields.
 * 2. Verifies that mutated fields are listed in the blueprint for the function.
 *    (best-effort; only checks direct writes we can see via shallow diff).
 */
export function guard(fnName, mutationFn) {
  return async function guarded(...args) {
    const before = JSON.parse(JSON.stringify(globalThis.HTA?.tree || {})); // naive deep clone
    const result = await mutationFn.apply(this, args);
    const after = globalThis.HTA?.tree || {};

    // Compare tasks arrays if present
    try {
      const newTasks = findNewTasks(before, after);
      for (const task of newTasks) {
        const errs = validateTask(task);
        if (errs.length) {
          throw new Error(`HTA guard: Invalid task structure – ${errs.join(', ')}`);
        }
        // Blueprint field check
        const meta = getFunctionMeta(fnName);
        if (meta && meta.writes && meta.writes.length) {
          const unexpected = Object.keys(task).filter(
            (k) => !meta.writes.includes(k) && !['id', 'prerequisites'].includes(k)
          );
          if (unexpected.length) {
            throw new Error(`HTA guard: Function ${fnName} attempted to write unexpected fields: ${unexpected.join(', ')}`);
          }
        }
      }
    } catch (err) {
      console.warn('[HTA-Guard] Blocked mutation:', err.message);
      // rollback
      globalThis.HTA.tree = before;
      throw err;
    }

    return result;
  };
}

function findNewTasks(beforeTree, afterTree) {
  const beforeIds = new Set();
  collectIds(beforeTree, beforeIds);
  const newTasks = [];
  traverseTasks(afterTree, (task) => {
    if (!beforeIds.has(task.id)) {
      newTasks.push(task);
    }
  });
  return newTasks;
}

function collectIds(tree, idSet) {
  traverseTasks(tree, (t) => idSet.add(t.id));
}

function traverseTasks(node, cb) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((n) => traverseTasks(n, cb));
  } else if (typeof node === 'object') {
    if (node.id && node.title) cb(node);
    for (const v of Object.values(node)) {
      traverseTasks(v, cb);
    }
  }
} 