/**
 * Gated Onboarding Module - Multi-step Gated Project Creation Process
 * Implements the complete onboarding workflow with Claude AI integration
 */

import { FILE_NAMES } from './memory-sync.js';

const ONBOARDING_STATES = {
  INITIAL: 'initial',
  GOAL_COLLECTED: 'goal_collected',
  CONTEXT_COLLECTED: 'context_collected',
  QUESTIONNAIRE_GENERATED: 'questionnaire_generated',
  QUESTIONNAIRE_COMPLETED: 'questionnaire_completed',
  COMPLEXITY_ANALYZED: 'complexity_analyzed',
  FRAMEWORK_BUILT: 'framework_built',
  COMPLETED: 'completed'
};

const ONBOARDING_STEPS = {
  GOAL_SUBMISSION: 'goal_submission',
  CONTEXT_SUBMISSION: 'context_submission',
  QUESTIONNAIRE_COMPLETION: 'questionnaire_completion',
  COMPLEXITY_ANALYSIS: 'complexity_analysis',
  FRAMEWORK_BUILDING: 'framework_building'
};

export class GatedOnboarding {
  constructor(dataPersistence, claudeInterface, htaCore, projectManagement) {
    this.dataPersistence = dataPersistence;
    this.claudeInterface = claudeInterface;
    this.htaCore = htaCore;
    this.projectManagement = projectManagement;
    this.logger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
    
    // Track active onboarding sessions
    this.activeSessions = new Map();
  }

  /**
   * Initialize a new gated onboarding session
   * @param {string} sessionId - Unique session identifier
   * @returns {Promise<Object>} Initial onboarding state
   */
  async startOnboarding(sessionId) {
    try {
      const session = {
        id: sessionId,
        state: ONBOARDING_STATES.INITIAL,
        currentStep: ONBOARDING_STEPS.GOAL_SUBMISSION,
        data: {},
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };

      this.activeSessions.set(sessionId, session);
      
      // Save session to persistence
      await this.dataPersistence.saveGlobalData(
        `onboarding_session_${sessionId}`,
        session
      );

      return {
        success: true,
        content: [{
          type: 'text',
          text: `# 🌲 Welcome to Forest Suite - Project Creation

**Step 1 of 5: Share Your Goal or Dream**

To create a personalized learning and achievement framework, I need to understand what you're trying to accomplish.

**Please describe your goal or dream:**
- What do you want to achieve?
- What's your ultimate vision?
- What would success look like?

This can be anything from learning a new skill, building a business, changing careers, developing a creative project, or any personal ambition.

**⚠️ Important: You must submit your goal before we can proceed to the next step.**

Use the \`submit_goal_forest\` tool to continue.`
        }],
        sessionId,
        state: ONBOARDING_STATES.INITIAL,
        currentStep: ONBOARDING_STEPS.GOAL_SUBMISSION,
        gated: true
      };
    } catch (error) {
      this.logger.error('[GatedOnboarding] Failed to start onboarding', { error: error.message });
      throw new Error(`Failed to start onboarding: ${error.message}`);
    }
  }

  /**
   * Submit goal and progress to context collection
   * @param {string} sessionId - Session identifier
   * @param {string} goal - User's goal or dream
   * @returns {Promise<Object>} Next step response
   */
  async submitGoal(sessionId, goal) {
    try {
      const session = await this.getSession(sessionId);
      
      if (session.state !== ONBOARDING_STATES.INITIAL) {
        throw new Error('Goal has already been submitted for this session');
      }

      if (!goal || goal.trim().length < 10) {
        throw new Error('Please provide a more detailed goal (at least 10 characters)');
      }

      // Update session with goal
      session.data.goal = goal.trim();
      session.state = ONBOARDING_STATES.GOAL_COLLECTED;
      session.currentStep = ONBOARDING_STEPS.CONTEXT_SUBMISSION;
      session.last_updated = new Date().toISOString();

      await this.saveSession(session);

      return {
        success: true,
        content: [{
          type: 'text',
          text: `# ✅ Goal Captured Successfully!

**Your Goal:** ${goal}

**Step 2 of 5: Provide Context**

Now I need to understand your current situation and why this goal matters to you right now.

**Please share context about:**
- Your current life situation
- Why this goal is important to you now
- Any relevant background or experience
- What's motivating you to pursue this
- Any time constraints or pressures

This context helps me create a more personalized and effective learning strategy.

**⚠️ Important: You must submit context before we can proceed to the questionnaire.**

Use the \`submit_context_forest\` tool to continue.`
        }],
        sessionId,
        state: ONBOARDING_STATES.GOAL_COLLECTED,
        currentStep: ONBOARDING_STEPS.CONTEXT_SUBMISSION,
        gated: true
      };
    } catch (error) {
      this.logger.error('[GatedOnboarding] Failed to submit goal', { error: error.message, sessionId });
      throw error;
    }
  }

