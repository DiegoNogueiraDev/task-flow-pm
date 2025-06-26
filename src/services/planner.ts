import { TaskNode } from '../mcp/schema';
import { EffortEstimator } from './effort';
import { randomUUID } from 'crypto';

export interface PlanResult {
  tasks: TaskNode[];
  dependencies: Array<{
    fromId: string;
    toId: string;
    type: 'depends_on' | 'blocks' | 'child_of';
  }>;
}

export class TaskPlanner {
  static async plan(specText: string): Promise<PlanResult> {
    // This is a simplified planner that uses rule-based decomposition
    // In a real implementation, this would use LLM APIs or more sophisticated AI
    const sections = this.parseSpecIntoSections(specText);
    const tasks: TaskNode[] = [];
    const dependencies: Array<{
      fromId: string;
      toId: string;
      type: 'depends_on' | 'blocks' | 'child_of';
    }> = [];

    // Create epics from main sections
    for (const section of sections) {
      const epic = this.createEpic(section);
      tasks.push(epic);

      // Break down epic into stories
      const stories = this.breakdownIntoStories(section, epic.id);
      tasks.push(...stories);

      // Create child relationships
      for (const story of stories) {
        dependencies.push({
          fromId: story.id,
          toId: epic.id,
          type: 'child_of',
        });

        // Break down stories into tasks
        const storyTasks = this.breakdownIntoTasks(story, epic.id);
        tasks.push(...storyTasks);

        // Create child relationships for tasks
        for (const task of storyTasks) {
          dependencies.push({
            fromId: task.id,
            toId: story.id,
            type: 'child_of',
          });
        }
      }
    }

    // Add logical dependencies between tasks
    this.addLogicalDependencies(tasks, dependencies);

    return { tasks, dependencies };
  }

