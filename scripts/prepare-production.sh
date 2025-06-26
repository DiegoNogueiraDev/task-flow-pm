#!/bin/bash

# 🚀 Task Flow PM - Preparação para Produção
# Script para preparar distribuição para 100+ desenvolvedores

set -e

echo "🚀 Preparando Task Flow PM para distribuição enterprise..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_dependencies() {
    log "Verificando dependências..."
    
      if ! command -v node &> /dev/null; then
      error "Node.js não encontrado. Instale Node.js 18+"
      exit 1
  fi
  
  if ! command -v npm &> /dev/null; then
      error "NPM não encontrado"
      exit 1
  fi
  
  log "✅ Node.js $(node --version) encontrado"
  log "✅ NPM $(npm --version) encontrado"
    
    log "✅ Dependências verificadas"
}

create_distribution_structure() {
    log "Criando estrutura de distribuição..."
    
    mkdir -p dist-enterprise/{
        packages/npm,
        installers,
        scripts/{setup,health},
        docs,
        update-server
    }
    
    log "✅ Estrutura criada"
}

prepare_npm_package() {
    log "Preparando NPM package enterprise..."
    
    cat > dist-enterprise/packages/npm/package.json << 'EOF'
{
  "name": "@empresa/task-flow-pm",
  "version": "2.1.0",
  "description": "Task Flow PM MCP Server - Enterprise Edition",
  "bin": {
    "taskflow": "./dist/bin/cli.js",
    "taskflow-mcp": "./dist/bin/server.js",
    "taskflow-setup": "./scripts/setup.js"
  },
  "scripts": {
    "postinstall": "node scripts/enterprise-setup.js"
  },
  "files": ["dist/", "scripts/", "configs/", "docs/"],
  "keywords": ["mcp", "task-management", "ai", "enterprise"],
  "license": "MIT",
  "engines": { "node": ">=18.0.0" }
}
EOF
    
    log "✅ Package.json enterprise criado"
}

create_universal_installer() {
    log "Criando installers universais..."
    
    # Linux/macOS installer
    cat > dist-enterprise/installers/install.sh << 'EOF'
#!/bin/bash
set -e

INSTALL_DIR="${HOME}/.taskflow"
REPO_URL="https://api.github.com/repos/empresa/task-flow-pm"

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case $ARCH in
    x86_64) ARCH="x64" ;;
    arm64|aarch64) ARCH="arm64" ;;
    *) echo "❌ Arquitetura não suportada: $ARCH"; exit 1 ;;
esac

echo "🚀 Instalando Task Flow PM Enterprise..."

  if ! command -v node &> /dev/null; then
      echo "❌ Node.js não encontrado. Instale Node.js 18+:"
      echo "   https://nodejs.org/"
      exit 1
  fi
  
  echo "✅ Node.js $(node --version) detectado"

mkdir -p "$INSTALL_DIR"

LATEST_VERSION=$(curl -s "$REPO_URL/releases/latest" | grep -o '"tag_name": "[^"]*' | cut -d'"' -f4)
DOWNLOAD_URL="$REPO_URL/releases/download/$LATEST_VERSION/taskflow-$OS-$ARCH.tar.gz"

echo "📦 Baixando versão $LATEST_VERSION..."
curl -L "$DOWNLOAD_URL" | tar xz -C "$INSTALL_DIR"

chmod +x "$INSTALL_DIR/taskflow"

# Adicionar ao PATH
SHELL_CONFIG=""
case $SHELL in
    */zsh) SHELL_CONFIG="$HOME/.zshrc" ;;
    */bash) SHELL_CONFIG="$HOME/.bashrc" ;;
esac

if [[ -n "$SHELL_CONFIG" && -f "$SHELL_CONFIG" ]]; then
    if ! grep -q "taskflow" "$SHELL_CONFIG"; then
        echo 'export PATH="$HOME/.taskflow:$PATH"' >> "$SHELL_CONFIG"
        echo "✅ Adicionado ao PATH"
    fi
fi

"$INSTALL_DIR/taskflow" setup --enterprise

echo "✅ Task Flow PM instalado com sucesso!"
echo "🔄 Reinicie seu terminal"
echo "🎯 Para começar: taskflow --help"
EOF

    chmod +x dist-enterprise/installers/install.sh
    log "✅ Installers criados"
}

