#!/bin/bash

# Clean Workspace Management Script
# Makes it easy to create and validate clean workspaces for Claude

set -e

case "$1" in
    "validate")
        echo "🔍 Validating current context..."
        node context-filter.js validate
        ;;
    "create")
        echo "🧹 Creating clean workspace..."
        node create-clean-workspace.js
        ;;
    "list")
        echo "📋 Listing exposed files..."
        node context-filter.js list
        ;;
    "core")
        echo "🎯 Listing core modules..."
        node context-filter.js core
        ;;
    "help"|*)
        echo "🛠  Forest Clean Workspace Manager"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  validate  - Validate current context filtering"
        echo "  create    - Create clean workspace for Claude"
        echo "  list      - List all exposed files"
        echo "  core      - List core modules only"
        echo "  help      - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 validate   # Check if filtering is working correctly"
        echo "  $0 create     # Create ./claude-workspace with clean files"
        echo ""
        ;;
esac
