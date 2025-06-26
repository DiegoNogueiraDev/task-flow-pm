#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { GraphDB } from '../src/db/graph';
import { EmbeddingsService } from '../src/db/embeddings';
import { Logger } from '../src/services/logger';
import { MCPCommandHandler } from '../src/mcp/commands';
import { MCPCommandHandlerPortugues } from '../src/mcp/commands-pt';
import { MCPConfig } from '../src/mcp/schema';

class MCPCLIPortugues {
  private config: MCPConfig;
  private db: GraphDB;
  private embeddings: EmbeddingsService;
  private logger: Logger;
  private commandHandler: MCPCommandHandler;
  private handlerPortugues: MCPCommandHandlerPortugues;

  constructor() {
    this.config = this.carregarConfig();
    this.garantirDiretorio(dirname(this.config.dbPath));
    this.db = new GraphDB(this.config.dbPath);
    this.embeddings = new EmbeddingsService(this.config.embeddingsModel);
    this.logger = new Logger(this.config.esEndpoint);
    this.commandHandler = new MCPCommandHandler(this.db, this.embeddings, this.logger);
    this.handlerPortugues = new MCPCommandHandlerPortugues(this.commandHandler);
  }

  private carregarConfig(): MCPConfig {
    const caminhoConfig = resolve(process.cwd(), 'mcp.json');
    
    const configPadrao: MCPConfig = {
      dbPath: '.mcp/graph.db',
      embeddingsModel: 'all-MiniLM-L6-v2',
      esEndpoint: 'http://localhost:9200/mcp-events',
      contextTokens: 1024,
    };

    if (!existsSync(caminhoConfig)) {
      return configPadrao;
    }

    try {
      const dadosConfig = readFileSync(caminhoConfig, 'utf-8');
      const configUsuario = JSON.parse(dadosConfig);
      return { ...configPadrao, ...configUsuario };
    } catch (erro) {
      console.error('Erro ao carregar configuração, usando padrões:', erro);
      return configPadrao;
    }
  }