create_setup_scripts() {
    log "Criando scripts de setup enterprise..."
    
    cat > dist-enterprise/scripts/setup/enterprise-setup.js << 'EOF'
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

class EnterpriseSetup {
    constructor() {
        this.homeDir = os.homedir();
        this.configDir = path.join(this.homeDir, '.taskflow');
    }

    async run() {
        console.log('🚀 Configurando Task Flow PM Enterprise...');
        
        try {
            await this.createDirectories();
            await this.configureMCP();
            await this.setupHealthChecks();
            
            console.log('✅ Setup enterprise completo!');
            console.log('🎯 Reinicie seu IDE para usar as ferramentas MCP');
        } catch (error) {
            console.error('❌ Erro no setup:', error.message);
            process.exit(1);
        }
    }

    async createDirectories() {
        console.log('📁 Criando diretórios...');
        
        const dirs = [
            this.configDir,
            path.join(this.configDir, 'data'),
            path.join(this.configDir, 'logs'),
            path.join(this.configDir, 'cache')
        ];
        
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    async configureMCP() {
        console.log('⚙️ Configurando MCP...');
        
        const mcpConfig = {
            mcpServers: {
                "task-flow-pm": {
                    command: "taskflow-mcp",
                    args: [],
                    env: {
                        NODE_ENV: "production",
                        TASKFLOW_HOME: this.configDir,
                        ENTERPRISE_MODE: "true"
                    }
                }
            }
        };

        // Cursor
        const cursorDir = path.join(this.homeDir, '.cursor');
        if (!fs.existsSync(cursorDir)) {
            fs.mkdirSync(cursorDir, { recursive: true });
        }
        
        const cursorConfig = path.join(cursorDir, 'mcp_settings.json');
        fs.writeFileSync(cursorConfig, JSON.stringify(mcpConfig, null, 2));
        console.log('  ✅ Cursor configurado');
    }

    async setupHealthChecks() {
        console.log('🔍 Configurando health checks...');
        
        const healthScript = `#!/bin/bash
# Task Flow PM Health Check
taskflow-mcp --health || echo "❌ MCP Server com problemas"
`;
        
        const healthFile = path.join(this.configDir, 'health-check.sh');
        fs.writeFileSync(healthFile, healthScript);
        
        if (os.platform() !== 'win32') {
            fs.chmodSync(healthFile, '755');
        }
    }
}

if (require.main === module) {
    new EnterpriseSetup().run();
}

module.exports = EnterpriseSetup;
EOF

    chmod +x dist-enterprise/scripts/setup/enterprise-setup.js
    log "✅ Scripts de setup criados"
}

create_quick_docs() {
    log "Criando documentação..."
    
    cat > dist-enterprise/docs/README.md << 'EOF'
# 🚀 Task Flow PM Enterprise - Quick Start

## Instalação

### Automática (Recomendado)
```bash
# Linux/macOS
curl -fsSL https://install.empresa.com/taskflow | bash

# Windows (PowerShell)
iwr -useb https://install.empresa.com/taskflow.ps1 | iex
```

### Manual
```bash
npm install -g @empresa/task-flow-pm
taskflow setup --enterprise
```

  ## Verificação

  ```bash
  taskflow health      # Health check
  taskflow diagnose    # Diagnóstico completo
  taskflow status      # Status atual
  ```

  ## Recursos 100% Node.js

  ✅ **SEM PYTHON** - Totalmente baseado em Node.js/TypeScript
  ✅ **Processamento DOCX** - Via mammoth library
  ✅ **Processamento PDF** - Via pdf-parse library  
  ✅ **Análise HTML** - Via cheerio library
  ✅ **Markdown nativo** - Processamento direto

## Uso no Cursor

1. **Reinicie o Cursor**
2. **Verifique**: "Task Flow PM" nas ferramentas MCP
3. **Teste**: "Gere tarefas para sistema de login"

## Comandos

```bash
taskflow tasks                           # Listar tarefas
taskflow next                           # Próxima tarefa
taskflow plan "Criar API REST"          # Gerar plano
taskflow start <task-id>                # Iniciar tracking
taskflow stop                           # Parar tracking
```

## Troubleshooting

### "0 tools enabled" no Cursor
```bash
taskflow diagnose
taskflow setup --force
```

### Problemas de performance
```bash
taskflow cache clear
taskflow rebuild
```

## Suporte

- 📖 Docs: https://docs.taskflow.empresa.com
- 💬 Slack: #taskflow-support
- 🐛 Issues: GitHub Issues
EOF

    log "✅ Documentação criada"
}

create_update_server() {
    log "Criando update server..."
    
    cat > dist-enterprise/update-server/server.js << 'EOF'
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/latest', (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    const platform = userAgent.includes('Win') ? 'win' :
                    userAgent.includes('Mac') ? 'mac' : 'linux';
    
    res.json({
        version: '2.1.0',
        downloadUrl: `https://releases.empresa.com/v2.1.0/taskflow-${platform}.tar.gz`,
        mandatory: false,
        releaseNotes: 'Melhorias de performance e correções de bugs'
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Update Server running on port ${PORT}`);
});
EOF

    cat > dist-enterprise/update-server/package.json << 'EOF'
{
  "name": "taskflow-update-server",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
EOF

    log "✅ Update server criado"
}

# Executar todas as funções
main() {
    echo "============================================"
    echo "🚀 Task Flow PM - Preparação para Produção"
    echo "============================================"
    echo
    
    check_dependencies
    create_distribution_structure
    prepare_npm_package
    create_universal_installer
    create_setup_scripts
    create_quick_docs
    create_update_server
    
    echo
    echo "============================================"
    echo "✅ Preparação completa!"
    echo "============================================"
    echo
    echo "📁 Estrutura criada em: ./dist-enterprise/"
    echo
    echo "🎯 Próximos passos:"
    echo "  1. Testar installer: ./dist-enterprise/installers/install.sh"
    echo "  2. Configurar CI/CD para releases automáticos"
    echo "  3. Deploy update server"
    echo "  4. Testar com 5-10 desenvolvedores pilot"
    echo
    echo "📖 Docs: ./dist-enterprise/docs/README.md"
    echo "🔧 Scripts: ./dist-enterprise/scripts/"
    echo
    echo "🚀 Sua distribuição enterprise está pronta!"
}

main