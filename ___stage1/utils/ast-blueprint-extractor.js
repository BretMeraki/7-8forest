// @ts-nocheck
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@babel/parser';
import traversePkg from '@babel/traverse';
import { isParseableFile, isExcludedDirectory, filterFiles } from './file-exclusion.js';
const traverse = traversePkg.default || traversePkg;

/**
 * AST Blueprint Extractor – Stage-1
 * ---------------------------------
 * Lightweight utility that parses the two critical Stage-1 modules
 * (`hta-core.js`, `task-strategy-core.js`) and produces a static blueprint
 * describing where each exported function lives and which HTA node fields
 * it *reads* or *writes*.
 *
 * The resulting JSON is saved to `.forest-data/static_hta_blueprint.json`.
 * This file will be consumed by runtime guard-rails (added in later milestones)
 * to validate HTA mutations and ground LLM prompts.
 *
 * Usage (npm script):
 *   npm run generate:blueprint
 */

// Resolve __dirname in ES-module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STAGE1_ROOT = path.resolve(__dirname, '..');
const MODULE_DIR = path.join(STAGE1_ROOT, 'modules');
const OUTPUT_PATH = path.join(STAGE1_ROOT, '.forest-data', 'static_hta_blueprint.json');

const TARGET_FILES = [
  'hta-core.js',
  'task-strategy-core.js',
].map((f) => path.join(MODULE_DIR, f))
 .filter(fs.existsSync)
 .filter(isParseableFile);

const PARSER_OPTIONS = {
  sourceType: 'module',
  plugins: [
    'classProperties',
    'dynamicImport',
    'optionalChaining',
    'nullishCoalescingOperator',
    'typescript',
  ],
  allowImportExportEverywhere: true,
  errorRecovery: true,
};

/**
 * Utility: Given an AssignmentExpression node left-hand side, determine if it
 * matches `exports.<name>` (CommonJS export pattern).
 */
function getCommonJSExportName(node) {
  if (!node) return null;
  if (node.type !== 'MemberExpression') return null;
  if (node.object.type === 'Identifier' && node.object.name === 'exports') {
    if (node.property.type === 'Identifier') return node.property.name;
  }
  return null;
}

/**
 * Walk the AST of a single file and collect blueprint info.
 */
function collectFromFile(filePath, blueprint) {
  // Skip if file should be excluded
  if (!isParseableFile(filePath)) {
    console.warn(`[Blueprint] Skipping excluded file: ${filePath}`);
    return;
  }
  
  // Skip if file is in an excluded directory
  if (isExcludedDirectory(path.dirname(filePath))) {
    console.warn(`[Blueprint] Skipping file in excluded directory: ${filePath}`);
    return;
  }
  
  const code = fs.readFileSync(filePath, 'utf8');
  let ast;
  try {
    ast = parse(code, PARSER_OPTIONS);
  } catch (err) {
    console.error(`[Blueprint] Failed to parse ${filePath}:`, err.message);
    return;
  }

  traverse(ast, {
    /**
     * Handle ES module `export function foo()` declarations.
     */
    ExportNamedDeclaration(nodePath) {
      const { declaration, loc, leadingComments } = nodePath.node;
      if (declaration && declaration.type === 'FunctionDeclaration') {
        const name = declaration.id?.name;
        if (name) {
          blueprint[name] = {
            file: path.relative(STAGE1_ROOT, filePath),
            loc: { start: loc.start.line, end: loc.end.line },
            doc: (leadingComments ?? []).map((c) => c.value.trim()).join('\n'),
            reads: new Set(),
            writes: new Set(),
          };
        }
      }
    },

    /**
     * Handle CommonJS `exports.foo = function …` pattern.
     */
    AssignmentExpression(nodePath) {
      const exportName = getCommonJSExportName(nodePath.node.left);
      if (!exportName) return;

      // Grab function node (could be FunctionExpression or ArrowFunctionExpression)
      const right = nodePath.node.right;
      if (right.type !== 'FunctionExpression' && right.type !== 'ArrowFunctionExpression') {
        return;
      }

      const { loc, leadingComments } = nodePath.node;
      blueprint[exportName] = blueprint[exportName] || {
        file: path.relative(STAGE1_ROOT, filePath),
        loc: { start: loc.start.line, end: loc.end.line },
        doc: (leadingComments ?? []).map((c) => c.value.trim()).join('\n'),
        reads: new Set(),
        writes: new Set(),
      };

      // Traverse the function body to find node.<field> accesses
      nodePath.traverse({
        MemberExpression(memberPath) {
          const { object, property } = memberPath.node;
          if (object.type === 'Identifier' && object.name === 'node') {
            if (property.type === 'Identifier') {
              const fieldName = property.name;
              const parent = memberPath.parent;
              const isWrite =
                parent.type === 'AssignmentExpression' && parent.left === memberPath.node;
              if (isWrite) {
                blueprint[exportName].writes.add(fieldName);
              } else {
                blueprint[exportName].reads.add(fieldName);
              }
            }
          }
        },
      });
    },

    ClassMethod(methodPath) {
      const { key, loc } = methodPath.node;
      if (key && key.type === 'Identifier') {
        const name = key.name;
        blueprint[name] = blueprint[name] || {
          file: path.relative(STAGE1_ROOT, filePath),
          loc: { start: loc.start.line, end: loc.end.line },
          doc: '',
          reads: new Set(),
          writes: new Set(),
        };

        // detect node.<field> accesses inside method
        methodPath.traverse({
          MemberExpression(me) {
            const { object, property } = me.node;
            if (object.type === 'Identifier' && object.name === 'node') {
              if (property.type === 'Identifier') {
                const fieldName = property.name;
                const parent = me.parent;
                const isWrite = parent.type === 'AssignmentExpression' && parent.left === me.node;
                if (isWrite) {
                  blueprint[name].writes.add(fieldName);
                } else {
                  blueprint[name].reads.add(fieldName);
                }
              }
            }
          },
        });
      }
    },
  });
}

function extractBlueprint() {
  const blueprint = {};
  for (const file of TARGET_FILES) {
    collectFromFile(file, blueprint);
  }

  // Convert Sets ➝ sorted arrays for JSON serialisation
  for (const fn of Object.values(blueprint)) {
    if (fn.reads && fn.writes) {
      fn.reads = Array.from(fn.reads).sort();
      fn.writes = Array.from(fn.writes).sort();
    }
  }

  return blueprint;
}

function writeBlueprint(blueprint) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(blueprint, null, 2));
}

/* ------------------------------------------------------------- */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('🔍 Extracting AST blueprint for HTA validation...');
  const blueprint = extractBlueprint();
  writeBlueprint(blueprint);
  
  const functionCount = Object.keys(blueprint).length;
  console.log(`✅ Blueprint generated: ${functionCount} functions analyzed`);
  console.log(`📁 Saved to: ${OUTPUT_PATH}`);
  
  // Show some statistics
  const readCounts = Object.values(blueprint).map(fn => fn.reads?.length || 0);
  const writeCounts = Object.values(blueprint).map(fn => fn.writes?.length || 0);
  const totalReads = readCounts.reduce((sum, count) => sum + count, 0);
  const totalWrites = writeCounts.reduce((sum, count) => sum + count, 0);
  
  console.log(`📊 Analysis complete:`);
  console.log(`   - ${totalReads} field reads detected`);
  console.log(`   - ${totalWrites} field writes detected`);
  console.log(`   - Functions with writes: ${writeCounts.filter(c => c > 0).length}`);
  
  process.exit(0);
}

export { extractBlueprint as buildBlueprint, writeBlueprint }; 