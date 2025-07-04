import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { TaskNode } from '../mcp/schema';

export interface ScaffoldResult {
  taskId: string;
  baseDir: string;
  files: {
    readme: string;
    implementation: string;
    test: string;
  };
}

export class ScaffoldGenerator {
  private baseScaffoldDir: string;

  constructor(baseDir = 'scaffold') {
    this.baseScaffoldDir = baseDir;
  }

  generateScaffold(task: TaskNode): ScaffoldResult {
    const taskDir = join(this.baseScaffoldDir, task.id);
    const testDir = join(taskDir, '__tests__');

    // Ensure directories exist
    this.ensureDirectory(taskDir);
    this.ensureDirectory(testDir);

    // Generate file names based on task
    const fileName = this.generateFileName(task.title);
    
    const files = {
      readme: join(taskDir, 'README.md'),
      implementation: join(taskDir, `${fileName}.ts`),
      test: join(testDir, `${fileName}.test.ts`),
    };

    // Generate content
    const readmeContent = this.generateReadme(task);
    const implementationContent = this.generateImplementation(task, fileName);
    const testContent = this.generateTest(task, fileName);

    // Write files
    writeFileSync(files.readme, readmeContent);
    writeFileSync(files.implementation, implementationContent);
    writeFileSync(files.test, testContent);

    return {
      taskId: task.id,
      baseDir: resolve(taskDir),
      files: {
        readme: resolve(files.readme),
        implementation: resolve(files.implementation),
        test: resolve(files.test),
      },
    };
  }

