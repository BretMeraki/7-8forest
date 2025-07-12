/**
 * Domain-Agnostic Task Generation Helpers
 * Provides intelligent task generation that adapts to different domains and learning styles
 */

import { ForestIntelligenceAdapter } from './core-intelligence.js';

/**
 * Domain analysis and classification utilities
 */
export class DomainAnalyzer {
    static DOMAIN_PATTERNS = {
        technical: {
            keywords: ['programming', 'code', 'software', 'web', 'app', 'development', 'api', 'database', 'framework'],
            learningStyle: 'hands-on',
            progressionType: 'incremental-building',
            typical_phases: ['setup', 'basics', 'practice', 'projects', 'advanced', 'specialization']
        },
        creative: {
            keywords: ['art', 'design', 'music', 'writing', 'creative', 'visual', 'aesthetic', 'composition'],
            learningStyle: 'experiential',
            progressionType: 'exploratory-refinement',
            typical_phases: ['exploration', 'technique', 'practice', 'style', 'portfolio', 'mastery']
        },
        academic: {
            keywords: ['study', 'research', 'theory', 'academic', 'science', 'analysis', 'methodology'],
            learningStyle: 'structured',
            progressionType: 'cumulative-knowledge',
            typical_phases: ['foundation', 'concepts', 'application', 'synthesis', 'research', 'expertise']
        },
        business: {
            keywords: ['business', 'marketing', 'sales', 'management', 'strategy', 'finance', 'entrepreneurship'],
            learningStyle: 'practical',
            progressionType: 'problem-solving',
            typical_phases: ['understanding', 'strategy', 'implementation', 'measurement', 'optimization', 'scaling']
        },
        skill_based: {
            keywords: ['skill', 'technique', 'method', 'practice', 'improvement', 'mastery', 'performance'],
            learningStyle: 'deliberate-practice',
            progressionType: 'skill-building',
            typical_phases: ['fundamentals', 'practice', 'feedback', 'refinement', 'consistency', 'expertise']
        },
        lifestyle: {
            keywords: ['health', 'fitness', 'habit', 'personal', 'lifestyle', 'wellness', 'routine'],
            learningStyle: 'behavioral',
            progressionType: 'habit-formation',
            typical_phases: ['awareness', 'planning', 'initiation', 'consistency', 'adaptation', 'integration']
        }
    };

    static analyzeDomain(goal, context = {}) {
        const goalText = goal.toLowerCase();
        const contextText = JSON.stringify(context).toLowerCase();
        const combinedText = `${goalText} ${contextText}`;

        const domainScores = {};
        
        // Score each domain based on keyword matches
        for (const [domain, pattern] of Object.entries(this.DOMAIN_PATTERNS)) {
            let score = 0;
            for (const keyword of pattern.keywords) {
                if (combinedText.includes(keyword)) {
                    score += 1;
                }
            }
            domainScores[domain] = {
                score,
                percentage: score / pattern.keywords.length,
                ...pattern
            };
        }

        // Find the highest scoring domain
        const bestMatch = Object.entries(domainScores)
            .sort(([,a], [,b]) => b.score - a.score)[0];

        return {
            primaryDomain: bestMatch[0],
            domainInfo: bestMatch[1],
            allScores: domainScores,
            confidence: bestMatch[1].percentage
        };
    }

    static getComplexityIndicators(goal, context = {}) {
        const complexityFactors = {
            length: goal.length > 100 ? 2 : goal.length > 50 ? 1 : 0,
            multipleAreas: (goal.match(/and|or|plus|also|including/gi) || []).length,
            technicalTerms: (goal.match(/\b[A-Z]{2,}\b|framework|system|architecture|methodology/g) || []).length,
            timeframe: context.deadline ? (new Date(context.deadline) - new Date()) < 30 * 24 * 60 * 60 * 1000 ? 3 : 1 : 0,
            prerequisites: context.prerequisites ? context.prerequisites.length : 0,
            scope: goal.includes('master') || goal.includes('expert') ? 3 : goal.includes('learn') ? 1 : 2
        };

        const totalScore = Object.values(complexityFactors).reduce((sum, val) => sum + val, 0);
        const maxPossibleScore = 15; // Rough maximum
        
        const normalizedScore = Math.min(10, Math.round((totalScore / maxPossibleScore) * 10));
        
        let level;
        if (normalizedScore <= 3) level = 'beginner';
        else if (normalizedScore <= 6) level = 'intermediate';
        else if (normalizedScore <= 8) level = 'advanced';
        else level = 'expert';

        return {
            score: normalizedScore,
            level,
            factors: complexityFactors,
            estimatedTimeframe: this.estimateTimeframe(normalizedScore, context)
        };
    }

