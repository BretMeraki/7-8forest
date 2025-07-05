// @ts-nocheck
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildBlueprint, writeBlueprint } from './ast-blueprint-extractor.js';
import { isParseableFile, isExcludedDirectory } from './file-exclusion.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STAGE1_ROOT = path.resolve(__dirname, '..');
const BLUEPRINT_PATH = path.join(STAGE1_ROOT, '.forest-data', 'static_hta_blueprint.json');

let cachedBlueprint = null;

function isStale() {
  try {
    const bpStat = fs.statSync(BLUEPRINT_PATH);
    const htaCoreFile = path.join(STAGE1_ROOT, 'modules', 'hta-core.js');
    const taskStrategyCoreFile = path.join(STAGE1_ROOT, 'modules', 'task-strategy-core.js');
    
    // Safety check - ensure files are parseable and not in excluded directories
    if (!isParseableFile(htaCoreFile) || !isParseableFile(taskStrategyCoreFile)) {
      console.warn('[Blueprint] Core files are not parseable, treating as stale');
      return true;
    }
    
    if (isExcludedDirectory(path.dirname(htaCoreFile)) || isExcludedDirectory(path.dirname(taskStrategyCoreFile))) {
      console.warn('[Blueprint] Core files are in excluded directories, treating as stale');
      return true;
    }
    
    const m1 = fs.statSync(htaCoreFile).mtimeMs;
    const m2 = fs.statSync(taskStrategyCoreFile).mtimeMs;
    return bpStat.mtimeMs < Math.max(m1, m2);
  } catch {
    return true; // If any file missing, treat as stale
  }
}

function ensureBlueprint() {
  if (isStale()) {
    const bp = buildBlueprint();
    writeBlueprint(bp);
    cachedBlueprint = bp;
  }
}

export function getBlueprint() {
  if (!cachedBlueprint) {
    ensureBlueprint();
    const raw = fs.readFileSync(BLUEPRINT_PATH, 'utf8');
    cachedBlueprint = JSON.parse(raw);
  }
  return cachedBlueprint;
}

/**
 * Return meta for specific function (or undefined).
 */
export function getFunctionMeta(fnName) {
  const bp = getBlueprint();
  return bp[fnName];
} 