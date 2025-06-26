# 🎯 Task Flow PM - Gerenciamento Inteligente de Tarefas com IA

> **Sistema local-first de gerenciamento de projetos com IA embarcada, integração nativa com Cursor/VS Code e knowledge graph para contexto inteligente.**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-green)]()

## 🚀 O que é o Task Flow PM?

O **Task Flow PM** é uma ferramenta revolucionária que combina:

- 🧠 **IA Embarcada**: Análise inteligente de especificações e planejamento automático de tarefas
- 🔗 **Knowledge Graph**: Relacionamentos entre tarefas, dependências e contexto semântico
- 🔍 **Busca Híbrida**: Combinação de busca vetorial (embeddings) + busca grafo + busca textual
- 💻 **Integração IDE**: Suporte nativo para Cursor e VS Code via Model Context Protocol (MCP)
- 🏗️ **Geração de Código**: Scaffold automático de código com testes e documentação
- 📊 **Aprendizado Contínuo**: Melhoria automática de estimativas baseada no histórico
- 🌐 **Multi-idioma**: Suporte completo em Português e Inglês

## ✨ Principais Benefícios

### 🎯 **Para Desenvolvedores Solo**
- Transforme especificações em tarefas estruturadas automaticamente
- Receba recomendações inteligentes da próxima tarefa a trabalhar
- Gere código scaffold com estrutura completa (implementação + testes + docs)
- Tenha contexto automático de tarefas relacionadas enquanto codifica

### 👥 **Para Equipes**
- Decomposição automática de épicos em stories e tasks
- Rastreamento de dependências e detecção de bloqueios
- Estimativas que melhoram com o tempo baseadas no histórico real
- Busca semântica para encontrar trabalho relacionado rapidamente

### 🏢 **Para Gestores de Projeto**
- Visibilidade completa do progresso em tempo real
- Métricas de velocidade e precisão de estimativas
- Identificação automática de riscos e bloqueios
- Relatórios de aprendizado da equipe

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js >= 18.0.0
- npm ou yarn
- Cursor ou VS Code (para integração IDE)

### 1. Clone e Instale
```bash
git clone <repo-url>
cd task-flow-pm
npm install
npm run build
```

### 2. Configuração Rápida

#### Para **Cursor** (Recomendado):
```bash
# Linux/Mac
./scripts/setup-cursor.sh

# Windows (PowerShell)
.\scripts\setup-cursor.ps1

# Windows (Batch)
scripts\setup-cursor.bat
```

#### Para **VS Code**:
```bash
# Linux/Mac  
./scripts/setup-vscode.sh

# Windows (PowerShell)
.\scripts\setup-vscode.ps1

# Windows (Batch)
scripts\setup-vscode.bat
```

### 3. Inicialização
```bash
npm run cli init
```

## 📋 Guia de Uso Completo

### 🔄 **Workflow Típico de Desenvolvimento**

#### 1️⃣ **Planejamento Inteligente**
```bash
# Crie um arquivo spec.md com requisitos do projeto
echo "# Sistema de Login
- Autenticação com email/senha
- Registro de novos usuários  
- Recuperação de senha
- Dashboard pós-login" > spec.md

# Gere tarefas automaticamente
npm run cli plan spec.md
```

**✨ O que acontece:**
- IA analisa a especificação e identifica componentes principais
- Cria automaticamente épicos, stories e tasks estruturadas
- Calcula estimativas de esforço baseadas em complexidade
- Estabelece dependências lógicas entre tarefas
- Gera tags relevantes para busca futura

#### 2️⃣ **Desenvolvimento Guiado**
```bash
# Obtenha a próxima tarefa recomendada
npm run cli next

# Inicie trabalho na tarefa
npm run cli begin <task-id>

# Gere estrutura de código
npm run cli scaffold <task-id>
```

**✨ O que acontece:**
- Sistema recomenda próxima tarefa baseada em prioridade e dependências
- Marca tarefa como "em progresso" com timestamp
- Gera automaticamente:
  - 📁 Estrutura de pastas
  - 💻 Arquivo de implementação com TODOs estruturados
  - 🧪 Arquivos de teste com casos básicos
  - 📖 README específico da tarefa com critérios de aceite

#### 3️⃣ **Desenvolvimento com Contexto**
```bash
# Busque tarefas relacionadas
npm run cli search "authentication login"

# Veja detalhes completos de uma tarefa
npm run cli details <task-id>
```

**✨ O que acontece:**
- Busca híbrida combina similaridade semântica + relacionamentos do grafo
- Retorna tarefas relacionadas ordenadas por relevância
- Mostra dependências, bloqueios e contexto completo

#### 4️⃣ **Finalização e Aprendizado**
```bash
# Marque como concluída (com tempo real gasto)
npm run cli done <task-id> 45

# Adicione reflexões para aprendizado futuro  
npm run cli reflect <task-id> "Implementação foi mais simples que esperado"

# Veja estatísticas de aprendizado
npm run cli stats
```

