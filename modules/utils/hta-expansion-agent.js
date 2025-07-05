/**
 * HTA Expansion Agent
 * ----------------------------------------------------
 * Monitors the active project's HTA tree and automatically
 * expands / regenerates it when certain conditions are met.
 *
 * Triggers:
 *   • Periodic timer (via BackgroundProcessor)
 *   • Optional EventBus events (e.g. task completion, branch completion)
 *
 * Dependencies are passed in via constructor to avoid tight coupling
 * with global singletons.
 */

import { bus as globalEventBus } from './event-bus.js';

export class HTAExpansionAgent {
  /**
   * @param {Object} params
   * @param {*} params.htaCore             HTACore instance (required)
   * @param {*} params.projectManagement   ProjectManagement instance (required)
   * @param {*} params.eventBus            EventBus (singleton) instance (optional – defaults to global bus)
   * @param {*} params.backgroundProcessor BackgroundProcessor instance (required)
   * @param {Object} [params.options]      Configurable behaviour (intervalMs, minAvailableTasks, debug)
   */
  constructor({ htaCore, projectManagement, eventBus = globalEventBus, backgroundProcessor, options = {} }) {
    if (!htaCore || !projectManagement || !backgroundProcessor) {
      throw new Error('[HTAExpansionAgent] Missing required dependencies');
    }

    this.htaCore = htaCore;
    this.projectManagement = projectManagement;
    this.eventBus = eventBus;
    this.backgroundProcessor = backgroundProcessor;

    // Configurable thresholds
    this.intervalMs = options.intervalMs ?? 5 * 60 * 1000; // default 5 minutes
    this.minAvailableTasks = options.minAvailableTasks ?? 3; // regenerate when < 3 available tasks
    this.debug = options.debug ?? false;

    this.taskName = 'hta-expansion-check';
    this.isStarted = false;

    // Bind methods
    this.runCheck = this.runCheck.bind(this);
  }

  /**
   * Start monitoring (idempotent).
   */
  start() {
    if (this.isStarted) return;

    // Schedule periodic background task
    this.backgroundProcessor.addTask(this.taskName, this.runCheck, this.intervalMs);

    // Subscribe to relevant events for immediate checks
    if (this.eventBus && this.eventBus.on) {
      this.eventBus.on('task_completed', this.runCheck, 'hta-expansion-agent');
      this.eventBus.on('hta_tree_updated', this.runCheck, 'hta-expansion-agent');
    }

    this.isStarted = true;
    if (this.debug) console.error('[HTAExpansionAgent] Started');
  }

  /**
   * Stop monitoring and remove listeners.
   */
  stop() {
    if (!this.isStarted) return;

    // Remove periodic task
    this.backgroundProcessor.removeTask(this.taskName);

    // Remove event listeners
    if (this.eventBus && this.eventBus.off) {
      this.eventBus.off('task_completed', 'hta-expansion-agent');
      this.eventBus.off('hta_tree_updated', 'hta-expansion-agent');
    }

    this.isStarted = false;
    if (this.debug) console.error('[HTAExpansionAgent] Stopped');
  }

  /**
   * Core logic executed periodically or via events.
   */
  async runCheck() {
    try {
      const activeProject = await this.projectManagement.getActiveProject();
      if (!activeProject || activeProject.error) {
        if (this.debug) console.error('[HTAExpansionAgent] No active project – skipping check');
        return;
      }

      const projectId = activeProject.project_id;
      const pathName = activeProject.project_config?.activePath || 'general';

      const htaData = await this.htaCore.loadPathHTA(projectId, pathName);
      if (!htaData) {
        if (this.debug) console.error('[HTAExpansionAgent] No HTA data yet – skipping');
        return;
      }

      const availableTasks = (htaData.frontierNodes || []).filter(n => !n.completed).length;

      if (this.debug) {
        console.error(`[HTAExpansionAgent] Available tasks for ${projectId}/${pathName}: ${availableTasks}`);
      }

      if (availableTasks < this.minAvailableTasks) {
        if (this.debug) console.error('[HTAExpansionAgent] Threshold reached – triggering HTA expansion');

        // Build (expand) HTA tree. We pass minimal args – HTACore will reuse existing goal/context.
        await this.htaCore.buildHTATree({ path_name: pathName });

        // Emit event for other modules
        this.eventBus?.emit?.('hta_tree_expanded', { projectId, pathName, triggeredBy: 'expansion-agent' }, 'hta-expansion-agent');
      }
    } catch (error) {
      console.error('[HTAExpansionAgent] Expansion check failed:', error.message);
    }
  }
}

// Export default for convenience
export default HTAExpansionAgent;
