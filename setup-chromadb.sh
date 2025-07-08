#!/bin/bash

# ChromaDB Setup and Startup Script for Forest MCP
set -e

echo "🚀 Setting up ChromaDB for Forest MCP..."

# Define directories
FOREST_DATA_DIR="$HOME/.forest-data"
CHROMA_DATA_DIR="$FOREST_DATA_DIR/.chromadb"

# Create directories
mkdir -p "$FOREST_DATA_DIR"
mkdir -p "$CHROMA_DATA_DIR"

echo "📁 Forest data directory: $FOREST_DATA_DIR"
echo "📁 ChromaDB data directory: $CHROMA_DATA_DIR"

# Check if ChromaDB is installed
if ! python3 -c "import chromadb" 2>/dev/null; then
    echo "📦 Installing ChromaDB..."
    python3 -m pip install --user chromadb
    echo "✅ ChromaDB installed"
else
    echo "✅ ChromaDB already installed"
fi

# Create a simple ChromaDB server script
cat > "$FOREST_DATA_DIR/start-chromadb-server.py" << 'EOF'
#!/usr/bin/env python3
import chromadb
import os
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data directory
CHROMA_DATA_DIR = os.path.expanduser("~/.forest-data/.chromadb")
Path(CHROMA_DATA_DIR).mkdir(parents=True, exist_ok=True)

logger.info(f"🗄️ ChromaDB data directory: {CHROMA_DATA_DIR}")

try:
    # Try to start ChromaDB server
    logger.info("🚀 Starting ChromaDB server on http://localhost:8000")
    logger.info("📊 Press Ctrl+C to stop")
    
    # This will start the ChromaDB server with persistent storage
    os.system(f"chroma run --path {CHROMA_DATA_DIR} --host localhost --port 8000")
    
except KeyboardInterrupt:
    logger.info("🛑 ChromaDB server stopped")
except Exception as e:
    logger.error(f"❌ Failed to start ChromaDB: {e}")
    logger.info("💡 Try: pip install --upgrade chromadb")
EOF

chmod +x "$FOREST_DATA_DIR/start-chromadb-server.py"

echo "✅ ChromaDB setup complete!"
echo ""
echo "🔧 To start ChromaDB server:"
echo "   python3 $FOREST_DATA_DIR/start-chromadb-server.py"
echo ""
echo "🔧 Or run directly:"
echo "   chroma run --path $CHROMA_DATA_DIR --host localhost --port 8000"
echo ""
echo "🔧 In another terminal, set Forest to use ChromaDB:"
echo "   export FOREST_VECTOR_PROVIDER=chroma"
echo ""

# Try to start ChromaDB server now
echo "🚀 Starting ChromaDB server..."
echo "📋 This will run in the foreground. Press Ctrl+C to stop."
echo "📋 After starting, open another terminal and run Forest MCP."
echo ""

# Start the server
chroma run --path "$CHROMA_DATA_DIR" --host localhost --port 8000
