/**
 * HTA Core Module - Consolidated HTA Intelligence
 * Merged from hta-tree-builder.js + hta-bridge.js - Preserves ALL HTA magic
 */

import { FILE_NAMES, DEFAULT_PATHS, HTA_LEVELS, FEATURE_FLAGS } from './memory-sync.js';
import { buildRichContext, formatConstraintsForPrompt } from './context-utils.js';
import { globalCircuitBreaker } from './llm-circuit-breaker.js';
import { guard } from '../utils/hta-guard.js';
import { HTAVectorIntegration } from './hta-vector-integration.js';
import { HTABridgeCommunication } from './hta-bridge-communication.js';
import { HTAComplexityAnalyzer } from './hta-complexity-analyzer.js';
import { HTADataManager } from './hta-data-manager.js';
import { PureSchemaHTASystem } from './pure-schema-driven-hta.js';

// Utility: ensure every branch has a valid name string
function sanitizeBranchNames(branches = []) {
  return branches.map((branch, idx) => {
    let name = (branch && typeof branch.name === 'string' && branch.name.trim()) ? branch.name.trim() : '';
    if (!name) {
      if (branch && typeof branch.description === 'string' && branch.description.trim()) {
        // Use up to first 3 words of description as fallback name
        name = branch.description.trim().split(/\s+/).slice(0, 3).join(' ');
      }
      if (!name) {
        name = `Branch ${idx + 1}`;
      }
    }
    return { ...branch, name };
  });
}


// PERMANENT_SCHEMA_FIX_INSTALLED: 2025-06-29T03:20:13.423Z
const PERMANENT_SCHEMA_FIX = {
  version: '1.0.0',
  installed: '2025-06-29T03:20:13.426Z',
  description: 'Handles resultSchema.parse errors gracefully',
};

const HTA_CONSTANTS = {
  DEFAULT_DEPTH_LEVELS: 3,
  DEFAULT_COMPLEXITY_SCORE: 5,
  DEFAULT_TASK_DIFFICULTY: 2,
  DEFAULT_TASK_DURATION: '25 minutes',
  TARGET_PRIORITY_MULTIPLIER: 100,
  BASE_COMPLEXITY_SCORE: 3,
  PROFESSIONAL_COMPLEXITY_BONUS: 4,
  TECHNICAL_COMPLEXITY_BONUS: 3,
  MASTERY_COMPLEXITY_BONUS: 2,
  TIME_PRESSURE_BONUS: 1,
  MAX_DOMAIN_BONUS: 2,
  MAX_COMPLEXITY_SCORE: 10,
  SIMPLE_THRESHOLD: 3,
  MODERATE_THRESHOLD: 6,
  COMPLEX_THRESHOLD: 8,
  SIMPLE_DEPTH: 2,
  MODERATE_DEPTH: 3,
  COMPLEX_DEPTH: 4,
  EXPERT_DEPTH: 5,
  MIN_BRANCHES: 3,
  MAX_BRANCHES: 8,
  BRANCH_MULTIPLIER: 1.2,
  MIN_PRACTICAL_BRANCHES: 4,
  MIN_THEORETICAL_BRANCHES: 3,
  BASE_TASKS_PER_BRANCH: 10,
  MIN_TASKS_PER_BRANCH: 2,
  BASE_TASK_DURATION: 25,
  DIFFICULTY_MULTIPLIER: 0.3,
  HANDS_ON_MULTIPLIER: 1.2,
  READING_MULTIPLIER: 0.8,
  MAX_DIFFICULTY: 5,
  MIN_DIFFICULTY: 1,
  COMPLEXITY_SCORE_DIVISOR: 2,
  TASK_DIFFICULTY_INCREMENT: 0.5,
};

if (!PERMANENT_SCHEMA_FIX.version) {
  throw new Error('CRITICAL: Permanent schema fix has been corrupted or removed');
}

export class HTACore {
  constructor(dataPersistence, projectManagement, claudeInterface) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.claudeInterface = claudeInterface;
    this.logger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
    
    // Initialize specialized modules
    this.vectorIntegration = new HTAVectorIntegration();
    this.bridgeCommunication = new HTABridgeCommunication();
    this.complexityAnalyzer = new HTAComplexityAnalyzer();
    this.dataManager = new HTADataManager(dataPersistence, projectManagement, this.vectorIntegration);
    
    // Initialize Pure Schema-Driven HTA System for superintelligent strategic planning
    this.pureSchemaHTA = new PureSchemaHTASystem(claudeInterface);

    // Apply HTA guards to mutation methods for runtime validation
    this.saveHTAData = guard('saveHTAData', this.saveHTAData.bind(this));
    this.buildHTATree = guard('buildHTATree', this.buildHTATree.bind(this));