  private ensureDirectory(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private generateFileName(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }

  private generateReadme(task: TaskNode): string {
    const estimateHours = Math.round(task.estimateMinutes / 60 * 10) / 10;
    
    return `# ${task.title}

## 📋 Task Overview

**ID:** \`${task.id}\`  
**Type:** ${task.type}  
**Priority:** ${task.priority}  
**Estimated Effort:** ${task.estimateMinutes} minutes (~${estimateHours}h)  
**Status:** ${task.status}

## 📝 Description

${task.description}

## ✅ Acceptance Criteria

${this.generateAcceptanceCriteria(task)}

## 🏗️ Implementation Notes

- [ ] Review task requirements
- [ ] Design approach and architecture
- [ ] Implement core functionality
- [ ] Write comprehensive tests
- [ ] Document implementation
- [ ] Review and refactor

## 🧪 Testing Strategy

${this.generateTestingStrategy(task)}

## 📚 Resources

- Task created: ${new Date(task.createdAt).toLocaleDateString()}
- Parent task: ${task.parentId || 'None'}
- Tags: ${task.tags.join(', ') || 'None'}

## 📝 Notes

Use this space to add implementation notes, decisions, and progress updates.

---

Generated by MCP Local Scaffold Generator
`;
  }

  private generateAcceptanceCriteria(task: TaskNode): string {
    const criteria: string[] = [];
    
    // Generate criteria based on task type and content
    if (task.type === 'epic') {
      criteria.push('- [ ] All child stories are completed');
      criteria.push('- [ ] Integration testing passes');
      criteria.push('- [ ] Documentation is complete');
    } else if (task.type === 'story') {
      criteria.push('- [ ] User can perform the described functionality');
      criteria.push('- [ ] All edge cases are handled');
      criteria.push('- [ ] User interface is intuitive');
    } else {
      criteria.push('- [ ] Implementation meets requirements');
      criteria.push('- [ ] Code passes all tests');
      criteria.push('- [ ] Code follows project standards');
    }

    // Add criteria based on content keywords
    const description = task.description.toLowerCase();
    
    if (description.includes('api') || description.includes('endpoint')) {
      criteria.push('- [ ] API endpoints return correct responses');
      criteria.push('- [ ] Input validation is implemented');
      criteria.push('- [ ] Error handling is comprehensive');
    }
    
    if (description.includes('database') || description.includes('data')) {
      criteria.push('- [ ] Data integrity is maintained');
      criteria.push('- [ ] Database migrations work correctly');
      criteria.push('- [ ] Performance requirements are met');
    }
    
    if (description.includes('ui') || description.includes('interface')) {
      criteria.push('- [ ] UI is responsive across devices');
      criteria.push('- [ ] Accessibility requirements are met');
      criteria.push('- [ ] User experience is smooth');
    }

    return criteria.join('\n');
  }

  private generateTestingStrategy(task: TaskNode): string {
    const strategies: string[] = [];
    
    if (task.type === 'epic') {
      strategies.push('- End-to-end testing of complete user journeys');
      strategies.push('- Integration testing between components');
      strategies.push('- Performance and load testing');
    } else if (task.type === 'story') {
      strategies.push('- User acceptance testing');
      strategies.push('- Integration testing with related components');
      strategies.push('- Cross-browser/device testing');
    } else {
      strategies.push('- Unit testing for all functions');
      strategies.push('- Edge case testing');
      strategies.push('- Error condition testing');
    }

    const description = task.description.toLowerCase();
    
    if (description.includes('api')) {
      strategies.push('- API endpoint testing with various inputs');
      strategies.push('- Authentication and authorization testing');
    }
    
    if (description.includes('database')) {
      strategies.push('- Database operation testing');
      strategies.push('- Data validation testing');
    }

    return strategies.join('\n');
  }

  private generateImplementation(task: TaskNode, fileName: string): string {
    const className = this.toPascalCase(fileName);
    const description = task.description.toLowerCase();
    
    let imports = '';
    let classContent = '';
    
    // Generate imports based on task content
    if (description.includes('database') || description.includes('data')) {
      imports += "import { Database } from '../db/connection';\n";
    }
    
    if (description.includes('api') || description.includes('service')) {
      imports += "import { Logger } from '../services/logger';\n";
    }

    // Generate class structure based on task type
    if (description.includes('service') || description.includes('manager')) {
      classContent = this.generateServiceClass(className, task);
    } else if (description.includes('component') || description.includes('ui')) {
      classContent = this.generateUIComponent(className, task);
    } else if (description.includes('util') || description.includes('helper')) {
      classContent = this.generateUtilityClass(className, task);
    } else {
      classContent = this.generateGenericClass(className, task);
    }

    return `${imports}
/**
 * ${task.title}
 * 
 * ${task.description}
 * 
 * @author MCP Local Scaffold Generator
 * @created ${new Date().toISOString()}
 */

${classContent}

export default ${className};
`;
  }

  private generateServiceClass(className: string, task: TaskNode): string {
    return `export class ${className} {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('${className}');
  }

  /**
   * TODO: Implement main service functionality
   * Based on: ${task.title}
   */
  async execute(): Promise<void> {
    this.logger.info('Starting ${className} execution');
    
    try {
      // TODO: Implement core logic here
      throw new Error('Not implemented yet');
    } catch (error) {
      this.logger.error('Error in ${className}:', error);
      throw error;
    }
  }

  /**
   * TODO: Add additional service methods based on requirements
   */
}`;
  }

  private generateUIComponent(className: string, task: TaskNode): string {
    return `interface ${className}Props {
  // TODO: Define component props based on requirements
}

export const ${className}: React.FC<${className}Props> = (props) => {
  // TODO: Implement component state and logic
  
  /**
   * Implementation for: ${task.title}
   * ${task.description}
   */

  return (
    <div className="${className}">
      {/* TODO: Implement component UI */}
      <h1>TODO: ${task.title}</h1>
      <p>Implement component functionality here</p>
    </div>
  );
};`;
  }

  private generateUtilityClass(className: string, task: TaskNode): string {
    return `/**
 * Utility class for ${task.title}
 */
export class ${className} {
  /**
   * TODO: Implement utility methods
   * Based on: ${task.description}
   */
  static process(input: any): any {
    // TODO: Implement processing logic
    throw new Error('Not implemented yet');
  }

  /**
   * TODO: Add validation methods
   */
  static validate(data: any): boolean {
    // TODO: Implement validation logic
    return false;
  }

  /**
   * TODO: Add transformation methods
   */
  static transform(data: any): any {
    // TODO: Implement transformation logic
    return data;
  }
}`;
  }

  private generateGenericClass(className: string, task: TaskNode): string {
    return `export class ${className} {
  constructor() {
    // TODO: Initialize class properties
  }

  /**
   * Main implementation for: ${task.title}
   * 
   * ${task.description}
   */
  async run(): Promise<void> {
    // TODO: Implement main functionality
    console.log('Starting ${className}');
    
    try {
      // TODO: Add implementation logic here
      throw new Error('Implementation pending');
    } catch (error) {
      console.error('Error in ${className}:', error);
      throw error;
    }
  }

  /**
   * TODO: Add helper methods as needed
   */
  private helper(): void {
    // TODO: Implement helper functionality
  }
}`;
  }

  private generateTest(task: TaskNode, fileName: string): string {
    const className = this.toPascalCase(fileName);
    
    return `import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ${className} from '../${fileName}';

describe('${className}', () => {
  let instance: ${className};

  beforeEach(() => {
    // Setup test instance
    instance = new ${className}();
  });

  afterEach(() => {
    // Cleanup after tests
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(${className});
    });
  });

  describe('main functionality', () => {
    it('should implement core requirements', async () => {
      // TODO: Test core functionality for ${task.title}
      
      // Arrange
      // TODO: Setup test data
      
      // Act
      // TODO: Execute the functionality
      
      // Assert
      // TODO: Verify expected outcomes
      expect(true).toBe(false); // Replace with actual test
    });

    it('should handle edge cases', async () => {
      // TODO: Test edge cases and error conditions
      expect(true).toBe(false); // Replace with actual test
    });

    it('should validate inputs correctly', async () => {
      // TODO: Test input validation
      expect(true).toBe(false); // Replace with actual test
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      // TODO: Test error scenarios
      expect(true).toBe(false); // Replace with actual test
    });
  });

  // TODO: Add more test cases based on acceptance criteria
  // Acceptance criteria from task:
  ${this.generateTestCasesFromCriteria(task)}
});

/**
 * Integration tests for ${className}
 */
describe('${className} Integration', () => {
  it('should integrate with other components', async () => {
    // TODO: Add integration tests
    expect(true).toBe(false); // Replace with actual test
  });
});
`;
  }

  private generateTestCasesFromCriteria(task: TaskNode): string {
    const description = task.description.toLowerCase();
    const testCases: string[] = [];
    
    if (description.includes('api')) {
      testCases.push('  // Test API endpoint responses');
      testCases.push('  // Test input validation');
      testCases.push('  // Test error handling');
    }
    
    if (description.includes('database')) {
      testCases.push('  // Test database operations');
      testCases.push('  // Test data integrity');
      testCases.push('  // Test performance requirements');
    }
    
    if (description.includes('ui') || description.includes('component')) {
      testCases.push('  // Test component rendering');
      testCases.push('  // Test user interactions');
      testCases.push('  // Test responsive behavior');
    }

    return testCases.join('\n');
  }

  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}