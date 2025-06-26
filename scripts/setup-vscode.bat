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

REM Check if VS Code is installed or running
echo 🔍 Checking VS Code installation...
set VSCODE_FOUND=false
set VSCODE_CMD=

REM Check multiple common VS Code commands
where code >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ VS Code CLI found: code
    set VSCODE_FOUND=true
    set VSCODE_CMD=code
) else (
    where code-insiders >nul 2>nul
    if %errorlevel% equ 0 (
        echo ✅ VS Code Insiders CLI found: code-insiders
        set VSCODE_FOUND=true
        set VSCODE_CMD=code-insiders
    ) else (
        REM Check if VS Code is running via process check
        tasklist /FI "IMAGENAME eq Code.exe" 2>nul | find /I "Code.exe" >nul
        if %errorlevel% equ 0 (
            echo ✅ VS Code is running (detected via process check)
            set VSCODE_FOUND=true
        ) else (
            REM Check common installation paths
            if exist "%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe" (
                echo ✅ VS Code installation found in %LOCALAPPDATA%\Programs\Microsoft VS Code\
                set VSCODE_FOUND=true
            ) else if exist "%PROGRAMFILES%\Microsoft VS Code\Code.exe" (
                echo ✅ VS Code installation found in %PROGRAMFILES%\Microsoft VS Code\
                set VSCODE_FOUND=true
            )
        )
    )
)

if "%VSCODE_FOUND%"=="false" (
    echo ❌ VS Code is not installed or not accessible
    echo 💡 Install VS Code from one of these options:
    echo    • Download from: https://code.visualstudio.com/
    echo    • Use winget: winget install Microsoft.VisualStudioCode
    echo    • Use Chocolatey: choco install vscode
    echo.
    set /p continueAnyway="🤔 Continue anyway? The setup will work but you'll need to install VS Code later. (y/N): "
    if /i not "%continueAnyway%"=="y" (
        echo Setup cancelled. Please install VS Code first.
        pause
        exit /b 1
    )
    echo ⚠️  Continuing without VS Code... You can run this script again after installing.
) else (
    echo ✅ VS Code detected successfully
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

REM 4. Install recommended extensions and GitHub Copilot
echo 🔌 Installing recommended VS Code extensions...

if not "%VSCODE_CMD%"=="" (
    echo 🔍 Checking extensions with: %VSCODE_CMD%
    
    REM Check if GitHub Copilot is already installed
    %VSCODE_CMD% --list-extensions | find "github.copilot" >nul
    if %errorlevel% equ 0 (
        echo ✅ GitHub Copilot extension found
        echo 💡 Make sure you're signed in to GitHub Copilot
        echo    In VS Code: Ctrl+Shift+P → "GitHub Copilot: Sign In"
    ) else (
        echo ⚠️  GitHub Copilot extension not found
        echo    Install with: %VSCODE_CMD% --install-extension GitHub.copilot
        echo    Or via marketplace: https://marketplace.visualstudio.com/items?itemName=GitHub.copilot
        echo.
        set /p installCopilot="🤔 Install GitHub Copilot extension now? (y/N): "
        if /i "%installCopilot%"=="y" (
            echo 📦 Installing GitHub Copilot extension...
            call %VSCODE_CMD% --install-extension GitHub.copilot
            if %errorlevel% equ 0 (
                echo ✅ GitHub Copilot extension installed successfully
            ) else (
                echo ❌ Failed to install extension. Please install manually.
            )
        )
    )
    
    REM Install other recommended extensions
    echo 📦 Installing other recommended extensions...
    call %VSCODE_CMD% --install-extension ms-vscode.vscode-typescript-next
    call %VSCODE_CMD% --install-extension bradlc.vscode-tailwindcss
    call %VSCODE_CMD% --install-extension esbenp.prettier-vscode
    call %VSCODE_CMD% --install-extension dbaeumer.vscode-eslint
    call %VSCODE_CMD% --install-extension ms-vscode.test-adapter-converter
) else (
    if "%VSCODE_FOUND%"=="true" (
        echo ⚠️  VS Code is installed but CLI is not available
        echo    Extensions can be installed manually from the marketplace
        echo    GitHub Copilot: https://marketplace.visualstudio.com/items?itemName=GitHub.copilot
    ) else (
        echo ⚠️  VS Code not detected. Install VS Code first, then run this script again.
    )
)

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

REM Offer to open VS Code automatically (only if VS Code command is available)
if not "%VSCODE_CMD%"=="" (
    set /p openVSCode="🤔 Open VS Code now? (y/N): "
    if /i "%openVSCode%"=="y" (
        echo 🎯 Opening VS Code...
        start %VSCODE_CMD% .
        echo ✅ VS Code opened! Check the Explorer panel for project structure.
    )
) else (
    if "%VSCODE_FOUND%"=="true" (
        echo 💡 Since VS Code is installed, you can open it manually
        echo    Open VS Code and use File → Open Folder to open this project
    ) else (
        echo 💡 Install VS Code first, then run this script again to complete setup
    )
)

echo.
echo 📚 For more help, check:
echo    • docs\vscode-setup.md
echo    • docs\methods.md
echo    • README.md
echo.
pause 