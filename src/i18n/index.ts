// Sistema de internacionalização para MCP Local
export type SupportedLocale = 'en' | 'pt-BR';

export interface LocalizedStrings {
  // CLI Messages
  cli: {
    init: {
      success: string;
      alreadyInitialized: string;
      nextSteps: string[];
    };
    planning: {
      processing: string;
      success: (tasks: number, deps: number) => string;
      failed: string;
    };
    tasks: {
      noTasks: string;
      listHeader: (status?: string) => string;
    };
    workflow: {
      taskStarted: (title: string) => string;
      taskCompleted: (title: string) => string;
      nextSteps: string[];
    };
  };
  
  // MCP Commands (for responses)
  commands: {
    generateTasks: string;
    listTasks: string;
    getTaskDetails: string;
    beginTask: string;
    markComplete: string;
    getNext: string;
    reflect: string;
    scaffold: string;
    hybridSearch: string;
    storeDocument: string;
    retrieveContext: string;
  };
  
  // Task Fields
  fields: {
    status: {
      pending: string;
      'in-progress': string;
      completed: string;
      blocked: string;
    };
    priority: {
      low: string;
      medium: string;
      high: string;
      critical: string;
    };
    type: {
      epic: string;
      story: string;
      task: string;
      subtask: string;
    };
  };
  
  // UI Elements
  ui: {
    icons: {
      status: Record<string, string>;
      priority: Record<string, string>;
    };
    labels: {
      id: string;
      title: string;
      description: string;
      estimate: string;
      actual: string;
      tags: string;
      created: string;
      updated: string;
    };
  };
}

// English (Default)
export const en: LocalizedStrings = {
  cli: {
    init: {
      success: '✅ MCP project initialized successfully!',
      alreadyInitialized: 'MCP project already initialized',
      nextSteps: [
        '1. Create a spec.md file with your project requirements',
        '2. Run: mcp plan spec.md',
        '3. View tasks: mcp tasks'
      ]
    },
    planning: {
      processing: '📋 Planning tasks from specification...',
      success: (tasks, deps) => `✅ Successfully created ${tasks} tasks with ${deps} dependencies`,
      failed: '❌ Failed to generate tasks'
    },
    tasks: {
      noTasks: '📝 No tasks found. Run "mcp plan spec.md" to create tasks from a specification.',
      listHeader: (status) => `📋 Tasks${status ? ` (${status})` : ''}:`
    },
    workflow: {
      taskStarted: (title) => `🚀 Task started: ${title}`,
      taskCompleted: (title) => `✅ Task completed: ${title}`,
      nextSteps: [
        'Run "mcp next" to get your next task!'
      ]
    }
  },
  commands: {
    generateTasks: 'generateTasksFromSpec',
    listTasks: 'listTasks',
    getTaskDetails: 'getTaskDetails',
    beginTask: 'beginTask',
    markComplete: 'markTaskComplete',
    getNext: 'getNextTask',
    reflect: 'reflectTask',
    scaffold: 'generateScaffold',
    hybridSearch: 'hybridSearch',
    storeDocument: 'storeDocument',
    retrieveContext: 'retrieveContext'
  },
  fields: {
    status: {
      pending: 'pending',
      'in-progress': 'in-progress',
      completed: 'completed',
      blocked: 'blocked'
    },
    priority: {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'critical'
    },
    type: {
      epic: 'epic',
      story: 'story',
      task: 'task',
      subtask: 'subtask'
    }
  },
  ui: {
    icons: {
      status: {
        pending: '⏳',
        'in-progress': '🚧',
        completed: '✅',
        blocked: '🚫'
      },
      priority: {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        critical: '🔴'
      }
    },
    labels: {
      id: 'ID',
      title: 'Title',
      description: 'Description',
      estimate: 'Estimate',
      actual: 'Actual',
      tags: 'Tags',
      created: 'Created',
      updated: 'Updated'
    }
  }
};

