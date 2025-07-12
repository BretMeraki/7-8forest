/**
 * SQLite-based dialogue persistence system
 * Stores clarification dialogue sessions in SQLite database
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import os from 'os';

const dataDirGlobal = process.env.FOREST_DATA_DIR || path.join(os.homedir(), '.forest-data');

export class DialoguePersistence {
  constructor(dataDir) {
    this.dataDir = dataDir || dataDirGlobal;
    this.db = null;
    this.dbPath = path.join(this.dataDir, 'dialogues.db');
  }

  async initializeDatabase() {
    try {
      // Ensure data directory exists
      const fs = await import('fs');
      await fs.promises.mkdir(this.dataDir, { recursive: true });

      // Open database connection
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Create tables if they don't exist
      await this.createTables();
      
      console.log('Dialogue persistence database initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize dialogue persistence database:', error);
      throw error;
    }
  }

  async createTables() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS dialogue_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        original_goal TEXT NOT NULL,
        context TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        started_at TEXT NOT NULL,
        completed_at TEXT,
        current_round INTEGER DEFAULT 1,
        responses TEXT,
        uncertainty_map TEXT,
        confidence_levels TEXT,
        refined_goal TEXT,
        final_confidence REAL,
        goal_evolution TEXT,
        last_question TEXT,
        last_updated TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.db.exec(createTableSQL);
    
    // Create indexes for better performance
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_dialogue_sessions_project_id 
      ON dialogue_sessions(project_id);
    `);
    
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_dialogue_sessions_status 
      ON dialogue_sessions(status);
    `);
    
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_dialogue_sessions_project_status 
      ON dialogue_sessions(project_id, status);
    `);
  }

  async ensureConnected() {
    if (!this.db) {
      await this.initializeDatabase();
    }
    return this.db;
  }

  async saveDialogueSession(session) {
    const db = await this.ensureConnected();
    
    const sessionData = {
      id: session.id,
      project_id: session.projectId,
      original_goal: session.originalGoal,
      context: session.context || '',
      status: session.status,
      started_at: session.startedAt,
      completed_at: session.completedAt || null,
      current_round: session.currentRound || 1,
      responses: JSON.stringify(session.responses || []),
      uncertainty_map: JSON.stringify(session.uncertaintyMap || {}),
      confidence_levels: JSON.stringify(session.confidenceLevels || {}),
      refined_goal: session.refinedGoal ? JSON.stringify(session.refinedGoal) : null,
      final_confidence: session.finalConfidence || null,
      goal_evolution: JSON.stringify(session.goalEvolution || []),
      last_question: session.lastQuestion || null,
      last_updated: new Date().toISOString()
    };

    try {
      await db.run(`
        INSERT OR REPLACE INTO dialogue_sessions (
          id, project_id, original_goal, context, status, started_at, completed_at,
          current_round, responses, uncertainty_map, confidence_levels, refined_goal,
          final_confidence, goal_evolution, last_question, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        sessionData.id,
        sessionData.project_id,
        sessionData.original_goal,
        sessionData.context,
        sessionData.status,
        sessionData.started_at,
        sessionData.completed_at,
        sessionData.current_round,
        sessionData.responses,
        sessionData.uncertainty_map,
        sessionData.confidence_levels,
        sessionData.refined_goal,
        sessionData.final_confidence,
        sessionData.goal_evolution,
        sessionData.last_question,
        sessionData.last_updated
      ]);

      return true;
    } catch (error) {
      console.error('Failed to save dialogue session:', error);
      throw error;
    }
  }

  async loadDialogueSession(dialogueId) {
    const db = await this.ensureConnected();
    
    try {
      const row = await db.get(
        'SELECT * FROM dialogue_sessions WHERE id = ?',
        [dialogueId]
      );

      if (!row) {
        return null;
      }

      // Parse JSON fields back to objects
      const session = {
        id: row.id,
        projectId: row.project_id,
        originalGoal: row.original_goal,
        context: row.context,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        currentRound: row.current_round,
        responses: JSON.parse(row.responses || '[]'),
        uncertaintyMap: JSON.parse(row.uncertainty_map || '{}'),
        confidenceLevels: JSON.parse(row.confidence_levels || '{}'),
        refinedGoal: row.refined_goal ? JSON.parse(row.refined_goal) : null,
        finalConfidence: row.final_confidence,
        goalEvolution: JSON.parse(row.goal_evolution || '[]'),
        lastQuestion: row.last_question,
        lastUpdated: row.last_updated
      };

      return session;
    } catch (error) {
      console.error('Failed to load dialogue session:', error);
      throw error;
    }
  }

  async getActiveDialogues(projectId) {
    const db = await this.ensureConnected();
    
    try {
      const query = projectId 
        ? 'SELECT * FROM dialogue_sessions WHERE project_id = ? AND status = "active" ORDER BY started_at DESC'
        : 'SELECT * FROM dialogue_sessions WHERE status = "active" ORDER BY started_at DESC';
      
      const params = projectId ? [projectId] : [];
      const rows = await db.all(query, params);

      return rows.map(row => ({
        id: row.id,
        projectId: row.project_id,
        originalGoal: row.original_goal,
        context: row.context,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        currentRound: row.current_round,
        responses: JSON.parse(row.responses || '[]'),
        uncertaintyMap: JSON.parse(row.uncertainty_map || '{}'),
        confidenceLevels: JSON.parse(row.confidence_levels || '{}'),
        refinedGoal: row.refined_goal ? JSON.parse(row.refined_goal) : null,
        finalConfidence: row.final_confidence,
        goalEvolution: JSON.parse(row.goal_evolution || '[]'),
        lastQuestion: row.last_question,
        lastUpdated: row.last_updated
      }));
    } catch (error) {
      console.error('Failed to get active dialogues:', error);
      throw error;
    }
  }

  async getDialoguesByProject(projectId) {
    const db = await this.ensureConnected();
    
    try {
      const rows = await db.all(
        'SELECT * FROM dialogue_sessions WHERE project_id = ? ORDER BY started_at DESC',
        [projectId]
      );

      return rows.map(row => ({
        id: row.id,
        projectId: row.project_id,
        originalGoal: row.original_goal,
        context: row.context,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        currentRound: row.current_round,
        responses: JSON.parse(row.responses || '[]'),
        uncertaintyMap: JSON.parse(row.uncertainty_map || '{}'),
        confidenceLevels: JSON.parse(row.confidence_levels || '{}'),
        refinedGoal: row.refined_goal ? JSON.parse(row.refined_goal) : null,
        finalConfidence: row.final_confidence,
        goalEvolution: JSON.parse(row.goal_evolution || '[]'),
        lastQuestion: row.last_question,
        lastUpdated: row.last_updated
      }));
    } catch (error) {
      console.error('Failed to get dialogues by project:', error);
      throw error;
    }
  }

  async deleteDialogueSession(dialogueId) {
    const db = await this.ensureConnected();
    
    try {
      await db.run(
        'DELETE FROM dialogue_sessions WHERE id = ?',
        [dialogueId]
      );
      return true;
    } catch (error) {
      console.error('Failed to delete dialogue session:', error);
      throw error;
    }
  }

  async completeDialogueSession(dialogueId, refinedGoal, finalConfidence) {
    const db = await this.ensureConnected();
    
    try {
      await db.run(`
        UPDATE dialogue_sessions 
        SET status = 'completed', 
            completed_at = ?, 
            refined_goal = ?, 
            final_confidence = ?,
            last_updated = ?
        WHERE id = ?
      `, [
        new Date().toISOString(),
        JSON.stringify(refinedGoal),
        finalConfidence,
        new Date().toISOString(),
        dialogueId
      ]);
      
      return true;
    } catch (error) {
      console.error('Failed to complete dialogue session:', error);
      throw error;
    }
  }

  async updateDialogueSession(dialogueId, updates) {
    const db = await this.ensureConnected();
    
    try {
      const updateFields = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (key === 'responses' || key === 'uncertaintyMap' || key === 'confidenceLevels' || key === 'goalEvolution') {
          updateFields.push(`${key} = ?`);
          values.push(JSON.stringify(updates[key]));
        } else {
          updateFields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });
      
      updateFields.push('last_updated = ?');
      values.push(new Date().toISOString());
      values.push(dialogueId);
      
      const query = `UPDATE dialogue_sessions SET ${updateFields.join(', ')} WHERE id = ?`;
      await db.run(query, values);
      
      return true;
    } catch (error) {
      console.error('Failed to update dialogue session:', error);
      throw error;
    }
  }

  async getDialogueStats(projectId = null) {
    const db = await this.ensureConnected();
    
    try {
      let query = `
        SELECT 
          status,
          COUNT(*) as count,
          AVG(final_confidence) as avg_confidence
        FROM dialogue_sessions
      `;
      
      const params = [];
      if (projectId) {
        query += ' WHERE project_id = ?';
        params.push(projectId);
      }
      
      query += ' GROUP BY status';
      
      const rows = await db.all(query, params);
      
      const stats = {
        total: 0,
        active: 0,
        completed: 0,
        avgConfidence: 0
      };
      
      rows.forEach(row => {
        stats.total += row.count;
        stats[row.status] = row.count;
        if (row.status === 'completed' && row.avg_confidence) {
          stats.avgConfidence = row.avg_confidence;
        }
      });
      
      return stats;
    } catch (error) {
      console.error('Failed to get dialogue stats:', error);
      throw error;
    }
  }

  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}
