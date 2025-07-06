# ChromaDB Persistent Connection Manager for PowerShell
# This script keeps ChromaDB connections alive to prevent "closed channel" errors

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  ChromaDB Connection Keep-Alive Manager" -ForegroundColor Cyan  
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will keep ChromaDB connections healthy for Forest MCP" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop gracefully" -ForegroundColor Yellow
Write-Host ""

# Set environment variable to use ChromaDB
$env:FOREST_VECTOR_PROVIDER = "chroma"

try {
    # Start the connection manager
    Write-Host "🚀 Starting ChromaDB Connection Manager..." -ForegroundColor Green
    node start-chromadb-persistent.js
}
catch {
    Write-Host "❌ Error running ChromaDB Connection Manager: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure Node.js is installed and you're in the correct directory" -ForegroundColor Yellow
}
finally {
    Write-Host ""
    Write-Host "ChromaDB Connection Manager stopped." -ForegroundColor Yellow
    Read-Host "Press Enter to close"
} 