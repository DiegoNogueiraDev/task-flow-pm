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

class MCPCLI {
  private config: MCPConfig;
  private db: GraphDB;
  private embeddings: EmbeddingsService;
  private logger: Logger;
  private commandHandler: MCPCommandHandler;

  constructor() {
    this.config = this.loadConfig();
    this.ensureDirectoryExists(dirname(this.config.dbPath));
    this.db = new GraphDB(this.config.dbPath);
    this.embeddings = new EmbeddingsService(this.config.embeddingsModel);
    this.logger = new Logger(this.config.esEndpoint);
    this.commandHandler = new MCPCommandHandler(this.db, this.embeddings, this.logger);
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

  private ensureDirectoryExists(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async init(): Promise<void> {
    const configPath = resolve(process.cwd(), 'mcp.json');
    
    if (existsSync(configPath)) {
      console.log('MCP project already initialized');
      return;
    }

    const defaultConfig: MCPConfig = {
      dbPath: '.mcp/graph.db',
      embeddingsModel: 'all-MiniLM-L6-v2',
      esEndpoint: 'http://localhost:9200/mcp-events',
      contextTokens: 1024,
    };

    writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    this.ensureDirectoryExists('.mcp');
    
    console.log('✅ MCP project initialized!');
    console.log(`📁 Config created at: ${configPath}`);
    console.log(`📊 Database will be stored at: ${defaultConfig.dbPath}`);
    console.log('\nNext steps:');
    console.log('1. Create a spec.md file with your project requirements');
    console.log('2. Run: mcp plan spec.md');
    console.log('3. View tasks: mcp tasks');
  }

  async plan(specFile: string): Promise<void> {
    if (!existsSync(specFile)) {
      console.error(`❌ Spec file not found: ${specFile}`);
      process.exit(1);
    }

    const specText = readFileSync(specFile, 'utf-8');
    
    console.log('📋 Planning tasks from specification...');
    
    const response = await this.commandHandler.handleCommand({
      command: 'generateTasksFromSpec',
      specText,
    });

    if (!response.success) {
      console.error('❌ Failed to generate tasks:', response.error);
      process.exit(1);
    }

    const { tasksCreated, dependenciesCreated } = response.data;
    
    console.log(`✅ Successfully created ${tasksCreated} tasks with ${dependenciesCreated} dependencies`);
    console.log('\nRun "mcp tasks" to see all tasks or "mcp next" to get the next task to work on.');
  }

  async listTasks(status?: string): Promise<void> {
    const response = await this.commandHandler.handleCommand({
      command: 'listTasks',
      status,
      limit: 50,
    });

    if (!response.success) {
      console.error('❌ Failed to list tasks:', response.error);
      process.exit(1);
    }

    const { tasks } = response.data;
    
    if (tasks.length === 0) {
      console.log('📝 No tasks found. Run "mcp plan spec.md" to create tasks from a specification.');
      return;
    }

    console.log(`\n📋 Tasks${status ? ` (${status})` : ''}:\n`);
    
    for (const task of tasks) {
      const statusIcon = this.getStatusIcon(task.status);
      const priorityIcon = this.getPriorityIcon(task.priority);
      const timeInfo = task.estimateMinutes > 0 ? ` (~${task.estimateMinutes}min)` : '';
      
      console.log(`${statusIcon} ${priorityIcon} [${task.type.toUpperCase()}] ${task.title}${timeInfo}`);
      console.log(`   ID: ${task.id}`);
      
      if (task.tags.length > 0) {
        console.log(`   Tags: ${task.tags.join(', ')}`);
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
    
    console.log(`\n📄 Task Details:\n`);
    console.log(`Title: ${task.title}`);
    console.log(`ID: ${task.id}`);
    console.log(`Type: ${task.type}`);
    console.log(`Status: ${this.getStatusIcon(task.status)} ${task.status}`);
    console.log(`Priority: ${this.getPriorityIcon(task.priority)} ${task.priority}`);
    console.log(`Estimate: ${task.estimateMinutes} minutes`);
    console.log(`Actual: ${task.actualMinutes} minutes`);
    console.log(`Can Start: ${canStart ? '✅ Yes' : '❌ No (blocked)'}`);
    
    if (task.tags.length > 0) {
      console.log(`Tags: ${task.tags.join(', ')}`);
    }
    
    console.log(`\nDescription:\n${task.description}`);
    
    if (children.length > 0) {
      console.log(`\n📦 Subtasks (${children.length}):`);
      for (const child of children) {
        console.log(`  ${this.getStatusIcon(child.status)} ${child.title}`);
      }
    }
    
    if (dependencies.length > 0) {
      console.log(`\n🔗 Dependencies (${dependencies.length}):`);
      for (const dep of dependencies) {
        console.log(`  ${this.getStatusIcon(dep.status)} ${dep.title}`);
      }
    }
    
    if (blocking.length > 0) {
      console.log(`\n🚫 Blocking Tasks (${blocking.length}):`);
      for (const block of blocking) {
        console.log(`  ${this.getStatusIcon(block.status)} ${block.title}`);
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
      console.log(`🎯 ${message || 'No tasks available'}`);
      return;
    }

    console.log('\n🎯 Next Recommended Task:\n');
    console.log(`${this.getPriorityIcon(task.priority)} ${task.title}`);
    console.log(`   ID: ${task.id}`);
    console.log(`   Type: ${task.type}`);
    console.log(`   Estimate: ${task.estimateMinutes} minutes`);
    console.log(`   Priority: ${task.priority}`);
    
    if (task.description) {
      console.log(`\n   Description: ${task.description.substring(0, 200)}${task.description.length > 200 ? '...' : ''}`);
    }

    if (alternativeTasks && alternativeTasks.length > 0) {
      console.log('\n🔄 Alternative Tasks:');
      for (const alt of alternativeTasks) {
        console.log(`   • ${alt.title} (${alt.estimateMinutes}min, ${alt.priority})`);
      }
    }
    
    console.log(`\nTo start this task, run: mcp details ${task.id}`);
    console.log(`To mark it complete, run: mcp done ${task.id}`);
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
    
    console.log(`🚀 Task started: ${task.title}`);
    console.log(`⏰ Started at: ${new Date(startedAt).toLocaleString()}`);
    console.log(`🎯 Estimated completion: ${new Date(estimatedCompletionTime).toLocaleString()}`);
    console.log(`⏱️  Estimated effort: ${task.estimateMinutes} minutes`);
    
    console.log('\nNext steps:');
    console.log(`- Work on the task requirements`);
    console.log(`- Run "mcp scaffold ${taskId}" to generate code structure`);
    console.log(`- Run "mcp done ${taskId} [actual-minutes]" when complete`);
  }

  async reflectOnTask(taskId: string, note: string): Promise<void> {
    const response = await this.commandHandler.handleCommand({
      command: 'reflectTask',
      taskId,
      note,
    });

    if (!response.success) {
      console.error('❌ Failed to add reflection:', response.error);
      process.exit(1);
    }

    const { reflection, task, totalReflections } = response.data;
    
    console.log(`💭 Reflection added for: ${task}`);
    console.log(`📝 Note: ${note}`);
    console.log(`📊 Total reflections: ${totalReflections}`);
    console.log(`🕐 Timestamp: ${new Date(reflection.timestamp).toLocaleString()}`);
  }

  async generateScaffold(taskId: string): Promise<void> {
    const response = await this.commandHandler.handleCommand({
      command: 'generateScaffold',
      taskId,
    });

    if (!response.success) {
      console.error('❌ Failed to generate scaffold:', response.error);
      process.exit(1);
    }

    const { scaffoldPath, files, task } = response.data;
    
    console.log(`🏗️  Scaffold generated for: ${task.title}`);
    console.log(`📁 Base directory: ${scaffoldPath}`);
    console.log('\n📄 Generated files:');
    console.log(`  📖 README: ${files.readme}`);
    console.log(`  💻 Implementation: ${files.implementation}`);
    console.log(`  🧪 Tests: ${files.test}`);
    
    console.log('\n🚀 Next steps:');
    console.log('1. Review the generated README for requirements');
    console.log('2. Implement the functionality in the generated files');
    console.log('3. Run the tests to verify your implementation');
    console.log('4. Update documentation as needed');
  }

  async hybridSearch(query: string, limit = 5): Promise<void> {
    const response = await this.commandHandler.handleCommand({
      command: 'hybridSearch',
      query,
      k: limit,
    });

    if (!response.success) {
      console.error('❌ Search failed:', response.error);
      process.exit(1);
    }

    const { results, meta } = response.data;
    
    console.log(`\n🔍 Hybrid search results for: "${query}"\n`);
    
    if (results.length === 0) {
      console.log('🤷 No results found');
      return;
    }

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const { task, scores } = result;
      
      console.log(`${i + 1}. ${this.getPriorityIcon(task.priority)} ${task.title}`);
      console.log(`   ID: ${task.id}`);
      console.log(`   Type: ${task.type} | Status: ${this.getStatusIcon(task.status)} ${task.status}`);
      console.log(`   📊 Scores: Sim=${scores.similarity.toFixed(3)} Graph=${scores.graph.toFixed(3)} Final=${scores.final.toFixed(3)}`);
      
      if (task.description.length > 0) {
        const preview = task.description.substring(0, 100);
        console.log(`   📝 ${preview}${task.description.length > 100 ? '...' : ''}`);
      }
      console.log('');
    }
    
    console.log(`📈 Found ${meta.totalFound} results using ${meta.searchType} search`);
  }

  async showLearningStats(): Promise<void> {
    // For now, let's get the stats through a direct database call
    // In a real implementation, we'd add a specific command for this
    const learningStats = (this.commandHandler as any).db ? 
      (this.commandHandler as any).db.getEstimationVariances(10) : [];
    
    console.log('\n📊 Learning & Estimation Statistics\n');
    
    if (learningStats.length === 0) {
      console.log('📝 No completed tasks with time tracking yet');
      console.log('Complete some tasks with actual time logging to see learning stats');
      return;
    }

    const avgVariance = learningStats.reduce((sum: number, v: any) => sum + v.variance, 0) / learningStats.length;
    const overestimations = learningStats.filter((v: any) => v.variance < 0).length;
    const underestimations = learningStats.filter((v: any) => v.variance > 0).length;
    
    console.log(`🎯 Average estimation variance: ${avgVariance.toFixed(1)}%`);
    console.log(`📈 Underestimations: ${underestimations} tasks`);
    console.log(`📉 Overestimations: ${overestimations} tasks`);
    console.log(`✅ Total completed with tracking: ${learningStats.length} tasks`);
    
    console.log('\n📋 Recent estimation performance:');
    learningStats.slice(0, 5).forEach((stat: any, i: number) => {
      const varianceIcon = stat.variance > 0 ? '📈' : stat.variance < 0 ? '📉' : '🎯';
      console.log(`  ${i + 1}. ${varianceIcon} ${stat.variance.toFixed(1)}% (Est: ${stat.estimate}min, Actual: ${stat.actual}min)`);
    });
  }

  async markDone(taskId: string, actualMinutes?: number): Promise<void> {
    const request: any = {
      command: 'markTaskComplete',
      taskId,
    };
    
    if (actualMinutes !== undefined) {
      request.actualMinutes = actualMinutes;
    }
    
    const response = await this.commandHandler.handleCommand(request);

    if (!response.success) {
      console.error('❌ Failed to mark task complete:', response.error);
      process.exit(1);
    }

    const { task, variance } = response.data;
    
    console.log(`✅ Task completed: ${task.title}`);
    
    if (actualMinutes) {
      const varianceText = variance > 0 ? 
        `${variance.toFixed(1)}% over estimate` : 
        `${Math.abs(variance).toFixed(1)}% under estimate`;
      console.log(`⏱️  Time: ${actualMinutes}min (estimated: ${task.estimateMinutes}min, ${varianceText})`);
    }
    
    console.log('\nRun "mcp next" to get your next task!');
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return '⏳';
      case 'in-progress': return '🚧';
      case 'completed': return '✅';
      case 'blocked': return '🚫';
      default: return '❓';
    }
  }

  private getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }
}

// CLI setup
const cli = new MCPCLI();

yargs(hideBin(process.argv))
  .command(
    'init',
    'Initialize a new MCP project',
    {},
    () => cli.init()
  )
  .command(
    'plan <spec>',
    'Generate tasks from a specification file',
    (yargs) => {
      return yargs.positional('spec', {
        describe: 'Path to specification file',
        type: 'string',
        demandOption: true,
      });
    },
    (argv) => cli.plan(argv.spec)
  )
  .command(
    ['tasks [status]', 'list [status]'],
    'List tasks, optionally filtered by status',
    (yargs) => {
      return yargs.positional('status', {
        describe: 'Filter by status (pending, in-progress, completed, blocked)',
        type: 'string',
        choices: ['pending', 'in-progress', 'completed', 'blocked'],
      });
    },
    (argv) => cli.listTasks(argv.status)
  )
  .command(
    ['details <taskId>', 'show <taskId>'],
    'Show detailed information about a task',
    (yargs) => {
      return yargs.positional('taskId', {
        describe: 'Task ID',
        type: 'string',
        demandOption: true,
      });
    },
    (argv) => cli.getTaskDetails(argv.taskId)
  )
  .command(
    'next',
    'Get the next recommended task to work on',
    {},
    () => cli.getNextTask()
  )
  .command(
    ['begin <taskId>', 'start <taskId>'],
    'Begin working on a task (sets status to in-progress)',
    (yargs) => {
      return yargs.positional('taskId', {
        describe: 'Task ID to begin',
        type: 'string',
        demandOption: true,
      });
    },
    (argv) => cli.beginTask(argv.taskId)
  )
  .command(
    'done <taskId> [time]',
    'Mark a task as complete',
    (yargs) => {
      return yargs
        .positional('taskId', {
          describe: 'Task ID',
          type: 'string',
          demandOption: true,
        })
        .positional('time', {
          describe: 'Actual time spent in minutes',
          type: 'number',
        });
    },
    (argv) => cli.markDone(argv.taskId, argv.time)
  )
  .command(
    ['reflect <taskId> <note>', 'note <taskId> <note>'],
    'Add a reflection note to a task',
    (yargs) => {
      return yargs
        .positional('taskId', {
          describe: 'Task ID',
          type: 'string',
          demandOption: true,
        })
        .positional('note', {
          describe: 'Reflection note',
          type: 'string',
          demandOption: true,
        });
    },
    (argv) => cli.reflectOnTask(argv.taskId, argv.note)
  )
  .command(
    ['scaffold <taskId>', 'generate <taskId>'],
    'Generate code scaffold for a task',
    (yargs) => {
      return yargs.positional('taskId', {
        describe: 'Task ID to generate scaffold for',
        type: 'string',
        demandOption: true,
      });
    },
    (argv) => cli.generateScaffold(argv.taskId)
  )
  .command(
    ['search <query>', 'find <query>'],
    'Search tasks using hybrid search',
    (yargs) => {
      return yargs
        .positional('query', {
          describe: 'Search query',
          type: 'string',
          demandOption: true,
        })
        .option('limit', {
          alias: 'l',
          describe: 'Maximum number of results',
          type: 'number',
          default: 5,
        });
    },
    (argv) => cli.hybridSearch(argv.query, argv.limit)
  )
  .command(
    ['stats', 'learning'],
    'Show learning and estimation statistics',
    {},
    () => cli.showLearningStats()
  )
  .demandCommand(1, 'You need at least one command')
  .help()
  .alias('help', 'h')
  .version('1.0.0')
  .parse();