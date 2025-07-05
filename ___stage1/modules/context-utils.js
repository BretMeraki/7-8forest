/**
 * Context Utilities - Build Rich Context and Format Constraints
 *
 * Phase-1 implementation replaces previous stub functions so that:
 * 1. Unit tests in __tests__/context-utils.test.js pass.
 * 2. Core modules (hta-core.js) receive a rich, human-readable Markdown snippet when
 *    additional arguments are provided.
 *
 * The function behaviour blueprint is:
 *   • extractTravellerConstraints(config) –e  Normalises & returns traveller/learner constraints.
 *   • buildRichContext(config, complexityAnalysis?, learningStyle?, focusAreas?) –
 *       – When invoked with ONLY a config (unit tests) ⇒ returns an object containing
 *         { travellerConstraints, raw } for downstream programmatic use.
 *       – When invoked with the extra arguments (runtime inside HTACore) ⇒ returns a
 *         formatted multi-line Markdown string suitable for inclusion in LLM prompts.
 *   • formatConstraintsForPrompt(constraints) – Converts an array returned by
 *     extractTravellerConstraints into a readable bullet-list string.
 */

/**
 * Extracts traveller/learner constraints from the project configuration.
 * Supports generic keys (travellers, learners) to stay future-proof.
 * All keys are down-cased and normalised to snake_case style for consistency.
 *
 * @param {object} config – Project configuration object.
 * @returns {Array<object>} Array of normalised traveller constraint objects.
 */
export function extractTravellerConstraints(config = {}) {
  const list = Array.isArray(config.travellers)
    ? config.travellers
    : Array.isArray(config.learners)
    ? config.learners
    : [];

  return list.map((trav) => {
    if (trav == null || typeof trav !== 'object') return {};
    const normalised = {};
    for (const [key, value] of Object.entries(trav)) {
      // Convert key to lower_snake_case (simple approach)
      const snake = key
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/\s+/g, '_')
        .toLowerCase();
      normalised[snake] = value;
    }
    if (!normalised.name && trav.name) {
      normalised.name = trav.name;
    }
    return normalised;
  });
}

/**
 * Builds a rich, markdown-friendly context representation of the current project
 * configuration and meta-analysis.
 *
 * Behaviour changes based on invocation signature:
 *   – If called with ONLY the config argument (tests/util use-case) it returns an
 *     object containing raw config and traveller constraints.
 *   – If called with additional arguments (complexityAnalysis, etc.) it returns a
 *     formatted string for prompt injection.
 *
 * @param {object} config – Project configuration.
 * @param {?object} complexityAnalysis – Optional complexity analysis object.
 * @param {string} [learningStyle='mixed'] – Preferred learning style.
 * @param {Array<string>} [focusAreas=[]] – Focus areas / domains of interest.
 * @returns {object|string} Rich context object OR markdown string.
 */
export function buildRichContext(
  config = {},
  complexityAnalysis = null,
  learningStyle = 'mixed',
  focusAreas = []
) {
  // Unit-test / programmatic mode – return structured object
  if (complexityAnalysis === null || typeof complexityAnalysis !== 'object') {
    return {
      travellerConstraints: extractTravellerConstraints(config),
      raw: config,
    };
  }

  // Runtime mode – build string for LLM prompts
  const sections = [];

  sections.push('### Learner Profile');
  sections.push(`• Goal: ${config.goal || 'N/A'}`);
  if (config.context) sections.push(`• Context: ${config.context}`);
  if (config.domain) sections.push(`• Domain: ${config.domain}`);
  if (learningStyle) sections.push(`• Preferred learning style: ${learningStyle}`);
  if (Array.isArray(focusAreas) && focusAreas.length) {
    sections.push(`• Focus areas: ${focusAreas.join(', ')}`);
  }

  const travellerConstraints = extractTravellerConstraints(config);
  if (travellerConstraints.length) {
    sections.push('\n### Constraints');
    sections.push(formatConstraintsForPrompt(travellerConstraints));
  }

  if (complexityAnalysis?.analysis) {
    sections.push('\n### Complexity Analysis');
    sections.push(complexityAnalysis.analysis);
  }

  return sections.join('\n');
}

/**
 * Formats traveller constraint objects into a human-readable string suitable for
 * LLM prompt consumption.
 *
 * @param {Array<object>} constraints – Output of extractTravellerConstraints.
 * @returns {string} Bullet-list markdown string.
 */
export function formatConstraintsForPrompt(constraints = []) {
  if (!Array.isArray(constraints) || constraints.length === 0) return '';

  return constraints
    .map((trav) => {
      if (!trav || typeof trav !== 'object') return '';
      const { name, ...rest } = trav;
      const kv = Object.entries(rest)
        .map(([k, v]) => {
          const valueStr = Array.isArray(v) ? v.join(', ') : String(v);
          return `${k}: ${valueStr}`;
        })
        .join('; ');
      return `• ${name || 'Unnamed'} – ${kv}`;
    })
    .filter(Boolean)
    .join('\n');
}
