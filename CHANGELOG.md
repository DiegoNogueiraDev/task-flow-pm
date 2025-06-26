# 📝 Changelog

All notable changes to Task Flow PM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### ✨ Added
- Open source project structure
- Professional README with comprehensive documentation
- Contributing guidelines and Code of Conduct
- GitHub issue templates for bugs and feature requests
- Pull request template
- CI/CD pipeline with GitHub Actions
- Docker support with multi-stage builds
- Comprehensive test coverage
- Security scanning and code quality checks

### 🔄 Changed
- Improved project documentation structure
- Enhanced development workflow

### 🐛 Fixed
- Various bug fixes and stability improvements

## [1.0.0] - 2024-01-20

### ✨ Added
- **🤖 AI-Powered Task Generation**: Automatically extract tasks from documents
- **📄 Universal Document Processing**: Support for DOCX, PDF, Markdown, HTML, JSON, TXT
- **🔍 Semantic Search**: Vector-based search using embeddings
- **⏱️ Time Tracking**: Built-in time tracking with estimation variance
- **📊 Knowledge Graph**: SQLite-based graph database for task relationships
- **🌍 Multilingual CLI**: Full support for English and Portuguese commands
- **🔌 MCP Protocol**: Model Context Protocol integration
- **📱 Cross-Platform**: Works on Windows, macOS, and Linux

### 🏗️ Technical Features
- **🚫 Zero Python Dependencies**: 100% Node.js/TypeScript implementation
- **⚡ Performance**: Optimized with SQLite and efficient embeddings
- **🎨 Beautiful CLI**: Intuitive command-line interface
- **📝 Cursor/VS Code**: Direct integration with popular editors
- **🤖 AI Assistants**: Compatible with GitHub Copilot and other AI tools

### 📄 Document Processing
- **DOCX Support**: Text extraction, formatting, tables
- **PDF Support**: Multi-page, text extraction, metadata
- **Markdown Support**: Headers, lists, code blocks
- **HTML Support**: DOM parsing, clean text extraction
- **JSON Support**: Structured data, nested objects
- **TXT Support**: Plain text, encoding detection

### 🔧 Commands
- `task-flow-pm init` - Initialize project
- `task-flow-pm plan <document>` - Process documents
- `task-flow-pm tasks [status]` - List and filter tasks
- `task-flow-pm next` - Get recommended task
- `task-flow-pm begin <id>` - Start working on task
- `task-flow-pm complete <id> [minutes]` - Mark task complete
- `task-flow-pm search <query>` - Search tasks
- `task-flow-pm details <id>` - Get task details

### 🌐 Portuguese Support
- All CLI commands available in Portuguese
- Localized error messages and help text
- Portuguese documentation

### 🧪 Testing
- Comprehensive unit test suite
- Integration tests for document processing
- CLI command testing
- Cross-platform compatibility testing

## [0.9.0] - 2024-01-15

### ✨ Added
- Initial document processing capabilities
- Basic task management
- SQLite database integration
- CLI interface foundation

### 🔄 Changed
- Refactored core architecture
- Improved error handling

## [0.8.0] - 2024-01-10

### ✨ Added
- MCP server implementation
- Basic document parsing
- Task database schema

### 🐛 Fixed
- Various parsing issues
- Database connection stability

## [0.7.0] - 2024-01-05

### ✨ Added
- Initial TypeScript project structure
- Basic CLI framework
- Document type detection

## [0.1.0] - 2024-01-01

### ✨ Added
- Initial project setup
- Basic TypeScript configuration
- Package.json structure

---

## 📋 Legend

- **✨ Added** for new features
- **🔄 Changed** for changes in existing functionality  
- **⚠️ Deprecated** for soon-to-be removed features
- **🗑️ Removed** for now removed features
- **🐛 Fixed** for any bug fixes
- **🔐 Security** in case of vulnerabilities

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for information on how to contribute to this changelog and the project.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details. 