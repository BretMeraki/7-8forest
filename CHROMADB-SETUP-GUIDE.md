# ChromaDB Setup Guide for Forest MCP

## 🎯 Current Status

✅ **Forest 7-3 Implementation**: Fully operational with vector intelligence
✅ **TaskFormatter Issue**: Resolved (added missing static method)
✅ **Data Connectivity**: Connected to your existing `.forest-data` (8 projects)
✅ **Vector Pipeline**: Working with LocalJSON provider
✅ **MCP Integration**: Ready for production use

## 🔧 Vector Provider Configuration

### Current Configuration
- **Primary Provider**: LocalJSON (fully functional)
- **Data Location**: `/Users/bretmeraki/.forest-data/vectors/`
- **Status**: ✅ Working without fallbacks

### ChromaDB Integration Options

#### Option 1: Docker ChromaDB (Recommended)

**Prerequisites**: Docker installed on your system

**Setup Commands**:
```bash
# 1. Start ChromaDB server with persistence
docker run -d --name chromadb \
  -p 8000:8000 \
  -v "/Users/bretmeraki/.forest-data/.chromadb:/chroma/chroma" \
  chromadb/chroma:latest

# 2. Verify ChromaDB is running
curl http://localhost:8000/api/v1/heartbeat

# 3. Enable ChromaDB in Forest
export FOREST_VECTOR_PROVIDER=chroma

# 4. Restart Claude Desktop to pick up the new MCP server
```

**Automatic Setup Script**:
```bash
# Use the generated startup script
bash /Users/bretmeraki/.forest-data/start-chromadb.sh
```

#### Option 2: ChromaDB Cloud

**Setup**:
```bash
# Set environment variables for ChromaDB Cloud
export FOREST_VECTOR_PROVIDER=chroma
export CHROMA_URL=https://your-cloud-instance.chromadb.app
export CHROMA_API_KEY=your_api_key

# Restart Forest MCP server
```

#### Option 3: Keep LocalJSON (Current Setup)

**Status**: ✅ Already working perfectly
- No additional setup required
- Full vector intelligence capabilities
- Persistent storage in `/Users/bretmeraki/.forest-data/vectors/`
- Performance: Good for most use cases

## 📊 Performance Comparison

| Provider | Performance | Setup Complexity | Persistence | Vector Search Quality |
|----------|-------------|------------------|-------------|---------------------|
| **LocalJSON** | Good | ✅ Ready | ✅ Yes | Good |
| **ChromaDB** | Excellent | Medium | ✅ Yes | Excellent |
| **Qdrant** | Excellent | High | ✅ Yes | Excellent |

## 🧪 Testing Your Setup

### Test Vector Intelligence
```bash
cd /Users/bretmeraki/Downloads/7-3forest-main
node test-vector-pipeline.js
```

### Test Data Connectivity
```bash
cd /Users/bretmeraki/Downloads/7-3forest-main
node test-data-connectivity.js
```

### Test ChromaDB (if using Docker)
```bash
cd /Users/bretmeraki/Downloads/7-3forest-main
# Set environment variable first
export FOREST_VECTOR_PROVIDER=chroma
node test-vector-pipeline.js
```

## 🔄 Switching Between Providers

### To ChromaDB:
```bash
export FOREST_VECTOR_PROVIDER=chroma
# Restart Claude Desktop
```

### Back to LocalJSON:
```bash
unset FOREST_VECTOR_PROVIDER
# Restart Claude Desktop
```

## 📁 Data Migration

When switching providers, your HTA data will be automatically migrated:

1. **LocalJSON → ChromaDB**: Vector embeddings are preserved and transferred
2. **ChromaDB → LocalJSON**: Vectors are exported to JSON format
3. **Data Safety**: Original HTA trees are always preserved in project directories

## 🚀 Recommended Next Steps

### For Development/Testing
**Continue with LocalJSON** - it's working perfectly and requires no additional setup.

### For Production/Heavy Use
**Upgrade to ChromaDB** when you need:
- Better vector search performance
- Large-scale vector operations (>10,000 vectors)
- Advanced similarity search features

### Upgrade Command Sequence
```bash
# 1. Install Docker (if not installed)
# 2. Start ChromaDB
docker run -d --name chromadb -p 8000:8000 \
  -v "/Users/bretmeraki/.forest-data/.chromadb:/chroma/chroma" \
  chromadb/chroma:latest

# 3. Enable ChromaDB
export FOREST_VECTOR_PROVIDER=chroma

# 4. Restart Claude Desktop

# 5. Verify the switch worked
# Use any Forest tool - it will automatically migrate your data
```

## 📋 Troubleshooting

### ChromaDB Not Starting
```bash
# Check if container exists
docker ps -a

# Remove existing container if needed
docker rm -f chromadb

# Start fresh
docker run -d --name chromadb -p 8000:8000 \
  -v "/Users/bretmeraki/.forest-data/.chromadb:/chroma/chroma" \
  chromadb/chroma:latest
```

### MCP Server Issues
```bash
# Check Forest MCP server logs
tail -f /Users/bretmeraki/.forest-data/forest-mcp.log

# Restart Claude Desktop to reload MCP server
```

### Vector Search Not Working
```bash
# Test vector pipeline
cd /Users/bretmeraki/Downloads/7-3forest-main
node test-vector-pipeline.js

# Check provider status in Forest tools
# Use any Forest tool and look for provider information in the output
```

## 💡 Current Optimal Setup

**For your immediate use**, everything is working perfectly with:
- ✅ LocalJSON vector provider (no fallbacks)
- ✅ 8 projects accessible
- ✅ Vector intelligence operational
- ✅ Task formatting working
- ✅ Full HTA capabilities

**ChromaDB is optional** and can be added later when needed for enhanced performance.

## 🔧 Configuration Files

### Generated Configuration
- **Vector Setup**: `/Users/bretmeraki/.forest-data/vector-setup.json`
- **ChromaDB Startup**: `/Users/bretmeraki/.forest-data/start-chromadb.sh`
- **MCP Config**: `/Users/bretmeraki/Library/Application Support/Claude/claude_desktop_config.json`

### Environment Variables Reference
```bash
# Vector provider selection
export FOREST_VECTOR_PROVIDER=chroma  # or localjson, qdrant

# ChromaDB configuration
export CHROMA_URL=http://localhost:8000
export CHROMA_COLLECTION=forest_vectors
export CHROMA_DIMENSION=1536

# Data directory override
export FOREST_DATA_DIR=/Users/bretmeraki/.forest-data
```

---

**Status**: ✅ **Forest MCP is ready for production use with full vector intelligence capabilities!**