    // Dependency validation
    if (
      !this.projectManagement ||
      typeof this.projectManagement.requireActiveProject !== 'function'
    ) {
      this.logger.warn('[HTACore] ⚠️ projectManagement missing requireActiveProject');
    }
  }

  // ===== VECTOR STORE INITIALIZATION =====

  async ensureVectorStore() {
    return await this.vectorIntegration.ensureVectorStore(this.dataPersistence);
  }

  // ===== HTA BRIDGE FUNCTIONALITY =====

  async connect() {
    return await this.bridgeCommunication.connect();
  }

  async disconnect() {
    return await this.bridgeCommunication.disconnect();
  }

  async getOrCreateHTAData(projectId, pathName) {
    return await this.dataManager.loadHTAData(projectId, pathName);
  }

  convertHTAStructureToTaskFormat(htaStructure, pathName) {
    let frontierNodes = [];
    if (htaStructure.strategic_branches && htaStructure.strategic_branches.length > 0) {
      frontierNodes = this.generateTasksFromBranches(
        htaStructure.strategic_branches,
        htaStructure.goal
      );
    }

    const hierarchyMetadata = {
      total_tasks: frontierNodes.length,
      total_branches: htaStructure.strategic_branches?.length || 0,
      completed_tasks: 0,
      available_tasks: frontierNodes.length,
      depth_levels: htaStructure.depth_config?.target_depth || HTA_CONSTANTS.DEFAULT_DEPTH_LEVELS,
      last_updated: new Date().toISOString(),
    };

    return {
      pathName,
      goal: htaStructure.goal,
      complexity:
        htaStructure.complexity_profile?.complexity_score || HTA_CONSTANTS.DEFAULT_COMPLEXITY_SCORE,
      targetDepth: htaStructure.depth_config?.target_depth || HTA_CONSTANTS.DEFAULT_DEPTH_LEVELS,
      strategicBranches: htaStructure.strategic_branches || [],
      questionTree: htaStructure.question_tree || {
        root_question: `How to achieve: ${htaStructure.goal}?`,
        sub_questions: [],
      },
      dependencies: htaStructure.dependencies || {},
      metadata: htaStructure.metadata || { source: 'hta-server' },
      frontierNodes,
      hierarchyMetadata,
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
  }

  generateTasksFromBranches(strategicBranches, goal) {
    strategicBranches = sanitizeBranchNames(strategicBranches);
    const tasks = [];
    let taskId = 1;

    strategicBranches.forEach((branch, branchIndex) => {
      if (branch.tasks && Array.isArray(branch.tasks)) {
        branch.tasks.forEach((task, taskIndex) => {
          tasks.push({
            id: `${branch.name.toLowerCase().replace(/\s+/g, '_')}_${taskId}`,
            title: task.title || task.name || `${branch.name} Task ${taskIndex + 1}`,
            description: task.description || `Work on ${branch.name} objectives`,
            difficulty: task.difficulty || HTA_CONSTANTS.DEFAULT_TASK_DIFFICULTY,
            duration: task.duration || HTA_CONSTANTS.DEFAULT_TASK_DURATION,
            branch: branch.name,
            priority: (branchIndex + 1) * HTA_CONSTANTS.TARGET_PRIORITY_MULTIPLIER + taskIndex,
            prerequisites: task.prerequisites || [],
            learningOutcome: task.learning_outcome || `Progress in ${branch.name}`,
            generated: true,
          });
          taskId++;
        });
      } else {
        tasks.push({
          id: `${branch.name.toLowerCase().replace(/\s+/g, '_')}_${taskId}`,
          title: `Explore ${branch.name}`,
          description: branch.description || `Work on ${branch.name} objectives`,
          difficulty: HTA_CONSTANTS.DEFAULT_TASK_DIFFICULTY,
          duration: HTA_CONSTANTS.DEFAULT_TASK_DURATION,
          branch: branch.name,
          priority: (branchIndex + 1) * HTA_CONSTANTS.TARGET_PRIORITY_MULTIPLIER,
          prerequisites: [],
          learningOutcome: `Understanding of ${branch.name}`,
          generated: true,
        });
        taskId++;
      }
    });

    return tasks;
  }

  async saveHTAData(projectId, pathName, htaData) {
    return await this.dataManager.saveHTAData(projectId, htaData, pathName);
  }

  async createFallbackHTA(config, pathName) {
    const complexityAnalysis = await this.analyzeGoalComplexityAsync(config.goal, config.context || '');
    const skeletonTasks = await this.generateSkeletonTasks(
      complexityAnalysis,
      config,
      [],
      config.learningStyle || 'mixed'
    );
    return {
      pathName,
      goal: config.goal,
      complexity: complexityAnalysis,
      strategicBranches: Array.isArray(skeletonTasks)
        ? this.organizeBranchesFromTasks(skeletonTasks)
        : this.generateBasicFallbackBranches(config.goal),
      frontierNodes: Array.isArray(skeletonTasks) ? skeletonTasks : [],
      hierarchyMetadata: {
        total_tasks: Array.isArray(skeletonTasks) ? skeletonTasks.length : 0,
        total_branches: 0,
        completed_tasks: 0,
        available_tasks: Array.isArray(skeletonTasks) ? skeletonTasks.length : 0,
        depth_levels: complexityAnalysis.recommended_depth,
        last_updated: new Date().toISOString(),
      },
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      metadata: { source: 'fallback-generation' },
    };
  }

  // ===== HTA TREE BUILDER FUNCTIONALITY =====

  async generateHTAData(goal, context = '', options = {}) {
    // PRD-required function for Claude integration
    try {
      const complexityAnalysis = await this.analyzeGoalComplexityAsync(goal, context);
      
      if (this.claudeInterface && globalCircuitBreaker.canExecute()) {
        const branchPrompt = this.buildBranchGenerationPrompt(
          complexityAnalysis,
          { goal, context },
          options.focusAreas || [],
          options.learningStyle || 'mixed',
          context,
          ''
        );
        
        const claudeResponse = await globalCircuitBreaker.execute(async () => {
          return await this.claudeInterface.request({
            method: 'llm/completion',
            params: {
              prompt: branchPrompt,
              max_tokens: 4000,
              temperature: 0.95,
              system: 'You are an expert learning strategist. Generate comprehensive, actionable learning paths.',
            }
          });
        });
        
        if (claudeResponse && claudeResponse.strategic_branches) {
          return {
            success: true,
            strategicBranches: claudeResponse.strategic_branches,
            complexity: complexityAnalysis,
            source: 'claude'
          };
        }
      }
      
      // Fallback to skeleton generation
      const skeletonTasks = await this.generateSkeletonTasks(complexityAnalysis, { goal, context }, options.focusAreas || [], options.learningStyle || 'mixed');
      const strategicBranches = this.organizeBranchesFromTasks(skeletonTasks);
      
      return {
        success: true,
        strategicBranches,
        complexity: complexityAnalysis,
        source: 'fallback'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        source: 'error'
      };
    }
  }

  async buildHTATree(args) {
    // Enhanced parameter debugging and validation
    console.error('🔍 HTACore.buildHTATree called with args:', JSON.stringify(args, null, 2));
    
    // Use activePath from config if not provided
    const activeProject = await this.projectManagement.getActiveProject();
    if (!activeProject || !activeProject.project_id) {
      throw new Error('No active project found. Please create a project using create_project_forest or switch to an existing project using switch_project_forest first.');
    }
    const projectId = activeProject.project_id;
    console.error('✅ Active project found:', projectId);
    
    const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
    console.error('📁 Project config loaded:', config ? 'Found' : 'Not found');
    if (config) {
      console.error('📁 Config goal:', config.goal);
      console.error('📁 Config context:', config.context);
    }
    
    const pathName = args.path_name || args.pathName || (config && config.activePath) || 'general';
    const learningStyle = args.learning_style || args.learningStyle || 'mixed';
    const focusAreas = args.focus_areas || args.focusAreas || [];
    const goalOverride = args.goal;
    const contextOverride = args.context;
    
    // Enhanced parameter logging for debugging
    console.error('🔍 HTACore.buildHTATree parameter extraction:');
    console.error('  - pathName:', pathName);
    console.error('  - learningStyle:', learningStyle);
    console.error('  - focusAreas:', focusAreas);
    console.error('  - goalOverride:', goalOverride);
    console.error('  - contextOverride:', contextOverride);
    console.error('  - config.goal:', config?.goal);
    console.error('  - config.context:', config?.context);
    
    try {
      if (!this.projectManagement) {
        throw new Error('ProjectManagement instance is null or undefined in HTACore');
      }

      // Check if onboarding is complete before allowing HTA tree generation
      const onboardingState = await this.dataPersistence.loadProjectData(projectId, 'onboarding_state.json');
      if (!onboardingState || onboardingState.current_stage !== 'completed') {
        return {
          success: false,
          content: [
            {
              type: 'text',
              text: `**Gated Onboarding Required** 🔒\n\nAccording to the Forest documentation, HTA trees should only be generated after completing the 6-stage gated onboarding process to ensure comprehensive context gathering.\n\n**Current Status**: ${onboardingState?.current_stage || 'Not Started'}\n\n**Next Steps**: Use \`start_learning_journey_forest\` to begin the gated onboarding process.`,
            },
          ],
          requires_onboarding: true,
          current_stage: onboardingState?.current_stage || 'not_started',
        };
      }

      const existingHTA = await this.loadPathHTA(projectId, pathName || 'general');
      if (existingHTA && existingHTA.frontierNodes && existingHTA.frontierNodes.length > 0) {
        return {
          success: true,
          content: [
            {
              type: 'text',
              text: `**HTA Tree Already Exists**\n\n**Goal**: ${existingHTA.goal}\n**Complexity**: ${existingHTA.complexity?.score || 'Unknown'}/10\n**Tasks**: ${existingHTA.frontierNodes.length} generated\n**Created**: ${existingHTA.created}\n\n**Tree is ready!** Use \`get_next_pipeline_forest\` to see your Next + Pipeline task presentation.\n\n**Note**: HTA trees are generated only once per project through the gated onboarding process. Use task evolution to expand specific areas as you learn.`,
            },
          ],
          existing_tree: true,
          tasks_count: existingHTA.frontierNodes.length,
          complexity: existingHTA.complexity,
          next_task: await this.getNextTaskFromExistingTree(existingHTA),
        };
      }

      // Enhanced goal resolution with detailed debugging
      console.error('🎯 Goal resolution process:');
      console.error('  - goalOverride:', goalOverride);
      console.error('  - config.goal:', config?.goal);
      console.error('  - onboardingState.goal:', onboardingState?.goal);
      
      const goal = goalOverride || config?.goal || onboardingState?.goal;
      console.error('  - Final resolved goal:', goal);
      
      if (!goal) {
        console.error('❌ Goal resolution failed - no goal found in any source');
        throw new Error('Goal must be provided either in project configuration or as a parameter. Use start_learning_journey_forest to set a project goal through gated onboarding.');
      }
      
      console.error('🌍 Context resolution process:');
      console.error('  - contextOverride:', contextOverride);
      console.error('  - config.context:', config?.context);
      console.error('  - onboardingState.context:', onboardingState?.context);
      
      const context = contextOverride || config?.context || onboardingState?.context || '';
      console.error('  - Final resolved context:', context);
      
      // Use comprehensive context from onboarding if available
      const comprehensiveContext = onboardingState.aggregate_context || {
        goal,
        context,
        complexity: onboardingState.complexity_analysis,
        user_profile: onboardingState.user_profile || {}
      };
      
      const complexityAnalysis = comprehensiveContext.complexity || await this.analyzeGoalComplexityAsync(goal, context);

      const htaData = {
        projectId,
        pathName: pathName || 'general',
        created: new Date().toISOString(),
        learningStyle,
        focusAreas,
        goal: goal,
        context: context,
        complexity: complexityAnalysis,
        strategicBranches: [],
        frontierNodes: [],
        completedNodes: [],
        collaborative_sessions: [],
        // 6-Level HTA Architecture according to documentation
        level1_goalContext: comprehensiveContext.goal_context || null,
        level2_strategicBranches: null,
        level3_taskDecomposition: null,
        level4_microParticles: null,
        level5_nanoActions: null,
        level6_contextAdaptivePrimitives: null,
        hierarchyMetadata: {
          total_depth: complexityAnalysis.recommended_depth || 3,
          total_branches: 0,
          total_sub_branches: 0,
          total_tasks: 0,
          branch_task_distribution: {},
          schema_driven: true,
          gated_onboarding_complete: true,
        },
        generation_context: {
          method: 'pure_schema_driven_with_gated_onboarding',
          timestamp: new Date().toISOString(),
          goal: goal,
          complexity_score: complexityAnalysis.score || 5,
          awaiting_generation: true,
          onboarding_context: comprehensiveContext,
        },
      };

      // PRIMARY: Use Pure Schema-Driven HTA System with Enhanced 6-Level Progressive Architecture
      if (this.pureSchemaHTA && htaData.frontierNodes.length === 0) {
        try {
          console.log('🧠 Generating comprehensive HTA tree using Pure Schema-Driven Intelligence with Enhanced 6-Level Architecture');
          console.error('🔍 Schema HTA parameters before generation:');
          console.error('  - goal:', goal);
          console.error('  - comprehensiveContext:', JSON.stringify(comprehensiveContext, null, 2));
          
          // Generate complete 6-level HTA tree foundation
          const schemaHTATree = await this.pureSchemaHTA.generateHTATree(goal, comprehensiveContext);
          console.error('✅ Schema HTA tree generated successfully');
          console.error('🔍 Generated tree structure:', Object.keys(schemaHTATree || {}));
          
          // Extract Level 1: Goal Context
          htaData.level1_goalContext = schemaHTATree.level1_goalContext;
          console.log('✅ Level 1 (Goal Context) generated');
          
          // Extract Level 2: Strategic Branches
          htaData.level2_strategicBranches = schemaHTATree.level2_strategicBranches;
          console.log('✅ Level 2 (Strategic Branches) generated');
          
          // Convert strategic branches to HTA format
          if (schemaHTATree.level2_strategicBranches?.strategic_branches) {
            htaData.strategicBranches = schemaHTATree.level2_strategicBranches.strategic_branches.map(branch => ({
              name: branch.name,
              description: branch.description,
              priority: branch.priority,
              domain_focus: branch.domain_focus,
              rationale: branch.rationale,
              expected_outcomes: branch.expected_outcomes || [],
              context_adaptations: branch.context_adaptations || [],
              pain_point_mitigations: branch.pain_point_mitigations || [],
              exploration_opportunities: branch.exploration_opportunities || [],
              tasks: [],
              schema_generated: true
            }));
          }
          
          // Generate COMPREHENSIVE Level 3 Task Decomposition for each strategic branch
          const allTasks = [];
          let taskCounter = 1;
          
          for (const branch of htaData.strategicBranches) {
            console.log(`🔄 Processing branch: ${branch.name}`);
            
            // Level 3: Comprehensive Task Decomposition
            const taskDecomposition = await this.pureSchemaHTA.generateTaskDecomposition(
              branch.name,
              branch.description,
              htaData.level1_goalContext,
              comprehensiveContext
            );
            
            if (taskDecomposition.tasks) {
              // Create comprehensive tasks with progressive decomposition capabilities
              for (const task of taskDecomposition.tasks) {
                console.log(`  📋 Creating comprehensive task: ${task.title}`);
                
                // Determine decomposition depth based on task complexity and importance
                const shouldDecomposeDeep = task.difficulty_level >= 3 || 
                                          taskCounter <= 3 || // First 3 tasks get deep decomposition
                                          task.prerequisites?.length > 0;
                
                // Level 4: Generate Micro-Particles (conditional based on complexity)
                let microParticles = null;
                if (shouldDecomposeDeep) {
                  microParticles = await this.pureSchemaHTA.generateMicroParticles(
                    task.title,
                    task.description,
                    htaData.level1_goalContext,
                    comprehensiveContext
                  );
                  console.log(`    🔬 Generated ${microParticles.micro_particles?.length || 0} micro-particles for ${task.title}`);
                }
                
                // Level 5: Generate Nano-Actions (for critical tasks only)
                const nanoActions = [];
                if (shouldDecomposeDeep && microParticles?.micro_particles?.length > 0) {
                  // Generate nano-actions for the most critical micro-particles
                  const criticalMicroParticles = microParticles.micro_particles
                    .sort((a, b) => b.difficulty - a.difficulty)
                    .slice(0, Math.min(3, microParticles.micro_particles.length));
                  
                  for (const microParticle of criticalMicroParticles) {
                    const nanoAction = await this.pureSchemaHTA.generateNanoActions(
                      microParticle.title,
                      microParticle.description,
                      htaData.level1_goalContext,
                      comprehensiveContext
                    );
                    nanoActions.push(nanoAction);
                  }
                  console.log(`    ⚡ Generated ${nanoActions.length} nano-action sets for ${task.title}`);
                }
                
                // Level 6: Generate Context-Adaptive Primitives (for the most complex tasks)
                let contextAdaptivePrimitives = null;
                if (shouldDecomposeDeep && nanoActions.length > 0 && task.difficulty_level >= 4) {
                  const firstNanoAction = nanoActions[0].nano_actions?.[0];
                  if (firstNanoAction) {
                    contextAdaptivePrimitives = await this.pureSchemaHTA.generateContextAdaptivePrimitives(
                      firstNanoAction.action_title,
                      firstNanoAction.specific_steps?.join(', ') || 'Action steps',
                      htaData.level1_goalContext,
                      comprehensiveContext
                    );
                    console.log(`    🎯 Generated context-adaptive primitives for ${task.title}`);
                  }
                }
                
                // Create comprehensive task with intelligent decomposition
                const comprehensiveTask = {
                  id: `${branch.name.toLowerCase().replace(/\s+/g, '_')}_${taskCounter.toString().padStart(3, '0')}`,
                  title: task.title,
                  description: task.description,
                  difficulty: task.difficulty_level || 2,
                  duration: task.estimated_duration || '25 minutes',
                  branch: branch.name,
                  priority: branch.priority * 100 + taskCounter * 10,
                  prerequisites: task.prerequisites || [],
                  learningOutcome: task.success_criteria?.join(', ') || `Progress in ${branch.name}`,
                  generated: true,
                  schema_driven: true,
                  completed: false,
                  
                  // Progressive 6-Level HTA Architecture Data
                  level3_taskDecomposition: taskDecomposition,
                  level4_microParticles: microParticles,
                  level5_nanoActions: nanoActions,
                  level6_contextAdaptivePrimitives: contextAdaptivePrimitives,
                  
                  // Enhanced metadata
                  context_considerations: task.context_considerations || [],
                  potential_obstacles: task.potential_obstacles || [],
                  alternative_approaches: task.alternative_approaches || [],
                  
                  // Granularity indicators and decomposition flags
                  has_micro_particles: microParticles?.micro_particles?.length > 0,
                  has_nano_actions: nanoActions.length > 0,
                  has_context_primitives: contextAdaptivePrimitives !== null,
                  decomposition_depth: contextAdaptivePrimitives ? 6 : nanoActions.length > 0 ? 5 : microParticles?.micro_particles?.length > 0 ? 4 : 3,
                  can_decompose_further: !shouldDecomposeDeep, // Flag for progressive decomposition
                  decomposition_complexity: task.difficulty_level || 2
                };
                
                allTasks.push(comprehensiveTask);
                taskCounter++;
              }
            }
          }
          
          // Enhanced metadata with comprehensive statistics
          htaData.frontierNodes = allTasks;
          htaData.hierarchyMetadata.total_tasks = allTasks.length;
          htaData.hierarchyMetadata.total_branches = htaData.strategicBranches.length;
          htaData.hierarchyMetadata.average_decomposition_depth = allTasks.reduce((sum, task) => sum + task.decomposition_depth, 0) / allTasks.length;
          htaData.hierarchyMetadata.tasks_with_micro_particles = allTasks.filter(task => task.has_micro_particles).length;
          htaData.hierarchyMetadata.tasks_with_nano_actions = allTasks.filter(task => task.has_nano_actions).length;
          htaData.hierarchyMetadata.tasks_with_context_primitives = allTasks.filter(task => task.has_context_primitives).length;
          htaData.hierarchyMetadata.tasks_ready_for_decomposition = allTasks.filter(task => task.can_decompose_further).length;
          
          htaData.generation_context.awaiting_generation = false;
          htaData.generation_context.method = 'pure_schema_driven_progressive_6_level';
          htaData.generation_context.decomposition_stats = {
            total_levels_generated: 6,
            average_depth: htaData.hierarchyMetadata.average_decomposition_depth,
            deep_decomposition_coverage: `${Math.round((htaData.hierarchyMetadata.tasks_with_context_primitives / allTasks.length) * 100)}%`,
            progressive_decomposition_ready: htaData.hierarchyMetadata.tasks_ready_for_decomposition
          };
          
          console.log(`🧠 Generated ${htaData.frontierNodes.length} comprehensive tasks using Enhanced 6-Level HTA Intelligence`);
          console.log(`📊 Decomposition Stats: Avg depth ${htaData.hierarchyMetadata.average_decomposition_depth.toFixed(1)}, ${htaData.hierarchyMetadata.tasks_with_context_primitives} tasks with full 6-level decomposition`);
          console.log(`🚀 Progressive Decomposition: ${htaData.hierarchyMetadata.tasks_ready_for_decomposition} tasks ready for deeper decomposition as needed`);
          
        } catch (schemaError) {
          console.warn('Schema-driven generation failed, using enhanced fallback:', schemaError.message);
          
          // Enhanced fallback still using onboarding context
          const strategicBranches = await this.generateStrategicBranches(goal, complexityAnalysis, focusAreas);
          const skeletonTasks = await this.generateSkeletonTasks(complexityAnalysis, config, focusAreas, learningStyle);
          
          htaData.strategicBranches = strategicBranches;
          htaData.frontierNodes = Array.isArray(skeletonTasks)
            ? skeletonTasks.map(task => ({ ...task, completed: false }))
            : [];
          htaData.hierarchyMetadata.total_tasks = htaData.frontierNodes.length;
          htaData.hierarchyMetadata.total_branches = strategicBranches.length;
          htaData.generation_context.awaiting_generation = false;
          htaData.generation_context.method = 'enhanced_fallback_with_onboarding';
        }
      }
      
      // Fallback if no schema system available
      if (htaData.frontierNodes.length === 0) {
        console.warn('No schema-driven system available, using basic fallback');
        const basicBranches = this.generateBasicFallbackBranches(goal);
        const basicTasks = this.generateBasicFallbackTasks(goal, complexityAnalysis, focusAreas);
        
        htaData.strategicBranches = basicBranches;
        htaData.frontierNodes = basicTasks.map(task => ({ ...task, completed: false }));
        htaData.hierarchyMetadata.total_tasks = basicTasks.length;
        htaData.hierarchyMetadata.total_branches = basicBranches.length;
        htaData.generation_context.awaiting_generation = false;
        htaData.generation_context.method = 'basic_fallback';
      }

      // Save to traditional persistence
      await this.dataPersistence.savePathData(
        projectId,
        pathName || 'general',
        'hta.json',
        htaData
      );
      
      // ALSO save to vector store for enhanced persistence and intelligence
      let vectorStorageStatus = { success: false, initialized: false };
      try {
        const vsStatus = await this.ensureVectorStore();
        if (vsStatus && vsStatus.success && vsStatus.instance) {
          await vsStatus.instance.storeHTATree(projectId, htaData);
          const stats = await vsStatus.instance.getProjectStats(projectId);
          vectorStorageStatus = {
            success: true,
            initialized: true,
            provider: vsStatus.provider,
            stored_vectors: stats.total_vectors,
          };
          console.error(`[HTACore] HTA tree stored in vector store for project ${projectId}`);
        } else {
          vectorStorageStatus = {
            success: false,
            initialized: false,
            provider: vsStatus?.provider || 'unknown',
            error: vsStatus?.error,
          };
        }
      } catch (vectorError) {
        vectorStorageStatus = {
          success: false,
          initialized: false,
          provider: 'unknown',
          error: { message: vectorError.message },
        };
        console.error('[HTACore] Failed to store in vector store:', vectorError.message);
      }

      return {
        success: true,
        content: [
          {
            type: 'text',
            text: `**HTA Tree Generated Successfully!** 🌲\n\n**Goal**: ${htaData.goal}\n**Complexity**: ${htaData.complexity.score}/10 (${htaData.complexity.level})\n**Tasks Generated**: ${htaData.frontierNodes.length}\n**Strategic Branches**: ${htaData.strategicBranches.length}\n**6-Level Architecture**: ${htaData.generation_context.method.includes('6_level') ? '✅ Enabled' : '⚠️ Fallback'}\n**Vector Storage**: ${vectorStorageStatus.success ? '✅ Saved' : '⚠️ Not Saved'} (${vectorStorageStatus.provider || 'unknown'})\n\n**Next Steps**: Use \`get_next_pipeline_forest\` to see your Next + Pipeline task presentation!\n\n**Tree Structure**:\n${this.formatTreeSummary(htaData)}\n\n**Note**: This tree was generated using the gated onboarding process for optimal context and quality.`,
          },
        ],
        tasks_count: htaData.frontierNodes.length,
        complexity: htaData.complexity,
        strategic_branches: htaData.strategicBranches.length,
        vectorStorage: vectorStorageStatus,
        six_level_architecture: htaData.generation_context.method.includes('6_level'),
        gated_onboarding_complete: true,
      };
    } catch (error) {
      console.error('HTACore.buildHTATree failed:', error);
      return {
        success: false,
        content: [
          {
            type: 'text',
            text: `**HTA Tree Generation Failed**\n\nError: ${error.message}\n\nPlease check your project configuration and try again. If this persists, ensure you've completed the gated onboarding process first.`,
          },
        ],
        error: error.message,
      };
    }
  }

  // Alias for validation compatibility
  buildHtaTree(...args) {
    return this.buildHTATree(...args);
  }

  async getHTAStatus() {
    try {
      if (!this.projectManagement) {
        throw new Error('ProjectManagement not available in HTACore');
      }
      
      const activeProject = await this.projectManagement.getActiveProject();
      if (!activeProject || !activeProject.project_id) {
        return {
          content: [
            {
              type: 'text',
              text: '**No Active Project** ❌\n\nCreate or switch to a project first to view HTA status.',
            },
          ],
        };
      }
      
      const projectId = activeProject.project_id;
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
      
      // Try vector store first, then fallback to traditional storage
      let htaData = null;
      try {
        await this.ensureVectorStore();
        if (this.vectorStoreInitialized) {
          htaData = await this.vectorStore.retrieveHTATree(projectId);
          if (htaData) {
            console.error(`[HTACore] Retrieved HTA from vector store for project ${projectId}`);
          }
        }
      } catch (vectorError) {
        console.error('[HTACore] Vector store retrieval failed:', vectorError.message);
      }
      
      // Fallback to traditional storage if vector store fails
      if (!htaData) {
        htaData = await this.loadPathHTA(projectId, config?.activePath || 'general');
        if (htaData) {
          console.error(`[HTACore] Retrieved HTA from traditional storage for project ${projectId}`);
        }
      }
      
      if (!htaData) {
        return {
          content: [
            {
              type: 'text',
              text: '**No HTA Tree Found** 🌱\n\nUse `build_hta_tree_forest` to create your strategic learning framework first.',
            },
          ],
        };
      }
      
      const totalTasks = htaData.frontierNodes?.length || 0;
      const completedTasks = htaData.frontierNodes?.filter(task => task.completed)?.length || 0;
      const availableTasks = totalTasks - completedTasks;
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      const branchSummary = htaData.strategicBranches?.map((branch, index) => 
        `${index + 1}. **${branch.name}**: ${branch.description || 'Strategic learning branch'}`
      ).join('\n') || 'Tasks organized by priority and difficulty';
      
      return {
        content: [
          {
            type: 'text',
            text: 
              `**HTA Status Overview** 📊\n\n` +
              `**Goal**: ${htaData.goal}\n` +
              `**Complexity**: ${htaData.complexity?.score || 'Unknown'}/10 (${htaData.complexity?.level || 'Unknown'})\n` +
              `**Progress**: ${progressPercentage}% (${completedTasks}/${totalTasks} tasks)\n` +
              `**Available Tasks**: ${availableTasks}\n` +
              `**Strategic Branches**: ${htaData.strategicBranches?.length || 0}\n\n` +
              `**Tree Structure**:\n${branchSummary}\n\n` +
              `**Created**: ${htaData.created || 'Unknown'}\n` +
              `**Last Updated**: ${htaData.lastUpdated || 'Unknown'}\n\n` +
              `Use \`get_next_task_forest\` to continue your learning journey!`,
          },
        ],
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        available_tasks: availableTasks,
        progress_percentage: progressPercentage,
        complexity: htaData.complexity,
        strategic_branches: htaData.strategicBranches?.length || 0,
      };
    } catch (error) {
      console.error('HTACore.getHTAStatus failed:', error);
      return {
        content: [
          {
            type: 'text',
            text: `**HTA Status Error**: ${error.message}`,
          },
        ],
        error: error.message,
      };
    }
  }

  getHtaStatus(...args) {
    return this.getHTAStatus(...args);
  }

  // ===== CORE HTA INTELLIGENCE METHODS =====

  analyzeGoalComplexity(goal, context = '') {
    const analysis = this.complexityAnalyzer.analyzeGoalComplexity(goal, [], { context });
    // Convert to legacy format expected by existing code
    return {
      score: analysis.totalScore,
      level: analysis.totalScore <= 3 ? 'simple' : analysis.totalScore <= 6 ? 'moderate' : analysis.totalScore <= 8 ? 'complex' : 'expert',
      recommended_depth: analysis.totalScore <= 3 ? 2 : analysis.totalScore <= 6 ? 3 : analysis.totalScore <= 8 ? 4 : 5,
      factors: analysis.reasoning,
      analysis: `Goal complexity: ${analysis.totalScore}/10. ${analysis.reasoning.join(', ')}.`,
    };
  }

  /**
   * Legacy async alias maintained for backwards compatibility.
   * Several older code paths call `analyzeGoalComplexityAsync` and expect a
   * promise. This thin wrapper simply delegates to the synchronous
   * `analyzeGoalComplexity` implementation.
   *
   * @param {string} goal - The learning goal to analyse.
   * @param {string} [context=''] - Optional context string.
   * @returns {Promise<Object>} Resolved complexity analysis object.
   */
  async analyzeGoalComplexityAsync(goal, context = '') {
    return this.analyzeGoalComplexity(goal, context);
  }

  calculateTreeStructure(complexityAnalysis, learningStyle, focusAreas) {
    return this.complexityAnalyzer.calculateTreeStructure(complexityAnalysis.score, focusAreas);
  }

  async generateSkeletonTasks(complexityAnalysis, config = {}, focusAreas = [], learningStyle = 'mixed') {
    const goal = config.goal || 'Reach goal';
    const initialContext = {
      learningStyle,
      focusAreas,
      life_structure_preferences: config.life_structure_preferences,
      constraints: config.constraints,
      complexity: complexityAnalysis
    };
    
    try {
      // Use Pure Schema-Driven HTA System for superintelligent task generation
      const htaTree = await this.pureSchemaHTA.generateHTATree(goal, initialContext);
      
      // Convert strategic branches to tasks using schema intelligence
      const allTasks = [];
      if (htaTree.level2_strategicBranches?.strategic_branches) {
        for (const branch of htaTree.level2_strategicBranches.strategic_branches) {
          // Generate Level 3 tasks for each strategic branch
          const taskDecomposition = await this.pureSchemaHTA.generateTaskDecomposition(
            branch.name,
            branch.description,
            htaTree.level1_goalContext,
            initialContext
          );
          
          // Convert schema tasks to legacy format
          if (taskDecomposition.tasks) {
            taskDecomposition.tasks.forEach((task, index) => {
              allTasks.push({
                id: `${branch.name.toLowerCase().replace(/\s+/g, '_')}_${allTasks.length + 1}`,
                title: task.title,
                description: task.description,
                difficulty: task.difficulty_level || 2,
                duration: task.estimated_duration || '25 minutes',
                branch: branch.name,
                priority: branch.priority * 100 + index * 10,
                prerequisites: task.prerequisites || [],
                learningOutcome: task.success_criteria?.join(', ') || `Progress in ${branch.name}`,
                generated: true,
                schema_driven: true, // Mark as schema-generated
                context_considerations: task.context_considerations || [],
                potential_obstacles: task.potential_obstacles || []
              });
            });
          }
        }
      }
      
      return allTasks;
    } catch (error) {
      console.warn('Schema-driven task generation failed, using fallback:', error.message);
      // Fallback to basic task generation if schema system fails
      return this.generateBasicFallbackTasks(goal, complexityAnalysis, focusAreas);
    }
  }

  async generateStrategicBranches(goal, complexityAnalysis, focusAreas) {
    const initialContext = {
      focusAreas,
      complexity: complexityAnalysis
    };
    
    try {
      // Use Pure Schema-Driven HTA System for superintelligent strategic branch generation
      const htaTree = await this.pureSchemaHTA.generateHTATree(goal, initialContext);
      
      if (htaTree.level2_strategicBranches?.strategic_branches) {
        return sanitizeBranchNames(htaTree.level2_strategicBranches.strategic_branches).map(branch => ({
          name: branch.name,
          description: branch.description,
          priority: branch.priority,
          phase: branch.domain_focus,
          tasks: [],
          rationale: branch.rationale,
          expected_outcomes: branch.expected_outcomes || [],
          context_adaptations: branch.context_adaptations || [],
          schema_driven: true // Mark as schema-generated
        }));
      }
      
      return this.generateBasicFallbackBranches(goal);
    } catch (error) {
      console.warn('Schema-driven branch generation failed, using fallback:', error.message);
      return this.generateBasicFallbackBranches(goal);
    }
  }

  // Legacy method - simple fallback implementation
  generateBranchTasks(branch, complexityAnalysis, learningStyle, startId, context = {}) {
    const numTasks = Math.max(2, Math.floor(complexityAnalysis.score / 2));
    const tasks = [];
    
    for (let i = 0; i < numTasks; i++) {
      tasks.push({
        id: `${branch.name.toLowerCase().replace(/\s+/g, '_')}_${startId + i}`,
        title: `${branch.name} Task ${i + 1}`,
        description: `Work on ${branch.description}`,
        difficulty: Math.min(5, Math.max(1, complexityAnalysis.score - 2 + i)),
        duration: this.calculateTaskDuration(complexityAnalysis.score - 2 + i, learningStyle),
        branch: branch.name,
        priority: branch.priority * 100 + i * 10,
        prerequisites: i > 0 ? [`${branch.name.toLowerCase().replace(/\s+/g, '_')}_${startId + i - 1}`] : [],
        learningOutcome: `Progress in ${branch.name}`,
        generated: true
      });
    }
    
    return tasks;
  }

  calculateTaskDuration(difficulty, learningStyle, lifePrefs = {}) {
    // Simple duration estimation fallback
    let baseDuration = 25; // minutes
    
    if (lifePrefs && typeof lifePrefs.focus_duration === 'string') {
      const m = lifePrefs.focus_duration.match(/(\d+)\s*minutes?/i);
      const h = lifePrefs.focus_duration.match(/(\d+)\s*hours?/i);
      if (m) baseDuration = parseInt(m[1], 10);
      else if (h) baseDuration = parseInt(h[1], 10) * 60;
    }
    
    const difficultyMultiplier = 1 + ((difficulty || 2) - 1) * 0.3;
    let styleMultiplier = 1;
    
    if (learningStyle === 'hands-on') {
      styleMultiplier = 1.2;
    } else if (learningStyle === 'reading') {
      styleMultiplier = 0.8;
    }
    
    const duration = Math.round(baseDuration * difficultyMultiplier * styleMultiplier);
    return `${duration} minutes`;
  }

  /**
   * Progressive 6-Level Decomposition - Decompose tasks further as needed
   * This method can be called to decompose tasks that initially only had Level 3 generation
   */
  async progressivelyDecomposeTask(projectId, taskId, targetLevel = 6, userContext = {}) {
    try {
      // Load the HTA tree to find the task
      const htaData = await this.loadPathHTA(projectId, 'general');
      if (!htaData || !htaData.frontierNodes) {
        throw new Error('No HTA tree found for progressive decomposition');
      }
      
      const task = htaData.frontierNodes.find(t => t.id === taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found in HTA tree`);
      }
      
      const originalLevel = task.decomposition_depth || 3;
      if (originalLevel >= targetLevel) {
        return {
          success: true,
          message: `Task ${taskId} already decomposed to level ${originalLevel}`,
          task: task
        };
      }
      
      console.log(`🔄 Progressively decomposing task "${task.title}" from level ${originalLevel} to level ${targetLevel}`);
      
      // Level 4: Generate Micro-Particles if not already present
      if (originalLevel < 4 && targetLevel >= 4) {
        const microParticles = await this.pureSchemaHTA.generateMicroParticles(
          task.title,
          task.description,
          htaData.level1_goalContext,
          userContext
        );
        task.level4_microParticles = microParticles;
        task.has_micro_particles = microParticles?.micro_particles?.length > 0;
        console.log(`    🔬 Generated ${microParticles.micro_particles?.length || 0} micro-particles`);
      }
      
      // Level 5: Generate Nano-Actions if not already present
      if (originalLevel < 5 && targetLevel >= 5 && task.level4_microParticles?.micro_particles?.length > 0) {
        const nanoActions = [];
        const criticalMicroParticles = task.level4_microParticles.micro_particles
          .sort((a, b) => b.difficulty - a.difficulty)
          .slice(0, Math.min(3, task.level4_microParticles.micro_particles.length));
        
        for (const microParticle of criticalMicroParticles) {
          const nanoAction = await this.pureSchemaHTA.generateNanoActions(
            microParticle.title,
            microParticle.description,
            htaData.level1_goalContext,
            userContext
          );
          nanoActions.push(nanoAction);
        }
        
        task.level5_nanoActions = nanoActions;
        task.has_nano_actions = nanoActions.length > 0;
        console.log(`    ⚡ Generated ${nanoActions.length} nano-action sets`);
      }
      
      // Level 6: Generate Context-Adaptive Primitives if not already present
      if (originalLevel < 6 && targetLevel >= 6 && task.level5_nanoActions?.length > 0) {
        const firstNanoAction = task.level5_nanoActions[0].nano_actions?.[0];
        if (firstNanoAction) {
          const contextAdaptivePrimitives = await this.pureSchemaHTA.generateContextAdaptivePrimitives(
            firstNanoAction.action_title,
            firstNanoAction.specific_steps?.join(', ') || 'Action steps',
            htaData.level1_goalContext,
            userContext
          );
          task.level6_contextAdaptivePrimitives = contextAdaptivePrimitives;
          task.has_context_primitives = contextAdaptivePrimitives !== null;
          console.log(`    🎯 Generated context-adaptive primitives`);
        }
      }
      
      // Update decomposition metadata
      task.decomposition_depth = Math.max(originalLevel, targetLevel);
      task.can_decompose_further = task.decomposition_depth < 6;
      task.last_decomposition_update = new Date().toISOString();
      
      // Save the updated HTA tree
      await this.saveHTAData(projectId, 'general', htaData);
      
      console.log(`✅ Task "${task.title}" successfully decomposed to level ${task.decomposition_depth}`);
      
      return {
        success: true,
        message: `Task "${task.title}" decomposed from level ${originalLevel} to level ${task.decomposition_depth}`,
        task: task,
        decomposition_stats: {
          original_level: originalLevel,
          new_level: task.decomposition_depth,
          has_micro_particles: task.has_micro_particles,
          has_nano_actions: task.has_nano_actions,
          has_context_primitives: task.has_context_primitives
        }
      };
      
    } catch (error) {
      console.error('Progressive decomposition failed:', error);
      return {
        success: false,
        error: error.message,
        task_id: taskId
      };
    }
  }

  /**
   * Get decomposition details for a specific task
   */
  async getTaskDecompositionDetails(projectId, taskId) {
    try {
      const htaData = await this.loadPathHTA(projectId, 'general');
      if (!htaData || !htaData.frontierNodes) {
        throw new Error('No HTA tree found');
      }
      
      const task = htaData.frontierNodes.find(t => t.id === taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      return {
        success: true,
        task_id: taskId,
        title: task.title,
        current_level: task.decomposition_depth || 3,
        can_decompose_further: task.can_decompose_further,
        decomposition_data: {
          level3_tasks: task.level3_taskDecomposition ? 'Present' : 'Not available',
          level4_micro_particles: task.level4_microParticles ? `${task.level4_microParticles.micro_particles?.length || 0} micro-particles` : 'Not generated',
          level5_nano_actions: task.level5_nanoActions ? `${task.level5_nanoActions.length} nano-action sets` : 'Not generated',
          level6_primitives: task.level6_contextAdaptivePrimitives ? 'Context-adaptive primitives available' : 'Not generated'
        },
        detailed_data: {
          micro_particles: task.level4_microParticles,
          nano_actions: task.level5_nanoActions,
          context_primitives: task.level6_contextAdaptivePrimitives
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        task_id: taskId
      };
    }
  }

  transformTasksToFrontierNodes(strategicBranches, complexityAnalysis) {
    const frontierNodes = [];
    let taskId = 1;

    strategicBranches.forEach((branch, branchIndex) => {
      if (branch.tasks && Array.isArray(branch.tasks)) {
        branch.tasks.forEach((task, taskIndex) => {
          frontierNodes.push({
            id: `${branch.name.toLowerCase().replace(/\s+/g, '_')}_${taskId}`,
            title: task.title || task.name || `${branch.name} Task ${taskIndex + 1}`,
            description: task.description || `Work on ${branch.name} objectives`,
            difficulty:
              task.difficulty || Math.min(5, Math.max(1, Math.floor(complexityAnalysis.score / 2))),
            duration: task.duration || this.calculateTaskDuration(task.difficulty || 2, 'mixed'),
            branch: branch.name,
            priority: (branchIndex + 1) * 100 + taskIndex * 10,
            prerequisites: task.prerequisites || [],
            learningOutcome: task.learning_outcome || `Progress in ${branch.name}`,
            generated: true,
            completed: false,
          });
          taskId++;
        });
      }
    });

    return frontierNodes;
  }

  // Simple fallback methods for when schema-driven approach fails
  generateBasicFallbackTasks(goal, complexityAnalysis, focusAreas) {
    const basicBranches = this.generateBasicFallbackBranches(goal);
    const tasks = [];
    
    basicBranches.forEach((branch, branchIndex) => {
      const numTasks = Math.max(2, Math.floor(complexityAnalysis.score / 2));
      for (let i = 0; i < numTasks; i++) {
        tasks.push({
          id: `${branch.name.toLowerCase().replace(/\s+/g, '_')}_${i + 1}`,
          title: `${branch.name} Task ${i + 1}`,
          description: `Work on ${branch.description}`,
          difficulty: Math.min(5, Math.max(1, complexityAnalysis.score - 2 + i)),
          duration: '25 minutes',
          branch: branch.name,
          priority: branch.priority * 100 + i * 10,
          prerequisites: i > 0 ? [`${branch.name.toLowerCase().replace(/\s+/g, '_')}_${i}`] : [],
          learningOutcome: `Progress in ${branch.name}`,
          generated: true,
          fallback: true
        });
      }
    });
    
    return tasks;
  }

  generateBasicFallbackBranches(goal) {
    // Minimal fallback branches based on standard learning progression
    return [
      { name: 'Foundation', description: `Build fundamental understanding of ${goal}`, priority: 1, phase: 'Foundation', tasks: [] },
      { name: 'Practice', description: `Develop practical skills for ${goal}`, priority: 2, phase: 'Practice', tasks: [] },
      { name: 'Application', description: `Apply knowledge to real projects for ${goal}`, priority: 3, phase: 'Application', tasks: [] },
      { name: 'Mastery', description: `Achieve advanced proficiency in ${goal}`, priority: 4, phase: 'Mastery', tasks: [] }
    ];
  }

  organizeBranchesFromTasks(tasks) {
    const branchMap = new Map();
    tasks.forEach(task => {
      const branchName = task.branch || 'General';
      if (!branchMap.has(branchName)) {
        branchMap.set(branchName, {
          name: branchName,
          description: `Tasks related to ${branchName}`,
          tasks: [],
          priority: task.priority ? Math.floor(task.priority / 100) : 1,
        });
      }
      const preservedTask = {
        ...task,
        completed: task.completed || false
      };
      branchMap.get(branchName).tasks.push(preservedTask);
    });
    return Array.from(branchMap.values()).sort((a, b) => a.priority - b.priority);
  }

  buildBranchGenerationPrompt(
    complexityAnalysis,
    config,
    focusAreas,
    learningStyle,
    richContext,
    constraintsPrompt
  ) {
    return `Generate a comprehensive HTA (Hierarchical Task Analysis) structure for this learning goal:

**Goal**: ${config.goal}
**Context**: ${config.context || 'Self-directed learning'}
**Learning Style**: ${learningStyle}
**Focus Areas**: ${focusAreas.join(', ') || 'General'}
**Complexity**: ${complexityAnalysis.score}/10 (${complexityAnalysis.level})

${richContext}
${constraintsPrompt}

Generate ${complexityAnalysis.recommended_depth} strategic branches, each with 2-4 specific, actionable tasks.

Return JSON format:
{
  "strategic_branches": [
    {
      "name": "Branch Name",
      "description": "What this branch covers",
      "priority": 1,
      "tasks": [
        {
          "title": "Specific task title",
          "description": "What to do and why",
          "difficulty": 1-5,
          "duration": "25 minutes",
          "prerequisites": [],
          "learning_outcome": "What you'll learn"
        }
      ]
    }
  ]
}`;
  }

  async loadPathHTA(projectId, pathName) {
    return await this.dataManager.loadHTAData(projectId, pathName);
  }

  async getNextTaskFromExistingTree(htaData) {
    return await this.dataManager.getNextTaskFromExistingTree(htaData);
  }

  extractTasksFromStrategicBranches(strategicBranches) {
    const frontierNodes = [];
    strategicBranches.forEach(branch => {
      if (branch.tasks && Array.isArray(branch.tasks)) {
        branch.tasks.forEach(task => {
          // Ensure completed flag is set
          frontierNodes.push({
            ...task,
            completed: task.completed || false
          });
        });
      }
    });
    return frontierNodes;
  }

  formatTreeSummary(htaData) {
    const branches = htaData.strategicBranches || [];
    if (branches.length === 0) {
      return 'Tasks organized by priority and difficulty';
    }

    return branches
      .map(
        (branch, index) =>
          `${index + 1}. **${branch.name}**: ${branch.description || 'Strategic learning branch'}`
      )
      .join('\n');
  }

  /**
   * Ensure frontier nodes are generated for the HTA tree
   */
  ensureFrontierNodes(htaData) {
    if (!htaData.frontierNodes || htaData.frontierNodes.length === 0) {
      // Generate initial frontier nodes from strategic branches
      htaData.frontierNodes = [];
      
      if (htaData.strategicBranches && htaData.strategicBranches.length > 0) {
        // Create initial tasks for the first branch
        const firstBranch = htaData.strategicBranches[0];
        const initialTasks = [
          {
            id: `${firstBranch.phase || 'foundation'}_intro_001`,
            title: `Introduction to ${firstBranch.name}`,
            description: `Begin learning ${firstBranch.name} concepts and fundamentals`,
            phase: firstBranch.phase || 'foundation',
            branchId: firstBranch.id,
            difficulty: 2,
            estimatedDuration: 30,
            type: 'learning',
            prerequisites: [],
            isComplete: false,
            order: 1
          },
          {
            id: `${firstBranch.phase || 'foundation'}_setup_002`,
            title: `Set up environment for ${firstBranch.name}`,
            description: `Configure your development environment and tools`,
            phase: firstBranch.phase || 'foundation',
            branchId: firstBranch.id,
            difficulty: 3,
            estimatedDuration: 45,
            type: 'setup',
            prerequisites: [],
            isComplete: false,
            order: 2
          },
          {
            id: `${firstBranch.phase || 'foundation'}_basics_003`,
            title: `Core concepts of ${firstBranch.name}`,
            description: `Learn the fundamental concepts and principles`,
            phase: firstBranch.phase || 'foundation',
            branchId: firstBranch.id,
            difficulty: 3,
            estimatedDuration: 60,
            type: 'study',
            prerequisites: [`${firstBranch.phase || 'foundation'}_intro_001`],
            isComplete: false,
            order: 3
          }
        ];
        
        htaData.frontierNodes = initialTasks;
      }
    }
    
    return htaData;
  }

  /**
   * Save HTA data with proper frontierNodes tracking
   */
  async saveHTADataWithTracking(projectId, pathName, htaData) {
    // Ensure frontierNodes are properly counted
    if (htaData.frontierNodes && htaData.frontierNodes.length > 0) {
      htaData.taskCount = htaData.frontierNodes.length;
      htaData.hasTasks = true;
    }
    
    return await this.saveHTAData(projectId, pathName, htaData);
  }
}

export { HTACore as HtaCore };

// Testable pure functions for coverage and unit tests
export function validateHTAMutation(mutation) {
  // Minimal example: block if payload.task is null or missing required fields
  if (!mutation || typeof mutation !== 'object' || !mutation.payload || !mutation.payload.task) {
    return { valid: false, reason: 'Missing or invalid task' };
  }
  const task = mutation.payload.task;
  if (!task.id || !task.name) {
    return { valid: false, reason: 'Task missing id or name' };
  }
  return { valid: true };
}

export function addTasksToHTA(hta, tasks) {
  // Only add valid tasks (must have id and name)
  const validTasks = (tasks || []).filter(t => t && t.id && t.name);
  return { ...hta, tasks: [...(hta.tasks || []), ...validTasks] };
}