  /**
   * Submit context and trigger Claude AI questionnaire generation
   * @param {string} sessionId - Session identifier
   * @param {string} context - User's context
   * @returns {Promise<Object>} Generated questionnaire
   */
  async submitContext(sessionId, context) {
    try {
      const session = await this.getSession(sessionId);
      
      if (session.state !== ONBOARDING_STATES.GOAL_COLLECTED) {
        throw new Error('Context can only be submitted after goal collection');
      }

      if (!context || context.trim().length < 20) {
        throw new Error('Please provide more detailed context (at least 20 characters)');
      }

      // Update session with context
      session.data.context = context.trim();
      session.state = ONBOARDING_STATES.CONTEXT_COLLECTED;
      session.last_updated = new Date().toISOString();

      await this.saveSession(session);

      // Generate dynamic questionnaire using Claude AI
      const questionnaire = await this.generateQuestionnaire(session.data.goal, session.data.context);
      
      // Update session with questionnaire
      session.data.questionnaire = questionnaire;
      session.state = ONBOARDING_STATES.QUESTIONNAIRE_GENERATED;
      session.currentStep = ONBOARDING_STEPS.QUESTIONNAIRE_COMPLETION;
      session.last_updated = new Date().toISOString();

      await this.saveSession(session);

      return {
        success: true,
        content: [{
          type: 'text',
          text: `# ✅ Context Captured Successfully!

**Step 3 of 5: Complete Dynamic Questionnaire**

Based on your goal and context, I've generated a personalized questionnaire to fill in all the details needed for your strategic framework.

${this.formatQuestionnaire(questionnaire)}

**⚠️ Important: You must complete all questionnaire fields before we can proceed to complexity analysis.**

Use the \`submit_questionnaire_forest\` tool with your answers to continue.`
        }],
        sessionId,
        state: ONBOARDING_STATES.QUESTIONNAIRE_GENERATED,
        currentStep: ONBOARDING_STEPS.QUESTIONNAIRE_COMPLETION,
        questionnaire,
        gated: true
      };
    } catch (error) {
      this.logger.error('[GatedOnboarding] Failed to submit context', { error: error.message, sessionId });
      throw error;
    }
  }

  /**
   * Generate dynamic questionnaire using Claude AI
   * @param {string} goal - User's goal
   * @param {string} context - User's context
   * @returns {Promise<Object>} Generated questionnaire
   */
  async generateQuestionnaire(goal, context) {
    try {
      const prompt = `# Dynamic Questionnaire Generation

**Goal:** ${goal}
**Context:** ${context}

Generate a comprehensive questionnaire that ensures all tree schema blanks are filled before building the HTA tree. The questionnaire should be tailored to this specific goal and context.

**Required Categories to Cover:**
1. **Learning Paths** - What specific skills/areas need development
2. **Constraints** - Time, energy, financial, location limitations
3. **Existing Knowledge** - Current skills, credentials, experience
4. **Habits & Preferences** - Current routines, learning style, preferences
5. **Success Metrics** - How they'll measure progress and success
6. **Life Structure** - Daily routines, energy patterns, focus preferences

**Format Requirements:**
- 3-5 targeted questions per category
- Questions should be specific to their goal
- Include example answers where helpful
- Questions should fill gaps in the HTA tree schema
- Prioritize questions that affect strategic planning

Return a JSON object with the questionnaire structure.`;

      const response = await this.claudeInterface.generateResponse(prompt);
      
      // Parse Claude's response to extract questionnaire
      const questionnaireMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (questionnaireMatch) {
        try {
          return JSON.parse(questionnaireMatch[1]);
        } catch (parseError) {
          this.logger.warn('[GatedOnboarding] Failed to parse Claude questionnaire JSON, using fallback');
        }
      }

      // Fallback questionnaire if parsing fails
      return this.generateFallbackQuestionnaire(goal, context);
    } catch (error) {
      this.logger.error('[GatedOnboarding] Failed to generate questionnaire', { error: error.message });
      return this.generateFallbackQuestionnaire(goal, context);
    }
  }

