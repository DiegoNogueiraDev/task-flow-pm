# MCP Local - Model Context Protocol Server

Um servidor MCP (Model Context Protocol) local-first com knowledge graph embarcado para gerenciamento inteligente de tarefas e contexto.

## 🚀 Características

- **Servidor MCP local** via stdin/stdout para integração com Cursor/VSCode
- **Knowledge Graph embarcado** usando SQLite para tarefas, subtarefas e dependências
- **Embeddings locais** com sentence-transformers MiniLM (fallback para vetores aleatórios)
- **Busca híbrida** combinando SQL (grafo) e ANN (vetores)
- **CLI completo** para uso manual com ciclo de vida completo
- **Pipeline de métricas robusto** com retry para Elasticsearch
- **Planejamento automático** de tarefas a partir de especificações
- **Sistema de reflexão** para aprendizado contínuo
- **Geração de artefatos** (código scaffold) automática
- **Aprendizado de máquina** para melhoria de estimativas

## 📦 Instalação

```bash
# Clone e instale
git clone <repo>
cd mcp-local
npm install

# Build do projeto
npm run build

# Instalação global (opcional)
npm install -g .
```

## 🎯 Fluxo Geral de Uso

### 1️⃣ Inicialização
```bash
mcp init                    # Configura projeto MCP
```

### 2️⃣ Planejamento
```bash
mcp plan spec.md           # Gera tasks a partir de especificação
```

### 3️⃣ Execução
```bash
mcp next                   # Mostra próxima task recomendada
mcp begin <task-id>        # Inicia uma task (status → in-progress)
mcp scaffold <task-id>     # Gera estrutura de código
```

### 4️⃣ Contexto e Busca
```bash
mcp search "authentication"  # Busca híbrida por tasks relacionadas
mcp details <task-id>       # Vê detalhes e dependências
```

### 5️⃣ Finalização
```bash
mcp done <task-id> [45]    # Marca como concluída (45min reais)
mcp reflect <task-id> "nota"  # Adiciona reflexão/aprendizado
```

### 6️⃣ Análise
```bash
mcp stats                  # Vê estatísticas de aprendizado
```

## 📋 Comandos MCP Disponíveis

O servidor MCP expõe os seguintes comandos via stdin/stdout:

### ✨ Comandos Básicos

#### `generateTasksFromSpec`
Gera tarefas automaticamente a partir de um texto de especificação.

```json
{
  "command": "generateTasksFromSpec",
  "specText": "Desenvolver sistema de login...",
  "projectId": "optional-project-id"# MCP Local - Model Context Protocol Server

Um servidor MCP (Model Context Protocol) local-first com knowledge graph embarcado para gerenciamento inteligente de tarefas e contexto.

## 🚀 Características

- **Servidor MCP local** via stdin/stdout para integração com Cursor/VSCode
- **Knowledge Graph embarcado** usando SQLite para tarefas, subtarefas e dependências
- **Embeddings locais** com sentence-transformers MiniLM (fallback para vetores aleatórios)
- **Busca híbrida** combinando SQL (grafo) e ANN (vetores)
- **CLI simples** para uso manual
- **Pipeline de métricas** com envio assíncrono para Elasticsearch
- **Planejamento automático** de tarefas a partir de especificações

## 📦 Instalação

```bash
# Clone e instale
git clone <repo>
cd mcp-local
npm install

# Build do projeto
npm run build

# Instalação global (opcional)
npm install -g .
```

## 🎯 Uso Rápido

```bash
# 1. Inicializar projeto
mcp init

# 2. Criar tasks a partir de especificação
mcp plan spec.md

# 3. Ver todas as tasks
mcp tasks

# 4. Obter próxima task recomendada
mcp next

# 5. Ver detalhes de uma task
mcp details <task-id>

