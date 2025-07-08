/**
 * Consolidated Tool Definitions for Forest Suite
 * Following the COMPLETE_FOREST_DOCUMENTATION.md specification
 * 
 * Core principle: One tool per function, no overlapping functionality
 */

export const FOREST_TOOLS = {
  // ========== PROJECT MANAGEMENT (Tools 1-3) ==========
  create_project_forest: {
    name: 'create_project_forest',
    description: 'Create new learning project with automatic HTA generation. REQUIRED: goal parameter. Auto-generates project_id if not provided.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: '**REQUIRED** Your learning goal or what you want to achieve (e.g., "learn to play guitar")'
        },
        project_id: {
          type: 'string',
          description: 'Optional: Custom project ID (auto-generated from goal if not provided)'
        },
        context: {
          type: 'string',
          description: 'Optional: Additional context about why this matters to you'
        },
        learning_style: {
          type: 'string',
          enum: ['visual', 'auditory', 'kinesthetic', 'reading', 'mixed'],
          description: 'Optional: Your preferred learning style (default: mixed)'
        }
      },
      required: ['goal']
    }
  },

  switch_project_forest: {
    name: 'switch_project_forest',
    description: 'Switch between existing projects. REQUIRED: project_id parameter.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: '**REQUIRED** ID of the project to switch to (use list_projects_forest to see available IDs)'
        }
      },
      required: ['project_id']
    }
  },

  list_projects_forest: {
    name: 'list_projects_forest',
    description: 'View all your projects with status and progress',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // ========== HTA INTELLIGENCE (Tools 4-5) ==========
  build_hta_tree_forest: {
    name: 'build_hta_tree_forest',
    description: 'Build or rebuild strategic HTA framework for a specific learning path',
    inputSchema: {
      type: 'object',
      properties: {
        path_name: {
          type: 'string',
          description: 'Learning path to build HTA tree for (e.g. "saxophone", "piano"). Uses active path or general if not specified.'
        },
        goal: {
          type: 'string',
          description: 'Optional goal override. If not provided, uses the goal from active project configuration.'
        },
        context: {
          type: 'string',
          description: 'Optional context override. If not provided, uses context from active project configuration.'
        },
        learning_style: {
          type: 'string',
          description: 'Learning approach preference (e.g. "hands-on", "theoretical", "mixed"). Defaults to "mixed".'
        },
        focus_areas: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific areas to emphasize in the learning plan (e.g. ["fundamentals", "practical application"]).'
        }
      }
    }
  },

  get_hta_status_forest: {
    name: 'get_hta_status_forest',
    description: 'View HTA strategic framework for active project',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // ========== TASK MANAGEMENT (Tools 6-7) ==========
  get_next_task_forest: {
    name: 'get_next_task_forest',
    description: 'Get the single most logical next task based on current progress and context. No required parameters.',
    inputSchema: {
      type: 'object',
      properties: {
        energy_level: {
          type: 'number',
          minimum: 1,
          maximum: 5,
          description: 'Optional: Current energy level to match appropriate task difficulty (1-5)'
        },
        time_available: {
          type: 'string',
          description: 'Optional: Time available for the task (e.g. "30 minutes", "1 hour")'
        },
        context_from_memory: {
          type: 'string',
          description: 'Optional: Context retrieved from Memory MCP about recent progress/insights'
        }
      }
    }
  },

  complete_block_forest: {
    name: 'complete_block_forest',
    description: 'Complete time block and capture insights for active project. REQUIRED: block_id parameter.',
    inputSchema: {
      type: 'object',
      properties: {
        block_id: {
          type: 'string',
          description: '**REQUIRED** ID of the task block to complete'
        },
        outcome: {
          type: 'string',
          description: 'Optional: What happened? Key insights?'
        },
        energy_level: {
          type: 'number',
          minimum: 1,
          maximum: 5,
          description: 'Optional: Energy after completion (1-5)'
        },
        learned: {
          type: 'string',
          description: 'Optional: What specific knowledge or skills did you gain?'
        },
        next_questions: {
          type: 'string',
          description: 'What questions emerged? What do you need to learn next?'
        },
        difficulty_rating: {
          type: 'number',
          minimum: 1,
          maximum: 5,
          description: 'How difficult was this task? (1=too easy, 5=too hard)'
        },
        breakthrough: {
          type: 'boolean',
          description: 'Major insight or breakthrough?'
        }
      },
      required: ['block_id', 'outcome', 'energy_level']
    }
  },

  // ========== STRATEGY EVOLUTION (Tool 8) ==========
  evolve_strategy_forest: {
    name: 'evolve_strategy_forest',
    description: 'Analyze patterns and evolve the approach for active project. REQUIRED: hint parameter.',
    inputSchema: {
      type: 'object',
      properties: {
        hint: {
          type: 'string',
          description: "**REQUIRED** What's working? What's not? What needs to change? (your feedback/hint for evolution)"
        }
      },
      required: ['hint']
    }
  },

  // ========== SYSTEM STATUS (Tools 9-10) ==========
  current_status_forest: {
    name: 'current_status_forest',
    description: 'Show todays progress and next action for active project',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  generate_daily_schedule_forest: {
    name: 'generate_daily_schedule_forest',
    description: 'ON-DEMAND: Generate comprehensive gap-free daily schedule when requested by user',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'YYYY-MM-DD, defaults to today'
        },
        energy_level: {
          type: 'number',
          minimum: 1,
          maximum: 5,
          description: 'Current energy level (affects task difficulty and timing)'
        },
        available_hours: {
          type: 'string',
          description: 'Comma-separated list of hours to prioritize (e.g. "9,10,11,14,15")'
        },
        focus_type: {
          type: 'string',
          enum: ['learning', 'building', 'networking', 'habits', 'mixed'],
          description: 'Type of work to prioritize today'
        },
        schedule_request_context: {
          type: 'string',
          description: 'User context about why they need a schedule now (e.g. "planning tomorrow", "need structure today")'
        }
      }
    }
  },

  // ========== ADVANCED FEATURES (Tools 11-12) ==========
  sync_forest_memory_forest: {
    name: 'sync_forest_memory_forest',
    description: 'Sync current Forest state to memory for context awareness',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  ask_truthful_claude_forest: {
    name: 'ask_truthful_claude_forest',
    description: 'Query truthful Claude with structured prompts and context. REQUIRED: prompt parameter.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: '**REQUIRED** Your question or request for Claude'
        },
        context: {
          type: 'object',
          description: 'Optional: Additional context for the query'
        },
        response_format: {
          type: 'string',
          enum: ['text', 'json', 'markdown'],
          description: 'Optional: Desired response format (default: text)'
        }
      },
      required: ['prompt']
    }
  },

  // ========== SYSTEM MANAGEMENT ==========
  factory_reset_forest: {
    name: 'factory_reset_forest',
    description: 'Factory reset - delete project(s) with confirmation. WARNING: This permanently deletes data.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm_deletion: {
          type: 'boolean',
          description: 'Required confirmation flag - must be explicitly set to true to proceed',
          default: false
        },
        project_id: {
          type: 'string',
          description: 'Project to delete (optional - if not provided, offers to reset all projects)'
        },
        confirmation_message: {
          type: 'string',
          description: 'Confirmation message from user acknowledging data will be permanently deleted'
        }
      },
      required: ['confirm_deletion']
    }
  },

  get_landing_page_forest: {
    name: 'get_landing_page_forest',
    description: 'Generate dynamic, LLM-powered landing page with three action paths',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  get_active_project_forest: {
    name: 'get_active_project_forest',
    description: 'Show current active project',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  get_current_config: {
    name: 'get_current_config',
    description: 'Print the current configuration of the agent, including the active and available projects, tools, contexts, and modes.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // ========== DIAGNOSTIC TOOLS ==========
  verify_system_health_forest: {
    name: 'verify_system_health_forest',
    description: 'Verify overall system health and identify any real issues before reporting diagnostics',
    inputSchema: {
      type: 'object',
      properties: {
        include_tests: {
          type: 'boolean',
          description: 'Whether to run full test suite (default: true)'
        }
      }
    }
  },

  verify_function_exists_forest: {
    name: 'verify_function_exists_forest',
    description: 'Verify if a specific function exists before reporting it as missing',
    inputSchema: {
      type: 'object',
      properties: {
        function_name: {
          type: 'string',
          description: 'Name of the function to verify'
        },
        file_path: {
          type: 'string',
          description: 'Path to the file where the function should exist'
        }
      },
      required: ['function_name', 'file_path']
    }
  },

  run_diagnostic_verification_forest: {
    name: 'run_diagnostic_verification_forest',
    description: 'Run comprehensive diagnostic verification to prevent false positives',
    inputSchema: {
      type: 'object',
      properties: {
        reported_issues: {
          type: 'array',
          description: 'Array of issues to verify',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['function', 'import', 'export', 'file', 'system']
              },
              description: {
                type: 'string',
                description: 'Description of the issue'
              },
              function_name: {
                type: 'string',
                description: 'Function name (for function issues)'
              },
              file_path: {
                type: 'string',
                description: 'File path (for function/import/export issues)'
              },
              item_name: {
                type: 'string',
                description: 'Item name (for import/export issues)'
              }
            }
          }
        }
      }
    }
  }
};