  /**
   * Generate fallback questionnaire when Claude AI fails
   * @param {string} goal - User's goal
   * @param {string} context - User's context
   * @returns {Object} Fallback questionnaire
   */
  generateFallbackQuestionnaire(goal, context) {
    return {
      categories: [
        {
          name: "Learning Paths",
          questions: [
            {
              id: "learning_paths",
              question: `What specific skills or areas do you need to develop to achieve: "${goal}"?`,
              type: "array",
              placeholder: "e.g., programming, design, marketing, specific technologies"
            },
            {
              id: "learning_priorities",
              question: "Which learning areas are most critical to start with?",
              type: "array",
              placeholder: "e.g., foundational skills, immediate needs, long-term development"
            }
          ]
        },
        {
          name: "Constraints",
          questions: [
            {
              id: "time_constraints",
              question: "What are your time limitations and available slots for learning?",
              type: "text",
              placeholder: "e.g., 1 hour daily, weekends only, irregular schedule"
            },
            {
              id: "energy_patterns",
              question: "When do you have the most energy and focus during the day?",
              type: "text",
              placeholder: "e.g., morning person, night owl, energy varies"
            },
            {
              id: "financial_constraints",
              question: "What's your budget for learning resources and tools?",
              type: "text",
              placeholder: "e.g., free resources only, $100/month, no limit"
            }
          ]
        },
        {
          name: "Existing Knowledge",
          questions: [
            {
              id: "current_skills",
              question: "What relevant skills and experience do you already have?",
              type: "array",
              placeholder: "e.g., previous courses, work experience, hobbies"
            },
            {
              id: "credentials",
              question: "What formal education or certifications do you have?",
              type: "array",
              placeholder: "e.g., degree in X, certification in Y, course completion"
            }
          ]
        },
        {
          name: "Success Metrics",
          questions: [
            {
              id: "success_definition",
              question: "How will you know you've achieved your goal?",
              type: "text",
              placeholder: "e.g., specific outcomes, milestones, capabilities"
            },
            {
              id: "progress_tracking",
              question: "How do you prefer to track and measure progress?",
              type: "text",
              placeholder: "e.g., project completion, skill assessments, portfolio building"
            }
          ]
        }
      ],
      instructions: "Please answer all questions thoroughly. Your answers will be used to create a personalized strategic learning framework."
    };
  }

  /**
   * Format questionnaire for display
   * @param {Object} questionnaire - Questionnaire object
   * @returns {string} Formatted questionnaire text
   */
  formatQuestionnaire(questionnaire) {
    let formatted = "\n**Dynamic Questionnaire:**\n\n";
    
    questionnaire.categories.forEach((category, categoryIndex) => {
      formatted += `## ${categoryIndex + 1}. ${category.name}\n\n`;
      
      category.questions.forEach((question, questionIndex) => {
        formatted += `**${categoryIndex + 1}.${questionIndex + 1}** ${question.question}\n`;
        if (question.placeholder) {
          formatted += `*${question.placeholder}*\n`;
        }
        formatted += `**ID:** \`${question.id}\`\n\n`;
      });
    });

    formatted += "\n**Instructions:**\n";
    formatted += questionnaire.instructions || "Please answer all questions thoroughly.";
    formatted += "\n\n**Note:** Provide your answers as a JSON object with question IDs as keys.";

    return formatted;
  }

