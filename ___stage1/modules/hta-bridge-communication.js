/**
 * HTA Bridge Communication Module
 * Handles external HTA Analysis Server connections
 */

import WebSocket from 'ws';
import { CONSTANTS } from './constants.js';

export class HTABridgeCommunication {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.connectionPromise = null;
    this.lastError = null;
    this._sequenceId = 0;
  }

  async connect() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.isConnected) {
      return { success: true, status: 'already_connected' };
    }

    console.log('[HTABridge] Attempting to connect to HTA Analysis Server...');

    this.connectionPromise = new Promise((resolve) => {
      try {
        this.ws = new WebSocket(CONSTANTS.HTA_SERVER_URL);

        const timeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.terminate();
            this.isConnected = false;
            this.lastError = 'Connection timeout';
            console.warn('[HTABridge] Connection timeout');
            resolve({ success: false, error: 'Connection timeout' });
          }
        }, CONSTANTS.HTA_CONNECTION_TIMEOUT);

        this.ws.on('open', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.lastError = null;
          console.log('[HTABridge] Connected to HTA Analysis Server');
          resolve({ success: true, status: 'connected' });
        });

        this.ws.on('error', (error) => {
          clearTimeout(timeout);
          this.isConnected = false;
          this.lastError = error.message;
          console.warn('[HTABridge] Connection failed:', error.message);
          resolve({ success: false, error: error.message });
        });

        this.ws.on('close', () => {
          this.isConnected = false;
          console.log('[HTABridge] Connection closed');
        });
      } catch (error) {
        this.isConnected = false;
        this.lastError = error.message;
        console.warn('[HTABridge] Connection error:', error.message);
        resolve({ success: false, error: error.message });
      }
    });

    const result = await this.connectionPromise;
    this.connectionPromise = null;
    return result;
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.connectionPromise = null;
    console.log('[HTABridge] Disconnected from HTA Analysis Server');
  }

  async sendRequest(type, payload) {
    if (!this.isConnected) {
      const connectResult = await this.connect();
      if (!connectResult.success) {
        throw new Error(`Cannot connect to HTA server: ${connectResult.error}`);
      }
    }

    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const sequenceId = ++this._sequenceId;
      const message = {
        id: sequenceId,
        type,
        payload,
        timestamp: Date.now(),
      };

      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, CONSTANTS.HTA_REQUEST_TIMEOUT);

      const handleResponse = (data) => {
        try {
          const response = JSON.parse(data);
          if (response.id === sequenceId) {
            clearTimeout(timeout);
            this.ws.off('message', handleResponse);
            
            if (response.success) {
              resolve(response.data);
            } else {
              reject(new Error(response.error || 'HTA server error'));
            }
          }
        } catch (parseError) {
          // Ignore non-JSON messages or messages for other requests
        }
      };

      this.ws.on('message', handleResponse);
      this.ws.send(JSON.stringify(message));
    });
  }

  async analyzeGoal(goal, constraints = {}) {
    try {
      const response = await this.sendRequest('analyze_goal', {
        goal,
        constraints,
        options: {
          include_complexity: true,
          include_branches: true,
          include_tasks: true,
        },
      });
      return response;
    } catch (error) {
      console.warn('[HTABridge] Goal analysis failed:', error.message);
      throw error;
    }
  }

  async generateStrategicBranches(goal, complexity, userPreferences = {}) {
    try {
      const response = await this.sendRequest('generate_branches', {
        goal,
        complexity,
        preferences: userPreferences,
        phases: ['foundation', 'research', 'capability', 'implementation', 'mastery'],
      });
      return response;
    } catch (error) {
      console.warn('[HTABridge] Branch generation failed:', error.message);
      throw error;
    }
  }

  async generateTasks(branchData, userContext = {}) {
    try {
      const response = await this.sendRequest('generate_tasks', {
        branches: branchData,
        context: userContext,
        options: {
          granularity: 'detailed',
          include_prerequisites: true,
          include_estimates: true,
        },
      });
      return response;
    } catch (error) {
      console.warn('[HTABridge] Task generation failed:', error.message);
      throw error;
    }
  }

  async evolveStrategy(currentHTA, evolutionData) {
    try {
      const response = await this.sendRequest('evolve_strategy', {
        current_hta: currentHTA,
        evolution_data: evolutionData,
        options: {
          preserve_progress: true,
          adapt_difficulty: true,
          maintain_coherence: true,
        },
      });
      return response;
    } catch (error) {
      console.warn('[HTABridge] Strategy evolution failed:', error.message);
      throw error;
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      lastError: this.lastError,
      serverUrl: CONSTANTS.HTA_SERVER_URL,
    };
  }

  isHealthy() {
    return this.isConnected && !this.lastError;
  }
}
