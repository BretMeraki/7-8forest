# 🟢 ChromaDB Vector Storage Setup Guide

## Current Configuration Status

✅ **ChromaDB Package Installed**: `chromadb@3.0.6`  
✅ **ChromaDB Provider Implementation**: Fully implemented and ready  
✅ **Fallback Mechanism**: LocalJSON provider as reliable fallback  
⚠️  **Current Mode**: LocalJSON primary (ChromaDB requires server)  

## ChromaDB v3.x Architecture

ChromaDB v3.x is designed as a **client-server architecture** and does not include an embedded mode like some other vector databases. This means:

- **Client**: The ChromaDB JavaScript client (installed in Forest)
- **Server**: Separate ChromaDB server process that must be running
- **Communication**: Client connects to server via HTTP API

## Setup Options

### Option 1: Docker ChromaDB Server (Recommended)

The easiest way to run ChromaDB server:

```bash
# Pull and run ChromaDB server
docker run -p 8000:8000 chromadb/chroma:latest

# Or with persistent storage
docker run -p 8000:8000 -v ./chroma-data:/chroma/chroma chromadb/chroma:latest
```

### Option 2: Python ChromaDB Server

If you prefer running ChromaDB via Python:

```bash
# Install ChromaDB Python package
pip install chromadb

# Run the server
chroma run --host 0.0.0.0 --port 8000
```

### Option 3: Docker Compose (Production)

For production deployments, use Docker Compose:

```yaml
# docker-compose.yml
version: '3.8'
services:
  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - ./chroma-data:/chroma/chroma
    environment:
      - CHROMA_SERVER_CORS_ALLOW_ORIGINS=*
    restart: unless-stopped
```

## Forest Configuration

### Environment Variables

Set these environment variables to use ChromaDB as primary provider:

```bash
# Use ChromaDB as primary vector provider
export FOREST_VECTOR_PROVIDER=chroma

# ChromaDB server configuration
export CHROMA_URL=http://localhost:8000
export CHROMA_COLLECTION=forest_vectors
export CHROMA_DIMENSION=1536
```

### Automatic Configuration

Add to your `.env` file or shell profile:

```env
FOREST_VECTOR_PROVIDER=chroma
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION=forest_vectors
CHROMA_DIMENSION=1536
```

## Verification

### 1. Test ChromaDB Server Connection

```bash
# Test if ChromaDB server is running
curl http://localhost:8000/api/v1/heartbeat
```

Expected response: `OK`

### 2. Run Forest ChromaDB Tests

```bash
# Set environment variable and run tests
FOREST_VECTOR_PROVIDER=chroma node test-chromadb-setup.js
```

### 3. Verify in Forest System

```bash
# Start Forest with ChromaDB
FOREST_VECTOR_PROVIDER=chroma node forest-mcp-server.js
```

Check the logs for:
```
[HTA-Vector] Initializing ChromaDB as primary provider
[HTA-Vector] Provider initialized: ChromaDBProvider
```

## Current Implementation Features

### ✅ Project Isolation
- Vectors are namespaced by project: `${projectId}:type:id`
- Complete isolation between different Forest projects
- Safe project deletion without affecting other projects

### ✅ Vector Operations
- **Upsert**: Store vectors with metadata
- **Query**: Semantic similarity search with configurable threshold
- **Delete**: Remove individual vectors or entire namespaces
- **List**: Retrieve vectors by prefix (project-scoped)

### ✅ Fallback Mechanism
- Automatic fallback to LocalJSON if ChromaDB unavailable
- No data loss during provider transitions
- Transparent operation for users

### ✅ Performance Features
- Configurable vector dimensions (default: 1536)
- Similarity threshold filtering
- Limit controls for query results
- Project-specific statistics

## Switching Between Providers

### To ChromaDB (when server is running):
```bash
export FOREST_VECTOR_PROVIDER=chroma
# Restart Forest server
```

### To LocalJSON (no server required):
```bash
export FOREST_VECTOR_PROVIDER=localjson
# Restart Forest server
```

### To Qdrant (if Qdrant server available):
```bash
export FOREST_VECTOR_PROVIDER=qdrant
export QDRANT_URL=http://localhost:6333
# Restart Forest server
```

## Production Recommendations

### For Development
- **Use LocalJSON**: No external dependencies, simple setup
- **Files stored in**: `.forest-vectors/vectors.json`

### For Production/Team Use
- **Use ChromaDB server**: Better performance, proper vector database
- **Docker deployment**: Reliable and scalable
- **Persistent storage**: Mount volumes for data persistence

### For High Performance
- **Use Qdrant**: Advanced vector database with more features
- **Dedicated server**: Better resource management
- **Clustering**: Available for large-scale deployments

## Troubleshooting

### ChromaDB Connection Issues
1. **Check server status**: `curl http://localhost:8000/api/v1/heartbeat`
2. **Verify port**: Default is 8000, check if something else is using it
3. **Check CORS**: Add `CHROMA_SERVER_CORS_ALLOW_ORIGINS=*` to server environment

### Forest Startup Issues
1. **Check logs**: Look for `[HTA-Vector]` messages in console
2. **Verify environment**: `echo $FOREST_VECTOR_PROVIDER`
3. **Test fallback**: Should automatically use LocalJSON if ChromaDB fails

### Performance Issues
1. **Vector dimensions**: Ensure consistent across all vectors
2. **Collection size**: Monitor collection growth
3. **Query thresholds**: Adjust similarity thresholds for better results

## Migration Between Providers

Forest handles provider switching gracefully:

1. **Existing data**: Preserved in current provider
2. **New data**: Stored in newly configured provider  
3. **No data loss**: Old provider data remains accessible
4. **Manual migration**: Use Forest tools to migrate data if needed

---

## Summary

🎯 **Current Status**: Forest is configured to use **LocalJSON** as the primary vector provider with **ChromaDB** fully implemented and ready to use when a server is available.

🚀 **Next Steps**: 
1. Run `docker run -p 8000:8000 chromadb/chroma:latest` to start ChromaDB server
2. Set `FOREST_VECTOR_PROVIDER=chroma` environment variable
3. Restart Forest server to use ChromaDB as primary provider

💡 **Benefits**: This approach provides the best of both worlds - immediate functionality with LocalJSON and enterprise-grade vector storage with ChromaDB when needed.