// Portuguese Brazil
export const ptBR: LocalizedStrings = {
  cli: {
    init: {
      success: '✅ Projeto MCP inicializado com sucesso!',
      alreadyInitialized: 'Projeto MCP já foi inicializado',
      nextSteps: [
        '1. Crie um arquivo spec.md com os requisitos do projeto',
        '2. Execute: mcp-pt planejar spec.md',
        '3. Visualize as tarefas: mcp-pt tarefas'
      ]
    },
    planning: {
      processing: '📋 Planejando tarefas a partir da especificação...',
      success: (tasks, deps) => `✅ ${tasks} tarefas criadas com sucesso e ${deps} dependências`,
      failed: '❌ Falha ao gerar tarefas'
    },
    tasks: {
      noTasks: '📝 Nenhuma tarefa encontrada. Execute "mcp-pt planejar spec.md" para criar tarefas a partir de uma especificação.',
      listHeader: (status) => `📋 Tarefas${status ? ` (${status})` : ''}:`
    },
    workflow: {
      taskStarted: (title) => `🚀 Tarefa iniciada: ${title}`,
      taskCompleted: (title) => `✅ Tarefa concluída: ${title}`,
      nextSteps: [
        'Execute "mcp-pt proxima" para obter sua próxima tarefa!'
      ]
    }
  },
  commands: {
    generateTasks: 'gerarTarefas',
    listTasks: 'listarTarefas', 
    getTaskDetails: 'detalhesTarefa',
    beginTask: 'iniciarTarefa',
    markComplete: 'concluirTarefa',
    getNext: 'proximaTarefa',
    reflect: 'reflexaoTarefa',
    scaffold: 'gerarEstructura',
    hybridSearch: 'buscaHibrida',
    storeDocument: 'armazenarDocumento',
    retrieveContext: 'recuperarContexto'
  },
  fields: {
    status: {
      pending: 'pendente',
      'in-progress': 'em-andamento',
      completed: 'concluida',
      blocked: 'bloqueada'
    },
    priority: {
      low: 'baixa',
      medium: 'media',
      high: 'alta',
      critical: 'critica'
    },
    type: {
      epic: 'epico',
      story: 'historia',
      task: 'tarefa',
      subtask: 'subtarefa'
    }
  },
  ui: {
    icons: {
      status: {
        pending: '⏳',
        'in-progress': '🚧',
        completed: '✅',
        blocked: '🚫'
      },
      priority: {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        critical: '🔴'
      }
    },
    labels: {
      id: 'ID',
      title: 'Título',
      description: 'Descrição',
      estimate: 'Estimativa',
      actual: 'Real',
      tags: 'Tags',
      created: 'Criado em',
      updated: 'Atualizado em'
    }
  }
};

// Locale registry
const locales: Record<SupportedLocale, LocalizedStrings> = {
  en,
  'pt-BR': ptBR
};

// i18n class
export class I18n {
  private locale: SupportedLocale;
  private strings: LocalizedStrings;

  constructor(locale: SupportedLocale = 'en') {
    this.locale = locale;
    this.strings = locales[locale];
  }

  // Get localized string with path
  t(path: string, ...args: any[]): string {
    const keys = path.split('.');
    let value: any = this.strings;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    if (typeof value === 'function') {
      return value(...args);
    }
    
    return value || path;
  }

  // Get array values directly
  getArray(path: string): string[] {
    const keys = path.split('.');
    let value: any = this.strings;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    return Array.isArray(value) ? value : [value || path];
  }

  // Get command name for MCP
  getCommand(englishCommand: string): string {
    const commandMap = Object.fromEntries(
      Object.entries(this.strings.commands).map(([key, value]) => [value, key])
    );
    return commandMap[englishCommand] || englishCommand;
  }

  // Translate field values
  translateField(field: 'status' | 'priority' | 'type', value: string): string {
    return this.strings.fields[field][value as keyof typeof this.strings.fields[typeof field]] || value;
  }

  // Get icon for status/priority
  getIcon(type: 'status' | 'priority', value: string): string {
    return this.strings.ui.icons[type][value] || '❓';
  }

  // Switch locale
  setLocale(locale: SupportedLocale): void {
    this.locale = locale;
    this.strings = locales[locale];
  }

  getLocale(): SupportedLocale {
    return this.locale;
  }
}

// Auto-detect locale from environment
export function detectLocale(): SupportedLocale {
  const envLang = process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || '';
  
  if (envLang.includes('pt') || envLang.includes('BR')) {
    return 'pt-BR';
  }
  
  return 'en';
}

// Create singleton instance
export const i18n = new I18n(detectLocale());