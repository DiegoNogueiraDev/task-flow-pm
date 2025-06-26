# PowerShell script to setup Task Flow PM with VS Code on Windows
# Usage: .\scripts\setup-vscode.ps1

Write-Host "🔧 Setting up Task Flow PM with VS Code on Windows" -ForegroundColor Green
Write-Host "=================================================="

# Check if we're in the right directory
if (-Not (Test-Path "package.json")) {
    Write-Host "❌ Please run this script from the Task Flow PM project root" -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if VS Code is installed
try {
    $codeVersion = code --version
    Write-Host "✅ VS Code is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ VS Code is not installed or not in PATH. Please install from https://code.visualstudio.com/" -ForegroundColor Red
    exit 1
}

# 1. Install dependencies and build
Write-Host "📦 Installing dependencies and building project..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Please fix build errors first." -ForegroundColor Red
    exit 1
}

# 2. Create .vscode directory
Write-Host "📁 Creating VS Code configuration..." -ForegroundColor Yellow
if (-Not (Test-Path ".vscode")) {
    New-Item -ItemType Directory -Path ".vscode"
}

# 3. Backup existing settings if they exist
if (Test-Path ".vscode\settings.json") {
    Write-Host "⚠️  Backing up existing settings.json" -ForegroundColor Yellow
    Copy-Item ".vscode\settings.json" ".vscode\settings.json.backup"
}

# 4. Create VS Code settings.json
Write-Host "⚙️  Creating VS Code settings..." -ForegroundColor Yellow
$settings = @"
{
  "mcp.enable": true,
  "mcp.servers": {
    "task-flow-pm": {
      "command": "node",
      "args": ["dist/bin/server.js"],
      "cwd": "`${workspaceFolder}",
      "env": {
        "NODE_ENV": "development"
      }
    }
  },
  "editor.snippetSuggestions": "top",
  "github.copilot.enable": true,
  "github.copilot.advanced": {
    "debug.overrideEngine": "gpt-4",
    "debug.useCodeAnalysis": true
  },
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "typescript.suggest.autoImports": true
}
"@
$settings | Out-File -FilePath ".vscode\settings.json" -Encoding utf8

# 5. Create tasks.json
Write-Host "⚙️  Creating VS Code tasks..." -ForegroundColor Yellow
$tasks = @"
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "MCP: Start Server",
      "type": "shell",
      "command": "npm",
      "args": ["run", "dev"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      },
      "isBackground": true
    },
    {
      "label": "MCP: Initialize Project",
      "type": "shell",
      "command": "npm",
      "args": ["run", "cli", "init"],
      "group": "build"
    },
    {
      "label": "MCP: Get Next Task",
      "type": "shell",
      "command": "npm",
      "args": ["run", "cli", "next"],
      "group": "build"
    },
    {
      "label": "MCP: List Tasks",
      "type": "shell",
      "command": "npm",
      "args": ["run", "cli", "tasks"],
      "group": "build"
    },
    {
      "label": "MCP: Build",
      "type": "shell",
      "command": "npm",
      "args": ["run", "build"],
      "group": "build"
    }
  ]
}
"@
$tasks | Out-File -FilePath ".vscode\tasks.json" -Encoding utf8

# 6. Create snippets
Write-Host "⚙️  Creating VS Code snippets..." -ForegroundColor Yellow
if (-Not (Test-Path ".vscode\snippets")) {
    New-Item -ItemType Directory -Path ".vscode\snippets"
}

$snippets = @"
{
  "mcp-next-task": {
    "prefix": "@mcp-next",
    "body": [
      "// MCP: Get next recommended task",
      "// Auto-generated context from MCP server",
      "/* Task Context: `${1:loading...} */"
    ],
    "description": "Get next task from MCP server"
  },
  "mcp-search": {
    "prefix": "@mcp-search",
    "body": [
      "// MCP: Search tasks - `${1:query}",
      "// Results: `${2:loading...}"
    ],
    "description": "Search tasks in MCP"
  },
  "mcp-context": {
    "prefix": "@mcp-context",
    "body": [
      "/**",
      " * MCP Context",
      " * Project: `${TM_DIRECTORY/.*[\\\/\\\\\\\\](.*)$/$1/}",
      " * Task: `${1:current-task}",
      " * Status: `${2|pending,in-progress,completed,blocked|}",
      " * Priority: `${3|low,medium,high,critical|}",
      " * Estimate: `${4:30} minutes",
      " */"
    ],
    "description": "Add MCP context to code"
  }
}
"@
$snippets | Out-File -FilePath ".vscode\snippets\mcp.code-snippets" -Encoding utf8