**✨ O que acontece:**
- Sistema aprende com tempo real vs estimado
- Ajusta automaticamente fator de estimativa para tarefas similares futuras
- Armazena reflexões para contexto em tarefas relacionadas
- Gera métricas de velocidade e precisão da equipe

### 🎯 **Integração com Cursor/VS Code**

Após configuração, você pode usar comandos naturais no chat da IDE:

#### 🇺🇸 **English Commands**
```text
"What's my next task?"
"Search for authentication related tasks"  
"Get details for task abc-123"
"Show project status and progress"
"Generate code for task xyz-456"
"What are the high priority tasks?"
```

#### 🇧🇷 **Comandos em Português**
```text
"Qual minha próxima tarefa?"
"Buscar tarefas relacionadas a autenticação"
"Detalhes da tarefa abc-123"  
"Status do projeto e progresso"
"Gerar código para tarefa xyz-456"
"Quais são as tarefas de alta prioridade?"
```

### 📊 **Comandos Avançados**

#### **Análise e Relatórios**
```bash
# Ver todas as tarefas por status
npm run cli tasks pending
npm run cli tasks in-progress  
npm run cli tasks completed

# Estatísticas de aprendizado e velocidade
npm run cli stats

# Busca avançada com filtros
npm run cli search "api endpoint" --limit 10
```

#### **Gestão de Workflow**
```bash
# Ver dependências de uma tarefa
npm run cli details <task-id>

# Listar tarefas bloqueadas
npm run cli tasks blocked

# Relatório de progresso por tipo
npm run cli tasks --type epic
npm run cli tasks --type story
```

## 🔧 **Servidor MCP (Model Context Protocol)**

O Task Flow PM funciona como servidor MCP para integração profunda com IDEs:

### **Comandos MCP Disponíveis**

#### `generateTasksFromSpec`
```json
{
  "command": "generateTasksFromSpec",
  "specText": "Desenvolver sistema de login...",
  "projectId": "optional-project-id"
}
```

#### `getNextTask`
```json
{
  "command": "getNextTask",
  "excludeIds": ["id1", "id2"]
}
```

#### `hybridSearch`
```json
{
  "command": "hybridSearch", 
  "query": "authentication",
  "limit": 5
}
```

#### `beginTask` / `markTaskComplete`
```json
{
  "command": "beginTask",
  "taskId": "uuid"
}

{
  "command": "markTaskComplete",
  "taskId": "uuid", 
  "actualMinutes": 45
}
```

#### `generateScaffold`
```json
{
  "command": "generateScaffold",
  "taskId": "uuid"
}
```

### **Executar Servidor MCP**
```bash
# Iniciar servidor para integração com IDE
npm run dev

# Testar comandos MCP diretamente
echo '{"command":"getNextTask"}' | npm run dev
```

## 🧠 **Tecnologias e Arquitetura**

### **Core Technologies**
- **Node.js + TypeScript**: Base robusta e type-safe
- **SQLite + better-sqlite3**: Knowledge graph embarcado de alta performance
- **Sentence Transformers**: Embeddings semânticos (com fallback JavaScript puro)
- **Model Context Protocol**: Integração nativa com IDEs de IA

### **Arquitetura do Knowledge Graph**
```
📊 Nodes (Tarefas)
├── Épicos (épicos principais)
├── Stories (funcionalidades) 
├── Tasks (implementação)
└── Subtasks (detalhamento)

🔗 Edges (Relacionamentos)
├── depends_on (dependências)
├── blocks (bloqueios)
├── child_of (hierarquia)
└── related_to (similaridade)

🧠 Embeddings (Busca Semântica)  
├── Vetores 384D por tarefa
├── Busca por similaridade
└── Contexto automático
```

### **Sistema de Aprendizado**
- **Estimativas Adaptativas**: Fator de correção baseado em histórico
- **Métricas de Velocidade**: Tracking de tempo real vs estimado
- **Contexto Semântico**: Embeddings melhoram com uso
- **Reflexões**: Armazenamento de insights para tarefas futuras

## 📈 **Casos de Uso Reais**

### **🚀 Startup de Desenvolvimento**
```bash
# 1. Planejamento de MVP
npm run cli plan mvp-spec.md  # →  25 tarefas estruturadas

# 2. Sprint semanal
npm run cli tasks pending    # →  Ver backlog priorizado
npm run cli next            # →  Próxima tarefa recomendada

# 3. Desenvolvimento 
npm run cli begin task-123   # →  Inicia contexto no IDE
# [desenvolvimento no Cursor com sugestões de IA]
npm run cli done task-123 90 # →  Aprende que levou 90min vs 60min estimado
```

### **🏢 Equipe Enterprise**
```bash
# 1. Decomposição de features complexas
npm run cli plan enterprise-feature.md  # →  50+ tarefas hierárquicas

# 2. Gestão de dependências
npm run cli details epic-456   # →  Visualiza dependências críticas

# 3. Análise de velocidade
npm run cli stats             # →  Métricas da equipe e trending
```

