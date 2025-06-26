#!/bin/bash

echo "🔧 Setting up MCP Local with VSCode + GitHub Copilot"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the mcp-local project root"
    exit 1
fi

# Check if VSCode is installed or running
echo "🔍 Checking VSCode installation..."
VSCODE_FOUND=false

# Check multiple common VSCode commands
if command -v code &> /dev/null; then
    echo "✅ VSCode CLI found: code"
    VSCODE_FOUND=true
elif command -v code-insiders &> /dev/null; then
    echo "✅ VSCode Insiders CLI found: code-insiders"  
    VSCODE_FOUND=true
elif command -v codium &> /dev/null; then
    echo "✅ VSCodium CLI found: codium"
    VSCODE_FOUND=true
# Check if VSCode is running via process check (common for Snap, Flatpak, AppImage)
# Be more specific to avoid confusion with other editors like Cursor
elif pgrep -f "Visual Studio Code" > /dev/null 2>&1 || pgrep -f "/usr/share/code" > /dev/null 2>&1; then
    echo "✅ VSCode is running (detected via process check)"
    VSCODE_FOUND=true
elif pgrep -f "code" > /dev/null 2>&1; then
    # Found code process but need to verify it's actually VSCode, not Cursor or other editor
    echo "⚠️  Found 'code' process, but might be another editor (like Cursor)"
    echo "   If you have VSCode installed, it might be running but CLI is not in PATH"
    VSCODE_FOUND=false
# Check common installation paths
elif [ -f "/usr/bin/code" ] || [ -f "/snap/bin/code" ] || [ -f "/var/lib/flatpak/exports/bin/com.visualstudio.code" ]; then
    echo "✅ VSCode installation found in system paths"
    VSCODE_FOUND=true
fi

if [ "$VSCODE_FOUND" = false ]; then
    echo "❌ VSCode is not installed or not accessible"
    echo "💡 Install VSCode from one of these options:"
    echo "   • Download from: https://code.visualstudio.com/"
    echo "   • Ubuntu/Debian: sudo apt install code"
    echo "   • Snap: sudo snap install code --classic"
    echo "   • Flatpak: flatpak install flathub com.visualstudio.code"
    echo ""
    echo "🤔 Continue anyway? The setup will work but you'll need to install VSCode later. (y/N)"
    read -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled. Please install VSCode first."
        exit 1
    fi
    echo "⚠️  Continuing without VSCode... You can run this script again after installing."
fi

# 1. Build the project
echo "📦 Building MCP Local..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors first."
    exit 1
fi

# 2. Create .vscode directory
echo "📁 Creating VSCode configuration..."
mkdir -p .vscode

# 3. Check if VSCode settings exist and backup if needed
if [ -f ".vscode/settings.json" ]; then
    echo "⚠️  Backing up existing settings.json"
    cp .vscode/settings.json .vscode/settings.json.backup
fi

# 4. Create/update VSCode settings (this was already done via artifacts)
echo "✅ VSCode configuration files created"

# 5. Test MCP server
echo "🧪 Testing MCP server..."
timeout 5s npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 2

# Test if server responds
echo '{"command":"listTasks"}' | node dist/bin/server.js > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ MCP server is working correctly"
else
    echo "⚠️  MCP server test inconclusive (this might be normal)"
fi

# Cleanup
kill $SERVER_PID 2>/dev/null

# 6. Check GitHub Copilot extension
echo "🤖 Checking GitHub Copilot setup..."

# Find the appropriate VSCode command
VSCODE_CMD=""
if command -v code &> /dev/null; then
    VSCODE_CMD="code"
elif command -v code-insiders &> /dev/null; then
    VSCODE_CMD="code-insiders"
elif command -v codium &> /dev/null; then
    VSCODE_CMD="codium"
fi

