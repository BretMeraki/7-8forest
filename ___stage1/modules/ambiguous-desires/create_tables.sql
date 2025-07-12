CREATE TABLE IF NOT EXISTS dialogue_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    original_goal TEXT,
    context TEXT,
    status TEXT,
    started_at TEXT,
    completed_at TEXT,
    responses TEXT,
    refined_goal TEXT,
    confidence REAL,
    goal_evolution TEXT
);