  /**
   * Submit questionnaire answers and trigger complexity analysis
   * @param {string} sessionId - Session identifier
   * @param {Object} answers - User's questionnaire answers
   * @returns {Promise<Object>} Complexity analysis results
   */
  async submitQuestionnaire(sessionId, answers) {
    try {
      const session = await this.getSession(sessionId);
      
      if (session.state !== ONBOARDING_STATES.QUESTIONNAIRE_GENERATED) {
        throw new Error('Questionnaire can only be submitted after generation');
      }

      if (!answers || typeof answers !== 'object') {
        throw new Error('Please provide questionnaire answers as an object');
      }

      // Validate all required questions are answered
      const requiredQuestions = this.extractRequiredQuestions(session.data.questionnaire);
      const missingAnswers = requiredQuestions.filter(qId => !answers[qId]);
      
      if (missingAnswers.length > 0) {
        throw new Error(`Please answer all required questions: ${missingAnswers.join(', ')}`);
      }

      // Update session with answers
      session.data.answers = answers;
      session.state = ONBOARDING_STATES.QUESTIONNAIRE_COMPLETED;
      session.currentStep = ONBOARDING_STEPS.COMPLEXITY_ANALYSIS;
      session.last_updated = new Date().toISOString();

      await this.saveSession(session);

      // Perform complexity analysis
      const complexityAnalysis = await this.performComplexityAnalysis(session.data);
      
      // Update session with analysis
      session.data.complexityAnalysis = complexityAnalysis;
      session.state = ONBOARDING_STATES.COMPLEXITY_ANALYZED;
      session.currentStep = ONBOARDING_STEPS.FRAMEWORK_BUILDING;
      session.last_updated = new Date().toISOString();

      await this.saveSession(session);

      return {
        success: true,
        content: [{
          type: 'text',
          text: `# ✅ Questionnaire Completed Successfully!

**Step 4 of 5: Complexity Analysis Complete**

Based on your answers, I've analyzed the complexity of your goal and learning requirements:

${this.formatComplexityAnalysis(complexityAnalysis)}

**Step 5 of 5: Building Strategic Framework**

Now I'll create your personalized HTA tree and strategic framework. This will include:
- Hierarchical task decomposition
- Dynamic learning paths
- Strategic milestone planning
- Next + Pipeline task system

**⚠️ Processing: This may take a moment as I build your complete framework...**

Use the \`build_framework_forest\` tool to proceed with framework creation.`
        }],
        sessionId,
        state: ONBOARDING_STATES.COMPLEXITY_ANALYZED,
        currentStep: ONBOARDING_STEPS.FRAMEWORK_BUILDING,
        complexityAnalysis,
        gated: true
      };
    } catch (error) {
      this.logger.error('[GatedOnboarding] Failed to submit questionnaire', { error: error.message, sessionId });
      throw error;
    }
  }

  /**
   * Extract required question IDs from questionnaire
   * @param {Object} questionnaire - Questionnaire object
   * @returns {Array<string>} Required question IDs
   */
  extractRequiredQuestions(questionnaire) {
    const requiredIds = [];
    
    questionnaire.categories.forEach(category => {
      category.questions.forEach(question => {
        if (!question.optional) {
          requiredIds.push(question.id);
        }
      });
    });
    
    return requiredIds;
  }

