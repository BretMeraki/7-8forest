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

  // ========== ONBOARDING FLOW ==========
  start_learning_journey_forest: {
    name: 'start_learning_journey_forest',
    description: 'Begin the guided onboarding process for new users. Provides step-by-step setup and goal collection.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: 'Optional: Initial goal if user already knows what they want to achieve'
        },
        context: {
          type: 'string',
          description: 'Optional: Additional context about the goal'
        }
      }
    }
  },

  continue_onboarding_forest: {
    name: 'continue_onboarding_forest',
    description: 'Continue the onboarding process through validation gates. Guides users through required setup steps.',
    inputSchema: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'User input for the current onboarding step'
        },
        gate: {
          type: 'string',
          description: 'Optional: Specific gate to process (if not provided, continues from current gate)'
        }
      }
    }
  },

  get_onboarding_status_forest: {
    name: 'get_onboarding_status_forest',
    description: 'Check the current onboarding progress and next required steps.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  complete_onboarding_forest: {
    name: 'complete_onboarding_forest',
    description: 'Complete the onboarding process and activate the project for task execution.',
    inputSchema: {
      type: 'object',
      properties: {
        final_confirmation: {
          type: 'boolean',
          description: 'Required: Confirm completion of onboarding process'
        }
      },
      required: ['final_confirmation']
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
  },

  // ========== GATED ONBOARDING & PIPELINE TOOLS ==========
  start_learning_journey_forest: {
    name: 'start_learning_journey_forest',
    description: 'Begin comprehensive 6-stage gated onboarding process for optimal learning plan generation',
    inputSchema: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: '**REQUIRED** Your learning goal or what you want to achieve (e.g., "Master portrait photography and grow Instagram to 10k followers")'
        },
        user_context: {
          type: 'object',
          description: 'Optional: Initial context about your background, experience, constraints, etc.',
          properties: {
            experience: {
              type: 'string',
              description: 'Your current experience level (e.g., "beginner", "intermediate", "advanced")'
            },
            time_available: {
              type: 'string',
              description: 'How much time you can dedicate (e.g., "10 hours/week", "2 hours/day")'
            },
            background: {
              type: 'string',
              description: 'Relevant background or previous experience'
            },
            constraints: {
              type: 'array',
              items: { type: 'string' },
              description: 'Any constraints or limitations (time, budget, resources, etc.)'
            }
          }
        }
      },
      required: ['goal']
    }
  },

  continue_onboarding_forest: {
    name: 'continue_onboarding_forest',
    description: 'Continue through onboarding stages with quality gates',
    inputSchema: {
      type: 'object',
      properties: {
        stage: {
          type: 'string',
          enum: ['context_gathering', 'questionnaire', 'complexity_analysis', 'hta_generation', 'strategic_framework'],
          description: '**REQUIRED** Current onboarding stage to continue'
        },
        input_data: {
          type: 'object',
          description: 'Stage-specific input data (varies by stage)',
          properties: {
            action: {
              type: 'string',
              description: 'For questionnaire stage: "start" to begin questionnaire'
            },
            question_id: {
              type: 'string',
              description: 'For questionnaire stage: ID of question being answered'
            },
            response: {
              type: 'string',
              description: 'For questionnaire stage: Your response to the question'
            }
          }
        },
        project_id: {
          type: 'string',
          description: 'Optional: Project ID (uses active project if not provided)'
        }
      },
      required: ['stage']
    }
  },

  get_onboarding_status_forest: {
    name: 'get_onboarding_status_forest',
    description: 'Get current onboarding progress and next required actions',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Optional: Project ID (uses active project if not provided)'
        }
      }
    }
  },

  get_next_pipeline_forest: {
    name: 'get_next_pipeline_forest',
    description: 'Get Next + Pipeline presentation (PRIMARY: 1 main task, SECONDARY: 2-3 coming up, TERTIARY: 1-2 alternatives)',
    inputSchema: {
      type: 'object',
      properties: {
        energy_level: {
          type: 'number',
          minimum: 1,
          maximum: 5,
          description: 'Optional: Current energy level for task matching (1-5)'
        },
        time_available: {
          type: 'string',
          description: 'Optional: Time available for tasks (e.g., "45 minutes", "2 hours")'
        },
        project_id: {
          type: 'string',
          description: 'Optional: Project ID (uses active project if not provided)'
        }
      }
    }
  },

  evolve_pipeline_forest: {
    name: 'evolve_pipeline_forest',
    description: 'Evolve pipeline based on progress patterns and context changes',
    inputSchema: {
      type: 'object',
      properties: {
        triggers: {
          type: 'object',
          description: 'Evolution triggers',
          properties: {
            rapid_progress: {
              type: 'boolean',
              description: 'User is making rapid progress and needs more challenge'
            }
          }
        },
        context: {
          type: 'object',
          description: 'Context changes',
          properties: {
            focus_shift: {
              type: 'string',
              description: 'New area of focus (e.g., "advanced_lighting", "portrait_composition")'
            },
            difficulty_adjustment: {
              type: 'string',
              description: 'Difficulty adjustment needed (e.g., "increase", "decrease")'
            }
          }
        },
        project_id: {
          type: 'string',
          description: 'Optional: Project ID (uses active project if not provided)'
        }
      }
    }
  },

  // ========== DIAGNOSTIC TOOLS ==========
  verify_system_health_forest: {
    name: 'verify_system_health_forest',
    description: 'Verify overall system health to prevent false positive diagnostics. Runs comprehensive verification of system components.',
    inputSchema: {
      type: 'object',
      properties: {
        include_tests: {
          type: 'boolean',
          description: 'Optional: Include test suite verification (default: true)'
        }
      }
    }
  },

  verify_function_exists_forest: {
    name: 'verify_function_exists_forest',
    description: 'Verify if a specific function exists before reporting it as missing. Prevents false positive function reports.',
    inputSchema: {
      type: 'object',
      properties: {
        function_name: {
          type: 'string',
          description: '**REQUIRED** Name of the function to verify'
        },
        file_path: {
          type: 'string',
          description: '**REQUIRED** Path to the file containing the function'
        }
      },
      required: ['function_name', 'file_path']
    }
  },

  run_diagnostic_verification_forest: {
    name: 'run_diagnostic_verification_forest',
    description: 'Run comprehensive diagnostic verification for reported issues. Analyzes and categorizes issues to identify false positives.',
    inputSchema: {
      type: 'object',
      properties: {
        reported_issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['function', 'import', 'export', 'system'],
                description: 'Type of issue reported'
              },
              description: {
                type: 'string',
                description: 'Description of the issue'
              },
              functionName: {
                type: 'string',
                description: 'Function name (for function type issues)'
              },
              filePath: {
                type: 'string',
                description: 'File path (for function/import/export issues)'
              },
              itemName: {
                type: 'string',
                description: 'Item name (for import/export issues)'
              }
            },
            required: ['type', 'description']
          },
          description: 'Optional: List of issues to verify (empty array runs general diagnostics)'
        }
      }
    }
  },

  get_health_status_forest: {
    name: 'get_health_status_forest',
    description: 'Get comprehensive system health status including data directory, SQLite vector store, memory usage, and component status',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  get_vector_store_status_forest: {
    name: 'get_vector_store_status_forest',
    description: 'Get detailed SQLite vector store status including connection, statistics, and cache performance',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  optimize_vector_store_forest: {
    name: 'optimize_vector_store_forest',
    description: 'Optimize SQLite vector store by performing WAL checkpoint and database maintenance',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  get_chromadb_status_forest: {
    name: 'get_chromadb_status_forest',
    description: 'Legacy ChromaDB command - provides migration information about SQLite vector store transition',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  restart_chromadb_forest: {
    name: 'restart_chromadb_forest',
    description: 'Legacy ChromaDB command - provides migration information about SQLite vector store benefits',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  debug_cache_forest: {
    name: 'debug_cache_forest',
    description: 'Debug cache state for troubleshooting data persistence issues',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Optional: Project ID to debug (uses active project if not provided)'
        },
        cache_type: {
          type: 'string',
          enum: ['all', 'project', 'hta', 'config'],
          description: 'Optional: Type of cache to debug (default: all)'
        }
      }
    }
  },

  emergency_clear_cache_forest: {
    name: 'emergency_clear_cache_forest',
    description: 'Emergency cache clear for troubleshooting. Use with caution.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Optional: Specific project ID to clear cache for'
        },
        clear_all: {
          type: 'boolean',
          description: 'Optional: Clear entire cache (default: false)'
        }
      }
    }
  },

  // ========== VECTORIZATION TOOLS ==========
  get_vectorization_status_forest: {
    name: 'get_vectorization_status_forest',
    description: 'Get current vectorization status and capabilities for the active project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Optional: Project ID to check (uses active project if not provided)'
        }
      }
    }
  },

  vectorize_project_data_forest: {
    name: 'vectorize_project_data_forest',
    description: 'Manually vectorize project data for enhanced semantic search and task recommendations',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Optional: Project ID to vectorize (uses active project if not provided)'
        },
        force_refresh: {
          type: 'boolean',
          description: 'Optional: Force re-vectorization even if data already exists (default: false)'
        }
      }
    }
  },

  // ========== AMBIGUOUS DESIRES TOOLS ==========
  assess_goal_clarity_forest: {
    name: 'assess_goal_clarity_forest',
    description: 'Assess whether a goal is clear enough for effective planning or needs clarification',
    inputSchema: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: '**REQUIRED** Goal to assess for clarity'
        },
        context: {
          type: 'string',
          description: 'Optional: Additional context about the goal'
        }
      },
      required: ['goal']
    }
  },

  start_clarification_dialogue_forest: {
    name: 'start_clarification_dialogue_forest',
    description: 'Start an interactive dialogue to clarify ambiguous or vague goals',
    inputSchema: {
      type: 'object',
      properties: {
        initial_goal: {
          type: 'string',
          description: '**REQUIRED** Initial goal statement that needs clarification'
        },
        context: {
          type: 'string',
          description: 'Optional: Any additional context about the goal'
        }
      },
      required: ['initial_goal']
    }
  },

  continue_clarification_dialogue_forest: {
    name: 'continue_clarification_dialogue_forest',
    description: 'Continue the clarification dialogue by providing responses to clarifying questions',
    inputSchema: {
      type: 'object',
      properties: {
        response: {
          type: 'string',
          description: '**REQUIRED** Your response to the clarification question'
        },
        dialogue_id: {
          type: 'string',
          description: 'Optional: Dialogue ID to continue (uses active dialogue if not provided)'
        }
      },
      required: ['response']
    }
  },

  analyze_goal_convergence_forest: {
    name: 'analyze_goal_convergence_forest',
    description: 'Analyze whether multiple clarification responses are converging toward a clear, actionable goal',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Optional: Project ID to analyze (uses active project if not provided)'
        },
        detailed: {
          type: 'boolean',
          description: 'Optional: Provide detailed convergence analysis (default: false)'
        }
      }
    }
  },

  smart_evolution_forest: {
    name: 'smart_evolution_forest',
    description: 'Apply intelligent strategy evolution based on learning patterns and goal convergence',
    inputSchema: {
      type: 'object',
      properties: {
        evolution_trigger: {
          type: 'string',
          enum: ['convergence_detected', 'pattern_identified', 'manual_request'],
          description: 'What triggered this evolution request'
        },
        context: {
          type: 'string',
          description: 'Optional: Additional context about why evolution is needed'
        }
      },
      required: ['evolution_trigger']
    }
  },

  adaptive_evolution_forest: {
    name: 'adaptive_evolution_forest',
    description: 'Perform adaptive strategy evolution that responds to changing circumstances and progress patterns',
    inputSchema: {
      type: 'object',
      properties: {
        adaptation_reason: {
          type: 'string',
          description: 'Why adaptation is needed (e.g., "goal_shift", "progress_accelerated", "obstacles_encountered")'
        },
        new_context: {
          type: 'object',
          description: 'New context or circumstances that require adaptation',
          properties: {
            changed_priorities: {
              type: 'array',
              items: { type: 'string' },
              description: 'Any priorities that have changed'
            },
            new_constraints: {
              type: 'array',
              items: { type: 'string' },
              description: 'New constraints or limitations'
            },
            progress_insights: {
              type: 'string',
              description: 'Insights from recent progress'
            }
          }
        }
      },
      required: ['adaptation_reason']
    }
  },

  get_ambiguous_desire_status_forest: {
    name: 'get_ambiguous_desire_status_forest',
    description: 'Get the current status of ambiguous desire processing and goal clarification for the active project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Optional: Project ID to check (uses active project if not provided)'
        }
      }
    }
  }

};

