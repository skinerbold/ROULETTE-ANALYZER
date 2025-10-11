# ========================================
# SCRIPT DE DEPLOY AUTOMATIZADO
# Roulette Analyzer → GitHub → Vercel
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 DEPLOY AUTOMATIZADO - ROULETTE ANALYZER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
$currentPath = Get-Location
Write-Host "📁 Pasta atual: $currentPath" -ForegroundColor Yellow
Write-Host ""

# ========================================
# PASSO 1: Inicializar Git
# ========================================
Write-Host "🔧 PASSO 1/6: Inicializando Git..." -ForegroundColor Green

if (Test-Path ".git") {
    Write-Host "   ✅ Git já está inicializado" -ForegroundColor Gray
} else {
    git init
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Git inicializado com sucesso" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Erro ao inicializar Git" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# ========================================
# PASSO 2: Adicionar arquivos
# ========================================
Write-Host "📦 PASSO 2/6: Adicionando arquivos ao Git..." -ForegroundColor Green

git add .
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Arquivos adicionados" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Erro ao adicionar arquivos" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ========================================
# PASSO 3: Criar commit
# ========================================
Write-Host "💾 PASSO 3/6: Criando commit..." -ForegroundColor Green

$commitMessage = "Initial commit: Roulette Analyzer with 318 strategies"
git commit -m "$commitMessage"
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Commit criado: $commitMessage" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  Nada para commitar ou commit já existe" -ForegroundColor Yellow
}

Write-Host ""

# ========================================
# PASSO 4: Renomear branch para main
# ========================================
Write-Host "🌿 PASSO 4/6: Configurando branch main..." -ForegroundColor Green

git branch -M main
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Branch renomeada para 'main'" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  Branch já se chama 'main'" -ForegroundColor Yellow
}

Write-Host ""

# ========================================
# PASSO 5: Adicionar remote do GitHub
# ========================================
Write-Host "🔗 PASSO 5/6: Conectando ao GitHub..." -ForegroundColor Green

$repoUrl = "https://github.com/skinerbold/ROULETTE-ANALYZER.git"

# Verificar se remote já existe
$remoteExists = git remote get-url origin 2>$null

if ($remoteExists) {
    Write-Host "   ⚠️  Remote 'origin' já existe: $remoteExists" -ForegroundColor Yellow
    Write-Host "   🔄 Atualizando URL do remote..." -ForegroundColor Yellow
    git remote set-url origin $repoUrl
} else {
    git remote add origin $repoUrl
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Conectado ao repositório: $repoUrl" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Erro ao adicionar remote" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ========================================
# PASSO 6: Push para GitHub
# ========================================
Write-Host "⬆️  PASSO 6/6: Enviando para GitHub..." -ForegroundColor Green
Write-Host ""
Write-Host "   ⚠️  ATENÇÃO: Você precisará autenticar com GitHub!" -ForegroundColor Yellow
Write-Host "   📝 Use seu Personal Access Token (não senha)" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Se não tiver um token:" -ForegroundColor Cyan
Write-Host "   1. Acesse: https://github.com/settings/tokens" -ForegroundColor Cyan
Write-Host "   2. Generate new token (classic)" -ForegroundColor Cyan
Write-Host "   3. Marque: 'repo' (full control)" -ForegroundColor Cyan
Write-Host "   4. Copie o token gerado" -ForegroundColor Cyan
Write-Host ""

$confirmPush = Read-Host "   Deseja continuar com o push? (S/N)"

if ($confirmPush -eq "S" -or $confirmPush -eq "s") {
    Write-Host ""
    Write-Host "   🚀 Fazendo push..." -ForegroundColor Yellow
    
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "   ✅ Push realizado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "   ❌ Erro no push. Possíveis causas:" -ForegroundColor Red
        Write-Host "      - Credenciais incorretas" -ForegroundColor Gray
        Write-Host "      - Repositório não existe" -ForegroundColor Gray
        Write-Host "      - Sem permissão" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   💡 Tente:" -ForegroundColor Yellow
        Write-Host "      git push -u origin main" -ForegroundColor Cyan
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "   ⏸️  Push cancelado. Execute manualmente:" -ForegroundColor Yellow
    Write-Host "      git push -u origin main" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOY NO GITHUB CONCLUÍDO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  Acesse: https://vercel.com" -ForegroundColor Cyan
Write-Host "2️⃣  Clique em 'Sign Up' → 'Continue with GitHub'" -ForegroundColor Cyan
Write-Host "3️⃣  Clique em 'Add New...' → 'Project'" -ForegroundColor Cyan
Write-Host "4️⃣  Selecione: ROULETTE-ANALYZER" -ForegroundColor Cyan
Write-Host "5️⃣  Configure as variáveis de ambiente:" -ForegroundColor Cyan
Write-Host "     - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Gray
Write-Host "     - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Gray
Write-Host "6️⃣  Clique em 'Deploy'" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 Guia completo: Veja o arquivo DEPLOY.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 Seu repositório: https://github.com/skinerbold/ROULETTE-ANALYZER" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 SUCESSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