  /**
   * Perform complexity analysis on collected data
   * @param {Object} sessionData - Complete session data
   * @returns {Promise<Object>} Complexity analysis results
   */
  async performComplexityAnalysis(sessionData) {
    try {
      const { goal, context, answers } = sessionData;
      
      // Use Claude AI for sophisticated complexity analysis
      const analysisPrompt = `# Complexity Analysis for Strategic Framework

**Goal:** ${goal}
**Context:** ${context}
**Collected Data:** ${JSON.stringify(answers, null, 2)}

Perform a comprehensive complexity analysis to determine:

1. **Tree Depth** (2-5 levels): How many hierarchical levels needed
2. **Tree Richness** (3-8 branches): How many major learning paths
3. **Difficulty Rating** (1-10): Overall complexity of the goal
4. **Time Horizon** (weeks/months/years): Realistic timeline
5. **Resource Requirements** (low/medium/high): Learning resources needed
6. **Prerequisites** (none/some/extensive): Foundational knowledge required

**Analysis Factors:**
- Technical complexity of the goal
- User's existing knowledge and skills
- Time and resource constraints
- Learning path interdependencies
- Success metrics and urgency

Provide specific recommendations for the HTA tree structure and strategic approach.

Return analysis as JSON with specific numeric values and strategic recommendations.`;

      const response = await this.claudeInterface.generateResponse(analysisPrompt);
      
      // Parse Claude's response
      const analysisMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (analysisMatch) {
        try {
          const analysis = JSON.parse(analysisMatch[1]);
          return this.validateComplexityAnalysis(analysis);
        } catch (parseError) {
          this.logger.warn('[GatedOnboarding] Failed to parse complexity analysis, using fallback');
        }
      }

      // Fallback analysis
      return this.generateFallbackComplexityAnalysis(goal, context, answers);
    } catch (error) {
      this.logger.error('[GatedOnboarding] Failed to perform complexity analysis', { error: error.message });
      return this.generateFallbackComplexityAnalysis(sessionData.goal, sessionData.context, sessionData.answers);
    }
  }

  /**
   * Generate fallback complexity analysis
   * @param {string} goal - User's goal
   * @param {string} context - User's context
   * @param {Object} answers - User's answers
   * @returns {Object} Fallback complexity analysis
   */
  generateFallbackComplexityAnalysis(goal, context, answers) {
    // Simple heuristic-based analysis
    const goalComplexity = this.calculateGoalComplexity(goal);
    const skillGap = this.calculateSkillGap(answers);
    const timeConstraints = this.calculateTimeConstraints(answers);
    
    return {
      treeDepth: Math.min(5, Math.max(2, goalComplexity + skillGap - 2)),
      treeRichness: Math.min(8, Math.max(3, goalComplexity + 2)),
      difficultyRating: Math.min(10, Math.max(1, goalComplexity + skillGap)),
      timeHorizon: timeConstraints > 7 ? 'months' : timeConstraints > 4 ? 'weeks' : 'days',
      resourceRequirements: goalComplexity > 6 ? 'high' : goalComplexity > 3 ? 'medium' : 'low',
      prerequisites: skillGap > 6 ? 'extensive' : skillGap > 3 ? 'some' : 'none',
      strategicRecommendations: [
        'Focus on foundational skills first',
        'Break down complex tasks into manageable steps',
        'Regular progress assessment and strategy adjustment',
        'Build practical experience alongside theoretical learning'
      ]
    };
  }

  /**
   * Calculate goal complexity score
   * @param {string} goal - User's goal
   * @returns {number} Complexity score (1-10)
   */
  calculateGoalComplexity(goal) {
    const complexityKeywords = [
      'business', 'startup', 'company', 'enterprise', 'professional', 'career',
      'master', 'expert', 'advanced', 'complex', 'system', 'architecture',
      'programming', 'development', 'engineering', 'science', 'research',
      'certification', 'degree', 'qualification', 'multiple', 'various'
    ];
    
    const goalLower = goal.toLowerCase();
    const keywordMatches = complexityKeywords.filter(keyword => goalLower.includes(keyword)).length;
    const goalLength = goal.length;
    
    return Math.min(10, Math.max(1, keywordMatches * 2 + Math.floor(goalLength / 50)));
  }

  /**
   * Calculate skill gap score
   * @param {Object} answers - User's answers
   * @returns {number} Skill gap score (1-10)
   */
  calculateSkillGap(answers) {
    const currentSkills = answers.current_skills || [];
    const credentials = answers.credentials || [];
    const learningPaths = answers.learning_paths || [];
    
    const existingKnowledge = currentSkills.length + credentials.length;
    const requiredLearning = learningPaths.length;
    
    return Math.min(10, Math.max(1, requiredLearning * 2 - existingKnowledge));
  }

