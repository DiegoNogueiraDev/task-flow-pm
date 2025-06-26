# 🚀 VS Code Setup Guide for Task Flow PM

## Overview

This guide provides comprehensive instructions for setting up VS Code with Task Flow PM's MCP (Model Context Protocol) server integration.

## Prerequisites

- **VS Code**: Latest version installed
- **Node.js**: Version 18 or higher
- **Git**: For cloning and managing the project
- **GitHub Copilot** (recommended): For AI-enhanced development

## 🔧 Automated Setup (Recommended)

### Option 1: Quick Setup Script

```bash
# Clone or navigate to your project directory
cd task-flow-pm

# Make setup script executable
chmod +x scripts/setup-vscode.sh

# Run automated setup
./scripts/setup-vscode.sh

# Open VS Code
code .
```

### Option 2: Manual Setup

If you prefer manual configuration or need to customize the setup:

#### Step 1: Build the Project

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

#### Step 2: Configure VS Code

Create the following files in your project:

**.vscode/settings.json**:
```json
{
  "mcp.enable": true,
  "mcp.servers": {
    "task-flow-pm": {
      "command": "node",
      "args": ["dist/bin/server.js"],
      "cwd": "${workspaceFolder}",
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
```

**.vscode/tasks.json**:
```json
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
      "isBackground": true,
      "problemMatcher": [
        {
          "pattern": [
            {
              "regexp": ".",
              "file": 1,
              "location": 2,
              "message": 3
            }
          ],
          "background": {
            "activeOnStart": true,
            "beginsPattern": ".",
            "endsPattern": "."
          }
        }
      ]
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
      "label": "MCP: Search Tasks",
      "type": "shell",
      "command": "npm",
      "args": ["run", "cli", "search"],
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "MCP: Run Tests",
      "type": "shell",
      "command": "npm",
      "args": ["test"],
      "group": "test"
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
```

**.vscode/snippets.json**:
```json
{
  "mcp-next-task": {
    "prefix": "@mcp-next",
    "body": [
      "// MCP: Get next recommended task",
      "// Auto-generated context from MCP server",
      "/* Task Context: ${1:loading...} */"
    ],
    "description": "Get next task from MCP server"
  },
  "mcp-search": {
    "prefix": "@mcp-search",
    "body": [
      "// MCP: Search tasks - ${1:query}",
      "// Results: ${2:loading...}"
    ],
    "description": "Search tasks in MCP"
  },
  "mcp-context": {
    "prefix": "@mcp-context",
    "body": [
      "/**",
      " * MCP Context",
      " * Project: ${TM_DIRECTORY/.*[\\/\\\\](.*)$/$1/}",
      " * Task: ${1:current-task}",
      " * Status: ${2|pending,in-progress,completed,blocked|}",
      " * Priority: ${3|low,medium,high,critical|}",
      " * Estimate: ${4:30} minutes",
      " */"
    ],
    "description": "Add MCP context to code"
  },
  "mcp-task-template": {
    "prefix": "@mcp-task",
    "body": [
      "## Task: ${1:Task Title}",
      "",
      "**ID**: ${2:task-id}",
      "**Type**: ${3|task,story,epic,subtask|}",
      "**Priority**: ${4|low,medium,high,critical|}",
      "**Estimate**: ${5:30} minutes",
      "",
      "### Description",
      "${6:Task description}",
      "",
      "### Acceptance Criteria",
      "- [ ] ${7:Criterion 1}",
      "- [ ] ${8:Criterion 2}",
      "",
      "### Implementation Notes",
      "${9:Implementation details}",
      ""
    ],
    "description": "Create a new task template"
  }
}
```

#### Step 3: Install VS Code Extensions

Install these recommended extensions:

```bash
# GitHub Copilot (required for AI integration)
code --install-extension GitHub.copilot

# Additional helpful extensions
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-json
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-eslint
```

## 🎯 Usage Guide

### Starting the MCP Server

1. **Via Command Palette**:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Tasks: Run Task"
   - Select "MCP: Start Server"

2. **Via Terminal**:
   ```bash
   npm run dev
   ```

### Using MCP Features in VS Code

#### 1. Code Snippets

Type these snippets in any file:

