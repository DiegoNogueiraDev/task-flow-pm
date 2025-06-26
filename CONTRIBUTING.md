# 🤝 Contributing to Task Flow PM

Thank you for your interest in contributing to Task Flow PM! We welcome contributions from the community and are grateful for any help, whether it's fixing bugs, adding features, improving documentation, or spreading the word.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## 🎯 How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/diegonogueira/task-flow-pm/issues) to see if the problem has already been reported.

**Good Bug Reports Include:**
- A quick summary and/or background
- Steps to reproduce (be specific!)
- What you expected would happen
- What actually happens
- Sample documents that trigger the bug (if applicable)
- Your environment (OS, Node.js version, etc.)

**Bug Report Template:**
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Run command '...'
2. Process document '...'
3. See error

**Expected behavior**
A clear description of what you expected to happen.

**Environment:**
- OS: [e.g. Ubuntu 20.04, Windows 11, macOS 12]
- Node.js version: [e.g. 18.17.0]
- Task Flow PM version: [e.g. 1.2.3]

**Additional context**
Add any other context about the problem here.
```

### 💡 Suggesting Features

Feature requests are welcome! Please provide:

- **Clear description** of the feature
- **Use case** - why is this feature needed?
- **Expected behavior** - how should it work?
- **Alternatives considered** - what other solutions did you consider?

### 🔧 Code Contributions

#### Areas Where We Need Help

- **Document Processing**: Support for new file formats
- **AI Integration**: Better task extraction algorithms  
- **Performance**: Optimization for large documents
- **UI/UX**: CLI improvements and new interfaces
- **Testing**: More comprehensive test coverage
- **Documentation**: Examples, tutorials, API docs
- **Internationalization**: Support for more languages

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Setup Instructions

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/task-flow-pm.git
cd task-flow-pm

# 3. Add upstream remote
git remote add upstream https://github.com/diegonogueira/task-flow-pm.git

# 4. Install dependencies
npm install

# 5. Build the project
npm run build

# 6. Run tests to ensure everything works
npm test

# 7. Create a feature branch
git checkout -b feature/your-feature-name
```

### Development Commands

```bash
# Development mode with auto-rebuild
npm run dev

# Run specific test suites
npm run test:docling      # Document processing tests
npm run test:cli          # CLI tests  
npm run test:integration  # Integration tests

# Lint and format code
npm run lint
npm run format

# Build for production
npm run build

# Test document processing
npm run docling:test
```

### Project Structure

```
task-flow-pm/
├── 📁 bin/                    # CLI entry points
│   ├── mcp-unified.ts         # Main CLI
│   └── server.ts              # MCP server
├── 📁 src/
│   ├── 📁 db/                 # Database layer
│   │   ├── graph.ts           # Graph database
│   │   └── embeddings.ts      # Vector embeddings
│   ├── 📁 services/           # Core services
│   │   ├── docling.ts         # Document processing
│   │   ├── logger.ts          # Logging
│   │   └── time-tracker.ts    # Time tracking
│   ├── 📁 mcp/               # MCP protocol
│   │   ├── commands.ts        # Command handlers
│   │   └── schema.ts          # Type definitions
│   └── 📁 i18n/              # Internationalization
├── 📁 docs/                  # Documentation
├── 📁 scripts/               # Setup & utility scripts
├── 📁 __tests__/             # Test suites
└── 📁 examples/              # Usage examples
```

## 🔄 Pull Request Process

### Before Submitting

1. **Update** your fork: `git pull upstream main`
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes
4. **Add tests** for new functionality
5. **Run tests**: `npm test`
6. **Lint code**: `npm run lint`
7. **Update** documentation if needed
8. **Commit** with clear messages

### Commit Message Guidelines

We follow [Conventional Commits](https://conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(docling): add support for EPUB files
fix(cli): resolve crash when processing empty documents
docs(readme): update installation instructions
test(docling): add tests for PDF processing
```

### Pull Request Template

When creating a PR, please include:

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Checklist:
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

## 📏 Coding Standards

### TypeScript Guidelines

- **Use TypeScript** for all new code
- **Strict mode** is enabled - follow type safety
- **Prefer interfaces** over types for object definitions
- **Use meaningful names** for variables and functions
- **Add JSDoc comments** for public APIs

### Code Style

```typescript
// ✅ Good
interface DocumentProcessor {
  /**
   * Process a document and extract tasks
   * @param filePath Path to the document file
   * @param options Processing options
   * @returns Promise with processing results
   */
  processDocument(
    filePath: string, 
    options: ProcessingOptions
  ): Promise<ProcessResult>;
}

// ❌ Avoid
function process(f: string, o: any): any {
  // Implementation
}
```

### File Organization

- **One class per file** (exceptions for small, related utilities)
- **Barrel exports** in index files
- **Clear module boundaries**
- **Consistent naming** (kebab-case for files, PascalCase for classes)

## 🧪 Testing Guidelines

### Test Structure

```typescript
// ✅ Good test structure
describe('DoclingService', () => {
  let service: DoclingService;

  beforeEach(() => {
    service = new DoclingService();
  });

  describe('processDocument', () => {
    it('should extract text from DOCX files', async () => {
      // Arrange
      const filePath = 'test-documents/sample.docx';
      
      // Act
      const result = await service.convertDocument(filePath);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.content).toContain('expected text');
    });
  });
});
```

### Test Coverage

- **Aim for 80%+ coverage** on new code
- **Test happy paths** and error cases
- **Use meaningful test names** that describe behavior
- **Mock external dependencies**

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- docling.test.ts

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## 📚 Documentation

### Code Documentation

- **JSDoc comments** for public APIs
- **Inline comments** for complex logic
- **README updates** for new features
- **Type definitions** with descriptions

### Documentation Updates

When adding features, please update:

- [ ] **README.md** - if it affects user-facing functionality
- [ ] **API documentation** - for new public methods
- [ ] **Examples** - if it demonstrates new capabilities
- [ ] **CLI help** - for new commands or options

## 🌍 Internationalization

We support multiple languages. When adding user-facing text:

1. **Add to translation files**: `src/i18n/`
2. **Use translation keys**: Don't hardcode strings
3. **Test in different locales**
4. **Update both English and Portuguese** (if possible)

Example:
```typescript
// ✅ Good
console.log(this.i18n.t('cli.tasks.noTasks'));

// ❌ Avoid
console.log('No tasks found');
```

## 🎯 Performance Guidelines

- **Optimize for large documents** (>100MB)
- **Stream processing** when possible
- **Efficient database queries**
- **Memory usage** monitoring in tests
- **Async/await** for I/O operations

## 🏷️ Release Process

Releases follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

## 💬 Community

### Getting Help

- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bug reports and feature requests
- **Discord** (coming soon): For real-time chat

### Recognition

Contributors are recognized in:
- **Contributors section** in README
- **Release notes** for significant contributions
- **Hall of Fame** for major contributors

## 🙏 Thank You!

Every contribution makes Task Flow PM better. Whether you:

- Report a bug 🐛
- Suggest a feature 💡
- Improve documentation 📚
- Submit code 💻
- Spread the word 📢

**You are making a difference!** Thank you for being part of our community.

---

*For questions about contributing, please open a discussion or reach out to the maintainers.* 