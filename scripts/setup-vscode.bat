@echo off
REM Batch script to setup Task Flow PM with VS Code on Windows
REM Usage: scripts\setup-vscode.bat

echo.
echo 🔧 Setting up Task Flow PM with VS Code on Windows
echo ==================================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Please run this script from the Task Flow PM project root
    pause
    exit /b 1
)

REM Check if VS Code is installed
where code >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ VS Code is not installed or not in PATH
    echo 💡 Download from: https://code.visualstudio.com/
    pause
    exit /b 1
)

REM 1. Build the project
echo 📦 Building Task Flow PM...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed. Please fix build errors first.
    pause
    exit /b 1
)

REM 2. Create .vscode directory
echo 📁 Creating VS Code configuration...
if not exist ".vscode" mkdir .vscode

REM 3. Backup existing config if present
if exist ".vscode\settings.json" (
    echo ⚠️  Backing up existing settings.json
    copy ".vscode\settings.json" ".vscode\settings.json.backup" >nul
)

REM 4. Install recommended extensions
echo 🔌 Installing recommended VS Code extensions...
call code --install-extension ms-vscode.vscode-typescript-next
call code --install-extension bradlc.vscode-tailwindcss
call code --install-extension esbenp.prettier-vscode
call code --install-extension dbaeumer.vscode-eslint
call code --install-extension ms-vscode.test-adapter-converter

REM 5. Configure VS Code settings
echo ⚙️  Configuring VS Code settings...
(
    echo {
    echo   "typescript.preferences.quoteStyle": "single",
    echo   "editor.formatOnSave": true,
    echo   "editor.codeActionsOnSave": {
    echo     "source.fixAll.eslint": true
    echo   },
    echo   "files.associations": {
    echo     "*.md": "markdown"
    echo   },
    echo   "editor.rulers": [80, 120],
    echo   "workbench.colorTheme": "Default Dark+",
    echo   "terminal.integrated.defaultProfile.windows": "PowerShell",
    echo   "npm.enableScriptExplorer": true
    echo }
) > ".vscode\settings.json"

REM 6. Create launch configuration for debugging
echo 🐛 Creating debug configuration...
(
    echo {
    echo   "version": "0.2.0",
    echo   "configurations": [
    echo     {
    echo       "name": "Debug MCP Server",
    echo       "type": "node",
    echo       "request": "launch",
    echo       "program": "${workspaceFolder}/dist/bin/server.js",
    echo       "outFiles": ["${workspaceFolder}/dist/**/*.js"],
    echo       "console": "integratedTerminal",
    echo       "envFile": "${workspaceFolder}/.env"
    echo     },
    echo     {
    echo       "name": "Run Tests",
    echo       "type": "node",
    echo       "request": "launch",
    echo       "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
    echo       "args": ["--run"],
    echo       "console": "integratedTerminal",
    echo       "cwd": "${workspaceFolder}"
    echo     }
    echo   ]
    echo }
) > ".vscode\launch.json"

REM 7. Create tasks configuration
echo ⚡ Creating VS Code tasks...
(
    echo {
    echo   "version": "2.0.0",
    echo   "tasks": [
    echo     {
    echo       "label": "Build",
    echo       "type": "npm",
    echo       "script": "build",
    echo       "group": {
    echo         "kind": "build",
    echo         "isDefault": true
    echo       },
    echo       "presentation": {
    echo         "echo": true,
    echo         "reveal": "silent",
    echo         "focus": false,
    echo         "panel": "shared"
    echo       }
    echo     },
    echo     {
    echo       "label": "Test",
    echo       "type": "npm",
    echo       "script": "test",
    echo       "group": {
    echo         "kind": "test",
    echo         "isDefault": true
    echo       }
    echo     },
    echo     {
    echo       "label": "Start MCP Server",
    echo       "type": "npm",
    echo       "script": "dev",
    echo       "isBackground": true,
    echo       "presentation": {
    echo         "echo": true,
    echo         "reveal": "always",
    echo         "focus": true,
    echo         "panel": "new"
    echo       }
    echo     }
    echo   ]
    echo }
) > ".vscode\tasks.json"

REM 8. Initialize MCP project if not already done
if not exist ".mcp\graph.db" (
    echo 🚀 Initializing MCP project...
    call npm run cli init
)

REM 9. Test VS Code integration
echo 🧪 Testing VS Code integration...
call code --version >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ VS Code CLI is available
) else (
    echo ⚠️  VS Code CLI issues. VS Code will still work normally.
)

echo.
echo 🎉 VS Code + Task Flow PM Setup Complete!
echo ==========================================
echo.
echo 📋 Next Steps:
echo 1. Open this project in VS Code:
echo    code .
echo.
echo 2. VS Code will load with optimized settings for Task Flow PM
echo.
echo 3. Use VS Code features:
echo    - Build: Ctrl+Shift+P → "Tasks: Run Build Task"
echo    - Test: Ctrl+Shift+P → "Tasks: Run Test Task"
echo    - Debug: F5 to start debugging MCP server
echo.
echo 4. Available commands in terminal:
echo    - npm run dev (start MCP server)
echo    - npm test (run tests)
echo    - npm run cli help (CLI commands)
echo.
echo 🔧 Troubleshooting:
echo    • Check .vscode configuration files
echo    • Verify MCP server: npm run dev
echo    • Use VS Code integrated terminal
echo.
echo 🚀 Ready for productive development with VS Code + Task Flow PM!
echo.

REM Offer to open VS Code automatically
set /p openVSCode="🤔 Open VS Code now? (y/N): "
if /i "%openVSCode%"=="y" (
    echo 🎯 Opening VS Code...
    start code .
    echo ✅ VS Code opened! Check the Explorer panel for project structure.
)

echo.
echo 📚 For more help, check:
echo    • docs\vscode-setup.md
echo    • docs\methods.md
echo    • README.md
echo.
pause 