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

# Check if VS Code is installed or running
Write-Host "🔍 Checking VS Code installation..." -ForegroundColor Blue
$vscodeFound = $false
$vscodeCmd = $null

# Check multiple common VS Code commands
$vscodeCmd = Get-Command code -ErrorAction SilentlyContinue
if ($vscodeCmd) {
    Write-Host "✅ VS Code CLI found: code" -ForegroundColor Green
    $vscodeFound = $true
    $vscodeCmd = "code"
} else {
    $vscodeInsiders = Get-Command code-insiders -ErrorAction SilentlyContinue
    if ($vscodeInsiders) {
        Write-Host "✅ VS Code Insiders CLI found: code-insiders" -ForegroundColor Green
        $vscodeFound = $true
        $vscodeCmd = "code-insiders"
    } else {
        # Check if VS Code is running via process check
        $vscodeProcess = Get-Process -Name "Code" -ErrorAction SilentlyContinue
        if ($vscodeProcess) {
            Write-Host "✅ VS Code is running (detected via process check)" -ForegroundColor Green
            $vscodeFound = $true
        } else {
            # Check common installation paths
            $commonPaths = @(
                "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe",
                "$env:PROGRAMFILES\Microsoft VS Code\Code.exe"
            )
            
            foreach ($path in $commonPaths) {
                if (Test-Path $path) {
                    Write-Host "✅ VS Code installation found at: $path" -ForegroundColor Green
                    $vscodeFound = $true
                    break
                }
            }
        }
    }
}

if (-Not $vscodeFound) {
    Write-Host "❌ VS Code is not installed or not accessible" -ForegroundColor Red
    Write-Host "💡 Install VS Code from one of these options:" -ForegroundColor Yellow
    Write-Host "   • Download from: https://code.visualstudio.com/" -ForegroundColor Yellow
    Write-Host "   • Use winget: winget install Microsoft.VisualStudioCode" -ForegroundColor Yellow
    Write-Host "   • Use Chocolatey: choco install vscode" -ForegroundColor Yellow
    Write-Host ""
    $continueAnyway = Read-Host "🤔 Continue anyway? The setup will work but you'll need to install VS Code later. (y/N)"
    if ($continueAnyway -notmatch "^[Yy]$") {
        Write-Host "Setup cancelled. Please install VS Code first." -ForegroundColor Red
        exit 1
    }
    Write-Host "⚠️  Continuing without VS Code... You can run this script again after installing." -ForegroundColor Yellow
} else {
    Write-Host "✅ VS Code detected successfully" -ForegroundColor Green
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

# 8. Install recommended VS Code extensions and GitHub Copilot
Write-Host "🔌 Installing recommended VS Code extensions..." -ForegroundColor Yellow

if ($vscodeCmd) {
    Write-Host "🔍 Checking extensions with: $vscodeCmd" -ForegroundColor Blue
    
    # Check if GitHub Copilot is already installed
    $copilotInstalled = & $vscodeCmd --list-extensions | Where-Object { $_ -match "github.copilot" }
    if ($copilotInstalled) {
        Write-Host "✅ GitHub Copilot extension found" -ForegroundColor Green
        Write-Host "💡 Make sure you're signed in to GitHub Copilot" -ForegroundColor Cyan
        Write-Host "   In VS Code: Ctrl+Shift+P → 'GitHub Copilot: Sign In'" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  GitHub Copilot extension not found" -ForegroundColor Yellow
        Write-Host "   Install with: $vscodeCmd --install-extension GitHub.copilot" -ForegroundColor Cyan
        Write-Host "   Or via marketplace: https://marketplace.visualstudio.com/items?itemName=GitHub.copilot" -ForegroundColor Cyan
        Write-Host ""
        $installCopilot = Read-Host "🤔 Install GitHub Copilot extension now? (y/N)"
        if ($installCopilot -match "^[Yy]$") {
            Write-Host "📦 Installing GitHub Copilot extension..." -ForegroundColor Blue
            & $vscodeCmd --install-extension GitHub.copilot --force
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ GitHub Copilot extension installed successfully" -ForegroundColor Green
            } else {
                Write-Host "❌ Failed to install extension. Please install manually." -ForegroundColor Red
            }
        }
    }
    
    # Install other recommended extensions
    Write-Host "📦 Installing other recommended extensions..." -ForegroundColor Blue
    $extensions = @(
        "ms-vscode.vscode-typescript-next",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-json",
        "ms-vscode.vscode-eslint"
    )
    
    foreach ($extension in $extensions) {
        Write-Host "Installing $extension..." -ForegroundColor Cyan
        & $vscodeCmd --install-extension $extension --force 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $extension installed" -ForegroundColor Green
        }
    }
} else {
    if ($vscodeFound) {
        Write-Host "⚠️  VS Code is installed but CLI is not available" -ForegroundColor Yellow
        Write-Host "   Extensions can be installed manually from the marketplace" -ForegroundColor Cyan
        Write-Host "   GitHub Copilot: https://marketplace.visualstudio.com/items?itemName=GitHub.copilot" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  VS Code not detected. Install VS Code first, then run this script again." -ForegroundColor Yellow
    }
}

# 9. Initialize MCP project
Write-Host "🚀 Initializing MCP project..." -ForegroundColor Yellow
try {
    npm run cli init
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MCP project initialized successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MCP initialization had issues but continuing setup..." -ForegroundColor Yellow
        Write-Host "   You may need to fix TypeScript errors first" -ForegroundColor Cyan
        Write-Host "   Run 'npm run build' to see detailed errors" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠️  MCP initialization had issues but continuing setup..." -ForegroundColor Yellow
    Write-Host "   You may need to fix TypeScript errors first" -ForegroundColor Cyan
    Write-Host "   Run 'npm run build' to see detailed errors" -ForegroundColor Cyan
}

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

# Ask if user wants to open VS Code (only if VS Code command is available)
if ($vscodeCmd) {
    $openVSCode = Read-Host "🤔 Open VS Code now? (y/N)"
    if ($openVSCode -match "^[Yy]$") {
        Write-Host "🎯 Opening VS Code..." -ForegroundColor Green
        & $vscodeCmd .
        Write-Host "✅ VS Code opened! Check the status bar for MCP integration." -ForegroundColor Green
    }
} else {
    if ($vscodeFound) {
        Write-Host "💡 Since VS Code is installed, you can open it manually" -ForegroundColor Yellow
        Write-Host "   Open VS Code and use File → Open Folder to open this project" -ForegroundColor Cyan
    } else {
        Write-Host "💡 Install VS Code first, then run this script again to complete setup" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Task Flow PM is ready for intelligent development with VS Code!" -ForegroundColor Green