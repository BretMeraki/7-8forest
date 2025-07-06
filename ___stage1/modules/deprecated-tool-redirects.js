/**
 * Deprecated Tool Redirect Handlers
 * Provides helpful guidance when users try to use old/confusing tools
 */

export class DeprecatedToolRedirects {
  
  /**
   * Handle deprecated multi-step onboarding tools
   */
  static handleDeprecatedOnboardingTool(toolName, args) {
    const responses = {
      'start_learning_journey_forest': {
        title: '🌲 Let\'s Create Your Project!',
        message: `I see you want to start a new learning journey! Forest Suite now uses a simpler approach.

**Just use this single command:**
\`\`\`
create_project_forest "your goal here"
\`\`\`

**For example:**
- \`create_project_forest "learn Spanish"\`
- \`create_project_forest "become a web developer"\`
- \`create_project_forest "start a podcast"\`

This will create your project AND build your personalized learning strategy in one step!`
      },

      'start_gated_onboarding_forest': {
        title: '🌲 Simple Project Creation',
        message: `Forest Suite's onboarding is now much simpler!

**No more complex multi-step process.** Just one command:
\`\`\`
create_project_forest "your specific goal"
\`\`\`

This single command will:
✅ Create your project
✅ Build your learning strategy
✅ Get you started immediately

Try it now with your goal!`
      },

      'submit_goal_forest': {
        title: '📝 Goal Submission',
        message: `I see you're trying to submit a goal! In the new Forest Suite, you don't need separate submission steps.

**Instead, create your project directly:**
\`\`\`
create_project_forest "${args.goal || 'your goal here'}"
\`\`\`

This combines goal submission and project creation into one simple step.`
      },

      'submit_context_forest': {
        title: '📋 Context Submission',
        message: `You're trying to add context to your project. Good news - Forest Suite now handles this automatically!

**Just create your project with your goal:**
\`\`\`
create_project_forest "your detailed goal"
\`\`\`

The system will infer context from your goal description. You can always add more detail later with \`evolve_strategy_forest\`.`
      },

      'submit_questionnaire_forest': {
        title: '❓ Questionnaire',
        message: `Forest Suite no longer requires questionnaires! We've simplified the process.

**Create your project directly:**
\`\`\`
create_project_forest "your goal"
\`\`\`

The system adapts to your needs as you complete tasks - no upfront questionnaire needed!`
      },

      'continue_onboarding_forest': {
        title: '➡️ Continue Onboarding',
        message: `There's no multi-step onboarding to continue! Forest Suite is now instant.

**If you haven't created a project yet:**
\`\`\`
create_project_forest "your goal"
\`\`\`

**If you already have a project:**
\`\`\`
get_next_task_forest
\`\`\`

That's all you need!`
      },

      'build_framework_forest': {
        title: '🏗️ Framework Building',
        message: `Great news! The framework is now built automatically when you create a project.

**Just use:**
\`\`\`
create_project_forest "your goal"
\`\`\`

This creates your project AND builds your complete HTA framework instantly.

**Already have a project?** Use \`get_hta_status_forest\` to see your framework.`
      },

      'check_onboarding_status_forest': {
        title: '📊 Onboarding Status',
        message: `There's no onboarding status to check anymore! Forest Suite now works instantly.

**New user?** → \`create_project_forest "your goal"\`
**Existing user?** → \`list_projects_forest\`
**Want to work?** → \`get_next_task_forest\`

Simple as that!`
      },

      'get_onboarding_status_forest': {
        title: '📊 Status Check',
        message: `Forest Suite doesn't have complex onboarding anymore!

**Check your projects instead:**
- \`list_projects_forest\` - See all projects
- \`get_active_project_forest\` - See current project
- \`current_status_forest\` - See today's progress

Much simpler!`
      }
    };

    const response = responses[toolName] || {
      title: '🔄 Tool Updated',
      message: `The tool "${toolName}" has been simplified. 

**Try these instead:**
- \`create_project_forest "your goal"\` - Start new project
- \`list_projects_forest\` - See your projects
- \`get_next_task_forest\` - Get your next task`
    };

    return {
      success: true,
      content: [{
        type: 'text',
        text: `# ${response.title}\n\n${response.message}`
      }],
      redirect: true,
      suggested_tool: 'create_project_forest'
    };
  }

  /**
   * Check if a tool is deprecated
   */
  static isDeprecatedTool(toolName) {
    const deprecatedTools = [
      'start_learning_journey_forest',
      'start_gated_onboarding_forest',
      'submit_goal_forest',
      'submit_context_forest',
      'submit_questionnaire_forest',
      'continue_onboarding_forest',
      'build_framework_forest',
      'check_onboarding_status_forest',
      'get_onboarding_status_forest'
    ];
    
    return deprecatedTools.includes(toolName);
  }

  /**
   * Get simplified tool suggestion
   */
  static getSimplifiedAlternative(toolName) {
    const alternatives = {
      'start_learning_journey_forest': 'create_project_forest',
      'start_gated_onboarding_forest': 'create_project_forest',
      'submit_goal_forest': 'create_project_forest',
      'submit_context_forest': 'create_project_forest',
      'submit_questionnaire_forest': 'create_project_forest',
      'continue_onboarding_forest': 'get_next_task_forest',
      'build_framework_forest': 'get_hta_status_forest',
      'check_onboarding_status_forest': 'list_projects_forest',
      'get_onboarding_status_forest': 'list_projects_forest'
    };
    
    return alternatives[toolName] || 'create_project_forest';
  }
}
