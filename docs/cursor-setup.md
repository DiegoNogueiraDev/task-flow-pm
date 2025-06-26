# 🎯 Cursor Setup Guide for Task Flow PM

## Overview

This guide provides comprehensive instructions for setting up Cursor with Task Flow PM's MCP (Model Context Protocol) server integration. Cursor has native MCP support, making it the ideal IDE for AI-enhanced development with task context awareness.

## Prerequisites

- **Cursor**: Latest version installed from [cursor.sh](https://cursor.sh/)
- **Node.js**: Version 18 or higher
- **Git**: For cloning and managing the project

## 🚀 Automated Setup (Recommended)

### Quick Setup with Smart Language Detection

```bash
# Clone or navigate to your project directory
cd task-flow-pm

# Make setup script executable
chmod +x scripts/setup-cursor-smart.sh

# Run automated smart setup
./scripts/setup-cursor-smart.sh

# The script will:
# 1. Detect your system language
# 2. Ask for your preference (English/Portuguese/Auto-detect)
# 3. Configure MCP accordingly
# 4. Set up intelligent aliases
# 5. Offer to open Cursor automatically
```

### Traditional Setup (English Only)

```bash
# For English-only setup
chmod +x scripts/setup-cursor.sh
./scripts/setup-cursor.sh

# Open Cursor
cursor .
```

## 🔧 Manual Configuration

If you prefer manual setup or need custom configuration:

### Step 1: Build the Project

```bash
# Install dependencies
npm install

# Build the unified multilingual version
npm run build
```

### Step 2: Create Cursor Configuration

#### `.cursor/mcp.json` (Core MCP Configuration)

```json
{
  "mcpServers": {
    "local-task-mcp": {
      "command": "node",
      "args": ["./dist/bin/server.js"],
      "cwd": "${workspaceRoot}",
      "description": "Local-first task management with intelligent context (Multi-language)",
      "env": {
        "NODE_ENV": "production",
        "MCP_PREFERRED_LANG": "auto"
      }
    }
  }
}
```

#### `.cursor/settings.json` (Cursor Settings)

```json
{
  "cursor.mcp.enabled": true,
  "cursor.mcp.autoStart": true,
  "cursor.mcp.servers": ["local-task-mcp"],
  "cursor.chat.contextAwareness": "enhanced",
  "cursor.chat.systemLanguage": "auto",
  "mcp.local.preferredLanguage": "auto",
  "mcp.local.autoDetectLanguage": true,
  "mcp.local.commands": {
    "english": "mcp",
    "portuguese": "mcp-pt",
    "unified": "mcp"
  },
  "cursor.chat.aliases": {
    "next": "Get my next priority task using MCP",
    "proxima": "Obter minha próxima tarefa prioritária via MCP",
    "search": "Search MCP for tasks related to: ",
    "buscar": "Buscar no MCP tarefas relacionadas a: ",
    "context": "Get full MCP context for task: ",
    "contexto": "Obter contexto completo MCP para tarefa: ",
    "scaffold": "Generate code scaffold for task: ",
    "estrutura": "Gerar estrutura de código para tarefa: ",
    "status": "Show project status from MCP",
    "projeto": "Mostrar status do projeto via MCP"
  },
  "cursor.ai.model": "gpt-4",
  "cursor.ai.codeGeneration": true,
  "cursor.ai.contextWindow": "enhanced"
}
```

#### `.cursor/prompts.md` (Custom Prompts)

```markdown
# Task Flow PM - Cursor Prompts

## Next Task
Get my next priority task from MCP and provide implementation guidance.

Command: Get next task from MCP server and explain what needs to be done, including context and acceptance criteria.

## Search Tasks  
Search for tasks related to a specific topic.

Command: Search MCP for tasks containing: [QUERY]
Provide a summary of relevant tasks with their status and priorities.

## Begin Task
Start working on a specific task with full context.

Command: Get complete context for task [TASK_ID] from MCP, including:
- Task description and acceptance criteria
- Dependencies and related tasks  
- Suggested implementation approach
- Code scaffolding if needed

## Complete Task
Mark a task as completed and add reflection.

Command: Mark task [TASK_ID] as completed in MCP with [MINUTES] minutes spent.
Add reflection: [REFLECTION_TEXT]
Get next recommended task.

## Project Status
Get overall project status and metrics.

Command: Get project overview from MCP including:
- Task distribution by status
- Recent activity
- Upcoming priorities
- Potential blockers

## Code Context
Get MCP context for the current code file.

Command: Based on the current file I'm working on, get relevant tasks and context from MCP that relate to this code.

## Implementation Help
Get implementation guidance for a specific task.

Command: For task [TASK_ID], provide:
1. Detailed implementation plan
2. Code examples and patterns
3. Testing strategy
4. Potential challenges and solutions
```

#### `.cursor/workspace.json` (Workspace Configuration)

```json
{
  "workspaceSettings": {
    "mcp.integration.enabled": true,
    "mcp.context.autoDetect": true,
    "ai.contextSources": ["mcp", "codebase", "git"],
    "ai.taskAwareness": true
  },
  "extensions": {
    "recommendations": [
      "ms-vscode.vscode-typescript-next",
      "esbenp.prettier-vscode",
      "bradlc.vscode-tailwindcss"
    ]
  },
  "tasks": {
    "version": "2.0.0",
    "tasks": [
      {
        "label": "Start MCP Server",
        "type": "shell",
        "command": "npm run dev",
        "group": "build",
        "isBackground": true,
        "presentation": {
          "reveal": "silent",
          "panel": "new"
        }
      },
      {
        "label": "MCP Status",
        "type": "shell", 
        "command": "npm run cli tasks",
        "group": "build"
      }
    ]
  }
}
```

### Step 3: Initialize Project

```bash
# Initialize MCP project
npm run cli init

# Create sample tasks (if you have a spec.md file)
npm run cli plan spec.md
```

## 🎯 Usage Guide

### Verifying MCP Integration

1. **Open Cursor**: `cursor .`
2. **Check Status Bar**: Look for "MCP Server: local-task-mcp" 
3. **Test Connection**: Open Cursor Chat and type "What's my next task?"

### Essential Chat Commands

#### 🇺🇸 English Commands

```bash
# Task Management
"What's my next task?"
"Search for authentication tasks"  
"Get details for task abc-123"
"Show project status"
"Begin task xyz-456"
"Complete task abc-123 with 45 minutes"

# Code Generation
"Generate scaffold for task abc-123"
"Show me similar code patterns"
"Help me implement user authentication"
"Create tests for this component"

# Project Insights
"What are the high priority tasks?"
"Show me blocked tasks"
"Get project velocity metrics"
"List recent completed tasks"
```

#### 🇧🇷 Portuguese Commands

```bash
# Gerenciamento de Tarefas
"Qual minha próxima tarefa?"
"Buscar tarefas de autenticação"
"Detalhes da tarefa abc-123"
"Status do projeto"
"Iniciar tarefa xyz-456"
"Concluir tarefa abc-123 com 45 minutos"

# Geração de Código
"Gerar estrutura para tarefa abc-123"
"Mostrar padrões de código similares"
"Ajudar implementar autenticação"
"Criar testes para este componente"

# Insights do Projeto
"Quais são as tarefas de alta prioridade?"
"Mostrar tarefas bloqueadas"
"Métricas de velocidade do projeto"
"Listar tarefas concluídas recentes"
```

### Advanced Workflows

#### 🚀 Morning Development Routine

```bash
1. "Good morning! What should I work on today?"
   # Gets prioritized task list and recommendations

2. "Get context for task [ID] and help me plan implementation"
   # Provides full task context and implementation strategy

3. "Generate code scaffold for this task"
   # Creates boilerplate code structure

4. [Code throughout the day with AI assistance]

5. "I completed [task-ID], help me reflect and update estimates"
   # Records completion and improves future estimates
```

#### 🔍 Research and Discovery

```bash
# Understanding existing code
"Analyze this codebase and find authentication patterns"
"Show me how error handling is implemented here"
"Find similar components to what I'm building"

# Task-driven development
"What tasks are related to this file I'm editing?"
"Show me dependencies for the current feature"
"Get testing requirements for this component"
```

#### 🎯 Feature Development

```bash
# Planning phase
"Help me break down this large task into subtasks"
"What are the technical requirements for this feature?"
"Show me acceptance criteria and edge cases"

# Implementation phase  
"Generate component structure for this feature"
"Show me best practices for this type of component"
"Help me implement error handling"

# Testing phase
"Generate tests for this component"
"What edge cases should I test?"
"Help me write integration tests"
```

## 🌐 Multi-Language Features

### Automatic Language Detection

The system automatically detects your preferred language based on:

1. **Environment Variable**: `MCP_LANG=pt-BR` or `MCP_LANG=en`
2. **System Locale**: `LANG=pt_BR.UTF-8`
3. **Cursor Settings**: `cursor.chat.systemLanguage`
4. **Command Used**: `mcp` vs `mcp-pt`

### Language-Specific Aliases

**English**:
```bash
mcp next              # Next task
mcp search auth       # Search tasks
mcp begin abc-123     # Begin task
mcp complete abc-123  # Complete task
```

**Portuguese**:
```bash
mcp-pt proxima              # Próxima tarefa
mcp-pt buscar auth          # Buscar tarefas
mcp-pt iniciar abc-123      # Iniciar tarefa
mcp-pt concluir abc-123     # Concluir tarefa
```

### Natural Language Chat

You can chat in any language naturally:

```bash
# English
"What's the status of the authentication feature?"
"Help me implement user registration"
"Show me high priority tasks"

# Portuguese  
"Qual o status da funcionalidade de autenticação?"
"Me ajude a implementar registro de usuário"
"Mostrar tarefas de alta prioridade"
```

## 🔧 Advanced Configuration

### Custom MCP Queries

You can run custom MCP queries directly:

```javascript
// In Cursor Chat
"Execute MCP query: {'command': 'hybridSearch', 'query': 'api endpoints', 'k': 5}"

"Run MCP command: {'command': 'getTaskDetails', 'taskId': 'abc-123'}"
```

### Performance Optimization

**For Large Projects**:

```json
{
  "mcp.performance": {
    "cacheEnabled": true,
    "maxCacheSize": "500MB",
    "backgroundSync": true,
    "indexingEnabled": true
  },
  "cursor.ai.contextWindow": "large",
  "cursor.ai.codeAnalysis": {
    "enabled": true,
    "depth": "enhanced"
  }
}
```

### Team Configuration

**Shared Team Settings** (`.cursor/team-settings.json`):

```json
{
  "team": {
    "preferredLanguage": "auto",
    "sharedPrompts": true,
    "mcpConfiguration": {
      "autoStart": true,
      "contextSharing": "enhanced"
    }
  },
  "workflows": {
    "taskPrefix": "TEAM",
    "estimationMethod": "planning-poker",
    "reviewProcess": "mandatory"
  }
}
```

## 🐛 Troubleshooting

### Common Issues

**MCP Server Not Detected**:
```bash
# Check if MCP server is running
npm run dev

# Verify configuration
cat .cursor/mcp.json

# Restart Cursor
cursor --restart
```

**Language Detection Issues**:
```bash
# Force language in environment
export MCP_LANG=pt-BR
cursor .

# Or update Cursor settings
echo '{"mcp.local.preferredLanguage": "pt-BR"}' > .cursor/settings.json
```

**Performance Issues**:
```bash
# Clear MCP cache
rm -rf .mcp/cache/

# Reduce context window
# Update .cursor/settings.json:
# "cursor.ai.contextWindow": "standard"
```

**Chat Not Working**:
```bash
# Check MCP connection
npm run cli next

# Verify server logs
DEBUG=mcp* npm run dev

# Reset Cursor configuration
rm -rf .cursor/
./scripts/setup-cursor-smart.sh
```

### Debug Mode

Enable debug logging:

```bash
# Set debug environment
export DEBUG=mcp*,cursor*

# Start with verbose logging
cursor --verbose .

# Check MCP server logs
tail -f .mcp/logs/server.log
```

## 📊 Monitoring and Analytics

### Usage Metrics

Monitor your development productivity:

```bash
# Task completion metrics
mcp stats

# Time tracking
mcp report weekly

# Velocity trends  
mcp analytics velocity
```

### Performance Monitoring

Track MCP server performance:

```json
{
  "mcp.monitoring": {
    "metricsEnabled": true,
    "performanceLogging": true,
    "usageAnalytics": true
  }
}
```

## 🚀 Best Practices

### Effective Prompting

**Be Specific**:
```bash
❌ "Help me code"
✅ "Help me implement user authentication for task AUTH-123 using JWT tokens"
```

**Use Context**:
```bash
❌ "Fix this bug"  
✅ "There's a validation bug in task VAL-456. The email regex isn't working properly."
```

**Request Examples**:
```bash
✅ "Show me code examples for implementing pagination similar to existing patterns"
```

### Development Workflow

1. **Start with Context**: Always get task context before coding
2. **Use Scaffolds**: Generate code structure first, then implement
3. **Frequent Reflection**: Record learnings and time estimates
4. **Search First**: Check for existing patterns before creating new ones
5. **Test Integration**: Use MCP for test generation and validation

### Code Organization

**MCP-Aware Comments**:
```javascript
/**
 * User Authentication Service
 * 
 * @mcp-task AUTH-123
 * @mcp-status in-progress
 * @mcp-estimate 120min
 * @mcp-tags authentication, security, jwt
 */
class AuthService {
  // Implementation...
}
```

## 🔗 Integration with Other Tools

### Git Integration

```bash
# Commit with MCP task reference
git commit -m "feat(auth): implement JWT authentication 

Implements task AUTH-123
- Add JWT token generation
- Implement token validation middleware
- Add refresh token support

Co-authored-by: MCP-Task-Flow <mcp@local>"
```

### CI/CD Integration

```yaml
# .github/workflows/mcp-integration.yml
name: MCP Task Validation
on: [push, pull_request]

jobs:
  validate-tasks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Validate MCP Tasks
        run: |
          npm install
          npm run build
          npm run cli validate-tasks
```

## 📚 Resources

### Learning Materials

- [Cursor Documentation](https://docs.cursor.sh/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Task Flow PM User Guide](./README.md)

### Community

- [Cursor Discord](https://discord.gg/cursor)
- [MCP Community](https://github.com/modelcontextprotocol)
- [Task Flow PM Issues](https://github.com/task-flow-pm/issues)

## 🔄 Updates and Maintenance

Keep your setup current:

```bash
# Update Task Flow PM
git pull origin main
npm install
npm run build

# Update Cursor
# Cursor auto-updates, but you can check manually in settings

# Update MCP configuration
./scripts/setup-cursor-smart.sh --update
```

---

**🎉 Your Cursor environment is now optimized for AI-driven development with intelligent task management!**

The combination of Cursor's native MCP support and Task Flow PM's multilingual capabilities creates a seamless development experience where your AI assistant has full context of your project's tasks, priorities, and progress.