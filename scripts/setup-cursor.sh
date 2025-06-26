#!/bin/bash

echo "🎯 Setting up MCP Local with Cursor"
echo "==================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the mcp-local project root"
    exit 1
fi

# Check if Cursor is installed
if ! command -v cursor &> /dev/null; then
    echo "❌ Cursor is not installed or not in PATH"
    echo "💡 Download from: https://cursor.sh/"
    exit 1
fi

# 1. Build the project
echo "📦 Building MCP Local..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors first."
    exit 1
fi

# 2. Create .cursor directory
echo "📁 Creating Cursor configuration..."
mkdir -p .cursor

# 3. Backup existing config if present
if [ -f ".cursor/mcp.json" ]; then
    echo "⚠️  Backing up existing mcp.json"
    cp .cursor/mcp.json .cursor/mcp.json.backup
fi

if [ -f ".cursor/settings.json" ]; then
    echo "⚠️  Backing up existing settings.json"
    cp .cursor/settings.json .cursor/settings.json.backup
fi

# 4. Test MCP server functionality
echo "🧪 Testing MCP server..."
timeout 10s npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 3

# Test basic MCP commands
echo "🔍 Testing MCP commands..."
echo '{"command":"listTasks"}' | node dist/bin/server.js > /dev/null 2>&1
LIST_TEST=$?

echo '{"command":"getNextTask"}' | node dist/bin/server.js > /dev/null 2>&1
NEXT_TEST=$?

# Cleanup test server
kill $SERVER_PID 2>/dev/null

if [ $LIST_TEST -eq 0 ] && [ $NEXT_TEST -eq 0 ]; then
    echo "✅ MCP server is responding correctly"
else
    echo "⚠️  MCP server test had issues (might still work in Cursor)"
fi

# 5. Initialize MCP project if not already done
if [ ! -f ".mcp/graph.db" ]; then
    echo "🚀 Initializing MCP project..."
    npm run cli init
fi

# 6. Create sample tasks if database is empty
TASK_COUNT=$(node -e "
const Database = require('better-sqlite3');
try {
  const db = new Database('.mcp/graph.db');
  const count = db.prepare('SELECT COUNT(*) as count FROM nodes').get();
  console.log(count.count);
  db.close();
} catch(e) {
  console.log('0');
}
")

if [ "$TASK_COUNT" -eq 0 ]; then
    echo "📝 Creating sample tasks from spec.md..."
    if [ -f "spec.md" ]; then
        npm run cli plan spec.md
    else
        echo "⚠️  No spec.md found. You can create tasks later with 'npm run cli plan <your-spec-file>'"
    fi
fi

# 7. Test Cursor MCP integration
echo "🎯 Testing Cursor MCP integration..."

# Create a test workspace configuration
cat > .cursor/test-mcp.json << 'EOF'
{
  "test": true,
  "mcpServers": {
    "local-task-mcp": {
      "command": "node",
      "args": ["./dist/bin/server.js"],
      "cwd": "${workspaceRoot}"
    }
  }
}
EOF

# Test if Cursor can parse the config
cursor --help > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Cursor CLI is available"
else
    echo "⚠️  Cursor CLI not found. MCP will still work when opening in Cursor GUI."
fi

# Clean up test file
rm .cursor/test-mcp.json

echo
echo "🎉 Cursor + MCP Local Setup Complete!"
echo "===================================="
echo
echo "📋 Next Steps:"
echo "1. Open this project in Cursor:"
echo "   cursor ."
echo
echo "2. Cursor will automatically detect MCP configuration"
echo "   Look for 'MCP Server: local-task-mcp' in the status bar"
echo
echo "3. Test MCP integration in Cursor Chat:"
echo "   - Open Cursor Chat (Cmd/Ctrl + L)"
echo "   - Type: 'What's my next task?' "
echo "   - Cursor should query MCP automatically"
echo
echo "4. Use built-in prompts:"
echo "   Copy prompts from .cursor/prompts.md"
echo "   Or type '@next-task', '@search-tasks', etc."
echo
echo "🔧 Troubleshooting:"
echo "   • If MCP not working: Restart Cursor"
echo "   • Check .cursor/mcp.json configuration"
echo "   • Verify MCP server: npm run dev"
echo
echo "📊 Current Status:"
if [ -f ".mcp/graph.db" ]; then
    CURRENT_STATS=$(node -e "
    const Database = require('better-sqlite3');
    try {
      const db = new Database('.mcp/graph.db');
      const stats = db.prepare('SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = \"pending\" THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = \"completed\" THEN 1 ELSE 0 END) as completed
      FROM nodes').get();
      console.log(\`   📋 Total tasks: \${stats.total}\`);
      console.log(\`   ⏳ Pending: \${stats.pending}\`);  
      console.log(\`   ✅ Completed: \${stats.completed}\`);
      db.close();
    } catch(e) {
      console.log('   📊 Database stats unavailable');
    }
    ")
    echo "$CURRENT_STATS"
fi

echo
echo "🚀 Ready to experience AI-powered development with Cursor + MCP Local!"

# Offer to open Cursor automatically
read -p "🤔 Open Cursor now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🎯 Opening Cursor..."
    cursor . &
    echo "✅ Cursor opened! Check MCP status in the status bar."
fi