# 6. Marcar task como concluída
mcp done <task-id> [tempo-em-minutos]
```

## 📋 Comandos MCP Disponíveis

O servidor MCP expõe os seguintes comandos via stdin/stdout:

### `generateTasksFromSpec`
Gera tarefas automaticamente a partir de um texto de especificação.

```json
{
  "command": "generateTasksFromSpec",
  "specText": "Desenvolver sistema de login...",
  "projectId": "optional-project-id"
}
```

### `listTasks`
Lista tarefas com filtros opcionais.

```json
{
  "command": "listTasks",
  "status": "pending",
  "limit": 10,
  "offset": 0
}
```

### `getTaskDetails`
Obtém detalhes completos de uma tarefa incluindo dependências.

```json
{
  "command": "getTaskDetails",
  "taskId": "task-uuid"
}
```

### `markTaskComplete`
Marca uma tarefa como concluída e registra métricas.

```json
{
  "command": "markTaskComplete",
  "taskId": "task-uuid",
  "actualMinutes": 45
}
```

### `getNextTask`
Retorna a próxima tarefa recomendada baseada em prioridade e dependências.

```json
{
  "command": "getNextTask",
  "excludeIds": ["id1", "id2"]
}
```

### `storeDocument`
Armazena documentos com embeddings para busca contextual.

```json
{
  "command": "storeDocument",
  "title": "API Documentation",
  "content": "Content here...",
  "tags": ["api", "docs"]
}
```

### `retrieveContext`
Busca contexto relevante usando similaridade de embeddings.

```json
{
  "command": "retrieveContext",
  "query": "authentication system",
  "limit": 5
}
```

## ⚙️ Configuração

O arquivo `mcp.json` permite customizar o comportamento:

```json
{
  "dbPath": ".mcp/graph.db",
  "embeddingsModel": "all-MiniLM-L6-v2",
  "esEndpoint": "http://localhost:9200/mcp-events",
  "contextTokens": 1024
}
```

### Parâmetros:

- **dbPath**: Caminho para o banco SQLite
- **embeddingsModel**: Modelo sentence-transformers (requer Python)
- **esEndpoint**: URL do Elasticsearch para métricas (opcional)
- **contextTokens**: Limite de tokens para contexto

## 🔧 Integração com Cursor/VSCode

1. Copie o arquivo `mcp.server.json` para a raiz do seu projeto
2. Configure o Cursor para usar o servidor MCP local:

```json
{
  "mcpServers": {
    "local-task-mcp": {
      "command": "node",
      "args": ["./dist/bin/server.js"],
      "cwd": "./",
      "description": "Local task management with knowledge graph"
    }
  }
}
```

3. Reinicie o Cursor e o servidor MCP estará disponível

## 🐍 Dependências Python (Opcional)

Para embeddings locais, instale as dependências Python:

```bash
pip install sentence-transformers
```

Se não disponível, o sistema usa vetores aleatórios normalizados como fallback.

## 📊 Métricas e Monitoramento

O sistema envia eventos para Elasticsearch automaticamente:

```json
{
  "type": "task_status_change",
  "taskId": "uuid",
  "oldStatus": "pending",
  "newStatus": "completed",
  "estimate": 60,
  "actualMinutes": 75,
  "timestamp": "2025-01-01T12:00:00Z"
}
```

Tipos de eventos:
- `task_created`
- `task_status_change` 
- `task_completed`

## 🧪 Desenvolvimento

```bash
# Modo desenvolvimento
npm run dev

# Executar CLI diretamente
npm run cli -- tasks

# Testes
npm test

# Linting
npm run lint

# Formatação
npm run format
```

## 📁 Estrutura do Projeto

```
mcp-local/
├── bin/
│   ├── server.ts        # Servidor MCP (stdin/stdout)
│   └── mcp.ts           # CLI wrapper
├── src/
│   ├── db/
│   │   ├── graph.ts     # CRUD grafo SQLite
│   │   └── embeddings.ts# Wrapper sentence-transformers
│   ├── services/
│   │   ├── planner.ts   # Geração automática de tarefas
│   │   ├── effort.ts    # Estimativa de esforço
│   │   └── logger.ts    # Envio para Elasticsearch
│   └── mcp/
│       ├── commands.ts  # Implementação comandos MCP
│       └── schema.ts    # Tipos TypeScript
└── .mcp/                # Banco e arquivos gerados
```

## 🔍 Exemplo de Uso

1. **Criar especificação** (`spec.md`):
```markdown
# Sistema de Login + Dashboard

## 1. Autenticação
- Registro de usuários
- Login seguro
- Recuperação de senha

## 2. Dashboard
- Interface responsiva
- Métricas principais
- Gráficos
```

2. **Gerar tarefas**:
```bash
mcp plan spec.md
# ✅ Successfully created 12 tasks with 8 dependencies
```

3. **Trabalhar nas tarefas**:
```bash
mcp next
# 🎯 Next Recommended Task:
# 🔴 Design authentication database schema
# ID: abc-123
# Estimate: 30 minutes

mcp done abc-123 25
# ✅ Task completed: Design authentication database schema
# ⏱️ Time: 25min (estimated: 30min, 16.7% under estimate)
```

## ⚡ Scripts NPM

- `npm run dev` - Servidor em modo desenvolvimento
- `npm run cli` - Executar CLI
- `npm run build` - Build para produção
- `npm test` - Executar testes
- `npm run lint` - Linting
- `npm run format` - Formatação

## 🎯 Requisitos

- **Node.js** ≥ 18.0.0
- **Python** ≥ 3.8 (opcional, para embeddings)
- **SQLite** (incluído)

## 📄 Licença

MIT License - veja LICENSE para detalhes.

---

**MCP Local** - Gerenciamento inteligente de tarefas com knowledge graph embarcado 🚀