# Roulette History System - Deployment Guide

Guia completo de deployment do sistema de histórico de roletas (Database + Worker + API + Front-end).

## 📋 Pré-requisitos

- ✅ Conta Supabase (gratuita)
- ✅ Conta Railway/Render (para Worker e API)
- ✅ Conta Vercel (para Front-end Next.js)
- ✅ WebSocket Server rodando em `wss://roulette-websocket-server-production.up.railway.app`

## 🗄️ Fase 1: Database (Supabase)

### 1. Criar Projeto Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie novo projeto
3. Anote:
   - **Project URL**: `https://seu-projeto.supabase.co`
   - **Anon Key**: `eyJhbGciOiJ...` (public)
   - **Service Role Key**: `eyJhbGciOiJ...` (secret, admin access)

### 2. Executar Migrations

**Opção A: Supabase Dashboard (Recomendado)**

1. Vá em **SQL Editor** no dashboard
2. Execute os arquivos SQL nesta ordem:

```sql
-- 1. Copiar e executar: database/001_create_roulette_history.sql
-- 2. Copiar e executar: database/002_create_roulette_metadata.sql
-- 3. Copiar e executar: database/003_create_update_function.sql
```

**Opção B: Supabase CLI**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref seu-projeto-id

# Executar migrations
supabase db push --include-all
```

### 3. Verificar Instalação

Execute `database/004_test_queries.sql` no SQL Editor para validar:

```sql
-- Deve retornar as tabelas criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('roulette_history', 'roulette_metadata');

-- Deve retornar a função
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'update_roulette_history';
```

### 4. Configurar RLS (Row Level Security)

Por padrão, as tabelas são **públicas para leitura** e **protegidas para escrita**.

Se quiser restringir acesso:

```sql
-- Desabilitar acesso público de leitura
ALTER TABLE roulette_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE roulette_metadata DISABLE ROW LEVEL SECURITY;

-- Criar políticas customizadas
-- (veja database/README.md seção "RLS Policies")
```

## 🤖 Fase 2: Worker (Railway/Render)

O Worker escuta o WebSocket 24/7 e atualiza o banco de dados.

### Deploy no Railway

1. **Criar novo projeto:**
   ```bash
   cd roulette-history-worker
   railway login
   railway init
   railway up
   ```

2. **Configurar variáveis de ambiente:**
   
   No dashboard Railway, vá em **Variables** e adicione:
   
   ```bash
   NODE_ENV=production
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGciOiJ... (SERVICE ROLE KEY)
   WEBSOCKET_URL=wss://roulette-websocket-server-production.up.railway.app
   LOG_LEVEL=info
   RECONNECT_DELAY_MS=5000
   MAX_RECONNECT_ATTEMPTS=999999
   HEALTH_CHECK_PORT=3000
   ENABLE_METRICS=true
   METRICS_INTERVAL_MS=300000
   ```

3. **Configurar Health Check:**
   
   - **Path:** `/health`
   - **Port:** `3000`
   - **Interval:** 30s

4. **Verificar logs:**
   
   ```bash
   railway logs
   ```
   
   Deve aparecer:
   ```
   [INFO] ✅ Roulette History Worker iniciado com sucesso
   [INFO] ✅ Conectado ao WebSocket
   ```

### Deploy no Render

1. **Criar Web Service:**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Port: `3000`

2. **Adicionar variáveis de ambiente** (mesmo que Railway)

3. **Configurar Health Check:**
   - Path: `/health`

## 🌐 Fase 3: API (Railway/Render)

A API serve os históricos via REST.

### Deploy no Railway

1. **Criar novo projeto:**
   ```bash
   cd roulette-history-api
   railway init
   railway up
   ```

2. **Configurar variáveis de ambiente:**
   
   ```bash
   NODE_ENV=production
   PORT=3001
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJ... (ANON KEY, não service role!)
   ALLOWED_ORIGINS=https://seu-site-frontend.vercel.app,https://www.seu-dominio.com
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX_REQUESTS=100
   LOG_LEVEL=info
   ENABLE_CACHE=true
   CACHE_TTL_SECONDS=30
   ```

3. **Gerar domínio público:**
   
   Railway cria automaticamente: `https://seu-projeto.up.railway.app`
   
   Ou adicione domínio customizado:
   ```
   api.seu-dominio.com → seu-projeto.up.railway.app
   ```

4. **Testar API:**
   
   ```bash
   curl https://seu-projeto.up.railway.app/health
   curl https://seu-projeto.up.railway.app/api/history/lightning-roulette?limit=100
   ```

### Deploy no Render

1. **Criar Web Service:**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Port: `3001`

2. **Adicionar variáveis de ambiente**

3. **Health Check:** `/health`

## 🎨 Fase 4: Front-end (Vercel)

### 1. Configurar Variável de Ambiente

No dashboard Vercel, adicione:

```bash
NEXT_PUBLIC_ROULETTE_HISTORY_API_URL=https://seu-api.up.railway.app
```

### 2. Deploy

```bash
cd seu-projeto-nextjs
vercel --prod
```

### 3. Testar Integração

Abra o site e verifique o console:

```javascript
// Deve aparecer logs do hook
✅ Sucesso: { count: 500, cached: false, numbers: [23, 15, 7, ...] }
```

## 🔍 Monitoramento

### 1. Worker Health Check

```bash
curl https://worker-url.up.railway.app/health
```

