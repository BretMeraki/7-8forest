/**
 * MCP Core Module - Consolidated MCP Handlers & Communication
 * Optimized from mcp-handlers.js - Preserves all 12 core tool definitions and handler setup
 */

import { ListToolsRequestSchema, CallToolRequestSchema, ListResourcesRequestSchema, ListPromptsRequestSchema } from '../local-mcp-types.js';
// Simple debug logger for Stage1 - avoid complex imports
const debugLogger = {
  logEvent: (type, data = {}) => {
    const elapsed = Date.now() - debugLogger.startTime;
    console.error(`[DEBUG-${type}] ${JSON.stringify({ elapsed, ...data })}`);
  },
  logCritical: (type, data = {}) => {
    console.error(`[CRITICAL-${type}] ${JSON.stringify(data)}`);
  },
  startTime: Date.now()
};

export class McpCore {
  constructor(server) {
    this.server = server;
    this.toolRouter = null;
    // Eagerly populate tools for handshake
    const toolDefs = this.getToolDefinitions();
    if (!this.server.capabilities) {
      this.server.capabilities = {};
    }
    this.server.capabilities.tools = Object.fromEntries(toolDefs.map(t => [t.name, t]));
  }

  async setupHandlers() {
    const setupStart = Date.now();
    const debugSetup = (step, data = {}) => {
      const elapsed = Date.now() - setupStart;
      console.error(`[MCP-SETUP-${elapsed}ms] ${step}`);
      if (Object.keys(data).length > 0) {
        console.error(`[MCP-SETUP-${elapsed}ms] Data:`, JSON.stringify(data, null, 2));
      }
    };

    debugSetup('Starting MCP handlers setup...');
    debugLogger.logEvent('MCP_HANDLERS_SETUP_START');

    try {
      // List tools handler
      this.server.setRequestHandler(ListToolsRequestSchema, async () => {
        debugLogger.logEvent('LIST_TOOLS_REQUEST');
        const tools = this.getToolDefinitions();
        debugSetup(`Returning ${tools.length} tools`);
        return { tools };
      });

      // Call tool handler
      this.server.setRequestHandler(CallToolRequestSchema, async request => {
        const { name, arguments: args } = request.params;
        debugLogger.logEvent('CALL_TOOL_REQUEST', { toolName: name, hasArgs: !!args });
        debugSetup(`Tool called: ${name}`);

        try {
          const result = await this.handleToolCall(name, args || {});
          debugLogger.logEvent('TOOL_CALL_SUCCESS', { toolName: name });
          return result;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          debugLogger.logCritical('TOOL_CALL_ERROR', {
            toolName: name,
            error: err.message,
            stack: err.stack?.substring(0, 500),
          });
          debugSetup(`❌ Tool ${name} failed: ${err.message}`);

          return {
            content: [
              {
                type: 'text',
                text: `**Tool Error: ${name}**\n\nError: ${err.message}\n\nPlease check your input and try again.`,
              },
            ],
            isError: true,
          };
        }
      });

      // List resources handler (required by MCP spec)
      this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
        debugLogger.logEvent('LIST_RESOURCES_REQUEST');
        return { resources: [] }; // No resources in this implementation
      });