- `@mcp-next` - Get next recommended task
- `@mcp-search` - Search tasks  
- `@mcp-context` - Add task context to code
- `@mcp-task` - Create new task template

#### 2. Task Management

Use the Command Palette (`Ctrl+Shift+P`) to run:

- **MCP: Get Next Task** - Get your next recommended task
- **MCP: List Tasks** - View all tasks
- **MCP: Search Tasks** - Search for specific tasks
- **MCP: Initialize Project** - Set up MCP in current project

#### 3. GitHub Copilot Integration

With GitHub Copilot enabled, you can:

**Chat Commands**:
```
@mcp What's my next task?
@mcp Search for authentication tasks
@mcp Show me high priority tasks
@mcp Get project status
```

**In Code Comments**:
```javascript
// @mcp: Generate function for user authentication
// Copilot will now have context from your MCP task database

// @mcp-context: working on login feature, task #123
function authenticateUser() {
  // Copilot suggestions will be contextually aware
}
```

### 📋 Common Workflows

#### Starting a New Development Session

1. Open VS Code: `code .`
2. Start MCP server: `Ctrl+Shift+P` → "Tasks: Run Task" → "MCP: Start Server"
3. Get next task: `Ctrl+Shift+P` → "Tasks: Run Task" → "MCP: Get Next Task"
4. Use `@mcp-context` snippet to add task context to your code
5. Let GitHub Copilot assist with implementation

#### Creating a New Task

1. Create a new markdown file or open existing spec
2. Use `@mcp-task` snippet to generate task template
3. Fill in task details
4. Run: `npm run cli plan your-spec.md` to import tasks

#### Searching and Managing Tasks

1. Use `@mcp-search` snippet in comments
2. Or run: `Ctrl+Shift+P` → "Tasks: Run Task" → "MCP: Search Tasks"
3. Use the built-in terminal for advanced CLI commands

## 🔧 Advanced Configuration

### Custom Task Types

Edit `.vscode/settings.json` to add custom task types:

```json
{
  "mcp.taskTypes": {
    "feature": "🚀 Feature",
    "bugfix": "🐛 Bug Fix", 
    "refactor": "♻️ Refactor",
    "docs": "📚 Documentation",
    "test": "🧪 Test"
  }
}
```

### GitHub Copilot Optimization

For best AI integration:

```json
{
  "github.copilot.advanced": {
    "debug.overrideEngine": "gpt-4",
    "debug.useCodeAnalysis": true,
    "debug.useSemanticSearch": true
  },
  "github.copilot.enable": {
    "*": true,
    "yaml": false,
    "plaintext": false
  }
}
```

### Multi-Language Support

For Portuguese interface:

```json
{
  "mcp.locale": "pt-BR",
  "mcp.servers": {
    "task-flow-pm-pt": {
      "command": "node",
      "args": ["dist/bin/mcp-pt.js"],
      "env": {
        "MCP_LANG": "pt-BR"
      }
    }
  }
}
```

## 🐛 Troubleshooting

### Common Issues

**MCP Server Not Starting**:
```bash
# Check if build is up to date
npm run build

# Check for port conflicts
lsof -ti :3000

# Restart with verbose logging
DEBUG=mcp* npm run dev
```

**Copilot Not Recognizing MCP Context**:
1. Restart VS Code
2. Ensure MCP server is running
3. Check GitHub Copilot extension is enabled
4. Try using snippets in a supported file type

**Tasks Not Loading**:
```bash
# Initialize project
npm run cli init

# Check database
ls -la .mcp/

# Test CLI
npm run cli tasks
```

### Performance Optimization

**For Large Projects**:
```json
{
  "mcp.performance": {
    "cacheEnabled": true,
    "maxCacheSize": "100MB",
    "backgroundSync": true
  },
  "typescript.preferences.maxNodeModuleJsFileSize": 8192
}
```

## 📚 References

- [VS Code Tasks Documentation](https://code.visualstudio.com/docs/editor/tasks)
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Task Flow PM Documentation](./README.md)

## 🔄 Updates and Maintenance

Keep your setup current:

```bash
# Update dependencies
npm update

# Rebuild project
npm run build

# Update VS Code extensions
code --update-extensions
```

---

**✅ Your VS Code environment is now optimized for intelligent task management with MCP integration!**