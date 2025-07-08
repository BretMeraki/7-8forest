import { DataPersistence } from './modules/data-persistence.js';
import { ProjectManagement } from './modules/project-management.js';
import { GatedOnboardingFlow } from './modules/gated-onboarding-flow.js';
import { HTACore } from './modules/hta-core.js';

// Mock logger to avoid actual console output during simulation
const mockLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
};

// Mock HTACore for controlled simulation
const mockHTACore = {
  analyzeGoal: async (goal) => ({
    isValid: true,
    clarity: 'clear',
    specificity: 'specific',
    achievability: 'achievable'
  }),
  analyzeGoalComplexity: async (goal, context) => ({
    score: 5,
    level: 'moderate',
    recommended_depth: 3,
    factors: ['Moderate complexity due to goal scope'],
    analysis: 'Goal complexity: 5/10. Moderate complexity due to goal scope.'
  }),
  buildHTATree: async (analyzedData) => ({
    built_successfully: true,
    strategicBranches: [
      { name: 'Foundation', description: 'Build fundamental understanding', priority: 1, phase: 'foundation', tasks: [] },
      { name: 'Practice', description: 'Develop practical skills', priority: 2, phase: 'practice', tasks: [] },
      { name: 'Application', description: 'Apply knowledge to projects', priority: 3, phase: 'application', tasks: [] }
    ],
    source: 'mock'
  }),
  generateInitialTaskBatch: async (htaTree, goal, context) => ({
    tasks: [
      { id: 'foundation_1', title: 'Introduction to Topic', description: 'Learn the basics', difficulty: 2, dependencies: [], branch_id: 'foundation', phase: 'foundation', estimated_duration: 30, priority: 'high' },
      { id: 'foundation_2', title: 'Core Concepts', description: 'Understand core concepts', difficulty: 3, dependencies: ['foundation_1'], branch_id: 'foundation', phase: 'foundation', estimated_duration: 45, priority: 'medium' }
    ]
  })
};

async function simulateOnboardingFlow() {
  console.log('Starting Onboarding Flow Simulation');
  console.log('=====================================');

  // Initialize components
  const dataPersistence = new DataPersistence('/tmp/forest-sim-data');
  dataPersistence.getLogger = async () => mockLogger;
  const projectManagement = new ProjectManagement(dataPersistence);
  projectManagement.getLogger = async () => mockLogger;
  const htaCore = new HTACore();
  Object.assign(htaCore, mockHTACore); // Override with mock methods
  const onboardingFlow = new GatedOnboardingFlow(dataPersistence, projectManagement, htaCore, null, null);
  onboardingFlow.getLogger = async () => mockLogger;

  // Simulate starting a new project
  console.log('\n[Step 1] Starting New Project');
  const goal = 'Learn Web Development';
  const startResult = await onboardingFlow.startNewProject(goal);
  console.log('Project Start Result:', JSON.stringify(startResult, null, 2));
  if (!startResult.success) {
    console.error('Failed to start project:', startResult.error || 'Unknown error');
    return;
  }

  const projectId = startResult.projectId;
  console.log('Project ID:', projectId);

  // Check initial aggregate context
  let aggregateContext = await onboardingFlow.getAggregate(projectId);
  console.log('\n[Initial] Aggregate Context:', JSON.stringify(aggregateContext, null, 2));

  // Simulate context gathering
  console.log('\n[Step 2] Context Gathering');
  const contextResult = await onboardingFlow.continueOnboarding(projectId, 'context_gathering', { context: 'I have some programming experience but new to web development. Can dedicate 10 hours per week.' });
  console.log('Context Gathering Result:', JSON.stringify(contextResult, null, 2));
  aggregateContext = await onboardingFlow.getAggregate(projectId);
  console.log('[After Context] Aggregate Context:', JSON.stringify(aggregateContext, null, 2));

  // Simulate complexity analysis
  console.log('\n[Step 3] Complexity Analysis');
  const complexityResult = await onboardingFlow.continueOnboarding(projectId, 'complexity_analysis', {});
  console.log('Complexity Analysis Result:', JSON.stringify(complexityResult, null, 2));
  aggregateContext = await onboardingFlow.getAggregate(projectId);
  console.log('[After Complexity] Aggregate Context:', JSON.stringify(aggregateContext, null, 2));

  // Simulate HTA tree building
  console.log('\n[Step 4] HTA Tree Building');
  const htaResult = await onboardingFlow.continueOnboarding(projectId, 'hta_tree_building', {});
  console.log('HTA Tree Building Result:', JSON.stringify(htaResult, null, 2));
  aggregateContext = await onboardingFlow.getAggregate(projectId);
  console.log('[After HTA] Aggregate Context:', JSON.stringify(aggregateContext, null, 2));

  // Simulate task generation
  console.log('\n[Step 5] Task Generation');
  const taskResult = await onboardingFlow.continueOnboarding(projectId, 'task_generation', {});
  console.log('Task Generation Result:', JSON.stringify(taskResult, null, 2));
  aggregateContext = await onboardingFlow.getAggregate(projectId);
  console.log('[After Tasks] Aggregate Context:', JSON.stringify(aggregateContext, null, 2));

  console.log('\n=====================================');
  console.log('Simulation Complete');
  console.log('Final Aggregate Context:', JSON.stringify(aggregateContext, null, 2));
  console.log('=====================================');
}

// Run the simulation
simulateOnboardingFlow().catch(error => {
  console.error('Simulation failed:', error);
});