      // List prompts handler (required by MCP spec)
      this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
        debugLogger.logEvent('LIST_PROMPTS_REQUEST');
        return { prompts: [] }; // No prompts in this implementation
      });

      debugSetup('✅ MCP handlers setup complete');
      debugLogger.logEvent('MCP_HANDLERS_SETUP_COMPLETE');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      debugSetup('❌ MCP handlers setup failed', { error: err.message });
      debugLogger.logCritical('MCP_HANDLERS_SETUP_ERROR', {
        error: err.message,
        stack: err.stack?.substring(0, 500),
      });
      throw err;
    }
  }

  setToolRouter(toolRouter) {
    this.toolRouter = toolRouter;
  }

  async handleToolCall(toolName, args) {
    console.error('[ToolRouter] handleToolCall called:', toolName, args);
    if (!this.toolRouter) {
      throw new Error('Tool router not set. Server may not be fully initialized.');
    }
    
    // Delegate to the provided tool router
    return await this.toolRouter.handleToolCall(toolName, args);
  }

  getToolDefinitions() {
    return [
      {
        name: 'create_project_forest',
        description:
          'Create comprehensive life orchestration project with detailed personal context',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Unique project identifier (e.g. "dream_project_alpha")',
            },
            goal: {
              type: 'string',
              description: 'Ultimate ambitious goal (what you want to achieve)',
            },
            context: {
              type: 'string',
              description: 'Current life situation and why this goal matters now',
            },
            specific_interests: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Optional: Specific things you want to be able to do (e.g. "play Let It Be on piano", "build a personal website"). Leave empty if you\'re not sure yet - the system will help you discover interests.',
            },
            learning_paths: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path_name: {
                    type: 'string',
                    description: 'Name of the learning path (e.g. "saxophone", "piano", "theory")',
                  },
                  priority: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'Relative priority of this path',
                  },
                  interests: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Specific interests for this path',
                  },
                },
                required: ['path_name'],
              },
              description:
                'Optional: Define separate learning paths within your goal for isolated focus (e.g. separate piano and saxophone paths)',
            },
            constraints: {
              type: 'object',
              properties: {
                time_constraints: {
                  type: 'string',
                  description: 'Available time slots, busy periods, commitments',
                },
                energy_patterns: {
                  type: 'string',
                  description: 'When you have high/low energy, physical limitations',
                },
                focus_variability: {
                  type: 'string',
                  description:
                    'How your focus and attention vary (e.g. "consistent daily", "varies with interest", "unpredictable energy levels")',
                },
                financial_constraints: {
                  type: 'string',
                  description: 'Budget limitations affecting learning resources',
                },
                location_constraints: {
                  type: 'string',
                  description: 'Home setup, workspace limitations, travel requirements',
                },
              },
            },
            existing_credentials: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  subject_area: {
                    type: 'string',
                    description: 'What field/subject',
                  },
                  credential_type: {
                    type: 'string',
                    description: 'Degree, certificate, course, etc.',
                  },
                  level: {
                    type: 'string',
                    description: 'Beginner, intermediate, advanced, expert',
                  },
                  relevance_to_goal: {
                    type: 'string',
                    description: 'How this relates to your new goal',
                  },
                },
              },
              description: 'All existing education, certificates, and relevant experience',
            },
            current_habits: {
              type: 'object',
              properties: {
                good_habits: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Existing positive habits to maintain/build on',
                },
                bad_habits: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Habits you want to replace or minimize',
                },
                habit_goals: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'New habits you want to build alongside learning',
                },
              },
            },
            life_structure_preferences: {
              type: 'object',
              properties: {
                wake_time: {
                  type: 'string',
                  description: 'Preferred wake time (e.g. "6:00 AM")',
                },
                sleep_time: {
                  type: 'string',
                  description: 'Preferred sleep time (e.g. "10:30 PM")',
                },
                meal_times: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Preferred meal schedule',
                },
                focus_duration: {
                  type: 'string',
                  description:
                    'Preferred focus session length (e.g. "25 minutes", "2 hours", "until natural break", "flexible", "variable")',
                },
                break_preferences: {
                  type: 'string',
                  description: 'How often and what type of breaks you need',
                },
                transition_time: {
                  type: 'string',
                  description: 'Time needed between activities',
                },
              },
            },
            urgency_level: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'How urgently you need to achieve this goal',
            },
            success_metrics: {
              type: 'array',
              items: { type: 'string' },
              description:
                'How you will measure success (income, job offers, portfolio pieces, etc.)',
            },
          },
          required: ['project_id', 'goal', 'life_structure_preferences'],
        },
      },
      {
        name: 'switch_project_forest',
        description: 'Switch to a different project workspace',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project to switch to',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_projects_forest',
        description: 'Show all project workspaces',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_active_project_forest',
        description: 'Show current active project',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'build_hta_tree_forest',
        description: 'Build strategic HTA framework for a specific learning path',
        inputSchema: {
          type: 'object',
          properties: {
            path_name: {
              type: 'string',
              description: 'Learning path to build HTA tree for (e.g. "saxophone", "piano"). Uses active path or general if not specified.'
            },
            learning_style: {
              type: 'string',
              description: 'Learning approach preference (e.g. "hands-on", "theoretical", "mixed"). Defaults to "mixed".'
            },
            focus_areas: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific areas to emphasize in the learning plan (e.g. ["fundamentals", "practical application"]).'
            },
            goal: {
              type: 'string',
              description: 'Optional goal override. If not provided, uses the goal from active project configuration.'
            },
            context: {
              type: 'string',
              description: 'Optional context override. If not provided, uses context from active project configuration.'
            }
          },
          // No required array; all parameters are optional
        },
      },
      {
        name: 'get_hta_status_forest',
        description: 'View HTA strategic framework for active project',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'generate_daily_schedule_forest',
        description:
          'ON-DEMAND: Generate comprehensive gap-free daily schedule when requested by user',
        inputSchema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'YYYY-MM-DD, defaults to today',
            },
            energy_level: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'Current energy level (affects task difficulty and timing)',
            },
            focus_type: {
              type: 'string',
              enum: ['learning', 'building', 'networking', 'habits', 'mixed'],
              description: 'Type of work to prioritize today',
            },
            available_hours: {
              type: 'string',
              description: 'Comma-separated list of hours to prioritize (e.g. "9,10,11,14,15")',
            },
            schedule_request_context: {
              type: 'string',
              description:
                'User context about why they need a schedule now (e.g. "planning tomorrow", "need structure today")',
            },
          },
        },
      },
      {
        name: 'complete_block_forest',
        description: 'Complete time block and capture insights for active project',
        inputSchema: {
          type: 'object',
          properties: {
            block_id: { type: 'string' },
            outcome: {
              type: 'string',
              description: 'What happened? Key insights?',
            },
            energy_level: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'Energy after completion',
            },
            learned: {
              type: 'string',
              description: 'What specific knowledge or skills did you gain?',
            },
            next_questions: {
              type: 'string',
              description: 'What questions emerged? What do you need to learn next?',
            },
            difficulty_rating: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'How difficult was this task? (1=too easy, 5=too hard)',
            },
            breakthrough: {
              type: 'boolean',
              description: 'Major insight or breakthrough?',
            },
          },
          required: ['block_id', 'outcome', 'energy_level'],
        },
      },
      {
        name: 'current_status_forest',
        description: 'Show todays progress and next action for active project',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'evolve_strategy_forest',
        description: 'Analyze patterns and evolve the approach for active project',
        inputSchema: {
          type: 'object',
          properties: {
            feedback: {
              type: 'string',
              description: "What's working? What's not? What needs to change?",
            },
          },
        },
      },
      {
        name: 'get_next_task_forest',
        description: 'Get the single most logical next task based on current progress and context',
        inputSchema: {
          type: 'object',
          properties: {
            energy_level: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'Current energy level to match appropriate task difficulty',
            },
            time_available: {
              type: 'string',
              description: 'Time available for the task (e.g. "30 minutes", "1 hour")',
            },
            context_from_memory: {
              type: 'string',
              description:
                'Optional context retrieved from Memory MCP about recent progress/insights',
            },
          },
        },
      },
      {
        name: 'sync_forest_memory_forest',
        description: 'Sync current Forest state to memory for context awareness',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'factory_reset_forest',
        description: 'Factory reset - delete project(s) with confirmation. WARNING: This permanently deletes data.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project to delete (optional - if not provided, offers to reset all projects)',
            },
            confirm_deletion: {
              type: 'boolean',
              description: 'Required confirmation flag - must be explicitly set to true to proceed',
              default: false
            },
            confirmation_message: {
              type: 'string',
              description: 'Confirmation message from user acknowledging data will be permanently deleted'
            }
          },
          required: ['confirm_deletion'],
        },
      },
      {
        name: 'start_gated_onboarding_forest',
        description: 'Start the gated onboarding process for new project creation',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Optional session identifier for tracking onboarding progress'
            }
          }
        },
      },
      {
        name: 'submit_goal_forest',
        description: 'Submit the goal/dream for the gated onboarding process',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Session identifier for tracking onboarding progress'
            },
            goal: {
              type: 'string',
              description: 'The goal or dream the user wants to achieve'
            }
          },
          required: ['session_id', 'goal']
        },
      },
      {
        name: 'submit_context_forest',
        description: 'Submit context/background information for the gated onboarding process',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Session identifier for tracking onboarding progress'
            },
            context: {
              type: 'string',
              description: 'Background context, current situation, constraints, or additional details'
            }
          },
          required: ['session_id', 'context']
        },
      },
      {
        name: 'submit_questionnaire_forest',
        description: 'Submit responses to the dynamic questionnaire in the gated onboarding process',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Session identifier for tracking onboarding progress'
            },
            responses: {
              type: 'object',
              description: 'Question-answer pairs from the dynamic questionnaire'
            }
          },
          required: ['session_id', 'responses']
        },
      },
      {
        name: 'check_onboarding_status_forest',
        description: 'Check the current status of the gated onboarding process',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Session identifier for tracking onboarding progress'
            }
          },
          required: ['session_id']
        },
      },
      // NEW: Revolutionary Gated Onboarding & Pipeline Tools
      {
        name: 'start_learning_journey_forest',
        description: 'Begin the 6-stage gated onboarding process for comprehensive project creation',
        inputSchema: {
          type: 'object',
          properties: {
            initial_goal: {
              type: 'string',
              description: 'Optional initial goal or dream to start with'
            }
          }
        },
      },
      {
        name: 'continue_onboarding_forest',
        description: 'Progress through onboarding stages with quality gates and validation',
        inputSchema: {
          type: 'object',
          properties: {
            stage_data: {
              type: 'object',
              description: 'Data for the current onboarding stage'
            },
            session_id: {
              type: 'string',
              description: 'Session identifier for tracking progress'
            }
          }
        },
      },
      {
        name: 'get_onboarding_status_forest',
        description: 'View current onboarding progress and next actions required',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Optional session identifier'
            }
          }
        },
      },
      {
        name: 'get_next_pipeline_forest',
        description: 'Get Next + Pipeline task presentation with hybrid design (Primary, Coming Up, Available)',
        inputSchema: {
          type: 'object',
          properties: {
            energy_level: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'Current energy level for task matching'
            },
            time_available: {
              type: 'string',
              description: 'Available time (e.g., "30 minutes", "2 hours")'
            },
            context: {
              type: 'string',
              description: 'Current context or constraints'
            }
          }
        },
      },
      {
        name: 'evolve_pipeline_forest',
        description: 'Refresh and evolve the pipeline based on progress patterns and learning',
        inputSchema: {
          type: 'object',
          properties: {
            feedback: {
              type: 'string',
              description: 'Feedback on current pipeline effectiveness'
            },
            force_refresh: {
              type: 'boolean',
              description: 'Force complete pipeline regeneration'
            }
          }
        },
      },
      {
        name: 'get_landing_page_forest',
        description: 'Generate dynamic, LLM-powered landing page with three action paths',
        inputSchema: {
          type: 'object',
          properties: {}
        },
      },
      {
        name: 'get_current_config',
        description: 'Print the current configuration of the agent, including the active and available projects, tools, contexts, and modes.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // Vectorization Intelligence Tools
      {
        name: 'get_vectorization_status_forest',
        description: 'Check semantic intelligence status and vectorization analytics for enhanced task recommendations',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Optional project ID to check (defaults to active project)'
            }
          }
        },
      },
      {
        name: 'vectorize_project_data_forest',
        description: 'Manually enable semantic intelligence for the current project to get context-aware task recommendations',
        inputSchema: {
          type: 'object',
          properties: {
            force_refresh: {
              type: 'boolean',
              description: 'Force re-vectorization of existing data'
            }
          }
        },
      },
    ];
  }

  // ===== TOOL EXPOSURE METHODS =====
  
  getAvailableTools() {
    const tools = [
      // Core 12 tools
      'create_project_forest',
      'switch_project_forest', 
      'list_projects_forest',
      'build_hta_tree_forest',
      'get_hta_status_forest',
      'get_next_task_forest',
      'complete_block_forest',
      'evolve_strategy_forest',
      'current_status_forest',
      'generate_daily_schedule_forest',
      'sync_forest_memory_forest',
      'ask_truthful_claude_forest',
      
      // System Management
      'factory_reset_forest',
      'get_landing_page_forest',
      'get_current_config',
      
      // Gated Onboarding & Pipeline Tools
      'start_learning_journey_forest',
      'continue_onboarding_forest',
      'get_onboarding_status_forest',
      'get_next_pipeline_forest',
      'evolve_pipeline_forest',
      
      // Ambiguous Desires Tools
      'assess_goal_clarity_forest',
      'start_clarification_dialogue_forest', 
      'continue_clarification_dialogue_forest',
      'analyze_goal_convergence_forest',
      'smart_evolution_forest',
      'adaptive_evolution_forest',
      'get_ambiguous_desire_status_forest'
    ];
    
    return tools;
  }
  
  // Tool function placeholders (implemented in handlers)
  create_project_forest() { return this.callHandler('create_project_forest', arguments); }
  switch_project_forest() { return this.callHandler('switch_project_forest', arguments); }
  list_projects_forest() { return this.callHandler('list_projects_forest', arguments); }
  build_hta_tree_forest() { return this.callHandler('build_hta_tree_forest', arguments); }
  get_hta_status_forest() { return this.callHandler('get_hta_status_forest', arguments); }
  get_next_task_forest() { return this.callHandler('get_next_task_forest', arguments); }
  complete_block_forest() { return this.callHandler('complete_block_forest', arguments); }
  evolve_strategy_forest() { return this.callHandler('evolve_strategy_forest', arguments); }
  current_status_forest() { return this.callHandler('current_status_forest', arguments); }
  generate_daily_schedule_forest() { return this.callHandler('generate_daily_schedule_forest', arguments); }
  sync_forest_memory_forest() { return this.callHandler('sync_forest_memory_forest', arguments); }
  ask_truthful_claude_forest() { return this.callHandler('ask_truthful_claude_forest', arguments); }
  factory_reset_forest() { return this.callHandler('factory_reset_forest', arguments); }
  get_current_config() { return this.callHandler('get_current_config', arguments); }
  
  // ===== AMBIGUOUS DESIRES TOOLS =====
  
  assess_goal_clarity_forest() { 
    return this.callHandler('assess_goal_clarity_forest', arguments); 
  }
  
  start_clarification_dialogue_forest() { 
    return this.callHandler('start_clarification_dialogue_forest', arguments); 
  }
  
  continue_clarification_dialogue_forest() { 
    return this.callHandler('continue_clarification_dialogue_forest', arguments); 
  }
  
  analyze_goal_convergence_forest() { 
    return this.callHandler('analyze_goal_convergence_forest', arguments); 
  }
  
  smart_evolution_forest() { 
    return this.callHandler('smart_evolution_forest', arguments); 
  }
  
  adaptive_evolution_forest() { 
    return this.callHandler('adaptive_evolution_forest', arguments); 
  }
  
  get_ambiguous_desire_status_forest() { 
    return this.callHandler('get_ambiguous_desire_status_forest', arguments); 
  }
  
    callHandler(toolName, args) {
    // This would be implemented to call the actual handlers
    return { tool: toolName, args: Array.from(args) };
  }
}