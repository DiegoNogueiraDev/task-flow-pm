#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { GraphDB } from '../src/db/graph';
import { EmbeddingsService } from '../src/db/embeddings';
import { Logger } from '../src/services/logger';
import { MCPCommandHandler } from '../src/mcp/commands';
import { MCPConfig } from '../src/mcp/schema';
import { I18n, SupportedLocale } from '../src/i18n/index';

class UnifiedMCPCLI {
  private config: MCPConfig;
  private db: GraphDB;
  private embeddings: EmbeddingsService;
  private logger: Logger;
  private commandHandler: MCPCommandHandler;
  private i18n: I18n;

  constructor(locale?: SupportedLocale) {
    // Auto-detect or use provided locale
    const detectedLocale = locale || this.detectLocaleFromCommand();
    this.i18n = new I18n(detectedLocale);
    
    this.config = this.loadConfig();
    this.ensureDirectory(dirname(this.config.dbPath));
    this.db = new GraphDB(this.config.dbPath);
    this.embeddings = new EmbeddingsService(this.config.embeddingsModel);
    this.logger = new Logger(this.config.esEndpoint);
    this.commandHandler = new MCPCommandHandler(this.db, this.embeddings, this.logger);
  }

  private detectLocaleFromCommand(): SupportedLocale {
    // Check explicit MCP language setting first
    if (process.env.MCP_LANG) {
      return process.env.MCP_LANG === 'pt-BR' ? 'pt-BR' : 'en';
    }
    
    const scriptName = process.argv[1];
    if (scriptName.includes('mcp-pt') || scriptName.includes('pt')) {
      return 'pt-BR';
    }
    if (scriptName.includes('mcp-en') || scriptName.includes('en')) {
      return 'en';
    }
    
    // Default to English
    return 'en';
  }

  private loadConfig(): MCPConfig {
    const configPath = resolve(process.cwd(), 'mcp.json');
    
    const defaultConfig: MCPConfig = {
      dbPath: '.mcp/graph.db',
      embeddingsModel: 'all-MiniLM-L6-v2',
      esEndpoint: 'http://localhost:9200/mcp-events',
      contextTokens: 1024,
    };

    if (!existsSync(configPath)) {
      return defaultConfig;
    }

    try {
      const configData = readFileSync(configPath, 'utf-8');
      const userConfig = JSON.parse(configData);
      return { ...defaultConfig, ...userConfig };
    } catch (error) {
      console.error('Error loading config, using defaults:', error);
      return defaultConfig;
    }
  }