  private static parseSpecIntoSections(specText: string): Array<{
    title: string;
    content: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const lines = specText.split('\n').filter(line => line.trim());
    const sections: Array<{
      title: string;
      content: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
    }> = [];

    let currentSection: {
      title: string;
      content: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
    } | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check if this is a header
      if (trimmed.startsWith('#') || this.isLikelyHeader(trimmed)) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: trimmed.replace(/^#+\s*/, ''),
          content: '',
          priority: this.extractPriority(trimmed),
        };
      } else if (currentSection) {
        currentSection.content += trimmed + '\n';
      }
    }

    // Don't forget the last section
    if (currentSection) {
      sections.push(currentSection);
    }

    // If no sections found, create a default one
    if (sections.length === 0) {
      sections.push({
        title: 'Main Feature',
        content: specText,
        priority: 'medium',
      });
    }

    return sections;
  }

  private static isLikelyHeader(text: string): boolean {
    const headerPatterns = [
      /^\d+\./,  // 1. numbered list
      /^[A-Z][^.]*:$/,  // Title:
      /^[A-Z\s]+$/,  // ALL CAPS
    ];
    
    return headerPatterns.some(pattern => pattern.test(text)) && text.length < 100;
  }

  private static extractPriority(text: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('critical') || lowerText.includes('urgent')) {
      return 'critical';
    }
    if (lowerText.includes('high') || lowerText.includes('important')) {
      return 'high';
    }
    if (lowerText.includes('low') || lowerText.includes('nice')) {
      return 'low';
    }
    
    return 'medium';
  }

  private static createEpic(section: {
    title: string;
    content: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }): TaskNode {
    const id = randomUUID();
    const estimateMinutes = EffortEstimator.estimateEffort({
      description: section.content,
      type: 'epic',
      priority: section.priority,
    });

    return {
      id,
      title: section.title,
      description: section.content,
      type: 'epic',
      status: 'pending',
      estimateMinutes,
      actualMinutes: 0,
      priority: section.priority,
      tags: this.extractTags(section.content),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private static breakdownIntoStories(
    section: {
      title: string;
      content: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
    },
    parentId: string
  ): TaskNode[] {
    const stories: TaskNode[] = [];
    
    // Simple heuristic: look for user stories or major features
    const storyPatterns = [
      /As a .* I want .* so that .*/gi,  // User story format
      /Feature: .*/gi,  // Feature format
      /Story: .*/gi,   // Story format
    ];

    let foundStories = false;
    for (const pattern of storyPatterns) {
      const matches = section.content.match(pattern);
      if (matches) {
        foundStories = true;
        for (const match of matches) {
          stories.push(this.createStory(match.trim(), section.priority, parentId));
        }
        break;
      }
    }

    // If no explicit stories found, create default stories based on content
    if (!foundStories) {
      const defaultStories = this.generateDefaultStories(section);
      for (const story of defaultStories) {
        stories.push(this.createStory(story, section.priority, parentId));
      }
    }

    return stories;
  }

  private static generateDefaultStories(section: {
    title: string;
    content: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }): string[] {
    const content = section.content.toLowerCase();
    const stories: string[] = [];

    // Common patterns for web applications
    if (content.includes('login') || content.includes('auth')) {
      stories.push('User Authentication System');
    }
    if (content.includes('dashboard') || content.includes('home')) {
      stories.push('Main Dashboard Interface');
    }
    if (content.includes('profile') || content.includes('account')) {
      stories.push('User Profile Management');
    }
    if (content.includes('admin') || content.includes('management')) {
      stories.push('Administrative Interface');
    }
    if (content.includes('api') || content.includes('backend')) {
      stories.push('Backend API Development');
    }
    if (content.includes('database') || content.includes('data')) {
      stories.push('Data Layer Implementation');
    }

    // If no specific patterns, create generic stories
    if (stories.length === 0) {
      stories.push(`${section.title} - Core Implementation`);
      stories.push(`${section.title} - User Interface`);
      stories.push(`${section.title} - Testing & Validation`);
    }

    return stories;
  }

  private static createStory(
    storyText: string,
    priority: 'low' | 'medium' | 'high' | 'critical',
    parentId: string
  ): TaskNode {
    const id = randomUUID();
    const estimateMinutes = EffortEstimator.estimateEffort({
      description: storyText,
      type: 'story',
      priority,
    });

    return {
      id,
      title: storyText.split('\n')[0].substring(0, 100), // First line, max 100 chars
      description: storyText,
      type: 'story',
      status: 'pending',
      estimateMinutes,
      actualMinutes: 0,
      priority,
      tags: this.extractTags(storyText),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parentId,
    };
  }

  private static breakdownIntoTasks(story: TaskNode, epicId: string): TaskNode[] {
    const tasks: TaskNode[] = [];
    const storyContent = story.description.toLowerCase();

    // Generate tasks based on story content
    const taskTemplates = this.getTaskTemplates(storyContent);
    
    for (const template of taskTemplates) {
      const id = randomUUID();
      const estimateMinutes = EffortEstimator.estimateEffort({
        description: template,
        type: 'task',
        priority: story.priority,
      });

      tasks.push({
        id,
        title: template.split('\n')[0].substring(0, 80),
        description: template,
        type: 'task',
        status: 'pending',
        estimateMinutes,
        actualMinutes: 0,
        priority: story.priority,
        tags: this.extractTags(template),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parentId: story.id,
      });
    }

    return tasks;
  }

  private static getTaskTemplates(storyContent: string): string[] {
    const tasks: string[] = [];

    // Common development tasks based on story content
    if (storyContent.includes('auth') || storyContent.includes('login')) {
      tasks.push('Design authentication database schema');
      tasks.push('Implement user registration endpoint');
      tasks.push('Implement login endpoint');
      tasks.push('Create login form UI');
      tasks.push('Add session management');
      tasks.push('Write authentication tests');
    } else if (storyContent.includes('dashboard')) {
      tasks.push('Design dashboard layout');
      tasks.push('Create dashboard components');
      tasks.push('Implement data fetching');
      tasks.push('Add responsive design');
      tasks.push('Test dashboard functionality');
    } else if (storyContent.includes('api')) {
      tasks.push('Design API endpoints');
      tasks.push('Implement CRUD operations');
      tasks.push('Add input validation');
      tasks.push('Write API documentation');
      tasks.push('Add error handling');
      tasks.push('Write API tests');
    } else {
      // Generic tasks
      tasks.push('Research and design approach');
      tasks.push('Implement core functionality');
      tasks.push('Create user interface');
      tasks.push('Add error handling');
      tasks.push('Write tests');
      tasks.push('Update documentation');
    }

    return tasks;
  }

  private static extractTags(text: string): string[] {
    const tags: string[] = [];
    const lowerText = text.toLowerCase();

    // Technology tags
    const techKeywords = [
      'react', 'node', 'javascript', 'typescript', 'python', 'api', 'database',
      'frontend', 'backend', 'ui', 'ux', 'testing', 'security', 'auth'
    ];

    for (const keyword of techKeywords) {
      if (lowerText.includes(keyword)) {
        tags.push(keyword);
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  private static addLogicalDependencies(
    tasks: TaskNode[],
    dependencies: Array<{
      fromId: string;
      toId: string;
      type: 'depends_on' | 'blocks' | 'child_of';
    }>
  ): void {
    // Add some logical dependencies based on task types and names
    const tasksByType = {
      epic: tasks.filter(t => t.type === 'epic'),
      story: tasks.filter(t => t.type === 'story'),
      task: tasks.filter(t => t.type === 'task'),
    };

    // Database/API tasks typically come before UI tasks
    const dbTasks = tasks.filter(t => 
      t.title.toLowerCase().includes('database') || 
      t.title.toLowerCase().includes('schema') ||
      t.title.toLowerCase().includes('api') ||
      t.title.toLowerCase().includes('endpoint')
    );

    const uiTasks = tasks.filter(t => 
      t.title.toLowerCase().includes('ui') || 
      t.title.toLowerCase().includes('form') ||
      t.title.toLowerCase().includes('component') ||
      t.title.toLowerCase().includes('interface')
    );

    // Create dependencies from DB/API to UI
    for (const dbTask of dbTasks) {
      for (const uiTask of uiTasks) {
        if (dbTask.parentId === uiTask.parentId) { // Same story
          dependencies.push({
            fromId: uiTask.id,
            toId: dbTask.id,
            type: 'depends_on',
          });
        }
      }
    }
  }
}