    static estimateTimeframe(complexityScore, context = {}) {
        if (context.deadline) return context.deadline;
        
        const baseWeeks = {
            1: 1, 2: 2, 3: 3, 4: 6, 5: 8, 
            6: 12, 7: 16, 8: 24, 9: 36, 10: 52
        };
        
        return `${baseWeeks[complexityScore] || 52} weeks`;
    }
}

/**
 * Intelligent task generation that adapts to domain and context
 */
export class DomainAgnosticTaskGenerator {
    constructor() {
        this.intelligenceAdapter = new ForestIntelligenceAdapter();
    }

    async generateAdaptiveTasks(goal, context = {}, options = {}) {
        // Analyze the domain and complexity
        const domainAnalysis = DomainAnalyzer.analyzeDomain(goal, context);
        const complexityAnalysis = DomainAnalyzer.getComplexityIndicators(goal, context);
        
        // Generate domain-specific learning strategy
        const strategyRequest = await this.intelligenceAdapter.requestStrategicBranches(
            goal,
            complexityAnalysis,
            options.focusAreas || [],
            options.learningStyle || domainAnalysis.domainInfo.learningStyle,
            { 
                ...context, 
                domainType: domainAnalysis.primaryDomain,
                progressionType: domainAnalysis.domainInfo.progressionType
            }
        );

        return {
            domainAnalysis,
            complexityAnalysis,
            strategyRequest,
            metadata: {
                generatedAt: new Date().toISOString(),
                adaptationLevel: domainAnalysis.confidence,
                estimatedDuration: complexityAnalysis.estimatedTimeframe
            }
        };
    }

