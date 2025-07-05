# Forest MCP Server – Production Guide

A minimal checklist for deploying the Stage-1 consolidated Forest MCP server with vector intelligence and Claude context builder.

---

## Prerequisites

* **Node.js ≥ 20** (ESM enabled)
* A writable data directory (defaults to `~/.forest-data` or as set in your MCP config)
* Optional: running Qdrant instance (if not, the built-in LocalJSONProvider is used)

## Installation

```bash
# clone repository then …
npm install            # installs dependencies defined in package.json
```

> The codebase is pure ESM – no Babel / TypeScript build step required.

## Configuration

Environment variables (all optional):

| Variable      | Purpose                                  | Default |
|---------------|------------------------------------------|---------|
| `LOG_LEVEL`   | pino log level (`trace`-`fatal`)         | `info`  |
| `DEBUG_CONTEXT` | Dumps hidden Claude context to stderr  | `false` |
| `FOREST_VECTOR_PROVIDER` | `qdrant` / `local`            | `local` |
| `FOREST_DATA_DIR`         | Path for persisted data       | `~/.forest-data` |

## Running the server

```bash
npm start            # runs node ___stage1/forest-mcp-server.js
```

On startup you should see:
```
🚀 Initializing Stage1 Core Server…
📊 Initializing vector intelligence…
✅ Vector intelligence ready
✅ Stage1 Core Server initialized successfully
```

## Health check

Call the MCP tool `get_health_status_forest` (no args). Response example:
```json
{
  "status": "ok",
  "dataDirWritable": true,
  "vectorStoreHealthy": true,
  "memory": { "rss": 12345678, … },
  "timestamp": "2025-07-01T20:28:00.000Z"
}
```

## Logs

Structured JSON logs are emitted via **pino** to stdout. Adjust `LOG_LEVEL` as needed. Example entry:
```json
{"level":30,"time":1719880080000,"msg":"[Stage1CoreServer] Tool call completed","tool":"get_next_task_forest","duration_ms":42}
```

## Testing

Only tests under `tests/` are executed:
```bash
npm test
```

### Adding a new test
Create a `*.test.js` file inside `tests/`. Use Node’s native test runner (`node --test`).

## Deployment tips

* Run under a process manager (systemd, pm2, etc.) to auto-restart on failure.
* Mount your data directory and, if using Qdrant, ensure the Qdrant URL & key are reachable via env vars.
* Monitor logs for `status:error` payloads returned by `get_health_status_forest`.

---

Happy shipping! 🌲🤖