  private garantirDiretorio(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async inicializar(): Promise<void> {
    const caminhoConfig = resolve(process.cwd(), 'mcp.json');
    
    if (existsSync(caminhoConfig)) {
      console.log('Projeto MCP já foi inicializado');
      return;
    }

    const configPadrao: MCPConfig = {
      dbPath: '.mcp/graph.db',
      embeddingsModel: 'all-MiniLM-L6-v2',
      esEndpoint: 'http://localhost:9200/mcp-events',
      contextTokens: 1024,
    };

    writeFileSync(caminhoConfig, JSON.stringify(configPadrao, null, 2));
    this.garantirDiretorio('.mcp');
    
    console.log('✅ Projeto MCP inicializado com sucesso!');
    console.log(`📁 Configuração criada em: ${caminhoConfig}`);
    console.log(`📊 Base de dados será armazenada em: ${configPadrao.dbPath}`);
    console.log('\nPróximos passos:');
    console.log('1. Crie um arquivo spec.md com os requisitos do projeto');
    console.log('2. Execute: mcp-pt planejar spec.md');
    console.log('3. Visualize as tarefas: mcp-pt tarefas');
  }

  async planejar(arquivoSpec: string): Promise<void> {
    if (!existsSync(arquivoSpec)) {
      console.error(`❌ Arquivo de especificação não encontrado: ${arquivoSpec}`);
      process.exit(1);
    }

    const textoSpec = readFileSync(arquivoSpec, 'utf-8');
    
    console.log('📋 Planejando tarefas a partir da especificação...');
    
    const resposta = await this.handlerPortugues.planejarProjeto(textoSpec);

    if (!resposta.sucesso) {
      console.error('❌ Falha ao gerar tarefas:', resposta.erro);
      process.exit(1);
    }

    const { tarefasCriadas, dependenciasCriadas } = resposta.dados;
    
    console.log(`✅ ${tarefasCriadas} tarefas criadas com sucesso e ${dependenciasCriadas} dependências`);
    console.log('\nExecute "mcp-pt tarefas" para ver todas as tarefas ou "mcp-pt proxima" para obter a próxima tarefa.');
  }

  async listarTarefas(status?: string): Promise<void> {
    const resposta = await this.handlerPortugues.processarComando({
      comando: 'listarTarefas',
      status: status as any,
      limite: 50,
    });

    if (!resposta.sucesso) {
      console.error('❌ Falha ao listar tarefas:', resposta.erro);
      process.exit(1);
    }

    const { tarefas } = resposta.dados;
    
    if (tarefas.length === 0) {
      console.log('📝 Nenhuma tarefa encontrada. Execute "mcp-pt planejar spec.md" para criar tarefas a partir de uma especificação.');
      return;
    }

    console.log(`\n📋 Tarefas${status ? ` (${status})` : ''}:\n`);
    
    for (const tarefa of tarefas) {
      const iconeStatus = this.obterIconeStatus(tarefa.status);
      const iconePrioridade = this.obterIconePrioridade(tarefa.prioridade);
      const infoTempo = tarefa.estimativaMinutos > 0 ? ` (~${tarefa.estimativaMinutos}min)` : '';
      
      console.log(`${iconeStatus} ${iconePrioridade} [${tarefa.tipo.toUpperCase()}] ${tarefa.titulo}${infoTempo}`);
      console.log(`   ID: ${tarefa.id}`);
      
      if (tarefa.tags.length > 0) {
        console.log(`   Tags: ${tarefa.tags.join(', ')}`);
      }
      console.log('');
    }
  }

  async obterDetalhesTarefa(idTarefa: string): Promise<void> {
    const resposta = await this.handlerPortugues.obterDetalhesTarefa(idTarefa);

    if (!resposta.sucesso) {
      console.error('❌ Falha ao obter detalhes da tarefa:', resposta.erro);
      process.exit(1);
    }

    const { tarefa, children: filhas, dependencies: dependencias, blocking: bloqueando, canStart: podeIniciar } = resposta.dados;
    
    console.log(`\n📄 Detalhes da Tarefa:\n`);
    console.log(`Título: ${tarefa.titulo}`);
    console.log(`ID: ${tarefa.id}`);
    console.log(`Tipo: ${tarefa.tipo}`);
    console.log(`Status: ${this.obterIconeStatus(tarefa.status)} ${tarefa.status}`);
    console.log(`Prioridade: ${this.obterIconePrioridade(tarefa.prioridade)} ${tarefa.prioridade}`);
    console.log(`Estimativa: ${tarefa.estimativaMinutos} minutos`);
    console.log(`Real: ${tarefa.minutosReais} minutos`);
    console.log(`Pode Iniciar: ${podeIniciar ? '✅ Sim' : '❌ Não (bloqueada)'}`);
    
    if (tarefa.tags.length > 0) {
      console.log(`Tags: ${tarefa.tags.join(', ')}`);
    }
    
    console.log(`\nDescrição:\n${tarefa.descricao}`);
    
    if (filhas && filhas.length > 0) {
      console.log(`\n📦 Subtarefas (${filhas.length}):`);
      for (const filha of filhas) {
        const tarefaFilha = this.handlerPortugues['traduzirTarefaEnParaPt'] ? 
          this.handlerPortugues['traduzirTarefaEnParaPt'](filha) : filha;
        console.log(`  ${this.obterIconeStatus(tarefaFilha.status)} ${tarefaFilha.titulo}`);
      }
    }
    
    if (dependencias && dependencias.length > 0) {
      console.log(`\n🔗 Dependências (${dependencias.length}):`);
      for (const dep of dependencias) {
        const tarefaDep = this.handlerPortugues['traduzirTarefaEnParaPt'] ? 
          this.handlerPortugues['traduzirTarefaEnParaPt'](dep) : dep;
        console.log(`  ${this.obterIconeStatus(tarefaDep.status)} ${tarefaDep.titulo}`);
      }
    }
    
    if (bloqueando && bloqueando.length > 0) {
      console.log(`\n🚫 Tarefas Bloqueadas (${bloqueando.length}):`);
      for (const block of bloqueando) {
        const tarefaBlock = this.handlerPortugues['traduzirTarefaEnParaPt'] ? 
          this.handlerPortugues['traduzirTarefaEnParaPt'](block) : block;
        console.log(`  ${this.obterIconeStatus(tarefaBlock.status)} ${tarefaBlock.titulo}`);
      }
    }
  }

  async obterProximaTarefa(): Promise<void> {
    const resposta = await this.handlerPortugues.proximaTarefa();

    if (!resposta.sucesso) {
      console.error('❌ Falha ao obter próxima tarefa:', resposta.erro);
      process.exit(1);
    }

    const { tarefa, alternativeTasks: alternativas, message: mensagem } = resposta.dados;
    
    if (!tarefa) {
      console.log(`🎯 ${mensagem || 'Nenhuma tarefa disponível'}`);
      return;
    }

    console.log('\n🎯 Próxima Tarefa Recomendada:\n');
    console.log(`${this.obterIconePrioridade(tarefa.prioridade)} ${tarefa.titulo}`);
    console.log(`   ID: ${tarefa.id}`);
    console.log(`   Tipo: ${tarefa.tipo}`);
    console.log(`   Estimativa: ${tarefa.estimativaMinutos} minutos`);
    console.log(`   Prioridade: ${tarefa.prioridade}`);
    
    if (tarefa.descricao) {
      const descricaoResumo = tarefa.descricao.substring(0, 200);
      console.log(`\n   Descrição: ${descricaoResumo}${tarefa.descricao.length > 200 ? '...' : ''}`);
    }

    if (alternativas && alternativas.length > 0) {
      console.log('\n🔄 Tarefas Alternativas:');
      for (const alt of alternativas) {
        console.log(`   • ${alt.titulo} (${alt.estimativaMinutos}min, ${alt.prioridade})`);