    async generateTaskSequence(strategicBranch, context = {}, options = {}) {
        const system = `You are an expert task sequencer who creates optimal learning progressions within specific phases.
        
Domain Context: ${context.domainType || 'general'}
Progression Type: ${context.progressionType || 'incremental'}
Learning Style: ${options.learningStyle || 'mixed'}`;
        
        const user = `Generate a detailed task sequence for this learning phase:

**Phase**: ${strategicBranch.name}
**Description**: ${strategicBranch.description}
**Key Activities**: ${strategicBranch.key_activities?.join(', ') || 'Not specified'}
**Learning Focus**: ${strategicBranch.learning_focus || 'general'}
**Duration**: ${strategicBranch.duration_estimate || 'flexible'}

**Requirements**:
1. Create 5-10 specific, actionable tasks for this phase
2. Ensure tasks build logically on each other
3. Include both learning and practice activities
4. Specify realistic time estimates for each task
5. Include success criteria and checkpoints
6. Adapt to the domain's typical learning patterns

**Critical Guidelines**:
- Tasks should be specific and actionable, not vague
- Include practical application opportunities
- Consider the learner's progression level
- Ensure each task contributes meaningfully to the phase goal`;

        const schema = {
            type: "object",
            properties: {
                phase_summary: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        goal: { type: "string" },
                        approach: { type: "string" }
                    }
                },
                task_sequence: {
                    type: "array",
                    minItems: 5,
                    maxItems: 10,
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            title: { type: "string" },
                            description: { type: "string" },
                            type: { 
                                type: "string", 
                                enum: ["learning", "practice", "project", "assessment", "reflection", "research"] 
                            },
                            estimated_time: { type: "string" },
                            difficulty: { type: "integer", minimum: 1, maximum: 5 },
                            prerequisites: { type: "array", items: { type: "string" } },
                            success_criteria: { type: "array", items: { type: "string" } },
                            resources_needed: { type: "array", items: { type: "string" } },
                            deliverable: { type: "string" }
                        },
                        required: ["id", "title", "description", "type", "estimated_time", "success_criteria"]
                    }
                },
                phase_checkpoints: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            checkpoint: { type: "string" },
                            criteria: { type: "string" },
                            timing: { type: "string" }
                        }
                    }
                }
            },
            required: ["phase_summary", "task_sequence", "phase_checkpoints"]
        };

        const request = await this.intelligenceAdapter.core.request({
            method: 'llm/completion',
            params: {
                system,
                user,
                schema,
                max_tokens: 3000,
                temperature: 0.4
            }
        });

        return request;
    }

    async generateContextualHints(task, learnerProgress = {}, context = {}) {
        const system = "You are a personalized learning coach who provides contextual hints and guidance.";
        const user = `Provide personalized hints and guidance for this task:

**Task**: ${task.title}
**Description**: ${task.description}
**Type**: ${task.type}
**Difficulty**: ${task.difficulty}/5

**Learner Context**:
- Progress: ${JSON.stringify(learnerProgress, null, 2)}
- Domain: ${context.domainType || 'general'}
- Learning Style: ${context.learningStyle || 'mixed'}

**Provide**:
1. Specific getting-started tips
2. Common pitfalls to avoid
3. Success indicators to watch for
4. Adaptive hints based on learner's style and progress
5. Motivation and encouragement specific to this task`;

        const schema = {
            type: "object",
            properties: {
                getting_started: { type: "array", items: { type: "string" } },
                pitfalls_to_avoid: { type: "array", items: { type: "string" } },
                success_indicators: { type: "array", items: { type: "string" } },
                adaptive_hints: {
                    type: "object",
                    properties: {
                        for_struggling: { type: "array", items: { type: "string" } },
                        for_advanced: { type: "array", items: { type: "string" } },
                        for_learning_style: { type: "array", items: { type: "string" } }
                    }
                },
                motivation: { type: "string" }
            },
            required: ["getting_started", "success_indicators", "motivation"]
        };

        const request = await this.intelligenceAdapter.core.request({
            method: 'llm/completion',
            params: {
                system,
                user,
                schema,
                max_tokens: 1500,
                temperature: 0.6
            }
        });

        return request;
    }

    async adaptTaskDifficulty(task, learnerPerformance, context = {}) {
        const system = "You are a learning adaptation specialist who adjusts task difficulty based on learner performance.";
        const user = `Adapt this task based on learner performance:

**Original Task**: ${task.title}
**Description**: ${task.description}
**Current Difficulty**: ${task.difficulty}/5

**Learner Performance**:
${JSON.stringify(learnerPerformance, null, 2)}

**Adaptation Requirements**:
1. If learner is struggling: simplify the task or break it into smaller steps
2. If learner is excelling: add complexity or advanced challenges
3. Maintain the core learning objective
4. Ensure the adapted task is still meaningful and engaging
5. Provide rationale for the adaptation`;

        const schema = {
            type: "object",
            properties: {
                adaptation_type: { 
                    type: "string", 
                    enum: ["simplify", "maintain", "enhance", "restructure"] 
                },
                adapted_task: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        difficulty: { type: "integer", minimum: 1, maximum: 5 },
                        estimated_time: { type: "string" },
                        success_criteria: { type: "array", items: { type: "string" } },
                        additional_resources: { type: "array", items: { type: "string" } }
                    }
                },
                rationale: { type: "string" },
                coaching_notes: { type: "array", items: { type: "string" } }
            },
            required: ["adaptation_type", "adapted_task", "rationale"]
        };

        const request = await this.intelligenceAdapter.core.request({
            method: 'llm/completion',
            params: {
                system,
                user,
                schema,
                max_tokens: 2000,
                temperature: 0.5
            }
        });

        return request;
    }
}

/**
 * Progress tracking and adaptive pacing
 */
export class AdaptivePacingManager {
    constructor() {
        this.intelligenceAdapter = new ForestIntelligenceAdapter();
    }

