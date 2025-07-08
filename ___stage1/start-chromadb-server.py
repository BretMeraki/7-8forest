#!/usr/bin/env python3
"""
ChromaDB Server Startup Script
Starts a ChromaDB server that the JavaScript client can connect to
"""

import sys
import os
import argparse
import logging
from pathlib import Path

def start_chromadb_server(host='0.0.0.0', port=8000, data_dir=None, log_level='INFO'):
    """Start ChromaDB server"""
    
    # Set logging level
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    try:
        import chromadb
        from chromadb.config import Settings
        
        print(f"🚀 Starting ChromaDB server v{chromadb.__version__}")
        print(f"📍 Host: {host}")
        print(f"🔌 Port: {port}")
        print(f"💾 Data directory: {data_dir or 'default'}")
        
        # Configure data directory if specified
        settings = {}
        if data_dir:
            data_path = Path(data_dir)
            data_path.mkdir(parents=True, exist_ok=True)
            settings['persist_directory'] = str(data_path)
            print(f"✅ Data directory created: {data_path}")
        
        # Start the server
        if hasattr(chromadb, 'run_server'):
            # ChromaDB 0.4.x+ API
            chromadb.run_server(host=host, port=port, **settings)
        else:
            # Fallback for older versions
            from chromadb.server.fastapi import app
            import uvicorn
            
            # Configure persistence if data directory specified
            if data_dir:
                os.environ['CHROMA_DB_IMPL'] = 'duckdb+parquet'
                os.environ['CHROMA_PERSIST_DIRECTORY'] = data_dir
            
            print(f"🌐 Starting server on http://{host}:{port}")
            uvicorn.run(app, host=host, port=port, log_level=log_level.lower())
            
    except ImportError as e:
        print(f"❌ ChromaDB not available: {e}")
        print("💡 Install with: pip install chromadb")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Server startup failed: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Start ChromaDB server for Forest integration')
    parser.add_argument('--host', default='0.0.0.0', help='Server host (default: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=8000, help='Server port (default: 8000)')
    parser.add_argument('--data-dir', help='Data directory for persistence')
    parser.add_argument('--log-level', default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'])
    
    args = parser.parse_args()
    
    print("🔧 ChromaDB Server for Forest Integration")
    print("=" * 50)
    
    try:
        start_chromadb_server(
            host=args.host,
            port=args.port,
            data_dir=args.data_dir,
            log_level=args.log_level
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()