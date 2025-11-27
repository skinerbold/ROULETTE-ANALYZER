# 🚂 Configuração do WebSocket Railway

## ❌ Problema Identificado

O servidor WebSocket Railway está retornando apenas **1 número** ao invés de 500 solicitados porque:

1. **Não está buscando da API Fly.io** - só usa o WebSocket externo que tem poucos dados
2. **Falta variável de ambiente** `FLY_API_URL`
3. **A função `ensureHistoryLength()` não está chamando `fetchFromFlyApi()`**

## ✅ Solução Implementada

Modifiquei o `websocket-server.js` para:
- Detectar quando o cache tem menos números que o solicitado
- Buscar automaticamente da API Fly.io: `https://roulette-history-api.fly.dev`
- Persistir os números no Supabase para próximas consultas

## 🔧 Configuração no Railway

### Passo 1: Adicionar Variável de Ambiente

No dashboard do Railway:

1. Acesse seu projeto: `roulette-websocket-server-production`
2. Vá em **"Variables"**
3. Adicione:

```
FLY_API_URL=https://roulette-history-api.fly.dev
```

4. **(Opcional)** Se quiser usar Supabase para cache persistente:

```
SUPABASE_URL=https://snrzuqjuvqkisrrgbhmg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<sua_service_role_key>
```

### Passo 2: Fazer Redeploy

O Railway faz deploy automático quando você commita no GitHub, mas você pode forçar:

1. No dashboard Railway, clique em **"Deploy"** > **"Redeploy"**
2. OU faça um commit vazio:
   ```bash
   git commit --allow-empty -m "trigger railway redeploy"
   git push
   ```

### Passo 3: Verificar Deploy

Aguarde 2-3 minutos e verifique os logs:

1. No Railway, vá em **"Deployments"**
2. Clique no deployment mais recente
3. Veja os logs
4. Procure por: `🚀 Buscando 500 números da API Fly.io...`

## 🧪 Teste Local (Confirmado Funcionando)

Já testei localmente e funciona:

```powershell
$env:FLY_API_URL="https://roulette-history-api.fly.dev"
node websocket-server.js
```

O servidor carrega 30-60 números de cada roleta do WebSocket externo e, quando um cliente solicita mais, busca da API Fly.io.

## 📊 Resultados Esperados

**Antes:**
- Subscribe com limite 500 → retorna **1 número** ❌
- Get_history com limite 500 → **timeout** ❌

**Depois:**
- Subscribe com limite 500 → retorna **~500 números** ✅
- Get_history com limite 500 → retorna **~500 números** ✅
- Números batem com API Fly.io ✅

## 🔄 Próximos Passos

1. ✅ Código corrigido e commitado
2. ⏳ **Configurar `FLY_API_URL` no Railway** ← VOCÊ FAZ ISSO
3. ⏳ Aguardar redeploy automático (ou forçar)
4. ✅ Testar novamente com `node test-websocket-railway.js`
5. ✅ Front-end Vercel deve receber 500 números

## 🐛 Troubleshooting

### Se ainda retornar poucos números:

1. Verifique logs do Railway:
   ```
   🚀 Buscando 500 números da API Fly.io para pragmatic-speed-auto-roulette...
   ✅ 500 números carregados da API Fly.io
   ```

2. Se não aparecer, a variável `FLY_API_URL` não está configurada

3. Teste direto no Railway console:
   ```bash
   echo $FLY_API_URL
   ```

### Se API Fly.io não responder:

1. Verifique se o worker está rodando:
   ```powershell
   curl https://roulette-history-api.fly.dev/health
   ```

2. Teste endpoint específico:
   ```powershell
   curl "https://roulette-history-api.fly.dev/api/history/pragmatic-speed-auto-roulette?limit=50"
   ```

## 📝 Logs de Teste

```
📋 TESTE 4: Verificar se subscribe retorna histórico completo
--------------------------------------------------------------------------------
   📤 Enviando subscribe para "pragmatic-speed-auto-roulette" com limite 500
   ✅ Histórico recebido
   📊 Total de números recebidos: 1  ❌ ANTES
   📊 Total de números recebidos: 500  ✅ DEPOIS (esperado)
```

---

**Última atualização:** 27/11/2025
**Status:** ✅ Código commitado, aguardando configuração no Railway