    async analyzeProgressAndAdapt(completedTasks, currentTask, overallGoal, context = {}) {
        const system = "You are a learning pace analyst who optimizes learning progression based on performance data.";
        const user = `Analyze learning progress and recommend pacing adjustments:

**Overall Goal**: ${overallGoal}
**Current Task**: ${currentTask.title}

**Completed Tasks Summary**:
${completedTasks.map(task => 
    `- ${task.title} (${task.completion_time || 'unknown time'}, quality: ${task.quality_score || 'not rated'}/5)`
).join('\n')}

**Context**: ${JSON.stringify(context, null, 2)}

**Analysis Requirements**:
1. Identify learning velocity and patterns
2. Assess comprehension vs speed balance
3. Recommend pacing adjustments (faster/slower/maintain)
4. Suggest focus areas for improvement
5. Predict optimal timeline for goal completion
6. Identify any concerning patterns or blockers`;

        const schema = {
            type: "object",
            properties: {
                progress_analysis: {
                    type: "object",
                    properties: {
                        learning_velocity: { type: "string", enum: ["slow", "moderate", "fast", "variable"] },
                        comprehension_quality: { type: "number", minimum: 1, maximum: 5 },
                        consistency: { type: "string", enum: ["low", "moderate", "high"] },
                        engagement_level: { type: "string", enum: ["low", "moderate", "high"] }
                    }
                },
                pacing_recommendation: {
                    type: "object",
                    properties: {
                        adjustment: { type: "string", enum: ["accelerate", "maintain", "decelerate", "restructure"] },
                        rationale: { type: "string" },
                        specific_changes: { type: "array", items: { type: "string" } }
                    }
                },
                focus_areas: { type: "array", items: { type: "string" } },
                timeline_prediction: {
                    type: "object",
                    properties: {
                        estimated_completion: { type: "string" },
                        confidence_level: { type: "string", enum: ["low", "moderate", "high"] },
                        key_milestones: { type: "array", items: { type: "string" } }
                    }
                },
                intervention_recommendations: { type: "array", items: { type: "string" } }
            },
            required: ["progress_analysis", "pacing_recommendation", "timeline_prediction"]
        };

        const request = await this.intelligenceAdapter.core.request({
            method: 'llm/completion',
            params: {
                system,
                user,
                schema,
                max_tokens: 2500,
                temperature: 0.4
            }
        });

        return request;
    }
}

/**
 * Utility functions for domain-agnostic task management
 */
export class TaskGenerationUtils {
    static generateTaskId(title, phase = '') {
        const timestamp = Date.now().toString(36);
        const titleSlug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 20);
        const phaseSlug = phase ? phase.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 10) + '-' : '';
        return `${phaseSlug}${titleSlug}-${timestamp}`;
    }

    static estimateTaskTime(description, complexity, domainType = 'general') {
        const baseMinutes = {
            1: 30, 2: 60, 3: 120, 4: 240, 5: 480
        };
        
        const domainMultipliers = {
            technical: 1.3,
            creative: 1.1,
            academic: 1.4,
            business: 0.9,
            skill_based: 1.2,
            lifestyle: 0.8
        };
        
        const base = baseMinutes[complexity] || 120;
        const multiplier = domainMultipliers[domainType] || 1.0;
        
        const totalMinutes = Math.round(base * multiplier);
        
        if (totalMinutes < 60) return `${totalMinutes} minutes`;
        if (totalMinutes < 480) return `${Math.round(totalMinutes / 60)} hours`;
        return `${Math.round(totalMinutes / 480)} days`;
    }

    static validateTaskSequence(tasks) {
        const validation = {
            isValid: true,
            issues: [],
            suggestions: []
        };

        // Check for logical progression
        if (tasks.length < 3) {
            validation.issues.push('Task sequence too short for meaningful learning progression');
            validation.isValid = false;
        }

        // Check difficulty progression
        const difficulties = tasks.map(t => t.difficulty || 1);
        const hasProgression = difficulties.some((diff, i) => i > 0 && diff > difficulties[i-1]);
        if (!hasProgression) {
            validation.suggestions.push('Consider including some tasks with increasing difficulty');
        }

        // Check for task type variety
        const types = [...new Set(tasks.map(t => t.type))];
        if (types.length < 2) {
            validation.suggestions.push('Include variety in task types (learning, practice, project, etc.)');
        }

        return validation;
    }
}

export default {
    DomainAnalyzer,
    DomainAgnosticTaskGenerator,
    AdaptivePacingManager,
    TaskGenerationUtils
};
