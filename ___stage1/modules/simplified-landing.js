/**
 * Simplified Landing Page Handler
 * Provides clear, actionable guidance without confusing multiple paths
 */

export class SimplifiedLanding {
  constructor(projectManagement) {
    this.projectManagement = projectManagement;
  }

  async generateLandingPage() {
    try {
      const projects = await this.projectManagement.listProjects();
      const hasProjects = projects && projects.length > 0;
      const activeProject = projects?.find(p => p.is_active);

      if (hasProjects) {
        return this.generateReturningUserPage(projects, activeProject);
      } else {
        return this.generateNewUserPage();
      }
    } catch (error) {
      return this.generateErrorPage(error);
    }
  }

  generateNewUserPage() {
    return {
      success: true,
      content: [{
        type: 'text',
        text: `# 🌲 Welcome to Forest Suite!

## Your Personal Achievement System

Forest Suite helps you achieve any goal through intelligent task breakdown and adaptive learning strategies.

### 🚀 Ready to Start? It's Simple!

**Recommended: Start with guided onboarding:**
\`\`\`
start_learning_journey_forest
\`\`\`

**Or create project directly:**
\`\`\`
create_project_forest {"goal": "your goal here"}
\`\`\`

### Examples:
- \`create_project_forest {"goal": "learn to play guitar"}\`
- \`create_project_forest {"goal": "start an online business"}\`
- \`create_project_forest {"goal": "become a data scientist"}\`
- \`create_project_forest {"goal": "write a novel"}\`

### Optional Parameters:
- \`project_id\` - Custom project ID (auto-generated if not provided)
- \`context\` - Additional context about why this matters
- \`learning_style\` - Your preferred style: visual, auditory, kinesthetic, reading, or mixed

**Full example:**
\`\`\`
create_project_forest {
  "goal": "learn to play guitar",
  "context": "I want to play for friends at gatherings",
  "learning_style": "visual"
}
\`\`\`

### What Happens Next?

1. **Instant Strategy** - I'll build a complete learning path for your goal
2. **First Task** - Get started immediately with \`get_next_task_forest\`
3. **Daily Progress** - Track achievements and evolve your approach

---

### 💡 Pro Tips:
- Be specific about your goal for better strategies
- Include "why" in your goal for more personalized paths
- You can have multiple projects running simultaneously

**Ready? Just tell me what you want to achieve!**`
      }]
    };
  }

  generateReturningUserPage(projects, activeProject) {
    let content = `# 🌲 Welcome Back to Forest Suite!

## Your Active Journey`;

    if (activeProject) {
      content += `

### 🎯 Current Focus: ${activeProject.name}
*Goal: ${activeProject.goal || 'No goal description'}*

**Continue now:** \`get_next_task_forest\``;
    }

    content += `

## Your Projects

`;

    // List projects with quick actions
    projects.forEach(project => {
      const isActive = project.is_active;
      const icon = isActive ? '🟢' : '⚪';
      
      content += `### ${icon} ${project.name}
`;
      if (project.goal) {
        content += `*${project.goal}*
`;
      }
      
      if (!isActive) {
        content += `**Activate:** \`switch_project_forest {"project_id": "${project.id || project.name}"}\`
`;
      }
      
      content += `
`;
    });

    content += `## Quick Actions

### Continue Learning
- **Next task:** \`get_next_task_forest\`
- **Today's progress:** \`current_status_forest\`
- **Full schedule:** \`generate_daily_schedule_forest\`

### Manage Projects
- **New project:** \`create_project_forest {"goal": "your new goal"}\`
- **Switch focus:** \`switch_project_forest {"project_id": "project_name"}\`
- **View strategy:** \`get_hta_status_forest\`

### Track Progress
- **Complete task:** \`complete_block_forest {"block_id": "task_id"}\`
- **Evolve strategy:** \`evolve_strategy_forest {"hint": "feedback about what's working"}\`

---

💪 **Keep going! Every task completed brings you closer to your goal.**`;

    return {
      success: true,
      content: [{
        type: 'text',
        text: content
      }],
      has_projects: true,
      active_project: activeProject?.id
    };
  }

  generateErrorPage(error) {
    return {
      success: false,
      content: [{
        type: 'text',
        text: `# ⚠️ Something Went Wrong

${error.message || 'An unexpected error occurred'}

## Let's Get You Back on Track

### If you're new here:
\`\`\`
create_project_forest {"goal": "your goal"}
\`\`\`

### If you're returning:
\`\`\`
list_projects_forest
\`\`\`

### Need system info:
\`\`\`
get_current_config
\`\`\`

### Start fresh (careful!):
\`\`\`
factory_reset_forest
\`\`\`

**Need help?** Just ask: "How do I...?"`
      }]
    };
  }
}

// Helper to generate quick start suggestions based on common goals
export function getQuickStartSuggestions() {
  return [
    {
      category: "🎵 Creative",
      suggestions: [
        "learn to play piano",
        "write a novel",
        "become a digital artist",
        "start a YouTube channel"
      ]
    },
    {
      category: "💼 Career",
      suggestions: [
        "transition to tech",
        "become a data scientist",
        "start freelancing",
        "learn project management"
      ]
    },
    {
      category: "🏃 Personal",
      suggestions: [
        "get in shape",
        "learn a new language",
        "develop better habits",
        "improve public speaking"
      ]
    },
    {
      category: "💰 Business",
      suggestions: [
        "start an online business",
        "build passive income",
        "launch a SaaS product",
        "become a consultant"
      ]
    }
  ];
}
