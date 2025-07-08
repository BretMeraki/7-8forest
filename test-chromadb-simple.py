#!/usr/bin/env python3
"""
Simple ChromaDB test to understand what version and features are available
"""

import logging
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_chromadb():
    try:
        import chromadb
        logger.info(f"✅ ChromaDB version: {chromadb.__version__}")
        
        # Check available modules
        try:
            from chromadb.server.fastapi import app
            logger.info("✅ FastAPI server module available")
        except ImportError as e:
            logger.error(f"❌ FastAPI server not available: {e}")
            
        try:
            import uvicorn
            logger.info("✅ Uvicorn available")
        except ImportError as e:
            logger.error(f"❌ Uvicorn not available: {e}")
            logger.info("💡 Install with: pip install uvicorn")
            
        # Try basic client
        try:
            client = chromadb.Client()
            logger.info("✅ Basic ChromaDB client created")
            
            # Test collections
            collections = client.list_collections()
            logger.info(f"✅ Collections listed: {len(collections)} found")
            
        except Exception as e:
            logger.error(f"❌ Client creation failed: {e}")
            
        # Check what's in chromadb module
        logger.info("📦 ChromaDB module contents:")
        attrs = [attr for attr in dir(chromadb) if not attr.startswith('_')]
        for attr in attrs[:10]:  # Show first 10
            logger.info(f"   - {attr}")
        if len(attrs) > 10:
            logger.info(f"   ... and {len(attrs) - 10} more")
            
    except ImportError as e:
        logger.error(f"❌ ChromaDB not available: {e}")
        return False
        
    return True

if __name__ == "__main__":
    test_chromadb()