// ========== DEPRECATED TOOLS TO REMOVE ==========
export const DEPRECATED_TOOLS = [
  // Confusing multi-step onboarding components (replaced by comprehensive gated flow)
  'start_gated_onboarding_forest',
  'submit_goal_forest',
  'submit_context_forest',
  'submit_questionnaire_forest',
  'check_onboarding_status_forest'
];

// ========== TOOL CATEGORIES FOR DOCUMENTATION ==========
export const TOOL_CATEGORIES = {
  'Project Management': [
    'create_project_forest',
    'switch_project_forest',
    'list_projects_forest',
    'get_active_project_forest'
  ],
  'Gated Onboarding': [
    'start_learning_journey_forest',
    'continue_onboarding_forest',
    'get_onboarding_status_forest'
  ],
  'HTA Intelligence': [
    'build_hta_tree_forest',
    'get_hta_status_forest'
  ],
  'Task Management': [
    'get_next_task_forest',
    'complete_block_forest'
  ],
  'Next + Pipeline': [
    'get_next_pipeline_forest',
    'evolve_pipeline_forest'
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
    'run_diagnostic_verification_forest',
    'get_health_status_forest',
    'debug_cache_forest',
    'emergency_clear_cache_forest'
  ],
  'Vector Store Management': [
    'get_vectorization_status_forest',
    'vectorize_project_data_forest',
    'get_vector_store_status_forest',
    'optimize_vector_store_forest'
  ],
  'Legacy Tools': [
    'get_chromadb_status_forest',
    'restart_chromadb_forest'
  ],
  'Ambiguous Desires': [
    'assess_goal_clarity_forest',
    'start_clarification_dialogue_forest',
    'continue_clarification_dialogue_forest',
    'analyze_goal_convergence_forest',
    'smart_evolution_forest',
    'adaptive_evolution_forest',
    'get_ambiguous_desire_status_forest'
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
