# MCP Local - Smart Multi-Language Prompts

## Auto-Detection System
The MCP Local system automatically detects your preferred language based on:
1. System locale (LANG environment variable)
2. Command used (`mcp` = English, `mcp-pt` = Portuguese)
3. Cursor workspace settings
4. Manual override in prompts

## Universal Prompts (Work in Any Language)

### 🎯 Next Task (Multi-Language)
```
Get my next priority task. Please query MCP and respond in my preferred language.

Include:
- Task title and description
- Time estimate and priority level
- Any blocking dependencies
- Related context I should know

Language preference: [auto-detect or specify: en/pt-BR]
```