// ========== DEPRECATED TOOLS TO REMOVE ==========
export const DEPRECATED_TOOLS = [
  // Confusing multi-step onboarding
  'start_learning_journey_forest',
  'start_gated_onboarding_forest',
  'submit_goal_forest',
  'submit_context_forest',
  'submit_questionnaire_forest',
  'continue_onboarding_forest',
  'check_onboarding_status_forest',
  'get_onboarding_status_forest',
  
  // Pipeline variation (keep simple get_next_task_forest)
  'get_next_pipeline_forest',
  'evolve_pipeline_forest',
  
  // Ambiguous desires (too complex for core flow)
  'assess_goal_clarity_forest',
  'start_clarification_dialogue_forest',
  'continue_clarification_dialogue_forest',
  'analyze_goal_convergence_forest',
  'smart_evolution_forest',
  'adaptive_evolution_forest',
  'get_ambiguous_desire_status_forest'
];

// ========== TOOL CATEGORIES FOR DOCUMENTATION ==========
export const TOOL_CATEGORIES = {
  'Project Management': [
    'create_project_forest',
    'switch_project_forest',
    'list_projects_forest',
    'get_active_project_forest'
  ],
  'HTA Intelligence': [
    'build_hta_tree_forest',
    'get_hta_status_forest'
  ],
  'Task Management': [
    'get_next_task_forest',
    'complete_block_forest'
  ],
  'Strategy Evolution': [
    'evolve_strategy_forest'
  ],
  'System Status': [
    'current_status_forest',
    'generate_daily_schedule_forest'
  ],
  'Advanced Features': [
    'sync_forest_memory_forest',
    'ask_truthful_claude_forest'
  ],
  'System Management': [
    'factory_reset_forest',
    'get_landing_page_forest',
    'get_current_config'
  ],
  'Diagnostic Tools': [
    'verify_system_health_forest',
    'verify_function_exists_forest',
    'run_diagnostic_verification_forest'
  ]
};

// Export tool list for MCP
export function getToolList() {
  return Object.values(FOREST_TOOLS);
}

// Export tool names for routing
export function getToolNames() {
  return Object.keys(FOREST_TOOLS);
}

// Check if tool is deprecated
export function isDeprecatedTool(toolName) {
  return DEPRECATED_TOOLS.includes(toolName);
}