**Resposta esperada (200):**
```json
{
  "status": "healthy",
  "services": {
    "websocket": { "connected": true },
    "updater": { "queueSize": 0 }
  }
}
```

### 2. API Health Check

```bash
curl https://api-url.up.railway.app/health
```

**Resposta esperada (200):**
```json
{
  "status": "healthy",
  "cache": { "enabled": true, "size": 15 }
}
```

### 3. Verificar Banco de Dados

Execute no Supabase SQL Editor:

```sql
-- Ver últimas atualizações
SELECT 
  roulette_id,
  last_number,
  last_update,
  total_spins,
  history_count
FROM roulette_metadata
ORDER BY last_update DESC;

-- Ver histórico de uma roleta
SELECT number, timestamp, position
FROM roulette_history
WHERE roulette_id = 'lightning-roulette'
ORDER BY position ASC
LIMIT 10;
```

### 4. Logs

**Railway:**
```bash
railway logs --service worker
railway logs --service api
```

**Render:**
- Acesse dashboard → Logs

## 🚨 Troubleshooting

### Worker não conecta ao WebSocket

**Sintomas:**
- Logs: `⚠️ Conexão WebSocket fechada`
- Health check: `"connected": false`

**Soluções:**
1. Verificar WEBSOCKET_URL correto
2. Verificar WebSocket server está rodando
3. Aumentar RECONNECT_DELAY_MS

### API retorna erro 500

**Sintomas:**
- `GET /api/history/...` retorna 500
- Logs: `❌ Erro ao buscar histórico`

**Soluções:**
1. Verificar SUPABASE_URL e SUPABASE_ANON_KEY corretos
2. Verificar tabelas criadas no Supabase
3. Verificar RLS desabilitado ou políticas configuradas

### Front-end não recebe dados

**Sintomas:**
- Hook retorna `error: "Failed to fetch"`
- Console: `CORS error`

**Soluções:**
1. Verificar NEXT_PUBLIC_ROULETTE_HISTORY_API_URL correto
2. Adicionar origem do front-end em ALLOWED_ORIGINS da API
3. Verificar API está respondendo (`curl /health`)

### Cache não funciona

**Sintomas:**
- Todas requests vão ao banco (lento)
- Logs: `🔍 Consultando banco de dados` sempre

**Soluções:**
1. Verificar ENABLE_CACHE=true na API
2. Verificar CACHE_TTL_SECONDS > 0
3. Limpar cache: restart da API

## 📊 Métricas de Performance

### Esperado

- **Worker:**
  - Uptime: >99%
  - Messages processed/sec: ~1-10
  - Database update latency: <50ms
  - Memory: <100MB

- **API:**
  - Response time (cache hit): <1ms
  - Response time (cache miss): <10ms
  - Cache hit rate: >95%
  - Memory: <50MB

- **Database:**
  - Query time: <10ms
  - Storage: ~1MB por roleta (500 números)
  - Connections: 2 (worker + api)

## 🔐 Segurança

### 1. Proteger Service Role Key

⚠️ **NUNCA** exponha SUPABASE_SERVICE_KEY no front-end!

- ✅ Usar no Worker (backend)
- ✅ Usar em scripts de migração (local)
- ❌ NUNCA usar no browser
- ❌ NUNCA commitar no Git

### 2. Rate Limiting

API já tem rate limiting (100 req/min). Para aumentar:

```bash
# Na API
RATE_LIMIT_MAX_REQUESTS=500
```

### 3. CORS

Restringir origens permitidas:

```bash
# Na API
ALLOWED_ORIGINS=https://seu-site.com,https://www.seu-site.com
```

### 4. HTTPS

Railway/Render/Vercel fornecem HTTPS automaticamente.

## 📈 Scaling

### Worker

- Railway/Render escalam automaticamente
- Para múltiplos workers: usar apenas 1 instância (evitar race conditions)

### API

- Railway/Render escalam horizontalmente
- Cache é local (cada instância tem seu cache)
- Para cache compartilhado: usar Redis (futuro)

### Database

- Supabase Free Tier: até 500MB, 2GB bandwidth/mês
- Para upgrade: Supabase Pro ($25/mês)

## 🧪 Teste Completo do Sistema

### 1. Verificar Database

```sql
SELECT COUNT(*) FROM roulette_history; -- Deve ter registros
SELECT COUNT(*) FROM roulette_metadata; -- Deve ter 9 roletas
```

### 2. Verificar Worker

```bash
curl https://worker.up.railway.app/metrics
```

Deve mostrar `updatesSuccessful > 0`

### 3. Verificar API

```bash
# Histórico
curl https://api.up.railway.app/api/history/lightning-roulette?limit=100

# Metadata
curl https://api.up.railway.app/api/history/metadata
```

### 4. Verificar Front-end

Abra o site e no console deve aparecer:

```
✅ Sucesso: { count: 500, cached: false }
```

## 📚 Recursos

- **Supabase Docs:** https://supabase.com/docs
- **Railway Docs:** https://docs.railway.app
- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs

## 🎉 Conclusão

Após seguir este guia, você terá:

✅ Database com histórico persistente (500 números por roleta)
✅ Worker rodando 24/7 atualizando banco automaticamente
✅ API REST servindo históricos com cache
✅ Front-end Next.js integrado com hooks React
✅ Sistema completo monitorado e escalável

**Próximos passos:**
- Adicionar alertas (ex: Worker offline > 5min)
- Dashboard de métricas (Grafana)
- Backup automático do banco (Supabase já faz)
- Cache Redis para API (múltiplas instâncias)
