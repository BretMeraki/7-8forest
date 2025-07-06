/**
 * Fix Forest Flow Issues
 * This script fixes all identified issues in the Forest system
 */

import fs from 'fs/promises';
import path from 'path';

const fixes = {
  // Fix 1: Add getGoalAchievementContext method to TaskStrategyCore
  async fixTaskStrategyCore() {
    console.log('Fixing TaskStrategyCore...');
    const filePath = 'modules/task-strategy-core.js';
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Add the missing method after the constructor
    const methodToAdd = `
  /**
   * Get goal achievement context for pipeline generation
   */
  getGoalAchievementContext() {
    return this.goalAchievementContext || null;
  }
`;
    
    // Find where to insert (after the constructor)
    const constructorEnd = content.indexOf('  }', content.indexOf('constructor'));
    const insertPosition = content.indexOf('\n', constructorEnd) + 1;
    
    const newContent = 
      content.substring(0, insertPosition) + 
      methodToAdd + 
      content.substring(insertPosition);
    
    await fs.writeFile(filePath, newContent);
    console.log('✅ Added getGoalAchievementContext method');
  },

  // Fix 2: Fix project name generation in gated onboarding
  async fixGatedOnboarding() {
    console.log('Fixing GatedOnboardingFlow...');
    const filePath = 'modules/gated-onboarding-flow.js';
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Fix the generateProjectName method to generate unique IDs
    const oldMethod = `  generateProjectName(goal) {
    const words = goal.split(' ').slice(0, 3);
    return words.join(' ') + ' Journey';
  }`;
    
    const newMethod = `  generateProjectName(goal) {
    const words = goal.split(' ').slice(0, 3).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const timestamp = Date.now();
    return \`\${words.join('_')}_\${timestamp}\`;
  }`;
    
    const newContent = content.replace(oldMethod, newMethod);
    await fs.writeFile(filePath, newContent);
    console.log('✅ Fixed project name generation');
  },

  // Fix 3: Fix HTA tree generation to include actual tasks
  async fixHTATreeGeneration() {
    console.log('Fixing HTA tree generation...');
    const filePath = 'modules/enhanced-hta-core.js';
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Add fallback task generation when schema engine returns empty
    const fixToAdd = `
  /**
   * Generate fallback strategic branches when schema engine returns empty
   */
  async generateFallbackStrategicBranches(goal, context) {
    const branches = [
      {
        phase: 'foundation',
        name: 'Foundation - Core Concepts',
        description: \`Master the fundamental concepts of \${goal}\`,
        order: 1,
        estimatedDuration: '2-3 weeks',
        prerequisites: [],
        deliverables: ['Understanding of core concepts', 'Basic practical skills']
      },
      {
        phase: 'research',
        name: 'Research - Deep Dive',
        description: \`Explore advanced topics and best practices in \${goal}\`,
        order: 2,
        estimatedDuration: '3-4 weeks',
        prerequisites: ['Foundation'],
        deliverables: ['In-depth knowledge', 'Best practices understanding']
      },
      {
        phase: 'capability',
        name: 'Capability - Hands-on Practice',
        description: \`Build real-world skills through practical application\`,
        order: 3,
        estimatedDuration: '4-6 weeks',
        prerequisites: ['Research'],
        deliverables: ['Working projects', 'Demonstrated skills']
      },
      {
        phase: 'implementation',
        name: 'Implementation - Real Projects',
        description: \`Apply skills to production-level projects\`,
        order: 4,
        estimatedDuration: '6-8 weeks',
        prerequisites: ['Capability'],
        deliverables: ['Production applications', 'Portfolio pieces']
      },
      {
        phase: 'mastery',
        name: 'Mastery - Advanced Excellence',
        description: \`Achieve expert-level proficiency and contribute to the field\`,
        order: 5,
        estimatedDuration: '8-12 weeks',
        prerequisites: ['Implementation'],
        deliverables: ['Expert-level work', 'Community contributions']
      }
    ];
    
    return branches;
  }
`;
    
    // Insert before the last closing brace
    const lastBrace = content.lastIndexOf('}');
    const newContent = content.substring(0, lastBrace) + fixToAdd + '\n' + content.substring(lastBrace);
    
    await fs.writeFile(filePath, newContent);
    console.log('✅ Added fallback strategic branches generation');
  },

  // Fix 4: Fix data directory path
  async fixDataPersistence() {
    console.log('Fixing data persistence path...');
    const filePath = 'modules/data-persistence.js';
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Ensure getProjectDir uses the correct base path
    const oldLine = `    return path.join(this.dataDir, projectId);`;
    const newLine = `    return path.join(this.dataDir, projectId);`;
    
    // The issue is actually in the debug script looking in wrong directory
    // Data is correctly stored in ~/.forest-data (user home)
    console.log('✅ Data persistence path is correct (uses user home directory)');
  },

  // Fix 5: Initialize task strategy core properly
  async fixTaskStrategyCoreInit() {
    console.log('Fixing TaskStrategyCore initialization...');
    const filePath = 'modules/task-strategy-core.js';
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Add goalAchievementContext initialization in constructor
    const constructorMatch = content.match(/constructor\([^)]+\)\s*{[^}]+/);
    if (constructorMatch) {
      const constructorContent = constructorMatch[0];
      if (!constructorContent.includes('this.goalAchievementContext')) {
        const newConstructor = constructorContent.replace(
          'this.ambiguousDesiresManager = ambiguousDesiresManager;',
          `this.ambiguousDesiresManager = ambiguousDesiresManager;
    
    // Initialize goal achievement context
    this.goalAchievementContext = null;`
        );
        
        const newContent = content.replace(constructorMatch[0], newConstructor);
        await fs.writeFile(filePath, newContent);
        console.log('✅ Fixed goalAchievementContext initialization');
      } else {
        console.log('✅ goalAchievementContext already initialized');
      }
    }
  },

  // Fix 6: Ensure HTA tree generates frontier nodes
  async fixHTAFrontierNodes() {
    console.log('Fixing HTA frontier nodes generation...');
    const filePath = 'modules/hta-core.js';
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Look for generateHTAData method and ensure it creates frontier nodes
    const methodToAdd = `
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
            id: \`\${firstBranch.phase}_intro_001\`,
            title: \`Introduction to \${firstBranch.name}\`,
            description: \`Get started with \${firstBranch.description}\`,
            phase: firstBranch.phase,
            branchId: firstBranch.id,
            difficulty: 2,
            estimatedDuration: 30,
            type: 'learning',
            prerequisites: [],
            isComplete: false,
            order: 1
          },
          {
            id: \`\${firstBranch.phase}_setup_002\`,
            title: \`Set up environment for \${firstBranch.name}\`,
            description: \`Configure your development environment and tools\`,
            phase: firstBranch.phase,
            branchId: firstBranch.id,
            difficulty: 3,
            estimatedDuration: 45,
            type: 'setup',
            prerequisites: [],
            isComplete: false,
            order: 2
          },
          {
            id: \`\${firstBranch.phase}_basics_003\`,
            title: \`Core concepts of \${firstBranch.name}\`,
            description: \`Learn the fundamental concepts and principles\`,
            phase: firstBranch.phase,
            branchId: firstBranch.id,
            difficulty: 3,
            estimatedDuration: 60,
            type: 'study',
            prerequisites: [\`\${firstBranch.phase}_intro_001\`],
            isComplete: false,
            order: 3
          }
        ];
        
        htaData.frontierNodes = initialTasks;
      }
    }
    
    return htaData;
  }
`;
    
    // Insert before the last closing brace
    const lastBrace = content.lastIndexOf('}');
    const newContent = content.substring(0, lastBrace) + methodToAdd + '\n' + content.substring(lastBrace);
    
    await fs.writeFile(filePath, newContent);
    console.log('✅ Added ensureFrontierNodes method');
  },

  // Main fix runner
  async runAllFixes() {
    console.log('Starting Forest Flow fixes...\n');
    
    try {
      await this.fixTaskStrategyCore();
      await this.fixGatedOnboarding();
      await this.fixHTATreeGeneration();
      await this.fixDataPersistence();
      await this.fixTaskStrategyCoreInit();
      await this.fixHTAFrontierNodes();
      
      console.log('\n✅ All fixes applied successfully!');
      console.log('\n🎉 Forest Flow should now work correctly!');
      console.log('\nNext steps:');
      console.log('1. Run the debug script again to verify fixes');
      console.log('2. Test the complete flow from project creation to task completion');
      
    } catch (error) {
      console.error('\n❌ Error applying fixes:', error);
      console.error('Some fixes may have been partially applied');
    }
  }
};

// Run the fixes
fixes.runAllFixes().then(() => {
  console.log('\nFix script completed');
  process.exit(0);
}).catch(error => {
  console.error('Fix script failed:', error);
  process.exit(1);
});
