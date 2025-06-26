/**
 * Serviço de integração com Docling
 * Converte documentos (PDF, DOCX, etc.) em tarefas, histórias e contexto
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';
import { randomUUID } from 'crypto';

export interface DoclingConversionResult {
  success: boolean;
  content?: string;
  metadata?: {
    title: string;
    page_count: number;
    tables_count: number;
    images_count: number;
    text_length: number;
    source_file: string;
  };
  format?: string;
  error?: string;
}

export interface DocumentProcessingOptions {
  format?: 'markdown' | 'html' | 'json';
  generateTasks?: boolean;
  generateContext?: boolean;
  storyMapping?: boolean;
}

export interface ProcessedDocument {
  id: string;
  sourceFile: string;
  content: string;
  metadata: any;
  tasks?: any[];
  context?: any[];
  stories?: any[];
  processedAt: Date;
}

export interface ExtractedTask {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  estimatedMinutes: number;
  source: string;
  extractedAt: Date;
}

export class DoclingService {
  private processedDocuments: Map<string, ProcessedDocument> = new Map();
  private pythonPath: string;

  constructor() {
    // Detecta caminho do Python (ambiente virtual ou sistema)
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
  }

  /**
   * Converte documento usando Docling
   */
  async convertDocument(
    filePath: string, 
    options: DocumentProcessingOptions = {}
  ): Promise<DoclingConversionResult> {
    const { format = 'markdown' } = options;

    try {
      console.log(`[Docling] Iniciando conversão: ${filePath} -> ${format}`);

      const result = await this.runDoclingBridge(filePath, format);
      
      if (result.success) {
        console.log(`[Docling] Conversão bem-sucedida: ${result.metadata?.text_length} chars`);
      }

      return result;
    } catch (error: any) {
      console.error(`[Docling] Erro na conversão: ${error.message}`);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Processa documento completo - conversão + geração de tarefas/contexto
   */
  async processDocument(
    filePath: string,
    options: DocumentProcessingOptions = {}
  ): Promise<ProcessedDocument> {
    const documentId = randomUUID();
    
    // Converte documento
    const conversion = await this.convertDocument(filePath, options);
    
    if (!conversion.success) {
      throw new Error(`Falha na conversão: ${conversion.error}`);
    }

    const processedDoc: ProcessedDocument = {
      id: documentId,
      sourceFile: filePath,
      content: conversion.content!,
      metadata: conversion.metadata!,
      processedAt: new Date()
    };

    // Gera tarefas se solicitado
    if (options.generateTasks) {
      processedDoc.tasks = await this.extractTasks(conversion.content!);
    }

    // Gera contexto se solicitado
    if (options.generateContext) {
      processedDoc.context = await this.extractContext(conversion.content!);
    }

    // Mapeia histórias se solicitado
    if (options.storyMapping) {
      processedDoc.stories = await this.extractStories(conversion.content!);
    }

    // Armazena documento processado
    this.processedDocuments.set(documentId, processedDoc);

    console.log(`[Docling] Documento processado: ${documentId} (${processedDoc.tasks?.length || 0} tarefas)`);

    return processedDoc;
  }

  /**
   * Extrai tarefas do conteúdo convertido
   */
  private async extractTasks(content: string): Promise<ExtractedTask[]> {
    const tasks: ExtractedTask[] = [];
    
    // Busca por padrões que indicam tarefas
    const taskPatterns = [
      /TODO:?\s*(.+)/gi,
      /TASK:?\s*(.+)/gi,
      /Action:?\s*(.+)/gi,
      /\[\s*\]\s*(.+)/g, // checkboxes
      /^\s*[-*]\s*(.+(?:implement|develop|create|build|fix|test).+)$/gmi
    ];

    taskPatterns.forEach((pattern, index) => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        tasks.push({
          id: randomUUID(),
          title: match[1]?.trim() || '',
          description: `Tarefa extraída automaticamente do documento`,
          type: `docling-task-${index}`,
          priority: 'medium',
          estimatedMinutes: 60, // estimativa padrão
          source: 'docling-extraction',
          extractedAt: new Date()
        });
      }
    });

    // Busca por seções de requisitos/especificações
    const requirementSections = content.match(/(?:requisitos?|requirements?|especifica[çc][õo]es?|specifications?)[\s\S]*?(?=\n\n|\n#|$)/gi);
    
    if (requirementSections) {
      requirementSections.forEach(section => {
        const items = section.split('\n').filter(line => 
          line.trim() && 
          (line.includes('-') || line.includes('*') || /^\d+\./.test(line.trim()))
        );
        
        items.forEach(item => {
          const cleaned = item.replace(/^[-*\d.]\s*/, '').trim();
          if (cleaned.length > 10) {
            tasks.push({
              id: randomUUID(),
              title: cleaned.length > 100 ? cleaned.substring(0, 97) + '...' : cleaned,
              description: cleaned,
              type: 'requirement',
              priority: 'high',
              estimatedMinutes: 120,
              source: 'docling-requirements',
              extractedAt: new Date()
            });
          }
        });
      });
    }

    return tasks;
  }

  /**
   * Extrai contexto relevante do conteúdo
   */
  private async extractContext(content: string): Promise<any[]> {
    const contexts: any[] = [];
    
    // Extrai seções importantes
    const sections = content.split(/\n#+\s/);
    
    sections.forEach((section, index) => {
      if (section.trim().length > 100) {
        const lines = section.split('\n');
        const title = lines[0]?.trim() || `Seção ${index + 1}`;
        const sectionContent = lines.slice(1).join('\n').trim();
        
        contexts.push({
          id: randomUUID(),
          title,
          content: sectionContent,
          type: 'document-section',
          tags: this.extractTags(sectionContent),
          relevanceScore: this.calculateRelevance(sectionContent),
          extractedAt: new Date()
        });
      }
    });

    return contexts;
  }

  /**
   * Extrai histórias/casos de uso do conteúdo
   */
  private async extractStories(content: string): Promise<any[]> {
    const stories: any[] = [];
    
    // Busca por padrões de user stories
    const storyPatterns = [
      /(?:como|as)\s+(?:um|uma|an?)\s+(.+?),?\s+(?:eu quero|i want|i need|preciso)\s+(.+?)(?:\s+(?:para que|so that|to)\s+(.+?))?[.!]?/gi,
      /user story:?\s*(.+)/gi,
      /história:?\s*(.+)/gi
    ];

    storyPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        stories.push({
          id: randomUUID(),
          title: match[0]?.trim(),
          actor: match[1]?.trim(),
          action: match[2]?.trim(),
          benefit: match[3]?.trim(),
          type: 'user-story',
          extractedAt: new Date()
        });
      }
    });

    return stories;
  }

  /**
   * Extrai tags relevantes do conteúdo
   */
  private extractTags(content: string): string[] {
    const commonTags = [
      'frontend', 'backend', 'api', 'database', 'security', 'performance',
      'ui', 'ux', 'testing', 'deployment', 'documentation', 'architecture'
    ];
    
    const lowerContent = content.toLowerCase();
    return commonTags.filter(tag => lowerContent.includes(tag));
  }

  /**
   * Calcula relevância do conteúdo (0-1)
   */
  private calculateRelevance(content: string): number {
    const keywords = ['desenvolvimento', 'implementar', 'criar', 'construir', 'testar', 'deploy'];
    const lowerContent = content.toLowerCase();
    
    const matches = keywords.filter(keyword => lowerContent.includes(keyword)).length;
    return Math.min(matches / keywords.length, 1);
  }

  /**
   * Executa o bridge Python para Docling
   */
  private async runDoclingBridge(filePath: string, format: string): Promise<DoclingConversionResult> {
    return new Promise((resolve, reject) => {
      // Tenta primeiro o Docling real, depois o mock
      const scripts = [
        join(process.cwd(), 'scripts/docling_bridge.py'),
        join(process.cwd(), 'scripts/docling_bridge_mock.py')
      ];
      
      let currentScript = 0;
      
      const tryScript = () => {
        if (currentScript >= scripts.length) {
          reject(new Error('Neither real Docling nor mock bridge are available'));
          return;
        }
        
        const scriptPath = scripts[currentScript];
        const args = [scriptPath, filePath, '--format', format];
        
        // Usa venv se disponível para o primeiro script, Python sistema para o mock
        const pythonCommand = currentScript === 0 && process.env.VIRTUAL_ENV 
          ? join(process.env.VIRTUAL_ENV, 'bin/python')
          : this.pythonPath;

        const child = spawn(pythonCommand, args, {
          cwd: process.cwd(),
          env: { ...process.env }
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              resolve(result);
            } catch (error) {
              reject(new Error(`Erro ao parsing do JSON: ${error}`));
            }
          } else {
            console.warn(`Script ${currentScript + 1} failed, trying next...`);
            currentScript++;
            tryScript();
          }
        });

        child.on('error', (error) => {
          console.warn(`Script ${currentScript + 1} error: ${error.message}, trying next...`);
          currentScript++;
          tryScript();
        });
      };
      
      tryScript();
    });
  }

  /**
   * Lista documentos processados
   */
  getProcessedDocuments(): ProcessedDocument[] {
    return Array.from(this.processedDocuments.values());
  }

  /**
   * Obtém documento processado por ID
   */
  getProcessedDocument(id: string): ProcessedDocument | undefined {
    return this.processedDocuments.get(id);
  }

  /**
   * Converte arquivo local e salva resultado
   */
  async convertAndSave(
    inputPath: string,
    outputPath?: string,
    options: DocumentProcessingOptions = {}
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    try {
      const processed = await this.processDocument(inputPath, options);
      
      const finalOutputPath = outputPath || inputPath.replace(extname(inputPath), '.processed.json');
      
      await fs.writeFile(finalOutputPath, JSON.stringify(processed, null, 2));
      
      return {
        success: true,
        outputPath: finalOutputPath
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Instância singleton
export const doclingService = new DoclingService(); 