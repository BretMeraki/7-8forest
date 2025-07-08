#!/usr/bin/env python3
"""
Local ChromaDB Server for Forest MCP
Starts a ChromaDB server that can be used by the Forest MCP system
"""

import os
import sys
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def install_chromadb():
    """Install ChromaDB if not already installed"""
    try:
        import chromadb
        logger.info(f"ChromaDB already installed: {chromadb.__version__}")
        return True
    except ImportError:
        logger.info("ChromaDB not found, installing...")
        try:
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install", "chromadb"])
            logger.info("ChromaDB installed successfully")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to install ChromaDB: {e}")
            return False

def start_chromadb_server():
    """Start ChromaDB server"""
    try:
        import chromadb
        from chromadb.config import Settings
        import uvicorn
        
        # Set up data directory
        forest_data_dir = os.path.expanduser("~/.forest-data")
        chroma_data_dir = os.path.join(forest_data_dir, ".chromadb")
        
        # Ensure directories exist
        Path(forest_data_dir).mkdir(exist_ok=True)
        Path(chroma_data_dir).mkdir(exist_ok=True)
        
        logger.info(f"ChromaDB data directory: {chroma_data_dir}")
        
        # Configure ChromaDB with persistence
        settings = Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=chroma_data_dir,
            chroma_server_host="localhost",
            chroma_server_http_port=8000,
            anonymized_telemetry=False
        )
        
        # Create ChromaDB client with persistence
        client = chromadb.Client(settings)
        
        logger.info("ChromaDB client created with persistence")
        
        # Start the server
        logger.info("Starting ChromaDB server on http://localhost:8000")
        logger.info("Press Ctrl+C to stop the server")
        
        # Run the ChromaDB server
        try:
            import chromadb.server.fastapi
            app = chromadb.server.fastapi.app
            
            uvicorn.run(
                app,
                host="0.0.0.0",
                port=8000,
                log_level="info"
            )
        except Exception as server_error:
            logger.error(f"Server startup failed: {server_error}")
            
            # Alternative: Run as simple HTTP server
            logger.info("Trying alternative server method...")
            from chromadb.server.fastapi import app
            
            import uvicorn
            uvicorn.run(
                "chromadb.server.fastapi:app",
                host="localhost", 
                port=8000,
                reload=False,
                log_level="info"
            )
            
    except ImportError as e:
        logger.error(f"ChromaDB import failed: {e}")
        logger.error("Try installing ChromaDB with: pip install chromadb")
        return False
    except Exception as e:
        logger.error(f"Failed to start ChromaDB server: {e}")
        return False

def main():
    """Main function"""
    logger.info("🚀 Starting ChromaDB server for Forest MCP")
    
    # Install ChromaDB if needed
    if not install_chromadb():
        logger.error("❌ Failed to install ChromaDB")
        sys.exit(1)
    
    # Start the server
    try:
        start_chromadb_server()
    except KeyboardInterrupt:
        logger.info("🛑 ChromaDB server stopped by user")
    except Exception as e:
        logger.error(f"❌ ChromaDB server failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