  /**
   * Calculate time constraints score
   * @param {Object} answers - User's answers
   * @returns {number} Time constraints score (1-10)
   */
  calculateTimeConstraints(answers) {
    const timeConstraints = answers.time_constraints || '';
    const timeConstraintsLower = timeConstraints.toLowerCase();
    
    if (timeConstraintsLower.includes('hour') || timeConstraintsLower.includes('limited')) {
      return 8;
    }
    if (timeConstraintsLower.includes('weekend') || timeConstraintsLower.includes('part-time')) {
      return 6;
    }
    if (timeConstraintsLower.includes('full-time') || timeConstraintsLower.includes('flexible')) {
      return 3;
    }
    
    return 5; // Default moderate constraints
  }

  /**
   * Validate and normalize complexity analysis
   * @param {Object} analysis - Raw complexity analysis
   * @returns {Object} Validated complexity analysis
   */
  validateComplexityAnalysis(analysis) {
    return {
      treeDepth: Math.min(5, Math.max(2, analysis.treeDepth || 3)),
      treeRichness: Math.min(8, Math.max(3, analysis.treeRichness || 4)),
      difficultyRating: Math.min(10, Math.max(1, analysis.difficultyRating || 5)),
      timeHorizon: ['days', 'weeks', 'months', 'years'].includes(analysis.timeHorizon) ? analysis.timeHorizon : 'months',
      resourceRequirements: ['low', 'medium', 'high'].includes(analysis.resourceRequirements) ? analysis.resourceRequirements : 'medium',
      prerequisites: ['none', 'some', 'extensive'].includes(analysis.prerequisites) ? analysis.prerequisites : 'some',
      strategicRecommendations: Array.isArray(analysis.strategicRecommendations) ? analysis.strategicRecommendations : []
    };
  }

  /**
   * Format complexity analysis for display
   * @param {Object} analysis - Complexity analysis
   * @returns {string} Formatted analysis text
   */
  formatComplexityAnalysis(analysis) {
    return `
**Complexity Analysis Results:**

🎯 **Difficulty Rating:** ${analysis.difficultyRating}/10
📊 **Tree Depth:** ${analysis.treeDepth} levels
🌿 **Tree Richness:** ${analysis.treeRichness} major branches
⏰ **Time Horizon:** ${analysis.timeHorizon}
📚 **Resource Requirements:** ${analysis.resourceRequirements}
🎓 **Prerequisites:** ${analysis.prerequisites}

**Strategic Recommendations:**
${analysis.strategicRecommendations.map(rec => `• ${rec}`).join('\n')}

This analysis will guide the creation of your personalized HTA tree and strategic framework.`;
  }

