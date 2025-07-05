# Mini PRD: Qdrant-Backed, AST-Aware HTA Vector Database for Forest MCP

## Objective
Transform the Forest MCP's HTA tree and task system into a robust, context-rich, and reliable vector database using Qdrant and advanced AST parsing, enabling seamless, intelligent, and resilient project management and AI-driven tasking.

---

## Key Requirements

### 1. Vector Database Integration
- Replace JSON-based storage with Qdrant as the default vector database for all HTA tree data, tasks, and code context.
- Ensure atomic, transactional, and concurrent-safe operations for all reads/writes.
- Provide fallback to local JSON storage if Qdrant is unavailable.

### 2. Rich AST Parsing
- Parse all relevant code (functions, classes, modules) to extract semantic structure (signatures, call graphs, dependencies, comments, etc.).
- Link AST-derived vectors to corresponding HTA nodes and tasks.
- Enable bidirectional navigation between tasks and code elements.

### 3. Embedding Service
- Use a modular embedding service to generate semantic vectors for both text (tasks, goals) and code (AST nodes).
- Support multiple embedding backends (OpenAI, local models) with caching and fallback.

### 4. Seamless MCP Integration
- Ensure all MCP tools (memory, filesystem, etc.) interact with the vector database for context retrieval and updates.
- Maintain domain-agnostic, functional, and robust code throughout.

### 5. Migration & Validation
- Provide scripts to migrate existing data to Qdrant, ingest codebase vectors, and validate data integrity.
- Ensure all data is preserved, consistent, and recoverable.

### 6. Performance & Reliability
- Support batch operations, health checks, and error handling.
- Guarantee no data loss, corruption, or race conditions in live operation.

### 7. Documentation & Observability
- Document all configuration, environment variables, and usage patterns.
- Provide clear logging, metrics, and health status for all vector operations.

---

## Success Criteria
- All HTA tree and task data is stored and retrieved from Qdrant, with no data loss or corruption.
- AST parsing enriches every node/task with deep code context, enabling smarter recommendations and context retrieval.
- The system remains domain-agnostic, robust, and easy to maintain.
- Migration and validation scripts work reliably, with clear reporting.
- Claude and all MCP tools operate seamlessly with the new architecture.

---

## Out of Scope
- Hardcoding for any specific domain or project.
- Non-functional, placeholder, or "demo-only" code.
- Any solution that does not guarantee data integrity and context awareness. 