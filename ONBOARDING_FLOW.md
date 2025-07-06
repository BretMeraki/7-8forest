# Forest Suite Onboarding Flow

## Overview

Forest Suite has been streamlined to provide a single, clear onboarding path that doesn't confuse users with multiple tools or complex multi-step processes.

## The Simple 3-Step Process

### For New Users

1. **Start** → `get_landing_page_forest` or `list_projects_forest`
2. **Create** → `create_project_forest "your specific goal"`
3. **Begin** → `get_next_task_forest`

That's it! No complex multi-stage onboarding, no session IDs to track, no questionnaires to complete.

### For Returning Users

1. **Check** → `list_projects_forest` (see all your projects)
2. **Continue** → `get_next_task_forest` (work on active project)
3. **Switch** → `switch_project_forest "project_name"` (change projects)

## Tool Consolidation

### ❌ DEPRECATED Tools (Don't Use These)
- `start_learning_journey_forest` - Overly complex
- `start_gated_onboarding_forest` - Confusing multi-step process
- `submit_goal_forest` - Part of deprecated flow
- `submit_context_forest` - Part of deprecated flow
- `submit_questionnaire_forest` - Part of deprecated flow
- `continue_onboarding_forest` - Part of deprecated flow
- `build_framework_forest` - Happens automatically now

### ✅ ACTIVE Tools (Use These)

#### Project Management
- `create_project_forest` - Creates project AND builds HTA in one step
- `list_projects_forest` - Shows all projects with clear next actions
- `switch_project_forest` - Switches between projects
- `get_active_project_forest` - Shows current active project

#### Daily Workflow
- `get_next_task_forest` - Gets your next task (most used tool!)
- `complete_block_forest` - Marks task as complete
- `current_status_forest` - Shows today's progress
- `generate_daily_schedule_forest` - Creates full day schedule

#### Strategy & Evolution
- `get_hta_status_forest` - Shows your full learning strategy
- `build_hta_tree_forest` - Rebuilds strategy (rarely needed)
- `evolve_strategy_forest` - Evolves based on progress

## Example Flows

### New User Journey
```
User: "I want to learn piano"
Assistant: Use `create_project_forest "learn piano"`
→ Creates project + builds HTA tree automatically

User: "What should I do first?"
Assistant: Use `get_next_task_forest`
→ Returns first task from HTA tree

User: "I finished that task"
Assistant: Use `complete_block_forest` with the block_id
→ Marks complete and evolves strategy
```

### Returning User Journey
```
User: "What projects do I have?"
Assistant: Use `list_projects_forest`
→ Shows all projects with status

User: "Continue with my piano project"
Assistant: Use `switch_project_forest "learn_piano"` then `get_next_task_forest`
→ Switches context and provides next task
```

## Implementation Details

### create_project_forest Enhancement

The tool now:
1. Accepts just a goal string
2. Automatically generates project ID
3. Creates project structure
4. Builds HTA tree immediately
5. Returns success with next steps

### Simplified Parameters

Old way (confusing):
```json
{
  "project_id": "my_piano_project",
  "goal": "Learn piano",
  "context": "I want to learn piano because...",
  "life_structure_preferences": {
    "wake_time": "7:00 AM",
    "sleep_time": "11:00 PM",
    "focus_duration": "25 minutes"
  },
  "constraints": {...},
  "existing_credentials": [...],
  // ... many more fields
}
```

New way (simple):
```json
{
  "goal": "Learn to play jazz piano"
}
```

### Error Handling

All tools now provide:
1. Clear error messages
2. Recovery suggestions
3. Example commands
4. Next steps

## Migration Guide

### If users try deprecated tools:

1. **start_learning_journey_forest** → Redirect to `create_project_forest`
2. **submit_goal_forest** → Explain to use `create_project_forest` instead
3. **start_gated_onboarding_forest** → Show simple 3-step process

### Response Templates

When user tries complex onboarding:
```
I see you're trying to start a project! Forest Suite now uses a simpler approach:

Just use: `create_project_forest "your goal here"`

This will create your project and build your learning strategy in one step.
```

When user is confused:
```
Forest Suite is simple! Here's all you need:

1. Create project: `create_project_forest "your goal"`
2. Get tasks: `get_next_task_forest`
3. Complete tasks: `complete_block_forest`

That's it! Would you like to create a project now?
```

## Benefits of Simplified Flow

1. **Faster onboarding** - One command instead of 5-6 steps
2. **Less confusion** - No session IDs or state tracking
3. **Immediate value** - HTA tree built automatically
4. **Clear navigation** - Always obvious what to do next
5. **Better UX** - Focuses on goals, not process

## Technical Implementation

The streamlined flow is implemented in:
- `___stage1/modules/streamlined-onboarding.js` - Core logic
- `___stage1/modules/project-management.js` - Enhanced create method
- `___stage1/core-server.js` - Simplified handlers

## Testing the Flow

1. Start fresh: `factory_reset_forest`
2. Create project: `create_project_forest "learn Spanish"`
3. Get task: `get_next_task_forest`
4. Complete: `complete_block_forest <block_id>`
5. Check progress: `current_status_forest`

The entire onboarding should take less than 30 seconds!