  /**
   * Build complete strategic framework
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Complete framework and project creation
   */
  async buildFramework(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      
      if (session.state !== ONBOARDING_STATES.COMPLEXITY_ANALYZED) {
        throw new Error('Framework can only be built after complexity analysis');
      }

      const { goal, context, answers, complexityAnalysis } = session.data;
      
      // Generate unique project ID
      const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Convert collected data to project schema
      const projectData = this.convertToProjectSchema(goal, context, answers, complexityAnalysis, projectId);
      
      // Create project using project management
      const projectResult = await this.projectManagement.createProject(projectData);
      
      if (!projectResult.success) {
        throw new Error('Failed to create project: ' + projectResult.content[0].text);
      }
      
      // Build HTA tree
      const htaResult = await this.htaCore.buildHTATree({
        pathName: projectData.learning_paths[0]?.path_name || 'general',
        goal,
        context,
        learning_style: 'mixed',
        focus_areas: ['foundational', 'practical']
      });
      
      // Create Next + Pipeline task system
      const taskPipeline = await this.createNextPipelineSystem(projectId, htaResult);
      
      // Update session as completed
      session.data.projectId = projectId;
      session.data.htaResult = htaResult;
      session.data.taskPipeline = taskPipeline;
      session.state = ONBOARDING_STATES.COMPLETED;
      session.last_updated = new Date().toISOString();
      
      await this.saveSession(session);
      
      return {
        success: true,
        content: [{
          type: 'text',
          text: `# 🎉 Onboarding Complete! Framework Built Successfully

**Project Created:** ${projectId}

**Your Strategic Framework:**
- **HTA Tree:** ${htaResult.strategicBranches?.length || 0} strategic branches
- **Total Tasks:** ${taskPipeline.totalTasks} tasks identified
- **Complexity Level:** ${complexityAnalysis.difficultyRating}/10

${this.formatTaskPipeline(taskPipeline)}

**Next Steps:**
1. Review your strategic framework with \`get_hta_status_forest\`
2. Get your next task with \`get_next_task_forest\`
3. Generate today's schedule with \`generate_daily_schedule_forest\`

Your personalized learning journey is now ready! 🚀`
        }],
        sessionId,
        projectId,
        state: ONBOARDING_STATES.COMPLETED,
        taskPipeline,
        onboardingComplete: true
      };
    } catch (error) {
      this.logger.error('[GatedOnboarding] Failed to build framework', { error: error.message, sessionId });
      throw error;
    }
  }

  /**
   * Convert collected data to project schema
   * @param {string} goal - User's goal
   * @param {string} context - User's context
   * @param {Object} answers - User's answers
   * @param {Object} complexityAnalysis - Complexity analysis
   * @param {string} projectId - Project ID
   * @returns {Object} Project schema data
   */
  convertToProjectSchema(goal, context, answers, complexityAnalysis, projectId) {
    const learningPaths = answers.learning_paths || [];
    const currentSkills = answers.current_skills || [];
    const credentials = answers.credentials || [];
    
    return {
      project_id: projectId,
      goal,
      context,
      specific_interests: answers.specific_interests || [],
      learning_paths: learningPaths.map((path, index) => ({
        path_name: path,
        priority: index === 0 ? 'high' : 'medium',
        interests: []
      })),
      constraints: {
        time_constraints: answers.time_constraints || '',
        energy_patterns: answers.energy_patterns || '',
        focus_variability: 'mixed',
        financial_constraints: answers.financial_constraints || '',
        location_constraints: answers.location_constraints || ''
      },
      existing_credentials: credentials.map(cred => ({
        subject_area: cred,
        credential_type: 'experience',
        level: 'intermediate',
        relevance_to_goal: 'relevant'
      })),
      current_habits: {
        good_habits: currentSkills,
        bad_habits: [],
        habit_goals: []
      },
      life_structure_preferences: {
        wake_time: '7:00 AM',
        sleep_time: '11:00 PM',
        meal_times: ['8:00 AM', '12:00 PM', '6:00 PM'],
        focus_duration: '25 minutes',
        break_preferences: 'short frequent breaks',
        transition_time: '5 minutes'
      },
      urgency_level: complexityAnalysis.timeHorizon === 'days' ? 'high' : 
                     complexityAnalysis.timeHorizon === 'weeks' ? 'medium' : 'low',
      success_metrics: [answers.success_definition || 'Goal completion']
    };
  }

  /**
   * Create Next + Pipeline task system
   * @param {string} projectId - Project ID
   * @param {Object} htaResult - HTA tree result
   * @returns {Promise<Object>} Task pipeline system
   */
  async createNextPipelineSystem(projectId, htaResult) {
    try {
      const allTasks = htaResult.frontierNodes || [];
      
      if (allTasks.length === 0) {
        return {
          primary: null,
          secondary: [],
          tertiary: [],
          totalTasks: 0,
          message: 'No tasks generated yet. Build HTA tree first.'
        };
      }
      
      // Sort tasks by priority and difficulty
      const sortedTasks = allTasks.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.difficulty - b.difficulty;
      });
      
      // Create Next + Pipeline structure
      const pipeline = {
        primary: sortedTasks[0] || null,
        secondary: sortedTasks.slice(1, 4),
        tertiary: sortedTasks.slice(4, 7),
        totalTasks: allTasks.length,
        created_at: new Date().toISOString()
      };
      
      // Save pipeline to project data
      await this.dataPersistence.saveProjectData(
        projectId,
        'task_pipeline',
        pipeline
      );
      
      return pipeline;
    } catch (error) {
      this.logger.error('[GatedOnboarding] Failed to create task pipeline', { error: error.message });
      return {
        primary: null,
        secondary: [],
        tertiary: [],
        totalTasks: 0,
        message: 'Failed to create task pipeline'
      };
    }
  }

  /**
   * Format task pipeline for display
   * @param {Object} pipeline - Task pipeline
   * @returns {string} Formatted pipeline text
   */
  formatTaskPipeline(pipeline) {
    let formatted = "\n**Your Next + Pipeline Task System:**\n\n";
    
    if (pipeline.primary) {
      formatted += `🎯 **Primary Task (Next):**\n`;
      formatted += `• ${pipeline.primary.title}\n`;
      formatted += `  *${pipeline.primary.description}*\n`;
      formatted += `  Duration: ${pipeline.primary.duration} | Difficulty: ${pipeline.primary.difficulty}/5\n\n`;
    }
    
    if (pipeline.secondary.length > 0) {
      formatted += `📋 **Secondary Tasks (Coming Up):**\n`;
      pipeline.secondary.forEach(task => {
        formatted += `• ${task.title} (${task.duration})\n`;
      });
      formatted += "\n";
    }
    
    if (pipeline.tertiary.length > 0) {
      formatted += `🔄 **Tertiary Tasks (Available Now):**\n`;
      pipeline.tertiary.forEach(task => {
        formatted += `• ${task.title} (${task.duration})\n`;
      });
      formatted += "\n";
    }
    
    formatted += `**Total Tasks in Pipeline:** ${pipeline.totalTasks}`;
    
    return formatted;
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Session data
   */
  async getSession(sessionId) {
    if (this.activeSessions.has(sessionId)) {
      return this.activeSessions.get(sessionId);
    }
    
    try {
      const session = await this.dataPersistence.loadGlobalData(`onboarding_session_${sessionId}`);
      if (session) {
        this.activeSessions.set(sessionId, session);
        return session;
      }
    } catch (error) {
      this.logger.warn('[GatedOnboarding] Failed to load session from persistence', { sessionId, error: error.message });
    }
    
    throw new Error(`Session ${sessionId} not found`);
  }

  /**
   * Save session to persistence
   * @param {Object} session - Session data
   * @returns {Promise<void>}
   */
  async saveSession(session) {
    this.activeSessions.set(session.id, session);
    await this.dataPersistence.saveGlobalData(`onboarding_session_${session.id}`, session);
  }

  /**
   * Check if session is gated at current step
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Gating status
   */
  async checkGateStatus(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      
      return {
        sessionId,
        state: session.state,
        currentStep: session.currentStep,
        isGated: session.state !== ONBOARDING_STATES.COMPLETED,
        nextAction: this.getNextAction(session.state)
      };
    } catch (error) {
      return {
        sessionId,
        state: ONBOARDING_STATES.INITIAL,
        currentStep: ONBOARDING_STEPS.GOAL_SUBMISSION,
        isGated: true,
        nextAction: 'start_onboarding'
      };
    }
  }

  /**
   * Get next action for current state
   * @param {string} state - Current state
   * @returns {string} Next action
   */
  getNextAction(state) {
    switch (state) {
      case ONBOARDING_STATES.INITIAL:
        return 'submit_goal_forest';
      case ONBOARDING_STATES.GOAL_COLLECTED:
        return 'submit_context_forest';
      case ONBOARDING_STATES.QUESTIONNAIRE_GENERATED:
        return 'submit_questionnaire_forest';
      case ONBOARDING_STATES.COMPLEXITY_ANALYZED:
        return 'build_framework_forest';
      case ONBOARDING_STATES.COMPLETED:
        return 'onboarding_complete';
      default:
        return 'start_onboarding';
    }
  }

  /**
   * Clean up completed sessions
   * @returns {Promise<void>}
   */
  async cleanupSessions() {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (new Date(session.last_updated) < cutoffTime) {
        this.activeSessions.delete(sessionId);
      }
    }
  }
}
