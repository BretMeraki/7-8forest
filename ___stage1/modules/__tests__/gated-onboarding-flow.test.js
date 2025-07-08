/**
 * Comprehensive Gated Onboarding System Test
 * Tests the complete user journey from landing page through task completion and evolution
 */

import { GatedOnboardingFlow } from '../gated-onboarding-flow.js';

describe('Gated Onboarding System - Complete User Journey', () => {
  let onboardingFlow;
  let mockDataPersistence;
  let mockProjectManagement;
  let mockLLMInterface;
  let mockEventBus;

  // Test user journey data
  const mockUserJourney = {
    userId: 'test-user-123',
    sessionId: 'session-456',
    goal: 'Learn advanced JavaScript programming',
    context: 'I have basic programming knowledge but want to become proficient in modern JavaScript frameworks and patterns',
    responses: {
      experienceLevel: 'intermediate',
      timeCommitment: '10 hours per week',
      learningStyle: 'hands-on projects',
      preferredDifficulty: 'challenging but manageable'
    }
  };

  const mockProject = {
    project_id: 'test-onboarding-project',
    name: 'JavaScript Mastery Journey',
    goal: mockUserJourney.goal,
    context: mockUserJourney.context,
    activePath: 'general'
  };

  beforeEach(() => {
    // Create comprehensive mock system
    const createMockFunction = (defaultReturnValue) => {
      const fn = (...args) => {
        fn.calls = fn.calls || [];
        fn.calls.push(args);
        if (fn.returnValue !== undefined) {
          const result = fn.returnValue;
          fn.returnValue = undefined;
          return result;
        }
        if (typeof defaultReturnValue === 'function') {
          return defaultReturnValue(...args);
        }
        return defaultReturnValue;
      };
      fn.calls = [];
      fn.mockResolvedValue = (value) => {
        fn.returnValue = Promise.resolve(value);
        return fn;
      };
      fn.mockRejectedValue = (error) => {
        fn.returnValue = Promise.reject(error);
        return fn;
      };
      return fn;
    };

    // Mock data persistence with comprehensive functionality
    mockDataPersistence = {
      loadProjectData: createMockFunction(Promise.resolve(mockProject)),
      saveProjectData: createMockFunction(Promise.resolve(true)),
      loadPathData: createMockFunction(Promise.resolve({
        goal: mockProject.goal,
        strategicBranches: [],
        frontierNodes: [],
        hierarchyMetadata: { total_tasks: 0 }
      })),
      savePathData: createMockFunction(Promise.resolve(true)),
      createProject: createMockFunction(Promise.resolve(mockProject)),
      listProjects: createMockFunction(Promise.resolve([mockProject]))
    };

    // Mock project management
    mockProjectManagement = {
      getActiveProject: createMockFunction(Promise.resolve(mockProject)),
      createProject: createMockFunction(Promise.resolve(mockProject)),
      switchToProject: createMockFunction(Promise.resolve(true)),
      listProjects: createMockFunction(Promise.resolve([mockProject]))
    };

    // Mock LLM interface with realistic responses
    mockLLMInterface = {
      chat: createMockFunction(Promise.resolve({
        text: 'Mock LLM response for goal validation and analysis'
      })),
      generateText: createMockFunction(Promise.resolve('Mock generated content')),
      analyzeGoal: createMockFunction(Promise.resolve({
        isValid: true,
        clarity: 0.9,
        specificity: 0.8,
        achievability: 0.85
      })),
      generateQuestionnaire: createMockFunction(Promise.resolve({
        questions: [
          { id: 'q1', text: 'What is your current experience level?', type: 'multiple_choice' },
          { id: 'q2', text: 'How much time can you dedicate weekly?', type: 'text' }
        ]
      })),
      analyzeComplexity: createMockFunction(Promise.resolve({
        complexity: 'moderate',
        estimatedDuration: '3-4 months',
        difficulty: 6
      }))
    };

    // Mock event bus
    mockEventBus = {
      emit: createMockFunction(),
      on: createMockFunction(),
      off: createMockFunction()
    };

    // Initialize system components
    onboardingFlow = new GatedOnboardingFlow(
      mockDataPersistence,
      mockProjectManagement,
      mockLLMInterface,
      mockEventBus
    );
  });

  describe('Gate 1: Landing Page and User Selection Validation', () => {
    test('should present gated landing page options', async () => {
      const landingResponse = await onboardingFlow.presentLandingPage();

      expect(landingResponse.gated).toBe(true);
      expect(landingResponse.options).toContain('start_new_project');
      expect(landingResponse.options).toContain('list_existing_projects');
      expect(landingResponse.requiresSelection).toBe(true);
    });

    test('should validate user selection before proceeding', async () => {
      const invalidSelection = 'invalid_option';
      const validSelection = 'start_new_project';

      const invalidResponse = await onboardingFlow.validateUserSelection(invalidSelection);
      expect(invalidResponse.valid).toBe(false);
      expect(invalidResponse.error).toContain('Invalid selection');

      const validResponse = await onboardingFlow.validateUserSelection(validSelection);
      expect(validResponse.valid).toBe(true);
      expect(validResponse.nextGate).toBe('goal_collection');
    });

    test('should handle existing project selection flow', async () => {
      mockProjectManagement.listProjects.mockResolvedValue([mockProject]);
      
      const selection = await onboardingFlow.validateUserSelection('list_existing_projects');
      expect(selection.valid).toBe(true);
      expect(selection.projects).toEqual([mockProject]);
      expect(mockProjectManagement.listProjects.calls.length).toBe(1);
    });

    test('should prevent progression without valid selection', async () => {
      const blockedProgression = await onboardingFlow.attemptGateProgression('goal_collection', null);
      
      expect(blockedProgression.blocked).toBe(true);
      expect(blockedProgression.reason).toContain('not completed');
    });
  });

  describe('Gate 2: Goal Collection and Validation', () => {
    test('should collect user goal through gated prompt', async () => {
      const goalPrompt = await onboardingFlow.presentGoalCollectionGate();

      expect(goalPrompt.gate).toBe('goal_collection');
      expect(goalPrompt.prompt).toContain('goal, dream');
      expect(goalPrompt.validation_required).toBe(true);
    });

    test('should validate goal completeness and clarity', async () => {
      const vaguGoal = 'Learn programming';
      const specificGoal = mockUserJourney.goal;

      mockLLMInterface.analyzeGoal.mockResolvedValue({ isValid: false, clarity: 0.3 });
      const vaguValidation = await onboardingFlow.validateGoal(vaguGoal);
      expect(vaguValidation.valid).toBe(false);
      expect(vaguValidation.reason).toContain('clarity');

      mockLLMInterface.analyzeGoal.mockResolvedValue({ isValid: true, clarity: 0.9 });
      const specificValidation = await onboardingFlow.validateGoal(specificGoal);
      expect(specificValidation.valid).toBe(true);
      expect(specificValidation.nextGate).toBe('context_gathering');
    });

    test('should provide feedback for goal improvement', async () => {
      mockLLMInterface.analyzeGoal.mockResolvedValue({
        isValid: false,
        clarity: 0.4,
        suggestions: ['Be more specific about the technology', 'Define your desired outcome']
      });

      const feedback = await onboardingFlow.validateGoal('Learn coding');
      expect(feedback.suggestions).toBeDefined();
      expect(feedback.suggestions.length).toBeGreaterThan(0);
    });

    test('should prevent context gate access without valid goal', async () => {
      const invalidGoal = { valid: false };
      onboardingFlow.currentGateData = { goal_validation: invalidGoal };

      const blockedAccess = await onboardingFlow.attemptGateProgression('context_gathering', null);
      expect(blockedAccess.blocked).toBe(true);
    });
  });

  describe('Gate 3: Context Gathering', () => {
    test('should prompt for detailed context after goal validation', async () => {
      onboardingFlow.currentGateData = { 
        goal_validation: { valid: true, goal: mockUserJourney.goal }
      };

      const contextPrompt = await onboardingFlow.presentContextGatheringGate();
      expect(contextPrompt.gate).toBe('context_gathering');
      expect(contextPrompt.prompt).toContain('where you stand');
      expect(contextPrompt.goal_reference).toBe(mockUserJourney.goal);
    });

    test('should validate context completeness', async () => {
      const briefContext = 'I know some basics';
      const detailedContext = mockUserJourney.context;

      const briefValidation = await onboardingFlow.validateContext(briefContext, mockUserJourney.goal);
      expect(briefValidation.sufficient).toBe(false);

      const detailedValidation = await onboardingFlow.validateContext(detailedContext, mockUserJourney.goal);
      expect(detailedValidation.sufficient).toBe(true);
      expect(detailedValidation.nextGate).toBe('schema_analysis');
    });

    test('should combine goal and context for schema analysis', async () => {
      onboardingFlow.currentGateData = {
        goal_validation: { valid: true, goal: mockUserJourney.goal },
        context_validation: { sufficient: true, context: mockUserJourney.context }
      };

      const combined = onboardingFlow.combineGoalAndContext();
      expect(combined.goal).toBe(mockUserJourney.goal);
      expect(combined.context).toBe(mockUserJourney.context);
      expect(combined.ready_for_analysis).toBe(true);
    });
  });

  describe('Gate 4: Dynamic HTA Schema Analysis', () => {
    test('should analyze goal and context against HTA schema', async () => {
      const goalContextData = {
        goal: mockUserJourney.goal,
        context: mockUserJourney.context
      };

      mockLLMInterface.chat.mockResolvedValue({
        text: JSON.stringify({
          missing_fields: ['time_commitment', 'experience_level'],
          schema_completion: 0.6,
          needs_questionnaire: true
        })
      });

      const schemaAnalysis = await onboardingFlow.analyzeHtaSchemaGaps(goalContextData);
      expect(schemaAnalysis.missing_fields).toBeDefined();
      expect(schemaAnalysis.needs_questionnaire).toBe(true);
      expect(schemaAnalysis.nextGate).toBe('questionnaire_generation');
    });

    test('should handle complete schema scenarios', async () => {
      mockLLMInterface.chat.mockResolvedValue({
        text: JSON.stringify({
          missing_fields: [],
          schema_completion: 1.0,
          needs_questionnaire: false
        })
      });

      const completeAnalysis = await onboardingFlow.analyzeHtaSchemaGaps({
        goal: mockUserJourney.goal,
        context: mockUserJourney.context
      });

      expect(completeAnalysis.needs_questionnaire).toBe(false);
      expect(completeAnalysis.nextGate).toBe('complexity_analysis');
    });

    test('should determine questionnaire questions based on gaps', async () => {
      const schemaGaps = {
        missing_fields: ['time_commitment', 'learning_style', 'experience_level'],
        needs_questionnaire: true
      };

      const questionnaire = await onboardingFlow.generateTargetedQuestionnaire(schemaGaps);
      expect(questionnaire.questions.length).toBeGreaterThan(0);
      expect(questionnaire.addresses_gaps).toBe(true);
    });
  });

  describe('Gate 5: Questionnaire Generation and Completion', () => {
    test('should generate questionnaire to fill schema gaps', async () => {
      const schemaGaps = {
        missing_fields: ['time_commitment', 'experience_level'],
        goal: mockUserJourney.goal
      };

      mockLLMInterface.generateQuestionnaire.mockResolvedValue({
        questions: [
          { id: 'time', text: 'How many hours per week can you dedicate?', type: 'number' },
          { id: 'exp', text: 'What is your experience level?', type: 'select' }
        ]
      });

      const questionnaire = await onboardingFlow.generateQuestionnaire(schemaGaps);
      expect(questionnaire.questions).toHaveLength(2);
      expect(questionnaire.addresses_gaps).toBe(true);
    });

    test('should validate questionnaire completion', async () => {
      const questionnaire = {
        questions: [
          { id: 'time', required: true },
          { id: 'exp', required: true }
        ]
      };

      const incompleteAnswers = { time: '10 hours' };
      const completeAnswers = { time: '10 hours', exp: 'intermediate' };

      const incompleteValidation = await onboardingFlow.validateQuestionnaireCompletion(
        questionnaire, 
        incompleteAnswers
      );
      expect(incompleteValidation.complete).toBe(false);

      const completeValidation = await onboardingFlow.validateQuestionnaireCompletion(
        questionnaire,
        completeAnswers
      );
      expect(completeValidation.complete).toBe(true);
      expect(completeValidation.nextGate).toBe('complexity_analysis');
    });

    test('should merge questionnaire data with goal and context', async () => {
      onboardingFlow.currentGateData = {
        goal_validation: { goal: mockUserJourney.goal },
        context_validation: { context: mockUserJourney.context },
        questionnaire_completion: { 
          complete: true, 
          answers: mockUserJourney.responses 
        }
      };

      const mergedData = onboardingFlow.mergeUserData();
      expect(mergedData.goal).toBe(mockUserJourney.goal);
      expect(mergedData.context).toBe(mockUserJourney.context);
      expect(mergedData.responses).toEqual(mockUserJourney.responses);
      expect(mergedData.ready_for_complexity_analysis).toBe(true);
    });
  });

  describe('Gate 6: Complexity Analysis', () => {
    test('should analyze complexity of complete user data', async () => {
      const completeUserData = {
        goal: mockUserJourney.goal,
        context: mockUserJourney.context,
        responses: mockUserJourney.responses
      };

      mockLLMInterface.analyzeComplexity.mockResolvedValue({
        complexity: 'moderate',
        estimatedDuration: '3-4 months',
        difficulty: 6,
        strategicBranches: ['foundation', 'research', 'capability', 'implementation']
      });

      const complexityAnalysis = await onboardingFlow.analyzeComplexity(completeUserData);
      expect(complexityAnalysis.complexity).toBeDefined();
      expect(complexityAnalysis.difficulty).toBeGreaterThan(0);
      expect(complexityAnalysis.nextGate).toBe('hta_tree_building');
    });

    test('should validate complexity analysis completion', async () => {
      const validAnalysis = {
        complexity: 'moderate',
        difficulty: 6,
        strategicBranches: ['foundation', 'research']
      };

      const validation = await onboardingFlow.validateComplexityAnalysis(validAnalysis);
      expect(validation.valid).toBe(true);
      expect(validation.ready_for_hta_building).toBe(true);
    });

    test('should handle complexity analysis errors gracefully', async () => {
      mockLLMInterface.analyzeComplexity.mockRejectedValue(new Error('Analysis failed'));

      const errorHandling = await onboardingFlow.analyzeComplexity({});
      expect(errorHandling.error).toBeDefined();
      expect(errorHandling.fallback_complexity).toBeDefined();
    });
  });

  describe('Gate 7: HTA Tree Building and Vectorization', () => {
    test('should build HTA tree from analyzed user data', async () => {
      const analyzedData = {
        goal: mockUserJourney.goal,
        context: mockUserJourney.context,
        responses: mockUserJourney.responses,
        complexity: 'moderate',
        difficulty: 6
      };

      mockDataPersistence.saveProjectData.mockResolvedValue(true);
      mockDataPersistence.savePathData.mockResolvedValue(true);

      const htaTree = await onboardingFlow.buildHtaTree(analyzedData);
      expect(htaTree.strategicBranches).toBeDefined();
      expect(htaTree.hierarchyMetadata).toBeDefined();
      expect(htaTree.built_successfully).toBe(true);
    });

    test('should vectorize HTA tree after building', async () => {
      const builtHta = {
        strategicBranches: [
          { name: 'Foundation', phase: 'foundation' },
          { name: 'Research', phase: 'research' }
        ],
        frontierNodes: []
      };

      const vectorization = await onboardingFlow.vectorizeHtaTree(builtHta, mockProject.project_id);
      expect(vectorization.vectorized).toBe(true);
      expect(vectorization.nextGate).toBe('task_generation');
    });

    test('should validate HTA tree completeness', async () => {
      const completeHta = {
        strategicBranches: [{ name: 'Foundation' }],
        frontierNodes: [],
        hierarchyMetadata: { total_tasks: 0 }
      };

      const incompleteHta = { strategicBranches: [] };

      const completeValidation = await onboardingFlow.validateHtaTreeCompletion(completeHta);
      expect(completeValidation.complete).toBe(true);

      const incompleteValidation = await onboardingFlow.validateHtaTreeCompletion(incompleteHta);
      expect(incompleteValidation.complete).toBe(false);
    });
  });

  describe('Gate 8: Task Generation and Dependency Ordering', () => {
    test('should generate initial task batch from HTA tree', async () => {
      const htaTree = {
        strategicBranches: [
          { 
            id: 'foundation-branch',
            name: 'Foundation', 
            phase: 'foundation',
            estimatedDuration: 0.25
          }
        ],
        frontierNodes: []
      };

      const taskBatch = await onboardingFlow.generateInitialTaskBatch(
        htaTree,
        mockUserJourney.goal,
        mockUserJourney.responses
      );

      expect(taskBatch.tasks).toBeDefined();
      expect(taskBatch.tasks.length).toBeGreaterThan(0);
      expect(taskBatch.ordered_by_dependency).toBe(true);
    });

    test('should order tasks by dependencies correctly', async () => {
      const unorderedTasks = [
        { id: 'task3', dependencies: ['task1', 'task2'] },
        { id: 'task1', dependencies: [] },
        { id: 'task2', dependencies: ['task1'] }
      ];

      const orderedTasks = await onboardingFlow.orderTasksByDependency(unorderedTasks);
      expect(orderedTasks[0].id).toBe('task1');
      expect(orderedTasks[1].id).toBe('task2');
      expect(orderedTasks[2].id).toBe('task3');
    });

    test('should validate task generation completion', async () => {
      const validTaskBatch = {
        tasks: [
          { id: 'task1', dependencies: [] },
          { id: 'task2', dependencies: ['task1'] }
        ],
        ordered_by_dependency: true
      };

      const validation = await onboardingFlow.validateTaskGeneration(validTaskBatch);
      expect(validation.valid).toBe(true);
      expect(validation.nextGate).toBe('first_task_recommendation');
    });

    test('should detect circular dependencies in task ordering', async () => {
      const circularTasks = [
        { id: 'task1', dependencies: ['task2'] },
        { id: 'task2', dependencies: ['task1'] }
      ];

      const validation = await onboardingFlow.orderTasksByDependency(circularTasks);
      expect(validation.error).toContain('Circular');
    });
  });

  describe('Gate 9: First Task Recommendation and Onboarding Completion', () => {
    test('should recommend optimal first task from generated batch', async () => {
      const taskBatch = {
        tasks: [
          { id: 'task1', difficulty: 2, dependencies: [], priority: 'high' },
          { id: 'task2', difficulty: 4, dependencies: ['task1'], priority: 'medium' },
          { id: 'task3', difficulty: 3, dependencies: [], priority: 'low' }
        ]
      };

      const userProfile = {
        experience_level: 'intermediate',
        time_available: '30 minutes'
      };

      const recommendation = await onboardingFlow.recommendFirstTask(taskBatch, userProfile);
      expect(recommendation.recommended_task).toBeDefined();
      expect(recommendation.reasoning).toBeDefined();
      expect(recommendation.onboarding_complete).toBe(true);
    });

    test('should mark onboarding as complete after first task recommendation', async () => {
      const completionStatus = await onboardingFlow.completeOnboarding(
        mockProject.project_id,
        'task1'
      );

      expect(completionStatus.onboarding_complete).toBe(true);
      expect(completionStatus.first_task_recommended).toBe('task1');
      expect(completionStatus.next_action).toBe('begin_task_execution');
    });

    test('should provide onboarding summary', async () => {
      onboardingFlow.currentGateData = {
        goal_validation: { goal: mockUserJourney.goal },
        context_validation: { context: mockUserJourney.context },
        task_generation: { tasks_created: 5 },
        first_recommendation: { onboarding_complete: true }
      };

      const summary = await onboardingFlow.generateOnboardingSummary();
      expect(summary.gates_completed).toBeGreaterThan(0);
      expect(summary.goal).toBe(mockUserJourney.goal);
      expect(summary.ready_to_start).toBe(true);
    });
  });

  describe('Post-Onboarding: Task Completion and Context Folding', () => {
    test('should handle task completion with context collection', async () => {
      const taskCompletion = {
        task_id: 'task1',
        outcome: 'completed successfully',
        learned: 'Understanding of JavaScript variable scoping and hoisting',
        next_questions: 'How does this apply to closures?',
        difficulty_rating: 3,
        time_spent: 25
      };

      const completionResult = await onboardingFlow.handleTaskCompletion(
        taskCompletion,
        mockProject.project_id
      );

      expect(completionResult.context_collected).toBe(true);
      expect(completionResult.next_task_available).toBe(true);
    });

    test('should fold context from completed task into next task', async () => {
      const completedTaskContext = {
        learned: 'JavaScript variable scoping',
        questions: 'How does this apply to closures?',
        insights: 'Hoisting affects variable declaration order'
      };

      const nextTask = {
        id: 'task2',
        title: 'Understanding JavaScript Closures',
        description: 'Learn about closure patterns'
      };

      const contextFolding = await onboardingFlow.foldContextIntoNextTask(
        completedTaskContext,
        nextTask
      );

      expect(contextFolding.enhanced_task).toBeDefined();
      expect(contextFolding.context_applied).toBe(true);
      expect(contextFolding.enhanced_task.contextual_background).toContain('variable scoping');
    });

    test('should continue task-to-task context accumulation', async () => {
      const taskHistory = [
        { learned: 'Variables and scope', questions: 'What about closures?' },
        { learned: 'Closure patterns', questions: 'How do async patterns work?' },
        { learned: 'Async/await patterns', questions: 'What about error handling?' }
      ];

      const accumulatedContext = await onboardingFlow.accumulateTaskContext(taskHistory);
      expect(accumulatedContext.cumulative_learning).toContain('Variables');
      expect(accumulatedContext.cumulative_learning).toContain('Closure');
      expect(accumulatedContext.cumulative_learning).toContain('Async');
      expect(accumulatedContext.progressive_questions).toBeDefined();
    });
  });

  describe('Breakthrough Detection and Evolution Triggers', () => {
    test('should detect breakthrough from task completion context', async () => {
      const breakthroughCompletion = {
        learned: 'Had a major breakthrough understanding how closures work with async patterns!',
        breakthrough: true,
        insight_level: 'high'
      };

      const breakthroughDetection = await onboardingFlow.detectBreakthrough(breakthroughCompletion);
      expect(breakthroughDetection.breakthrough_detected).toBe(true);
      expect(breakthroughDetection.should_evolve_strategy).toBe(true);
    });

    test('should trigger tree evolution after breakthrough', async () => {
      const breakthroughData = {
        breakthrough_detected: true,
        learned_content: 'Major insight about async patterns',
        project_id: mockProject.project_id
      };

      const evolutionTrigger = await onboardingFlow.triggerTreeEvolution(breakthroughData);
      expect(evolutionTrigger.evolution_triggered).toBe(true);
      expect(evolutionTrigger.new_tasks_generated).toBeGreaterThan(0);
    });

    test('should trigger batch evolution for consistent patterns', async () => {
      const consistentPattern = {
        pattern_type: 'rapid_progress',
        consecutive_easy_tasks: 4,
        substantial_learning: true
      };

      const batchEvolution = await onboardingFlow.triggerBatchEvolution(
        consistentPattern,
        mockProject.project_id
      );

      expect(batchEvolution.batch_evolved).toBe(true);
      expect(batchEvolution.difficulty_increased).toBe(true);
    });

    test('should handle complete evolution cycle', async () => {
      // Simulate full cycle: Task A -> Context -> Task B -> Context -> Task C
      const taskA = { id: 'taskA', learned: 'Basic concepts with substantial content that exceeds the fifty character minimum threshold needed for rich background detection' };
      const taskB = { id: 'taskB', learned: 'Intermediate concepts with additional detailed learning content that also exceeds the minimum threshold requirements' };
      const taskC = { id: 'taskC', learned: 'Advanced breakthrough!' };

      // Complete Task A
      const contextA = await onboardingFlow.handleTaskCompletion(taskA, mockProject.project_id);
      expect(contextA.context_collected).toBe(true);

      // Fold A -> B
      const foldedB = await onboardingFlow.foldContextIntoNextTask(
        contextA.collected_context,
        taskB
      );
      expect(foldedB.context_applied).toBe(true);

      // Complete Task B with A's context
      const contextB = await onboardingFlow.handleTaskCompletion(
        { ...taskB, previous_context: contextA.collected_context },
        mockProject.project_id
      );

      // Fold A+B -> C
      const combinedContext = await onboardingFlow.combineTaskContexts([
        contextA.collected_context,
        contextB.collected_context
      ]);

      const foldedC = await onboardingFlow.foldContextIntoNextTask(combinedContext, taskC);
      expect(foldedC.enhanced_task.rich_background).toBe(true);

      // Complete C with breakthrough
      const breakthroughC = await onboardingFlow.handleTaskCompletion(
        { ...taskC, breakthrough: true },
        mockProject.project_id
      );

      expect(breakthroughC.evolution_triggered).toBe(true);
    });
  });

  describe('Integration Tests - Complete Flow Validation', () => {
    test('should complete entire onboarding flow end-to-end', async () => {
      // Gate 1: Landing page
      const landing = await onboardingFlow.presentLandingPage();
      expect(landing.gated).toBe(true);

      const selection = await onboardingFlow.validateUserSelection('start_new_project');
      expect(selection.valid).toBe(true);

      // Gate 2: Goal collection
      const goalValidation = await onboardingFlow.validateGoal(mockUserJourney.goal);
      expect(goalValidation.valid).toBe(true);

      // Gate 3: Context gathering  
      const contextValidation = await onboardingFlow.validateContext(
        mockUserJourney.context,
        mockUserJourney.goal
      );
      expect(contextValidation.sufficient).toBe(true);

      // Gate 4: Schema analysis
      const schemaAnalysis = await onboardingFlow.analyzeHtaSchemaGaps({
        goal: mockUserJourney.goal,
        context: mockUserJourney.context
      });
      expect(schemaAnalysis.needs_questionnaire).toBe(true);

      // Gate 5: Questionnaire
      const questionnaire = await onboardingFlow.generateQuestionnaire(schemaAnalysis);
      const questionnaireCompletion = await onboardingFlow.validateQuestionnaireCompletion(
        questionnaire,
        mockUserJourney.responses
      );
      expect(questionnaireCompletion.complete).toBe(true);

      // Gate 6: Complexity analysis
      const complexityAnalysis = await onboardingFlow.analyzeComplexity({
        goal: mockUserJourney.goal,
        context: mockUserJourney.context,
        responses: mockUserJourney.responses
      });
      expect(complexityAnalysis.complexity).toBeDefined();

      // Gate 7: HTA building
      const htaTree = await onboardingFlow.buildHtaTree(complexityAnalysis);
      expect(htaTree.built_successfully).toBe(true);

      // Gate 8: Task generation
      const taskBatch = await onboardingFlow.generateInitialTaskBatch(
        htaTree,
        mockUserJourney.goal,
        mockUserJourney.responses
      );
      expect(taskBatch.tasks.length).toBeGreaterThan(0);

      // Gate 9: First recommendation
      const recommendation = await onboardingFlow.recommendFirstTask(
        taskBatch,
        mockUserJourney.responses
      );
      expect(recommendation.onboarding_complete).toBe(true);

      // Verify all gates passed
      const summary = await onboardingFlow.generateOnboardingSummary();
      expect(summary.gates_completed).toBe(9);
      expect(summary.ready_to_start).toBe(true);
    });

    test('should handle gate failures and recovery', async () => {
      // Complete landing page gate first
      await onboardingFlow.validateUserSelection('start_new_project');
      
      // Simulate failure at goal validation
      mockLLMInterface.analyzeGoal.mockResolvedValue({ isValid: false, clarity: 0.2 });
      
      const failedGoal = await onboardingFlow.validateGoal('vague goal');
      expect(failedGoal.valid).toBe(false);

      // Should not be able to progress
      const blockedProgression = await onboardingFlow.attemptGateProgression('context_gathering');
      expect(blockedProgression.blocked).toBe(true);

      // Recovery: fix goal and retry
      mockLLMInterface.analyzeGoal.mockResolvedValue({ isValid: true, clarity: 0.9 });
      const fixedGoal = await onboardingFlow.validateGoal(mockUserJourney.goal);
      expect(fixedGoal.valid).toBe(true);

      // Should now be able to progress
      const unlockedProgression = await onboardingFlow.attemptGateProgression('context_gathering');
      expect(unlockedProgression.blocked).toBe(false);
    });

    test('should maintain state consistency across gates', async () => {
      // Complete first few gates
      await onboardingFlow.validateUserSelection('start_new_project');
      await onboardingFlow.validateGoal(mockUserJourney.goal);
      await onboardingFlow.validateContext(mockUserJourney.context, mockUserJourney.goal);

      // Verify state accumulation
      const currentState = onboardingFlow.getCurrentGateData();
      expect(currentState.goal_validation).toBeDefined();
      expect(currentState.context_validation).toBeDefined();
      expect(currentState.ready_for_schema_analysis).toBe(true);

      // Continue to later gates
      const schemaAnalysis = await onboardingFlow.analyzeHtaSchemaGaps(currentState);
      expect(schemaAnalysis.goal).toBe(mockUserJourney.goal);
      expect(schemaAnalysis.context).toBe(mockUserJourney.context);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle LLM service failures gracefully', async () => {
      mockLLMInterface.analyzeGoal.mockRejectedValue(new Error('LLM service unavailable'));

      const errorHandling = await onboardingFlow.validateGoal(mockUserJourney.goal);
      expect(errorHandling.error).toBeDefined();
      expect(errorHandling.fallback_validation).toBe(true);
    });

    test('should handle data persistence failures', async () => {
      mockDataPersistence.saveProjectData.mockRejectedValue(new Error('Storage failed'));

      const saveAttempt = await onboardingFlow.buildHtaTree({
        goal: mockUserJourney.goal,
        complexity: 'moderate'
      });

      expect(saveAttempt.error).toBeDefined();
      expect(saveAttempt.retry_available).toBe(true);
    });

    test('should validate gate progression order', async () => {
      // Try to skip to advanced gate without completing prerequisites
      const skipAttempt = await onboardingFlow.attemptGateProgression('task_generation', null);
      expect(skipAttempt.blocked).toBe(true);
      expect(skipAttempt.missing_prerequisites).toBeDefined();
    });

    test('should handle concurrent user sessions', async () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      // Start two concurrent onboarding flows
      await onboardingFlow.startSession(session1);
      await onboardingFlow.startSession(session2);

      // Each should maintain separate state
      await onboardingFlow.validateGoal('Goal 1', session1);
      await onboardingFlow.validateGoal('Goal 2', session2);

      const state1 = onboardingFlow.getSessionData(session1);
      const state2 = onboardingFlow.getSessionData(session2);

      expect(state1.goal_validation.goal).toBe('Goal 1');
      expect(state2.goal_validation.goal).toBe('Goal 2');
    });
  });
});