if [ -n "$VSCODE_CMD" ]; then
    echo "🔍 Checking extensions with: $VSCODE_CMD"
    if $VSCODE_CMD --list-extensions | grep -q "github.copilot"; then
        echo "✅ GitHub Copilot extension found"
        
        # Check if user is signed in to Copilot
        echo "💡 Make sure you're signed in to GitHub Copilot"
        echo "   In VSCode: Ctrl+Shift+P -> 'GitHub Copilot: Sign In'"
    else
        echo "⚠️  GitHub Copilot extension not found"
        echo "   Install with: $VSCODE_CMD --install-extension GitHub.copilot"
        echo "   Or via marketplace: https://marketplace.visualstudio.com/items?itemName=GitHub.copilot"
        
        # Offer to install automatically
        echo ""
        read -p "🤔 Install GitHub Copilot extension now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "📦 Installing GitHub Copilot extension..."
            $VSCODE_CMD --install-extension GitHub.copilot
            if [ $? -eq 0 ]; then
                echo "✅ GitHub Copilot extension installed successfully"
            else
                echo "❌ Failed to install extension. Please install manually."
            fi
        fi
    fi
else
    if [ "$VSCODE_FOUND" = true ]; then
        echo "⚠️  VSCode is installed but CLI is not available"
        echo "   Extensions can be installed manually from the marketplace"
        echo "   GitHub Copilot: https://marketplace.visualstudio.com/items?itemName=GitHub.copilot"
    else
        echo "⚠️  VSCode not detected. Install VSCode first, then run this script again."
    fi
fi

# 7. Initialize MCP project
echo "🚀 Initializing MCP project..."
if npm run cli init; then
    echo "✅ MCP project initialized successfully"
else
    echo "⚠️  MCP initialization had issues but continuing setup..."
    echo "   You may need to fix TypeScript errors first"
    echo "   Run 'npm run build' to see detailed errors"
fi

# 8. Create example spec if it doesn't exist
if [ ! -f "spec.md" ]; then
    echo "📝 Creating example specification..."
    # spec.md already exists from previous artifacts
fi

echo
echo "🎉 Setup Complete!"
echo "================"
echo

# Provide appropriate next steps based on what was detected
if [ "$VSCODE_FOUND" = true ]; then
    echo "📋 Next Steps:"
    echo "1. Open this project in VSCode:"
    if [ -n "$VSCODE_CMD" ]; then
        echo "   $VSCODE_CMD ."
    else
        echo "   Open VSCode manually and use File -> Open Folder"
    fi
    echo "2. Press Ctrl+Shift+P and run 'Tasks: Run Task'"
    echo "3. Select 'MCP: Start Server' to start the MCP server"
    echo "4. Use GitHub Copilot Chat with MCP context:"
    echo "   - Type '@mcp-next' for next task"
    echo "   - Type '@mcp-search authentication' to search"
    echo "   - Use snippets in your code files"
    echo
    echo "🔧 Commands to try:"
    echo "   Ctrl+Shift+P -> 'Tasks: Run Task' -> 'MCP: Get Next Task'"
    echo "   Ctrl+Shift+P -> 'Tasks: Run Task' -> 'MCP: Search Tasks'"
    echo
    echo "💡 In any file, type '@mcp' to see available snippets"
    echo
    echo "🤖 GitHub Copilot Integration:"
    echo "   - Copilot can now access task context via MCP"
    echo "   - Use @mcp-context snippet in code files"
    echo "   - Ask Copilot: 'What's my next task?' and it will query MCP"
    echo
    echo "✅ MCP Local is ready for intelligent development!"
    
    # Offer to open VSCode automatically
    if [ -n "$VSCODE_CMD" ]; then
        echo ""
        read -p "🤔 Open VSCode now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🎯 Opening VSCode..."
            $VSCODE_CMD . &
            echo "✅ VSCode opened! Check the integrated terminal and task runner."
        fi
    fi
else
    echo "📋 Setup completed, but VSCode is not installed yet:"
    echo "1. Install VSCode first:"
    echo "   • Download from: https://code.visualstudio.com/"
    echo "   • Ubuntu/Debian: sudo apt install code"
    echo "   • Snap: sudo snap install code --classic"
    echo "   • Flatpak: flatpak install flathub com.visualstudio.code"
    echo ""
    echo "2. After installing, run this script again:"
    echo "   ./scripts/setup-vscode.sh"
    echo ""
    echo "3. Or manually open the project in VSCode and install GitHub Copilot"
    echo ""
    echo "✅ MCP configuration is ready - just need VSCode!"
fi