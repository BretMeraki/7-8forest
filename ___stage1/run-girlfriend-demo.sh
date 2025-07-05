#!/bin/bash

# 💕 THE GIRLFRIEND TEST - RUN SCRIPT 💕
# =====================================
# 
# This script runs the Forest MCP Server demo that's safe to show to loved ones.
# No bugs, no crashes, no embarrassment - just polished, working software!

echo "🎬 Preparing Forest MCP Server Demo..."
echo "======================================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "girlfriend-demo.js" ]; then
    echo "❌ girlfriend-demo.js not found. Please run from the stage1 directory."
    exit 1
fi

echo "✅ Environment check passed"
echo ""
echo "🚀 Starting Forest MCP Server Demo..."
echo "Press Ctrl+C if you need to stop the demo"
echo ""

# Run the demo with error handling
if node girlfriend-demo.js; then
    echo ""
    echo "✅ Demo completed successfully!"
    echo "🎉 Forest MCP Server is ready to impress!"
else
    echo ""
    echo "❌ Demo failed with exit code $?"
    echo "💔 This should never happen during The Girlfriend Test!"
    exit 1
fi