### **👨‍💻 Desenvolvedor Freelancer**
```bash
# 1. Estimativa de projetos
npm run cli plan client-spec.md  # →  Estimativas automáticas realistas

# 2. Tracking de produtividade  
npm run cli stats               # →  Velocidade individual e trends

# 3. Geração de relatórios
npm run cli tasks completed     # →  Trabalho entregue para cliente
```

## 🔄 **Embeddings e Busca Inteligente**

### **Implementação Híbrida**
- **Python + Sentence Transformers**: Embeddings de alta qualidade (quando disponível)
- **JavaScript Puro**: Fallback baseado em TF-IDF + features semânticas
- **Detecção Automática**: Sistema escolhe melhor implementação disponível

### **Qualidade da Busca**
```bash
# Teste a qualidade da busca semântica
npm run cli search "user authentication"
# Retorna: login forms, password validation, JWT tokens, OAuth integration...

npm run cli search "database schema"  
# Retorna: migrations, model definitions, SQL queries, indexes...
```

### **Aprendizado Contínuo**
- Vocabulário técnico pré-carregado (400+ termos)
- IDF scores ajustados com uso
- Contexto de projetos específicos

## 📚 **Scripts de Configuração Disponíveis**

### **Linux/Mac**
- `scripts/setup-cursor.sh` - Configuração completa do Cursor
- `scripts/setup-cursor-pt.sh` - Versão em português
- `scripts/setup-vscode.sh` - Configuração do VS Code
- `scripts/test-complete.sh` - Teste completo do sistema

### **Windows**
- `scripts/setup-cursor.ps1` - PowerShell para Cursor
- `scripts/setup-cursor.bat` - Batch para Cursor  
- `scripts/setup-vscode.ps1` - PowerShell para VS Code
- `scripts/setup-vscode.bat` - Batch para VS Code
- `scripts/test-complete.ps1` - Teste completo (PowerShell)

## 🎓 **Tutoriais e Documentação**

### **Documentação Detalhada**
- 📖 [`docs/cursor-setup.md`](docs/cursor-setup.md) - Configuração completa do Cursor
- 📖 [`docs/vscode-setup.md`](docs/vscode-setup.md) - Configuração completa do VS Code  
- 📖 [`docs/methods.md`](docs/methods.md) - Metodologias e best practices
- 📖 [`docs/test-howto.md`](docs/test-howto.md) - Guia completo de testes

### **Exemplos Práticos**
- 🔍 [`docs/arch.md`](docs/arch.md) - Arquitetura do sistema
- 📊 [`docs/results.md`](docs/results.md) - Casos de uso e resultados
- 🌐 [`docs/multi-language.md`](docs/multi-language.md) - Suporte multi-idioma

## 🧪 **Testes e Qualidade**

### **Executar Testes**
```bash
# Teste completo automatizado
npm run test:complete

# Testes unitários
npm test

# Teste de embeddings JavaScript
npm run test:js-embeddings

# Teste com cobertura
npm run test:coverage
```

### **Verificação de Funcionalidades**
```bash
# Verificar se tudo funciona
npm run build                 # ✓ Compilação
npm run cli tasks            # ✓ CLI
echo '{"command":"getNextTask"}' | npm run dev  # ✓ MCP Server
```

## 🚨 **Solução de Problemas**

### **Problemas Comuns**

#### ❌ "Python not found"
```bash
# Normal! Sistema usa JavaScript automaticamente
npm run test:js-embeddings  # Confirma que JS funciona
```

#### ❌ "Database locked" 
```bash
rm .mcp/graph.db  # Remove banco
npm run cli init  # Recria
```

#### ❌ "Cannot find module"
```bash
npm run build  # Rebuild o projeto
```

#### ❌ "Permission denied" (Linux/Mac)
```bash
chmod +x scripts/setup-cursor.sh
./scripts/setup-cursor.sh
```

## 🤝 **Contribuindo**

1. Fork o projeto
2. Crie uma feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 **Licença**

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

## 🙏 **Agradecimentos**

- **Model Context Protocol** - Protocolo revolucionário para integração IA + IDEs
- **Cursor** - IDE com IA nativa que inspirou este projeto  
- **Sentence Transformers** - Embeddings semânticos de alta qualidade
- **SQLite** - Database embarcado confiável e performático

---

## 🎯 **Próximos Passos**

Após instalar e configurar:

1. 📋 **Crie seu primeiro projeto**: `npm run cli init`
2. 📝 **Escreva uma especificação**: Crie `spec.md` com requisitos
3. 🚀 **Gere tarefas**: `npm run cli plan spec.md`  
4. 💻 **Desenvolva com IA**: Abra Cursor e use comandos naturais
5. 📊 **Acompanhe progresso**: `npm run cli stats`

**Ready to revolutionize your development workflow? 🚀**