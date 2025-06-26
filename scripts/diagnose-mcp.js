#!/usr/bin/env node

/**
 * 🔍 MCP Local - Diagnostic Script (Cross-Platform)
 * Diagnoses MCP server configuration and functionality
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const os = require('os');

// 🎨 Console colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(level, message) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const levelColors = {
        INFO: colors.cyan,
        SUCCESS: colors.green,
        WARNING: colors.yellow,
        ERROR: colors.red
    };
    
    const color = levelColors[level] || colors.reset;
    console.log(`[${timestamp}] ${color}${level}${colors.reset}: ${message}`);
}

function logStep(step, message) {
    console.log(`\n${colors.blue}${step}${colors.reset} ${message}`);
}

function logSuccess(message) {
    console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logWarning(message) {
    console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logError(message) {
    console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

async function checkFile(filePath, description) {
    try {
        await fs.promises.access(filePath);
        logSuccess(`${description}: ${filePath}`);
        return true;
    } catch {
        logError(`${description} not found: ${filePath}`);
        return false;
    }
}

async function runCommand(command, args = [], options = {}) {
    return new Promise((resolve) => {
        const proc = spawn(command, args, { 
            stdio: 'pipe',
            shell: true,
            ...options 
        });
        
        let output = '';
        let error = '';
        
        proc.stdout?.on('data', (data) => {
            output += data.toString();
        });
        
        proc.stderr?.on('data', (data) => {
            error += data.toString();
        });
        
        proc.on('close', (code) => {
            resolve({ code, output, error });
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
            proc.kill();
            resolve({ code: -1, output, error: 'Command timeout' });
        }, 10000);
    });
}

async function main() {
    console.log(`${colors.bright}🔍 MCP Local - Diagnostic Tool${colors.reset}`);
    console.log('====================================');
    console.log(`Platform: ${os.platform()} ${os.arch()}`);
    console.log(`Node.js: ${process.version}`);
    console.log('');

    // Check if we're in the right directory
    if (!fs.existsSync('package.json')) {
        logError('Please run this script from the mcp-local project root directory');
        process.exit(1);
    }

    logStep('1.', 'Checking project structure...');
    
    const requiredFiles = [
        ['package.json', 'Package configuration'],
        ['tsconfig.json', 'TypeScript configuration'],
        ['bin/server.ts', 'MCP server source'],
        ['bin/mcp-unified.ts', 'CLI source'],
        ['src/db/graph.ts', 'Database module']
    ];

    for (const [file, description] of requiredFiles) {
        await checkFile(file, description);
    }

    logStep('2.', 'Checking dependencies...');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        const criticalDeps = ['better-sqlite3', 'yargs', '@anthropic-ai/sdk'];
        
        for (const dep of criticalDeps) {
            if (deps[dep]) {
                logSuccess(`${dep}: ${deps[dep]}`);
            } else {
                logError(`Missing critical dependency: ${dep}`);
            }
        }
    } catch (error) {
        logError(`Could not read package.json: ${error.message}`);
    }

    logStep('3.', 'Checking Node.js modules...');
    
    const result = await runCommand('npm', ['list', '--depth=0']);
    if (result.code === 0) {
        logSuccess('All dependencies installed');
    } else {
        logWarning('Some dependencies may be missing. Run: npm install');
    }

    logStep('4.', 'Testing TypeScript compilation...');
    
    const buildResult = await runCommand('npm', ['run', 'build']);
    if (buildResult.code === 0) {
        logSuccess('Build successful');
    } else {
        logError('Build failed');
        console.log('Build output:', buildResult.error);
    }

    logStep('5.', 'Checking built files...');
    
    const builtFiles = [
        'dist/bin/server.js',
        'dist/bin/mcp-unified.js'
    ];
    
    for (const file of builtFiles) {
        await checkFile(file, 'Built file');
    }

    logStep('6.', 'Testing CLI functionality...');
    
    const cliResult = await runCommand('node', ['dist/bin/mcp-unified.js', '--help']);
    if (cliResult.code === 0) {
        logSuccess('CLI is functional');
    } else {
        logError('CLI test failed');
        console.log('CLI error:', cliResult.error);
    }

    logStep('7.', 'Testing database functionality...');
    
    try {
        const Database = require('better-sqlite3');
        const testDb = new Database(':memory:');
        testDb.exec('CREATE TABLE test (id INTEGER PRIMARY KEY)');
        testDb.close();
        logSuccess('SQLite working correctly');
    } catch (error) {
        logError(`SQLite test failed: ${error.message}`);
    }

    logStep('8.', 'Testing MCP server...');
    
    // Start server briefly to test
    const serverTest = spawn('node', ['dist/bin/server.js'], {
        stdio: 'pipe',
        shell: true
    });
    
    let serverWorking = false;
    
    setTimeout(() => {
        serverTest.kill();
        if (serverWorking) {
            logSuccess('MCP server starts successfully');
        } else {
            logWarning('MCP server test inconclusive');
        }
    }, 3000);
    
    serverTest.stdout.on('data', (data) => {
        if (data.toString().includes('listening') || data.toString().includes('ready')) {
            serverWorking = true;
        }
    });

    logStep('9.', 'Checking project configuration...');
    
    const configFiles = [
        ['.mcp/config.json', 'MCP configuration'],
        ['mcp.json', 'MCP settings'],
        ['cursor.local-mcp.json', 'Cursor configuration']
    ];

    for (const [file, description] of configFiles) {
        const exists = fs.existsSync(file);
        if (exists) {
            logSuccess(`${description}: ${file}`);
        } else {
            logWarning(`${description} not found: ${file} (will be created on first run)`);
        }
    }

    console.log('\n' + colors.bright + '📋 Diagnostic Summary:' + colors.reset);
    console.log('=====================');
    console.log('');
    console.log('🔧 To setup the project:');
    console.log('   npm install');
    console.log('   npm run build');
    console.log('   npm run cli init');
    console.log('');
    console.log('🚀 To start using:');
    console.log('   npm run cli plan your-document.pdf');
    console.log('   npm run cli tasks');
    console.log('   npm run cli next');
    console.log('');
    console.log('🎯 Integration:');
    if (os.platform() === 'win32') {
        console.log('   npm run setup:cursor     # Setup Cursor (Windows)');
        console.log('   npm run setup:vscode     # Setup VS Code (Windows)');
    } else {
        console.log('   npm run setup:cursor:unix  # Setup Cursor (Unix)');
        console.log('   npm run setup:vscode:unix  # Setup VS Code (Unix)');
    }
    console.log('');
}

// Handle unhandled promises
process.on('unhandledRejection', (error) => {
    logError(`Unhandled error: ${error.message}`);
    process.exit(1);
});

// Run main function
main().catch((error) => {
    logError(`Diagnostic failed: ${error.message}`);
    process.exit(1);
}); 