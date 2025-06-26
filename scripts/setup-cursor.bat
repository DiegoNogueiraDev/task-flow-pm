@echo off
REM Batch script to setup Task Flow PM with Cursor on Windows
REM Usage: scripts\setup-cursor.bat

echo.
echo 🎯 Setting up Task Flow PM with Cursor on Windows
echo =================================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Please run this script from the Task Flow PM project root
    pause
    exit /b 1
)

REM Check if Cursor is installed or running
echo 🔍 Checking Cursor installation...
set CURSOR_FOUND=false

REM Check if Cursor command is available
where cursor >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ Cursor CLI found: cursor
    set CURSOR_FOUND=true
) else (
    REM Check if Cursor is running via process check
    tasklist /FI "IMAGENAME eq Cursor.exe" 2>nul | find /I "Cursor.exe" >nul
    if %errorlevel% equ 0 (
        echo ✅ Cursor is running (detected via process check)
        set CURSOR_FOUND=true
    ) else (
        REM Check common installation paths
        if exist "%LOCALAPPDATA%\Programs\cursor\Cursor.exe" (
            echo ✅ Cursor installation found in %LOCALAPPDATA%\Programs\cursor\
            set CURSOR_FOUND=true
        ) else if exist "%PROGRAMFILES%\Cursor\Cursor.exe" (
            echo ✅ Cursor installation found in %PROGRAMFILES%\Cursor\
            set CURSOR_FOUND=true
        )
    )
)

if "%CURSOR_FOUND%"=="false" (
    echo ❌ Cursor is not installed or not accessible
    echo 💡 Install Cursor from: https://cursor.sh/
    echo    • Download the installer and run it
    echo    • Or use winget: winget install Cursor.Cursor
    pause
    exit /b 1
) else (
    echo ✅ Cursor detected successfully
)

REM 1. Build the project
echo 📦 Building Task Flow PM...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed. Please fix build errors first.
    pause
    exit /b 1
)

REM 2. Create .cursor directory
echo 📁 Creating Cursor configuration...
if not exist ".cursor" mkdir .cursor

REM 3. Backup existing config if present
if exist ".cursor\cursor.local-mcp.json" (
    echo ⚠️  Backing up existing cursor.local-mcp.json
    copy ".cursor\cursor.local-mcp.json" ".cursor\cursor.local-mcp.json.backup" >nul
)

if exist ".cursor\settings.json" (
    echo ⚠️  Backing up existing settings.json
    copy ".cursor\settings.json" ".cursor\settings.json.backup" >nul
)

REM 4. Initialize MCP project if not already done
if not exist ".mcp\graph.db" (
    echo 🚀 Initializing MCP project...
    call npm run cli init
)

REM 5. Configure Cursor MCP integration
echo 🎯 Configuring Cursor MCP integration...

if exist "cursor.local-mcp.json" (
    copy "cursor.local-mcp.json" ".cursor\cursor.local-mcp.json" >nul
    echo ✅ Cursor MCP configuration created
) else (
    echo ⚠️  cursor.local-mcp.json template not found. Creating basic configuration...
    (
        echo {
        echo   "mcpServers": {
        echo     "task-flow-pm": {
        echo       "command": "node",
        echo       "args": ["./dist/bin/server.js"],
        echo       "cwd": "${workspaceRoot}"
        echo     }
        echo   }
        echo }
    ) > ".cursor\cursor.local-mcp.json"
)

REM Test if Cursor CLI is available
cursor --help >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ Cursor CLI is available
) else (
    echo ⚠️  Cursor CLI not found. MCP will still work when opening in Cursor GUI.
)

echo.
echo 🎉 Cursor + Task Flow PM Setup Complete!
echo ========================================
echo.
echo 📋 Next Steps:
echo 1. Open this project in Cursor:
echo    cursor .
echo.
echo 2. Cursor will automatically detect MCP configuration
echo    Look for 'MCP Server: task-flow-pm' in the status bar
echo.
echo 3. Test MCP integration in Cursor Chat:
echo    - Open Cursor Chat (Ctrl + L)
echo    - Type: 'What's my next task?'
echo    - Cursor should query MCP automatically
echo.
echo 4. Use built-in prompts:
echo    Available commands: @next-task, @search-tasks, @plan-tasks
echo.
echo 🔧 Troubleshooting:
echo    • If MCP not working: Restart Cursor
echo    • Check cursor.local-mcp.json configuration
echo    • Verify MCP server: npm run dev
echo.
echo 🚀 Ready to experience AI-powered development with Cursor + Task Flow PM!
echo.

REM Offer to open Cursor automatically (only if cursor command is available)
where cursor >nul 2>nul
if %errorlevel% equ 0 (
    set /p openCursor="🤔 Open Cursor now? (y/N): "
    if /i "%openCursor%"=="y" (
        echo 🎯 Opening Cursor...
        start cursor .
        echo ✅ Cursor opened! Check MCP status in the status bar.
    )
) else (
    echo 💡 Since Cursor is already running, just restart it to apply MCP configuration.
)

echo.
echo 📚 For more help, check:
echo    • docs\cursor-setup.md
echo    • docs\methods.md
echo    • README.md
echo.
pause 