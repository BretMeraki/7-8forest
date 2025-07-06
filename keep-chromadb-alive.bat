@echo off
REM ChromaDB Persistent Connection Manager for Windows
REM This script keeps ChromaDB connections alive to prevent "closed channel" errors

echo.
echo ===========================================
echo   ChromaDB Connection Keep-Alive Manager
echo ===========================================
echo.
echo This will keep ChromaDB connections healthy for Forest MCP
echo Press Ctrl+C to stop gracefully
echo.

REM Set environment variable to use ChromaDB
set FOREST_VECTOR_PROVIDER=chroma

REM Start the connection manager
node start-chromadb-persistent.js

echo.
echo ChromaDB Connection Manager stopped.
pause 