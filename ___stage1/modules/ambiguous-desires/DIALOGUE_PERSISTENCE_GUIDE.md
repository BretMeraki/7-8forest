# SQLite Dialogue Persistence System

## Overview

The SQLite Dialogue Persistence System replaces the previous file-based storage with a robust SQLite database for storing clarification dialogue sessions. This ensures that dialogue sessions persist across server restarts and provides better data integrity and query performance.

## Architecture

### Components

1. **DialoguePersistence** - Main SQLite persistence layer
2. **ClarificationDialogue** - Updated to use SQLite persistence
3. **SQLite Database** - Stores dialogue sessions with proper indexing

### Database Schema

```sql
CREATE TABLE dialogue_sessions (
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
```

### Indexes

- `idx_dialogue_sessions_project_id` - For efficient project-based queries
- `idx_dialogue_sessions_status` - For filtering by status (active/completed)
- `idx_dialogue_sessions_project_status` - Composite index for project + status queries

## Key Features

### 1. Persistent Storage
- All dialogue sessions are stored in SQLite database
- Survives server restarts and crashes
- Data integrity with ACID transactions

### 2. Session Management
- Track dialogue ID and state across function calls
- Resume active dialogues on server startup
- Proper cleanup of completed dialogues

### 3. Multi-step Process Support
- Maintain conversation context across multiple rounds
- Store user responses and system questions
- Track theme evolution and confidence levels

### 4. Performance Optimization
- Indexed queries for fast retrieval
- In-memory caching for active sessions
- Lazy database initialization

## Usage

### Basic Operations

```javascript
import { DialoguePersistence } from './dialogue-persistence.js';

const persistence = new DialoguePersistence();
await persistence.initializeDatabase();

// Save a dialogue session
await persistence.saveDialogueSession(session);

// Load a dialogue session
const session = await persistence.loadDialogueSession(dialogueId);

// Get active dialogues for a project
const activeDialogues = await persistence.getActiveDialogues(projectId);

// Complete a dialogue
await persistence.completeDialogueSession(dialogueId, refinedGoal, confidence);
```

### Integration with ClarificationDialogue

The `ClarificationDialogue` class automatically uses the SQLite persistence:

```javascript
import { ClarificationDialogue } from './clarification-dialogue.js';

const dialogue = new ClarificationDialogue(dataPersistence, projectManagement, vectorStore);

// Resume active dialogues on server startup
await dialogue.resumeActiveDialogues(projectId);

// Start a new dialogue (automatically persisted)
const result = await dialogue.startClarificationDialogue({
  ambiguous_goal: 'learn programming',
  context: 'beginner level',
  project_id: 'my_project'
});

// Continue dialogue (automatically persisted)
const continuation = await dialogue.continueDialogue({
  dialogue_id: result.dialogue_id,
  response: 'I want to build web applications'
});
```

## Migration from File-based Storage

### Backward Compatibility
- The system maintains compatibility with existing file-based sessions
- Old sessions will gradually be migrated as they're accessed
- No manual migration required

### Data Structure Mapping
- JSON files → SQLite rows
- File names → dialogue IDs
- Nested objects → JSON strings in database

## Error Handling

### Database Connection Issues
- Automatic retry with exponential backoff
- Graceful degradation to in-memory storage
- Clear error messages for troubleshooting

### Session Recovery
- Automatic recovery of corrupted sessions
- Validation of loaded data structures
- Fallback to default values for missing fields

## Performance Considerations

### Memory Usage
- Active sessions cached in memory for fast access
- LRU eviction for memory management
- Periodic cleanup of completed sessions

### Database Size
- Automatic cleanup of old completed sessions
- Configurable retention policies
- VACUUM operations for database optimization

## Testing

### Test Suite
Run the comprehensive test suite to verify functionality:

```bash
node ___stage1/modules/ambiguous-desires/test-dialogue-persistence.js
```

### Test Coverage
- Database initialization and schema creation
- Session CRUD operations
- Active dialogue retrieval
- Session completion and updates
- Server restart simulation
- Integration with ClarificationDialogue

## Configuration

### Environment Variables
- `FOREST_DATA_DIR` - Directory for SQLite database (default: `~/.forest-data`)
- Database file: `dialogues.db`

### Database Settings
- SQLite WAL mode for better concurrency
- Foreign key constraints enabled
- Auto-vacuum for maintenance

## Troubleshooting

### Common Issues

1. **Database locked errors**
   - Check for orphaned connections
   - Ensure proper connection cleanup
   - Use connection pooling if needed

2. **Schema migration errors**
   - Backup database before updates
   - Check SQLite version compatibility
   - Verify disk space availability

3. **Session not found errors**
   - Check dialogue ID format
   - Verify project ID matches
   - Ensure session hasn't been completed

### Debug Commands

```javascript
// Get dialogue statistics
const stats = await persistence.getDialogueStats(projectId);

// List all active dialogues
const activeDialogues = await persistence.getActiveDialogues();

// Check database integrity
await persistence.db.exec('PRAGMA integrity_check');
```

## Future Enhancements

### Planned Features
- Dialogue session expiration policies
- Bulk operations for session management
- Cross-project dialogue search
- Analytics and reporting capabilities
- Real-time session synchronization

### Optimization Opportunities
- Connection pooling for high concurrency
- Read replicas for scalability
- Compression for large response data
- Automated backup and recovery

## Security Considerations

### Data Protection
- No sensitive data stored in plain text
- SQLite file permissions restricted
- Input validation and sanitization
- SQL injection prevention

### Access Control
- Project-based access restrictions
- User session isolation
- Audit trail for data modifications

---

This SQLite-based dialogue persistence system provides a robust foundation for maintaining clarification dialogue state across server restarts while ensuring data integrity and performance.