  private ensureDirectory(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  // Main CLI methods with i18n
  async init(): Promise<void> {
    const configPath = resolve(process.cwd(), 'mcp.json');
    
    if (existsSync(configPath)) {
      console.log(this.i18n.t('cli.init.alreadyInitialized'));
      return;
    }

    const defaultConfig: MCPConfig = {
      dbPath: '.mcp/graph.db',
      embeddingsModel: 'all-MiniLM-L6-v2',
      esEndpoint: 'http://localhost:9200/mcp-events',
      contextTokens: 1024,
    };

    writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    this.ensureDirectory('.mcp');
    
    console.log(this.i18n.t('cli.init.success'));
    console.log(`📁 Config created at: ${configPath}`);
    console.log(`📊 Database will be stored at: ${defaultConfig.dbPath}`);
    console.log('\n' + this.i18n.getArray('cli.init.nextSteps').join('\n'));
  }

  async plan(specFile: string): Promise<void> {
    if (!existsSync(specFile)) {
      console.error(`❌ Spec file not found: ${specFile}`);
      process.exit(1);
    }

    const specText = readFileSync(specFile, 'utf-8');
    console.log(this.i18n.t('cli.planning.processing'));
    
    const response = await this.commandHandler.handleCommand({
      command: 'generateTasksFromSpec',
      specText,
    });

    if (!response.success) {
      console.error(this.i18n.t('cli.planning.failed') + ':', response.error);
      process.exit(1);
    }

    const { tasksCreated, dependenciesCreated } = response.data;
    console.log(this.i18n.t('cli.planning.success', tasksCreated, dependenciesCreated));
    console.log('\n' + this.i18n.getArray('cli.workflow.nextSteps').join('\n'));
  }

  async listTasks(status?: string): Promise<void> {
    // Translate status from localized to English for internal use
    const internalStatus = status ? this.translateStatusToInternal(status) : undefined;
    
    const response = await this.commandHandler.handleCommand({
      command: 'listTasks',
      status: internalStatus,
      limit: 50,
    });

    if (!response.success) {
      console.error('❌ Failed to list tasks:', response.error);
      process.exit(1);
    }

    const { tasks } = response.data;
    
    if (tasks.length === 0) {
      console.log(this.i18n.t('cli.tasks.noTasks'));
      return;
    }

    console.log(`\n${this.i18n.t('cli.tasks.listHeader', status)}\n`);
    
    for (const task of tasks) {
      const statusIcon = this.i18n.getIcon('status', task.status);
      const priorityIcon = this.i18n.getIcon('priority', task.priority);
      const localizedStatus = this.i18n.translateField('status', task.status);
      const localizedType = this.i18n.translateField('type', task.type);
      const localizedPriority = this.i18n.translateField('priority', task.priority);
      const timeInfo = task.estimateMinutes > 0 ? ` (~${task.estimateMinutes}min)` : '';
      
      console.log(`${statusIcon} ${priorityIcon} [${localizedType.toUpperCase()}] ${task.title}${timeInfo}`);
      console.log(`   ${this.i18n.t('ui.labels.id')}: ${task.id}`);
      console.log(`   Status: ${localizedStatus} | ${this.i18n.t('ui.labels.estimate')}: ${localizedPriority}`);
      
      if (task.tags.length > 0) {
        console.log(`   ${this.i18n.t('ui.labels.tags')}: ${task.tags.join(', ')}`);
      }
      console.log('');
    }
  }

  async getTaskDetails(taskId: string): Promise<void> {
    const response = await this.commandHandler.handleCommand({
      command: 'getTaskDetails',
      taskId,
    });

    if (!response.success) {
      console.error('❌ Failed to get task details:', response.error);
      process.exit(1);
    }

    const { task, children, dependencies, blocking, canStart } = response.data;
    
    console.log(`\n📄 ${this.i18n.t('ui.labels.title')}:\n`);
    console.log(`${this.i18n.t('ui.labels.title')}: ${task.title}`);
    console.log(`${this.i18n.t('ui.labels.id')}: ${task.id}`);
    console.log(`Tipo: ${this.i18n.translateField('type', task.type)}`);
    console.log(`Status: ${this.i18n.getIcon('status', task.status)} ${this.i18n.translateField('status', task.status)}`);
    console.log(`Prioridade: ${this.i18n.getIcon('priority', task.priority)} ${this.i18n.translateField('priority', task.priority)}`);
    console.log(`${this.i18n.t('ui.labels.estimate')}: ${task.estimateMinutes} minutos`);
    console.log(`${this.i18n.t('ui.labels.actual')}: ${task.actualMinutes} minutos`);
    console.log(`Pode Iniciar: ${canStart ? '✅ Sim' : '❌ Não (bloqueada)'}`);
    
    if (task.tags.length > 0) {
      console.log(`${this.i18n.t('ui.labels.tags')}: ${task.tags.join(', ')}`);
    }
    
    console.log(`\n${this.i18n.t('ui.labels.description')}:\n${task.description}`);
    
    if (children.length > 0) {
      console.log(`\n📦 Subtarefas (${children.length}):`);
      for (const child of children) {
        console.log(`  ${this.i18n.getIcon('status', child.status)} ${child.title}`);
      }
    }
    
    if (dependencies.length > 0) {
      console.log(`\n🔗 Dependências (${dependencies.length}):`);
      for (const dep of dependencies) {
        console.log(`  ${this.i18n.getIcon('status', dep.status)} ${dep.title}`);
      }
    }
    
    if (blocking.length > 0) {
      console.log(`\n🚫 Tarefas Bloqueadas (${blocking.length}):`);
      for (const block of blocking) {
        console.log(`  ${this.i18n.getIcon('status', block.status)} ${block.title}`);
      }
    }
  }

  async getNextTask(): Promise<void> {
    const response = await this.commandHandler.handleCommand({
      command: 'getNextTask',
    });

    if (!response.success) {
      console.error('❌ Failed to get next task:', response.error);
      process.exit(1);
    }

    const { task, alternativeTasks, message } = response.data;
    
    if (!task) {
      console.log(`🎯 ${message || 'Nenhuma tarefa disponível'}`);
      return;
    }

    console.log('\n🎯 Próxima Tarefa Recomendada:\n');
    console.log(`${this.i18n.getIcon('priority', task.priority)} ${task.title}`);
    console.log(`   ${this.i18n.t('ui.labels.id')}: ${task.id}`);
    console.log(`   Tipo: ${this.i18n.translateField('type', task.type)}`);
    console.log(`   ${this.i18n.t('ui.labels.estimate')}: ${task.estimateMinutes} minutos`);
    console.log(`   Prioridade: ${this.i18n.translateField('priority', task.priority)}`);
    
    if (task.description) {
      const preview = task.description.substring(0, 200);
      console.log(`\n   ${this.i18n.t('ui.labels.description')}: ${preview}${task.description.length > 200 ? '...' : ''}`);
    }

    if (alternativeTasks && alternativeTasks.length > 0) {
      console.log('\n🔄 Tarefas Alternativas:');
      for (const alt of alternativeTasks) {
        const altPriority = this.i18n.translateField('priority', alt.priority);
        console.log(`   • ${alt.title} (${alt.estimateMinutes}min, ${altPriority})`);
      }
    }
    
    const commandPrefix = this.i18n.getLocale() === 'pt-BR' ? 'mcp-pt' : 'mcp';
    console.log(`\nPara ver detalhes: ${commandPrefix} details ${task.id}`);
    console.log(`Para iniciar: ${commandPrefix} begin ${task.id}`);
  }

  // Helper method to translate localized status to internal English
  private translateStatusToInternal(localizedStatus: string): string {
    const statusMap = {
      'pendente': 'pending',
      'em-andamento': 'in-progress', 
      'concluida': 'completed',
      'bloqueada': 'blocked',
      // English pass-through
      'pending': 'pending',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'blocked': 'blocked'
    };
    
    return statusMap[localizedStatus as keyof typeof statusMap] || localizedStatus;
  }

  async markTaskComplete(taskId: string, actualMinutes?: number): Promise<void> {
    const response = await this.commandHandler.handleCommand({
      command: 'markTaskComplete',
      taskId,
      actualMinutes,
    });

    if (!response.success) {
      console.error('❌ Failed to mark task complete:', response.error);
      process.exit(1);
    }

    const { task, completedAt, variance } = response.data;
    
    console.log(this.i18n.t('cli.workflow.taskCompleted', task.title));
    console.log(`✅ Concluída em: ${new Date(completedAt).toLocaleString(this.i18n.getLocale())}`);
    if (actualMinutes) {
      console.log(`⏱️  Tempo real: ${actualMinutes} minutos`);
      if (variance) {
        console.log(`📊 Variação: ${variance > 0 ? '+' : ''}${variance.toFixed(1)} minutos`);
      }
    }
  }

  async beginTask(taskId: string): Promise<void> {
    const response = await this.commandHandler.handleCommand({
      command: 'beginTask',
      taskId,
    });

    if (!response.success) {
      console.error('❌ Failed to begin task:', response.error);
      process.exit(1);
    }

    const { task, startedAt, estimatedCompletionTime } = response.data;
    
    console.log(this.i18n.t('cli.workflow.taskStarted', task.title));
    console.log(`⏰ Iniciada em: ${new Date(startedAt).toLocaleString(this.i18n.getLocale())}`);
    console.log(`🎯 Conclusão estimada: ${new Date(estimatedCompletionTime).toLocaleString(this.i18n.getLocale())}`);
    console.log(`⏱️  Esforço estimado: ${task.estimateMinutes} minutos`);
  }
}

// Setup CLI with locale detection
function setupCLI() {
  // Enhanced locale detection
  function detectSystemLocale(): SupportedLocale {
    // Check for explicit MCP language setting first
    if (process.env.MCP_LANG) {
      return process.env.MCP_LANG === 'pt-BR' ? 'pt-BR' : 'en';
    }
    
    // Check system environment
    const envLang = process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || '';
    
    if (envLang.includes('pt') || envLang.includes('BR')) {
      return 'pt-BR';
    }
    
    return 'en';
  }
  
  const locale = detectSystemLocale();
  const cli = new UnifiedMCPCLI(locale);
  
  // Command aliases based on locale
  const isPortuguese = locale === 'pt-BR';
  
  return yargs(hideBin(process.argv))
    .command(
      isPortuguese ? 'inicializar' : 'init',
      isPortuguese ? 'Inicializar um novo projeto MCP' : 'Initialize a new MCP project',
      {},
      () => cli.init()
    )
    .command(
      isPortuguese ? 'planejar <spec>' : 'plan <spec>',
      isPortuguese ? 'Gerar tarefas a partir de arquivo de especificação' : 'Generate tasks from specification file',
      (yargs) => {
        return yargs.positional('spec', {
          describe: isPortuguese ? 'Caminho para arquivo de especificação' : 'Path to specification file',
          type: 'string',
          demandOption: true,
        });
      },
      (argv) => cli.plan(argv.spec)
    )
    .command(
      isPortuguese ? ['tarefas [status]', 'listar [status]'] : ['tasks [status]', 'list [status]'],
      isPortuguese ? 'Listar tarefas, opcionalmente filtradas por status' : 'List tasks, optionally filtered by status',
      (yargs) => {
        const choices = isPortuguese ? 
          ['pendente', 'em-andamento', 'concluida', 'bloqueada'] : 
          ['pending', 'in-progress', 'completed', 'blocked'];
        
        return yargs.positional('status', {
          describe: isPortuguese ? 'Filtrar por status' : 'Filter by status',
          type: 'string',
          choices,
        });
      },
      (argv) => cli.listTasks(argv.status)
    )
    .command(
      isPortuguese ? ['detalhes <taskId>', 'mostrar <taskId>'] : ['details <taskId>', 'show <taskId>'],
      isPortuguese ? 'Mostrar informações detalhadas sobre uma tarefa' : 'Show detailed information about a task',
      (yargs) => {
        return yargs.positional('taskId', {
          describe: isPortuguese ? 'ID da Tarefa' : 'Task ID',
          type: 'string',
          demandOption: true,
        });
      },
      (argv) => cli.getTaskDetails(argv.taskId)
    )
    .command(
      isPortuguese ? 'proxima' : 'next',
      isPortuguese ? 'Obter a próxima tarefa recomendada' : 'Get the next recommended task',
      {},
      () => cli.getNextTask()
    )
    .command(
      isPortuguese ? ['iniciar <taskId>', 'comecar <taskId>'] : ['begin <taskId>', 'start <taskId>'],
      isPortuguese ? 'Iniciar trabalho em uma tarefa' : 'Begin working on a task',
      (yargs) => {
        return yargs.positional('taskId', {
          describe: isPortuguese ? 'ID da tarefa para iniciar' : 'Task ID to begin',
          type: 'string',
          demandOption: true,
        });
      },
      (argv) => cli.beginTask(argv.taskId)
    )
    .command(
      isPortuguese ? ['concluir <taskId> [minutes]', 'finalizar <taskId> [minutes]'] : ['complete <taskId> [minutes]', 'done <taskId> [minutes]'],
      isPortuguese ? 'Marcar tarefa como concluída' : 'Mark task as completed',
      (yargs) => {
        return yargs
          .positional('taskId', {
            describe: isPortuguese ? 'ID da tarefa para concluir' : 'Task ID to complete',
            type: 'string',
            demandOption: true,
          })
          .positional('minutes', {
            describe: isPortuguese ? 'Minutos gastos na tarefa' : 'Minutes spent on task',
            type: 'number',
          });
      },
      (argv) => cli.markTaskComplete(argv.taskId, argv.minutes)
    )
    .demandCommand(1, isPortuguese ? 'Você precisa de pelo menos um comando' : 'You need at least one command')
    .help(isPortuguese ? 'ajuda' : 'help')
    .alias(isPortuguese ? 'ajuda' : 'help', 'h')
    .version('1.0.0')
    .parse();
}

// Run CLI
setupCLI();