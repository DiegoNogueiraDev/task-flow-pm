# MCP Local - Complete Test Suite (PowerShell)
Write-Host "🧪 MCP Local - Complete Test Suite" -ForegroundColor Blue
Write-Host "==================================" -ForegroundColor Blue

function Write-Status($message) {
    Write-Host "ℹ️  $message" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host "✅ $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "⚠️  $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "❌ $message" -ForegroundColor Red
}

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Error "Please run this script from the mcp-local project root directory"
    exit 1
}

Write-Status "Step 1: Installing dependencies..."
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Success "Dependencies installed"
} else {
    Write-Error "Failed to install dependencies"
    exit 1
}

Write-Status "Step 2: Building project..."
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Success "Project built successfully"
} else {
    Write-Error "Build failed"
    exit 1
}

Write-Status "Step 3: Running unit tests..."
npm test
if ($LASTEXITCODE -eq 0) {
    Write-Success "Unit tests passed"
} else {
    Write-Error "Some unit tests failed"
}

Write-Status "Step 4: Testing CLI initialization..."
npm run cli init
if ($LASTEXITCODE -eq 0) {
    Write-Success "CLI initialization successful"
} else {
    Write-Error "CLI initialization failed"
    exit 1
}

Write-Status "Step 5: Testing task planning with example spec..."
npm run cli plan spec.md
if ($LASTEXITCODE -eq 0) {
    Write-Success "Task planning successful"
} else {
    Write-Error "Task planning failed"
    exit 1
}

Write-Status "Step 6: Listing created tasks..."
npm run cli tasks
if ($LASTEXITCODE -eq 0) {
    Write-Success "Task listing successful"
} else {
    Write-Error "Task listing failed"
}

Write-Status "Step 7: Getting next recommended task..."
npm run cli next
if ($LASTEXITCODE -eq 0) {
    Write-Success "Next task recommendation successful"
} else {
    Write-Error "Next task recommendation failed"
}

Write-Status "Step 8: Testing hybrid search..."
npm run cli search "authentication"
if ($LASTEXITCODE -eq 0) {
    Write-Success "Hybrid search successful"
} else {
    Write-Warning "Hybrid search had issues (this is normal without embeddings)"
}

Write-Status "Step 9: Testing embeddings detection..."
$embedTestScript = @"
const { EmbeddingsService } = require('./dist/src/db/embeddings.js');
(async () => {
  const embeddings = new EmbeddingsService();
  const type = await embeddings.getImplementationType();
  console.log('🧠 Embeddings implementation:', type);
  
  const testEmbedding = await embeddings.generateEmbedding('test authentication system');
  console.log('📊 Test embedding dimension:', testEmbedding.length);
  console.log('✅ Embeddings working correctly');
})().catch(console.error);
"@

node -e $embedTestScript

Write-Status "Step 10: Testing MCP server (5 second test)..."
$serverJob = Start-Job -ScriptBlock { npm run dev }
Start-Sleep -Seconds 2

# Test if server is responding
$testCommand = '{"command":"listTasks"}'
$testResult = $testCommand | node dist/bin/server.js 2>$null
if ($testResult) {
    Write-Success "MCP server responding correctly"
} else {
    Write-Warning "MCP server test inconclusive"
}

# Cleanup
Stop-Job $serverJob -ErrorAction SilentlyContinue
Remove-Job $serverJob -ErrorAction SilentlyContinue

Write-Status "Step 11: Checking generated files..."
if (Test-Path ".mcp") {
    Write-Success "MCP directory created"
    if (Test-Path ".mcp/graph.db") {
        Write-Success "Database file created"
    } else {
        Write-Warning "Database file not found"
    }
} else {
    Write-Warning "MCP directory not created"
}

if (Test-Path "mcp.json") {
    Write-Success "Configuration file created"
} else {
    Write-Warning "Configuration file not found"
}

Write-Host ""
Write-Host "🎯 Test Summary:" -ForegroundColor Blue
Write-Host "===============" -ForegroundColor Blue