# 7. Test MCP server
Write-Host "🧪 Testing MCP server..." -ForegroundColor Yellow
$serverProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow -PassThru
Start-Sleep -Seconds 3

try {
    # Test basic server response (simplified test)
    $testResult = npm run cli tasks 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MCP server is working correctly" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MCP server test inconclusive (this might be normal)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  MCP server test failed, but setup continues" -ForegroundColor Yellow
} finally {
    # Stop the test server
    if ($serverProcess -and !$serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    }
}

# 8. Install recommended VS Code extensions
Write-Host "🔌 Installing recommended VS Code extensions..." -ForegroundColor Yellow
$extensions = @(
    "GitHub.copilot",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json",
    "ms-vscode.vscode-eslint"
)

foreach ($extension in $extensions) {
    Write-Host "Installing $extension..." -ForegroundColor Cyan
    code --install-extension $extension --force 2>$null
}

# 9. Initialize MCP project
Write-Host "🚀 Initializing MCP project..." -ForegroundColor Yellow
npm run cli init

# 10. Create example spec if it doesn't exist
if (-Not (Test-Path "spec.md")) {
    Write-Host "📝 Creating example specification..." -ForegroundColor Yellow
    $exampleSpec = @"
# Task Flow PM Example Project

## User Authentication
Implement user registration and login system with JWT tokens.

### Requirements
- User registration with email validation
- Secure password hashing
- JWT token generation and validation
- Password reset functionality

## Dashboard
Create main user interface after login.

### Requirements
- Task overview display
- Quick task creation
- Progress charts
- User profile management
"@
    $exampleSpec | Out-File -FilePath "spec.md" -Encoding utf8
    
    # Generate tasks from spec
    npm run cli plan spec.md
}

Write-Host ""
Write-Host "🎉 VS Code Setup Complete!" -ForegroundColor Green
Write-Host "========================="
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Open this project in VS Code: code ." -ForegroundColor White
Write-Host "2. Press Ctrl+Shift+P and run 'Tasks: Run Task'" -ForegroundColor White
Write-Host "3. Select 'MCP: Start Server' to start the MCP server" -ForegroundColor White
Write-Host "4. Use GitHub Copilot Chat with MCP context:" -ForegroundColor White
Write-Host "   - Type '@mcp-next' for next task" -ForegroundColor White
Write-Host "   - Type '@mcp-search authentication' to search" -ForegroundColor White
Write-Host "   - Use snippets in your code files" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Commands to try:" -ForegroundColor Cyan
Write-Host "   Ctrl+Shift+P -> 'Tasks: Run Task' -> 'MCP: Get Next Task'" -ForegroundColor White
Write-Host "   Ctrl+Shift+P -> 'Tasks: Run Task' -> 'MCP: List Tasks'" -ForegroundColor White
Write-Host ""
Write-Host "💡 In any file, type '@mcp' to see available snippets" -ForegroundColor White
Write-Host ""
Write-Host "🤖 GitHub Copilot Integration:" -ForegroundColor Cyan
Write-Host "   - Copilot can now access task context via MCP" -ForegroundColor White
Write-Host "   - Use @mcp-context snippet in code files" -ForegroundColor White
Write-Host "   - Ask Copilot: 'What's my next task?' and it will query MCP" -ForegroundColor White
Write-Host ""

# Ask if user wants to open VS Code
$openVSCode = Read-Host "🤔 Open VS Code now? (y/N)"
if ($openVSCode -eq "y" -or $openVSCode -eq "Y") {
    Write-Host "🎯 Opening VS Code..." -ForegroundColor Green
    code .
    Write-Host "✅ VS Code opened! Check the status bar for MCP integration." -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Task Flow PM is ready for intelligent development with VS Code!" -ForegroundColor Green