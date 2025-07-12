/**
 * Vector Database and Embedding Service Configuration
 *
 * - provider: 'qdrant' | 'localjson' | 'chroma' | 'sqlitevec'
 * - qdrant: { url, apiKey, collection, dimension }
 * - embedding: { provider, model, cacheDir, batchSize }
 * - fallbackProvider: used if main provider fails
 */

export default {
  // Use SQLite as primary provider with LocalJSON as fallback
  provider: process.env.FOREST_VECTOR_PROVIDER || 'sqlitevec',
  fallbackProvider: 'localjson',
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || '',
    collection: process.env.QDRANT_COLLECTION || 'forest_vectors',
    dimension: parseInt(process.env.QDRANT_DIMENSION, 10) || 1536
  },
  localjson: {
    baseDir: process.env.LOCALJSON_DIR || '.forest-vectors'
  },
  embedding: {
    provider: process.env.FOREST_EMBEDDING_PROVIDER || 'deterministic',
    model: process.env.FOREST_EMBEDDING_MODEL || 'deterministic-hash',
    cacheDir: process.env.EMBEDDING_CACHE_DIR || '.embedding-cache',
    batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE, 10) || 32
  },
  chroma: {
    // Use embedded mode by default (no server required)
    // Use embedded mode by default; if CHROMA_URL is provided we switch to server mode.
    url: process.env.CHROMA_URL || '',
    path: process.env.CHROMA_PATH || '.chromadb',
    collection: process.env.CHROMA_COLLECTION || 'forest_vectors',
    dimension: parseInt(process.env.CHROMA_DIMENSION, 10) || 1536
  },
  sqlitevec: {
    dbPath: process.env.SQLITEVEC_PATH || 'forest_vectors.sqlite',
    dimension: parseInt(process.env.SQLITEVEC_DIMENSION, 10) || 1536
  }
}; 