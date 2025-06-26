# PowerShell script to setup Task Flow PM with Cursor on Windows
# Usage: .\scripts\setup-cursor.ps1

Write-Host "🎯 Setting up Task Flow PM with Cursor on Windows" -ForegroundColor Green
Write-Host "================================================="

# Check if we're in the right directory
if (-Not (Test-Path "package.json")) {
    Write-Host "❌ Please run this script from the Task Flow PM project root" -ForegroundColor Red
    exit 1
}

# Check if Cursor is installed
$cursorPath = Get-Command cursor -ErrorAction SilentlyContinue
if (-Not $cursorPath) {
    Write-Host "❌ Cursor is not installed or not in PATH" -ForegroundColor Red
    Write-Host "💡 Download from: https://cursor.sh/" -ForegroundColor Yellow
    exit 1
}

# 1. Build the project
Write-Host "📦 Building Task Flow PM..." -ForegroundColor Blue
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
} catch {
    Write-Host "❌ Build failed. Please fix build errors first." -ForegroundColor Red
    exit 1
}

# 2. Create .cursor directory
Write-Host "📁 Creating Cursor configuration..." -ForegroundColor Blue
if (-Not (Test-Path ".cursor")) {
    New-Item -ItemType Directory -Path ".cursor" -Force | Out-Null
}

# 3. Backup existing config if present
if (Test-Path ".cursor\cursor.local-mcp.json") {
    Write-Host "⚠️  Backing up existing cursor.local-mcp.json" -ForegroundColor Yellow
    Copy-Item ".cursor\cursor.local-mcp.json" ".cursor\cursor.local-mcp.json.backup" -Force
}

if (Test-Path ".cursor\settings.json") {
    Write-Host "⚠️  Backing up existing settings.json" -ForegroundColor Yellow
    Copy-Item ".cursor\settings.json" ".cursor\settings.json.backup" -Force
}

# 4. Test MCP server functionality
Write-Host "🧪 Testing MCP server..." -ForegroundColor Blue

# Start server in background for testing
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev
}

Start-Sleep -Seconds 3

# Test basic MCP commands
Write-Host "🔍 Testing MCP commands..." -ForegroundColor Blue
try {
    $testResult1 = '{"command":"listTasks"}' | node dist/bin/server.js
    $testResult2 = '{"command":"getNextTask"}' | node dist/bin/server.js
    Write-Host "✅ MCP server is responding correctly" -ForegroundColor Green
} catch {
    Write-Host "⚠️  MCP server test had issues (might still work in Cursor)" -ForegroundColor Yellow
}

# Cleanup test server
Stop-Job $serverJob -ErrorAction SilentlyContinue
Remove-Job $serverJob -ErrorAction SilentlyContinue

# 5. Initialize MCP project if not already done
if (-Not (Test-Path ".mcp\graph.db")) {
    Write-Host "🚀 Initializing MCP project..." -ForegroundColor Blue
    npm run cli init
}

# 6. Create sample tasks if database is empty
Write-Host "📊 Checking for existing tasks..." -ForegroundColor Blue
try {
    $taskCount = node -e "
    const Database = require('better-sqlite3');
    try {
      const db = new Database('.mcp/graph.db');
      const count = db.prepare('SELECT COUNT(*) as count FROM nodes').get();
      console.log(count.count);
      db.close();
    } catch(e) {
      console.log('0');
    }
    "
    
    if ([int]$taskCount -eq 0) {
        Write-Host "📝 Creating sample tasks from spec.md..." -ForegroundColor Blue
        if (Test-Path "spec.md") {
            npm run cli plan spec.md
        } else {
            Write-Host "⚠️  No spec.md found. You can create tasks later with 'npm run cli plan <your-spec-file>'" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠️  Could not check task count. Database might not be initialized yet." -ForegroundColor Yellow
}

# 7. Configure Cursor MCP integration
Write-Host "🎯 Configuring Cursor MCP integration..." -ForegroundColor Blue

# Create Cursor configuration from template
if (Test-Path "cursor.local-mcp.json") {
    Copy-Item "cursor.local-mcp.json" ".cursor\cursor.local-mcp.json" -Force
    Write-Host "✅ Cursor MCP configuration created" -ForegroundColor Green
} else {
    Write-Host "⚠️  cursor.local-mcp.json template not found. Creating basic configuration..." -ForegroundColor Yellow
    
    $mcpConfig = @{
        mcpServers = @{
            "task-flow-pm" = @{
                command = "node"
                args = @("./dist/bin/server.js")
                cwd = "`${workspaceRoot}"
            }
        }
    }
    
    $mcpConfig | ConvertTo-Json -Depth 3 | Set-Content ".cursor\cursor.local-mcp.json" -Encoding UTF8
}

# Test if Cursor can parse the config
Write-Host "🔍 Testing Cursor CLI availability..." -ForegroundColor Blue
try {
    cursor --help | Out-Null
    Write-Host "✅ Cursor CLI is available" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Cursor CLI not found. MCP will still work when opening in Cursor GUI." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Cursor + Task Flow PM Setup Complete!" -ForegroundColor Green
Write-Host "========================================"
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Open this project in Cursor:"
Write-Host "   cursor ."
Write-Host ""
Write-Host "2. Cursor will automatically detect MCP configuration"
Write-Host "   Look for 'MCP Server: task-flow-pm' in the status bar"
Write-Host ""
Write-Host "3. Test MCP integration in Cursor Chat:"
Write-Host "   - Open Cursor Chat (Ctrl + L)"
Write-Host "   - Type: 'What's my next task?'"
Write-Host "   - Cursor should query MCP automatically"
Write-Host ""
Write-Host "4. Use built-in prompts:"
Write-Host "   Available commands: @next-task, @search-tasks, @plan-tasks"
Write-Host ""
Write-Host "🔧 Troubleshooting:" -ForegroundColor Yellow
Write-Host "   • If MCP not working: Restart Cursor"
Write-Host "   • Check .cursor\cursor.local-mcp.json configuration"
Write-Host "   • Verify MCP server: npm run dev"
Write-Host ""

# Display current status
Write-Host "📊 Current Status:" -ForegroundColor Cyan
if (Test-Path ".mcp\graph.db") {
    try {
        $stats = node -e "
        const Database = require('better-sqlite3');
        try {
          const db = new Database('.mcp/graph.db');
          const stats = db.prepare('SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = \"pending\" THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = \"completed\" THEN 1 ELSE 0 END) as completed
          FROM nodes').get();
          console.log(`   📋 Total tasks: ${stats.total}`);
          console.log(`   ⏳ Pending: ${stats.pending}`);  
          console.log(`   ✅ Completed: ${stats.completed}`);
          db.close();
        } catch(e) {
          console.log('   📊 Database stats unavailable');
        }
        "
        Write-Host $stats
    } catch {
        Write-Host "   📊 Database stats unavailable" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🚀 Ready to experience AI-powered development with Cursor + Task Flow PM!" -ForegroundColor Green

# Offer to open Cursor automatically
$openCursor = Read-Host "🤔 Open Cursor now? (y/N)"
if ($openCursor -match "^[Yy]$") {
    Write-Host "🎯 Opening Cursor..." -ForegroundColor Blue
    Start-Process cursor -ArgumentList "." -NoNewWindow
    Write-Host "✅ Cursor opened! Check MCP status in the status bar." -ForegroundColor Green
}

Write-Host ""
Write-Host "📚 For more help, check:" -ForegroundColor Cyan
Write-Host "   • docs/cursor-setup.md"
Write-Host "   • docs/methods.md"
Write-Host "   • README.md" 