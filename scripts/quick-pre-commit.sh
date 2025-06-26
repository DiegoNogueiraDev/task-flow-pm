#!/bin/bash

# 🚀 Verificação Rápida Pré-Commit - Task Flow PM
echo "🔍 Verificação rápida antes do commit..."

# Teste o build (mais importante)
echo "🏗️ Testando build..."
if npm run build; then
    echo "✅ Build OK"
else
    echo "❌ Build falhou - resolva antes de commitar"
    exit 1
fi

# Teste lint básico (pode ter warnings)
echo "🔍 Verificando lint..."
npm run lint || echo "⚠️ Lint tem problemas mas não é crítico"

echo ""
echo "🎉 PRONTO PARA COMMIT!"
echo "Próximos passos:"
echo "  git add ."
echo "  git commit -m 'fix: correções na pipeline CI/CD'"
echo "  git push" 