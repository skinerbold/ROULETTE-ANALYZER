# 🚀 Guia de Deploy - Roulette Analyzer

## ⚠️ IMPORTANTE: WebSocket Server

O arquivo `websocket-server.js` **NÃO funciona no Vercel** (plataforma serverless).

### **Opções:**

1. **Deploy do WebSocket em outra plataforma (RECOMENDADO):**
   - Railway.app (gratuito)
   - Render.com (gratuito)
   - Fly.io (gratuito)

2. **Usar Next.js API Routes (limitado):**
   - Apenas HTTP, sem WebSocket em tempo real
   - Adequado para requisições pontuais

---

## 📦 Passo 1: Preparar o Repositório

### 1.1 Verificar arquivos ignorados pelo Git

Os seguintes arquivos já foram adicionados ao `.gitignore`:
- ✅ `websocket-server.js` (será movido para Railway)
- ✅ `api-config.js` (contém dados sensíveis)
- ✅ `test-auth.js` (apenas testes locais)
- ✅ Arquivos `.md` temporários
- ✅ Scripts PowerShell

### 1.2 Fazer commit e push

```bash
git status
git add .
git commit -m "feat: preparar projeto para deploy no Vercel"
git push origin master
```

---

## 🌐 Passo 2: Deploy no Vercel

### 2.1 Acessar Vercel Dashboard

1. Acesse: https://vercel.com/dashboard
2. Clique em **"New Project"**
3. Selecione o repositório: `ROULETTE-ANALYZER`

### 2.2 Configurar Variáveis de Ambiente

No painel de configuração do Vercel, adicione:

**Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL = https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sua-chave-anon-aqui
```

> ⚠️ **Como obter essas credenciais:**
> 1. Acesse: https://supabase.com/dashboard
> 2. Selecione seu projeto
> 3. Settings → API
> 4. Copie "Project URL" e "anon public key"

### 2.3 Configurações de Build

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (automático)
- **Output Directory**: `.next` (automático)
- **Install Command**: `npm install` (automático)

### 2.4 Deploy

Clique em **"Deploy"** e aguarde 2-5 minutos.

---

## 🔌 Passo 3: Deploy do WebSocket Server (Railway)

### Por que Railway?
- ✅ Gratuito (500h/mês)
- ✅ Suporta WebSocket
- ✅ Deploy automático via Git
- ✅ HTTPS automático

### 3.1 Criar conta no Railway

1. Acesse: https://railway.app
2. Faça login com GitHub

### 3.2 Criar novo projeto

1. Clique em **"New Project"**
2. Selecione **"Deploy from GitHub repo"**
3. **IMPORTANTE**: Você precisará criar um **repositório separado** para o WebSocket server

### 3.3 Criar repositório separado para WebSocket

Crie uma nova pasta com apenas os arquivos necessários:

```
roulette-websocket-server/
├── package.json
├── websocket-server.js
├── api-config.js
└── .gitignore
```

**package.json** mínimo:
```json
{
  "name": "roulette-websocket-server",
  "version": "1.0.0",
  "main": "websocket-server.js",
  "scripts": {
    "start": "node websocket-server.js"
  },
  "dependencies": {
    "ws": "^8.18.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 3.4 Configurar Railway

1. Após selecionar o repositório do WebSocket
2. Railway detectará automaticamente o Node.js
3. Configure a variável de ambiente:
   ```
   PORT = ${{RAILWAY_PUBLIC_PORT}}
   ```
4. Railway gerará uma URL pública, ex: `https://seu-app.railway.app`

### 3.5 Atualizar o frontend para usar o Railway URL

No seu projeto Next.js (Vercel), atualize a conexão WebSocket:

```typescript
// Antes (local):
const ws = new WebSocket('ws://localhost:3000');

// Depois (Railway):
const ws = new WebSocket('wss://seu-app.railway.app');
```

---

## 🔗 Passo 4: Conectar Vercel + Railway

### 4.1 Obter URL do Railway

Após deploy no Railway:
1. Acesse o dashboard do seu projeto
2. Clique em **"Settings"** → **"Networking"**
3. Copie a URL pública: `https://seu-app.railway.app`

### 4.2 Adicionar variável no Vercel

1. No Vercel, vá em **Settings** → **Environment Variables**
2. Adicione:
   ```
   NEXT_PUBLIC_WEBSOCKET_URL = wss://seu-app.railway.app
   ```
3. Redeploy o projeto Vercel

### 4.3 Atualizar código para usar variável de ambiente

```typescript
const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3000';
const ws = new WebSocket(wsUrl);
```

---

## ✅ Passo 5: Testar Deploy

### 5.1 Verificar Vercel

1. Acesse: https://roulette-analyzer-blue.vercel.app/
2. Teste login/cadastro
3. Verifique se a interface carrega

### 5.2 Verificar Railway

1. Acesse os logs do Railway
2. Confirme:
   ```
   🎰 Servidor WebSocket de Roleta rodando em ws://0.0.0.0:PORT
   ✅ Conectado ao WebSocket da API!
   ```

### 5.3 Verificar Integração

1. No app Vercel, abra o console do navegador (F12)
2. Procure por:
   ```
   ✅ Conectado ao WebSocket
   📨 Roletas recebidas: [...]
   ```

---

## 🐛 Troubleshooting

### Problema: "Build failed" no Vercel

**Solução:**
1. Verifique se `package.json` tem `"type": "module"` removido
2. Confirme que todas as dependências estão no `package.json`
3. Execute localmente: `npm run build`

### Problema: WebSocket não conecta

**Solução:**
1. Verifique se a URL do Railway está correta
2. Confirme que o protocolo é `wss://` (não `ws://`)
3. Verifique CORS no Railway (geralmente não é necessário para WebSocket)

### Problema: "Module not found"

**Solução:**
1. Delete `.next` e `node_modules`
2. Execute: `npm install`
3. Execute: `npm run build`

---

## 📊 Monitoramento

### Vercel Analytics
- Acesse: Vercel Dashboard → Seu Projeto → Analytics
- Monitore: Page Views, Unique Visitors, Performance

### Railway Logs
- Acesse: Railway Dashboard → Seu Projeto → Logs
- Monitore conexões WebSocket em tempo real

---

## 🔄 Atualizações Futuras

### Atualizar Frontend (Vercel)
```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin master
```
Vercel fará deploy automático.

### Atualizar WebSocket (Railway)
```bash
cd roulette-websocket-server
git add .
git commit -m "fix: correção no servidor"
git push origin main
```
Railway fará deploy automático.

---

## 💡 Dicas Finais

1. **Variáveis de Ambiente**: Nunca commite arquivos `.env` com credenciais
2. **Logs**: Sempre verifique os logs em caso de erro
3. **Cache**: Limpe cache do navegador se algo não atualizar
4. **Domínio Customizado**: Configure no Vercel Settings → Domains
5. **Backup**: Faça backup do banco Supabase regularmente

---

## 🆘 Precisa de Ajuda?

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

**Boa sorte com o deploy! 🚀**