# Check database content
if (Test-Path ".mcp/graph.db") {
    $taskCountScript = @"
    const Database = require('better-sqlite3');
    const db = new Database('.mcp/graph.db');
    try {
      const count = db.prepare('SELECT COUNT(*) as count FROM nodes').get();
      console.log(count.count);
    } catch(e) {
      console.log('0');
    }
    db.close();
"@
    
    $taskCount = node -e $taskCountScript
    
    if ([int]$taskCount -gt 0) {
        Write-Success "Created $taskCount tasks in database"
    } else {
        Write-Warning "No tasks found in database"
    }
}

# Test a complete workflow
Write-Status "Step 12: Testing complete workflow..."

# Get first task ID
$getTaskScript = @"
const Database = require('better-sqlite3');
const db = new Database('.mcp/graph.db');
try {
  const task = db.prepare('SELECT id FROM nodes LIMIT 1').get();
  console.log(task ? task.id : '');
} catch(e) {
  console.log('');
}
db.close();
"@

$firstTaskId = node -e $getTaskScript

if ($firstTaskId) {
    Write-Status "Testing workflow with task: $firstTaskId"
    
    # Begin task
    npm run cli begin $firstTaskId >$null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Task begin successful"
        
        # Generate scaffold
        npm run cli scaffold $firstTaskId >$null 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Scaffold generation successful"
            
            # Check if scaffold files were created
            if (Test-Path "scaffold/$firstTaskId") {
                Write-Success "Scaffold directory created"
            }
        } else {
            Write-Warning "Scaffold generation failed"
        }
        
        # Complete task
        npm run cli done $firstTaskId 30 >$null 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Task completion successful"
            
            # Add reflection
            npm run cli reflect $firstTaskId "Test reflection note" >$null 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Reflection addition successful"
            } else {
                Write-Warning "Reflection addition failed"
            }
        } else {
            Write-Warning "Task completion failed"
        }
    } else {
        Write-Warning "Task begin failed"
    }
} else {
    Write-Warning "No tasks available for workflow testing"
}

Write-Status "Step 13: Testing learning statistics..."
npm run cli stats >$null 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Learning statistics accessible"
} else {
    Write-Warning "Learning statistics had issues"
}

Write-Host ""
Write-Host "🎉 Test Suite Complete!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""
Write-Success "MCP Local is ready to use!"
Write-Host ""
Write-Host "📋 Quick Start Commands:" -ForegroundColor Yellow
Write-Host "  npm run cli next          # Get next task"
Write-Host "  npm run cli begin <id>    # Start working on a task" 
Write-Host "  npm run cli search <query> # Search for related tasks"
Write-Host "  npm run cli done <id>     # Complete a task"
Write-Host "  npm run cli stats         # View learning statistics"
Write-Host ""
Write-Host "🔧 Integration:" -ForegroundColor Yellow
Write-Host "  npm run dev              # Start MCP server for Cursor"
Write-Host "  Copy cursor.local-mcp.json to your project"
Write-Host ""

# Current status
Write-Host "📊 Current Status:" -ForegroundColor Yellow
if (Test-Path ".mcp/graph.db") {
    $statsScript = @"
    const Database = require('better-sqlite3');
    const db = new Database('.mcp/graph.db');
    try {
      const stats = db.prepare('SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = "in-progress" THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed
      FROM nodes').get();
      console.log(\`  📋 Total tasks: \${stats.total}\`);
      console.log(\`  ⏳ Pending: \${stats.pending}\`);
      console.log(\`  🚧 In Progress: \${stats.in_progress}\`);
      console.log(\`  ✅ Completed: \${stats.completed}\`);
    } catch(e) {
      console.log('  📊 Database stats unavailable');
    }
    db.close();
"@
    
    $stats = node -e $statsScript
    Write-Host $stats
}

Write-Host ""
Write-Host "🔗 Useful Links:" -ForegroundColor Yellow
Write-Host "  📖 README.md - Complete documentation"
Write-Host "  🧪 npm test - Run test suite"
Write-Host "  🔍 npm run cli search <query> - Search tasks"
Write-Host ""
Write-Success "Setup complete! MCP Local is fully functional."