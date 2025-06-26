#!/bin/bash

echo "🐍 Optional: Installing Python dependencies for enhanced embeddings..."
echo "⚠️  Note: This is OPTIONAL. MCP Local works perfectly with JavaScript-only embeddings!"
echo ""

# Check if user wants to proceed
read -p "🤔 Do you want to install Python embeddings for potentially better quality? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "✅ Skipping Python installation. Using JavaScript embeddings (recommended)."
    echo "💡 You can always run this script later if needed."
    exit 0
fi

echo "📋 Proceeding with Python embeddings installation..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    echo "💡 Alternatively, MCP Local works great with JavaScript-only embeddings!"
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip first."
    echo "💡 Alternatively, MCP Local works great with JavaScript-only embeddings!"
    exit 1
fi

# Install sentence-transformers
echo "📦 Installing sentence-transformers (this may take a few minutes)..."
pip3 install sentence-transformers

# Test installation
echo "🧪 Testing Python embeddings..."
python3 -c "
try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embedding = model.encode(['test'])
    print('✅ Python embeddings working! Vector dimension:', len(embedding[0]))
    print('🔬 Enhanced semantic similarity available')
except Exception as e:
    print('❌ Python embeddings test failed:', e)
    print('💡 Falling back to JavaScript embeddings (which work great!)')
    exit(1)
"

if [ $? -eq 0 ]; then
    echo "🎉 Python embeddings setup complete!"
    echo "💡 The MCP server will now use high-quality sentence-transformers embeddings."
    echo "🔄 To test both implementations:"
    echo "   npm run test:js-embeddings  # Test JavaScript version"
    echo "   npm run cli search 'test'   # Uses Python if available"
else
    echo "⚠️  Python setup failed, but don't worry!"
    echo "✅ MCP Local will automatically use JavaScript embeddings instead."
    echo "🚀 Run 'npm run test:js-embeddings' to verify functionality."
fi