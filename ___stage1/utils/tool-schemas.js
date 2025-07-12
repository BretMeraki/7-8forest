// Simple JSON-schema–like definitions for MCP tools.
// Each entry lists required argument keys. Optional keys are allowed implicitly.

export const toolSchemas = {
  // Updated: goal is required, project_id is auto-generated if not provided
  create_project_forest: {
    required: ['goal'],
  },
  switch_project_forest: {
    required: ['project_id'],
  },
  list_projects_forest: {
    required: [],
  },
  get_active_project_forest: {
    required: [],
  },
  build_hta_tree_forest: {
    // All parameters optional. Goal is inferred from project config if not provided.
    required: [],
  },
  get_hta_status_forest: {
    required: [],
  },
  get_next_task_forest: {
    required: [], // no required fields - energy_level and time_available are optional
  },
  complete_block_forest: {
    required: ['block_id', 'outcome', 'energy_level'],
  },
  evolve_strategy_forest: {
    required: ['hint'],
  },
  current_status_forest: {
    required: [],
  },
  generate_daily_schedule_forest: {
    required: [],
  },
  sync_forest_memory_forest: {
    required: [],
  },
  ask_truthful_claude_forest: {
    required: ['prompt'],
  },
  get_health_status_forest: {
    required: [],
  },
  // Onboarding flow tools
  start_learning_journey_forest: {
    required: [],
  },
  continue_onboarding_forest: {
    required: [],
  },
  get_onboarding_status_forest: {
    required: [],
  },
  complete_onboarding_forest: {
    required: ['final_confirmation'],
  },
  // Ambiguous Desires functionality is now integrated into existing tools
};

/**
 * Validate args against the schema for a given tool.
 * Throws an Error if validation fails.
 * @param {string} toolName
 * @param {object} args
 */
export function validateToolCall(toolName, args = {}) {
  const schema = toolSchemas[toolName];
  if (!schema) {
    // Unknown tool – handled elsewhere; skip validation so we don't mask the unknown-tool error.
    return;
  }

  const missing = (schema.required || []).filter((k) => !(k in (args || {})));
  if (missing.length > 0) {
    throw new Error(
      `Missing required field(s): ${missing.join(', ')} for tool ${toolName}`,
    );
  }
}
