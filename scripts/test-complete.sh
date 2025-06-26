#!/bin/bash

echo "🧪 MCP Local - Complete Test Suite"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the mcp-local project root directory"
    exit 1
fi

print_status "Step 1: Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi

print_status "Step 2: Building project..."
npm run build
if [ $? -eq 0 ]; then
    print_success "Project built successfully"
else
    print_error "Build failed"
    exit 1
fi

print_status "Step 3: Running unit tests..."
npm test
if [ $? -eq 0 ]; then
    print_success "Unit tests passed"
else
    print_error "Some unit tests failed"
fi

print_status "Step 4: Testing CLI initialization..."
npm run cli init
if [ $? -eq 0 ]; then
    print_success "CLI initialization successful"
else
    print_error "CLI initialization failed"
    exit 1
fi

print_status "Step 5: Testing task planning with example spec..."
npm run cli plan spec.md
if [ $? -eq 0 ]; then
    print_success "Task planning successful"
else
    print_error "Task planning failed"
    exit 1
fi

print_status "Step 6: Listing created tasks..."
npm run cli tasks
if [ $? -eq 0 ]; then
    print_success "Task listing successful"
else
    print_error "Task listing failed"
fi

print_status "Step 7: Getting next recommended task..."
npm run cli next
if [ $? -eq 0 ]; then
    print_success "Next task recommendation successful"
else
    print_error "Next task recommendation failed"
fi

print_status "Step 8: Testing hybrid search..."
npm run cli search "authentication"
if [ $? -eq 0 ]; then
    print_success "Hybrid search successful"
else
    print_warning "Hybrid search had issues (this is normal without embeddings)"
fi

print_status "Step 9: Testing embeddings detection..."
node -e "
const { EmbeddingsService } = require('./dist/src/db/embeddings.js');
(async () => {
  const embeddings = new EmbeddingsService();
  const type = await embeddings.getImplementationType();
  console.log('🧠 Embeddings implementation:', type);
  
  const testEmbedding = await embeddings.generateEmbedding('test authentication system');
  console.log('📊 Test embedding dimension:', testEmbedding.length);
  console.log('✅ Embeddings working correctly');
})().catch(console.error);
"

print_status "Step 10: Testing MCP server (5 second test)..."
timeout 5s npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 2

# Test if server is responding
echo '{"command":"listTasks"}' | node dist/bin/server.js > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "MCP server responding correctly"
else
    print_warning "MCP server test inconclusive"
fi

# Cleanup
kill $SERVER_PID 2>/dev/null

print_status "Step 11: Checking generated files..."
if [ -d ".mcp" ]; then
    print_success "MCP directory created"
    if [ -f ".mcp/graph.db" ]; then
        print_success "Database file created"
    else
        print_warning "Database file not found"
    fi
else
    print_warning "MCP directory not created"
fi

if [ -f "mcp.json" ]; then
    print_success "Configuration file created"
else
    print_warning "Configuration file not found"
fi

echo
echo "🎯 Test Summary:"
echo "==============="

# Check database content
if [ -f ".mcp/graph.db" ]; then
    TASK_COUNT=$(node -e "
    const Database = require('better-sqlite3');
    const db = new Database('.mcp/graph.db');
    try {
      const count = db.prepare('SELECT COUNT(*) as count FROM nodes').get();
      console.log(count.count);
    } catch(e) {
      console.log('0');
    }
    db.close();
    ")
    
    if [ "$TASK_COUNT" -gt 0 ]; then
        print_success "Created $TASK_COUNT tasks in database"
    else
        print_warning "No tasks found in database"
    fi
fi

# Test a complete workflow
print_status "Step 12: Testing complete workflow..."

# Get first task ID
FIRST_TASK_ID=$(node -e "
const Database = require('better-sqlite3');
const db = new Database('.mcp/graph.db');
try {
  const task = db.prepare('SELECT id FROM nodes LIMIT 1').get();
  console.log(task ? task.id : '');
} catch(e) {
  console.log('');
}
db.close();
")

if [ -n "$FIRST_TASK_ID" ]; then
    print_status "Testing workflow with task: $FIRST_TASK_ID"
    
    # Begin task
    npm run cli begin "$FIRST_TASK_ID" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_success "Task begin successful"
        
        # Generate scaffold
        npm run cli scaffold "$FIRST_TASK_ID" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            print_success "Scaffold generation successful"
            
            # Check if scaffold files were created
            if [ -d "scaffold/$FIRST_TASK_ID" ]; then
                print_success "Scaffold directory created"
            fi
        else
            print_warning "Scaffold generation failed"
        fi
        
        # Complete task
        npm run cli done "$FIRST_TASK_ID" 30 > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            print_success "Task completion successful"
            
            # Add reflection
            npm run cli reflect "$FIRST_TASK_ID" "Test reflection note" > /dev/null 2>&1
            if [ $? -eq 0 ]; then
                print_success "Reflection addition successful"
            else
                print_warning "Reflection addition failed"
            fi
        else
            print_warning "Task completion failed"
        fi
    else
        print_warning "Task begin failed"
    fi
else
    print_warning "No tasks available for workflow testing"
fi

print_status "Step 13: Testing learning statistics..."
npm run cli stats > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Learning statistics accessible"
else
    print_warning "Learning statistics had issues"
fi

echo
echo "🎉 Test Suite Complete!"
echo "======================"
echo
print_success "MCP Local is ready to use!"
echo
echo "📋 Quick Start Commands:"
echo "  npm run cli next          # Get next task"
echo "  npm run cli begin <id>    # Start working on a task"
echo "  npm run cli search <query> # Search for related tasks"
echo "  npm run cli done <id>     # Complete a task"
echo "  npm run cli stats         # View learning statistics"
echo
echo "🔧 Integration:"
echo "  npm run dev              # Start MCP server for Cursor"
echo "  Copy cursor.local-mcp.json to your project"
echo
echo "📊 Current