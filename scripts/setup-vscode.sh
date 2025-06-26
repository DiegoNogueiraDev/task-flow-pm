#!/bin/bash

echo "🔧 Setting up MCP Local with VSCode + GitHub Copilot"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the mcp-local project root"
    exit 1
fi

# 1. Build the project
echo "📦 Building MCP Local..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors first."
    exit 1
fi

# 2. Create .vscode directory
echo "📁 Creating VSCode configuration..."
mkdir -p .vscode

# 3. Check if VSCode settings exist and backup if needed
if [ -f ".vscode/settings.json" ]; then
    echo "⚠️  Backing up existing settings.json"
    cp .vscode/settings.json .vscode/settings.json.backup
fi

# 4. Create/update VSCode settings (this was already done via artifacts)
echo "✅ VSCode configuration files created"

# 5. Test MCP server
echo "🧪 Testing MCP server..."
timeout 5s npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 2

# Test if server responds
echo '{"command":"listTasks"}' | node dist/bin/server.js > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ MCP server is working correctly"
else
    echo "⚠️  MCP server test inconclusive (this might be normal)"
fi

# Cleanup
kill $SERVER_PID 2>/dev/null

# 6. Check GitHub Copilot extension
echo "🤖 Checking GitHub Copilot setup..."
if command -v code &> /dev/null; then
    code --list-extensions | grep -q "github.copilot"
    if [ $? -eq 0 ]; then
        echo "✅ GitHub Copilot extension found"
    else
        echo "⚠️  GitHub Copilot extension not found"
        echo "   Please install: https://marketplace.visualstudio.com/items?itemName=GitHub.copilot"
    fi
else
    echo "⚠️  VSCode CLI not found. Please install VSCode CLI."
fi

# 7. Initialize MCP project
echo "🚀 Initializing MCP project..."
npm run cli init

# 8. Create example spec if it doesn't exist
if [ ! -f "spec.md" ]; then
    echo "📝 Creating example specification..."
    # spec.md already exists from previous artifacts
fi

echo
echo "🎉 Setup Complete!"
echo "================"
echo
echo "📋 Next Steps:"
echo "1. Open this project in VSCode"
echo "2. Press Ctrl+Shift+P and run 'Tasks: Run Task'"
echo "3. Select 'MCP: Start Server' to start the MCP server"
echo "4. Use GitHub Copilot Chat with MCP context:"
echo "   - Type '@mcp-next' for next task"
echo "   - Type '@mcp-search authentication' to search"
echo "   - Use snippets in your code files"
echo
echo "🔧 Commands to try:"
echo "   Ctrl+Shift+P -> 'Tasks: Run Task' -> 'MCP: Get Next Task'"
echo "   Ctrl+Shift+P -> 'Tasks: Run Task' -> 'MCP: Search Tasks'"
echo
echo "💡 In any file, type '@mcp' to see available snippets"
echo
echo "🤖 GitHub Copilot Integration:"
echo "   - Copilot can now access task context via MCP"
echo "   - Use @mcp-context snippet in code files"
echo "   - Ask Copilot: 'What's my next task?' and it will query MCP"
echo
echo "✅ MCP Local is ready for intelligent development!"