#!/usr/bin/env python3
"""
Simple ChromaDB Server
Creates a basic HTTP server for ChromaDB client connections
"""

import sys
import os
import argparse
from pathlib import Path

def start_simple_server(host='0.0.0.0', port=8000, data_dir=None):
    """Start a simple ChromaDB-compatible server"""
    
    try:
        import chromadb
        print(f"🚀 ChromaDB v{chromadb.__version__}")
        
        # Set up data directory
        if data_dir:
            data_path = Path(data_dir)
            data_path.mkdir(parents=True, exist_ok=True)
            print(f"📁 Data directory: {data_path}")
            
            # Set environment variables for persistence
            os.environ['CHROMA_DB_IMPL'] = 'duckdb+parquet'
            os.environ['CHROMA_PERSIST_DIRECTORY'] = str(data_path)
            # Don't set CORS env var as it's causing parsing issues
        
        print(f"🌐 Starting server on http://{host}:{port}")
        
        # Try the simple approach with uvicorn and a minimal FastAPI app
        try:
            from fastapi import FastAPI
            from fastapi.middleware.cors import CORSMiddleware
            import uvicorn
            
            app = FastAPI(title="ChromaDB Simple Server")
            
            # Add CORS middleware
            app.add_middleware(
                CORSMiddleware,
                allow_origins=["*"],
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )
            
            # Create ChromaDB client for server operations
            if data_dir:
                client = chromadb.PersistentClient(path=data_dir)
            else:
                client = chromadb.Client()
            
            @app.get("/api/v1/heartbeat")
            async def heartbeat():
                return {"nanosecond heartbeat": int(time.time() * 1e9)}
            
            @app.get("/api/v1/collections")
            async def list_collections():
                collections = client.list_collections()
                return [{"name": c.name, "id": c.id} for c in collections]
            
            @app.post("/api/v1/collections")
            async def create_collection(request: dict):
                name = request.get("name")
                metadata = request.get("metadata", {})
                collection = client.create_collection(name=name, metadata=metadata)
                return {"name": collection.name, "id": collection.id}
            
            @app.get("/api/v1/collections/{collection_name}")
            async def get_collection(collection_name: str):
                collection = client.get_collection(collection_name)
                return {"name": collection.name, "id": collection.id}
            
            import time
            
            print("✅ Simple FastAPI server configured")
            uvicorn.run(app, host=host, port=port, log_level="info")
            
        except ImportError:
            print("❌ FastAPI or uvicorn not available")
            print("💡 Install with: pip install fastapi uvicorn")
            return False
            
    except ImportError:
        print("❌ ChromaDB not available")
        print("💡 Install with: pip install chromadb")
        return False
    except Exception as e:
        print(f"❌ Server error: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Simple ChromaDB server')
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--data-dir', help='Data directory')
    
    args = parser.parse_args()
    
    try:
        start_simple_server(args.host, args.port, args.data_dir)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")

if __name__ == '__main__':
    main()