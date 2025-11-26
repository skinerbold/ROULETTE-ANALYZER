# Roulette History API

REST API para servir os históricos dos últimos 500 números sorteados de cada roleta.

## 🎯 Funcionalidades

- ✅ Endpoint REST para consultar histórico por roleta
- ✅ Suporte a limites configuráveis (50, 100, 200, 300, 500)
- ✅ Cache em memória com TTL configurável
- ✅ Rate limiting (100 req/min por padrão)
- ✅ CORS configurável
- ✅ Validação de parâmetros
- ✅ Logging estruturado
- ✅ Health check endpoint
- ✅ Segurança com Helmet.js
- ✅ Graceful shutdown

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Copiar arquivo de configuração
cp .env.example .env

# Editar variáveis de ambiente
# SUPABASE_URL=https://seu-projeto.supabase.co
# SUPABASE_ANON_KEY=seu-anon-key
```

## 🚀 Execução

```bash
# Desenvolvimento (com watch mode)
npm run dev

# Produção
npm start

# Testes
npm test
```

## 📡 Endpoints

### GET /health

Health check do servidor.

**Resposta:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "cache": {
    "size": 15,
    "enabled": true,
    "ttl": 30000
  }
}
```

### GET /

Documentação básica da API.

**Resposta:**

```json
{
  "name": "Roulette History API",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /health",
    "history": "GET /api/history/:roulette_id?limit=50|100|200|300|500",
    "metadata": "GET /api/history/metadata/:roulette_id",
    "allMetadata": "GET /api/history/metadata"
  },
  "allowedRoulettes": [...],
  "allowedLimits": [50, 100, 200, 300, 500],
  "defaultLimit": 100
}
```

### GET /api/history/:roulette_id

Retorna o histórico de números de uma roleta específica.

**Parâmetros:**

- `roulette_id` (path, obrigatório): ID da roleta
- `limit` (query, opcional): Quantidade de números a retornar (50, 100, 200, 300, 500) - padrão: 100

**Exemplo:**

```bash
GET /api/history/lightning-roulette?limit=200
```

**Resposta (200):**

```json
{
  "success": true,
  "rouletteId": "lightning-roulette",
  "limit": 200,
  "count": 200,
  "cached": false,
  "numbers": [23, 15, 7, 32, 0, 14, ...],
  "metadata": {
    "lastNumber": 23,
    "lastUpdate": "2024-01-15T10:30:00.000Z",
    "totalSpins": 15234,
    "historyCount": 500
  }
}
```

**Resposta de Erro (400):**

```json
{
  "success": false,
  "error": "roulette_id inválido. Valores permitidos: ..."
}
```

### GET /api/history/metadata/:roulette_id

Retorna os metadados de uma roleta específica.

**Parâmetros:**

- `roulette_id` (path, obrigatório): ID da roleta

**Exemplo:**

```bash
GET /api/history/metadata/lightning-roulette
```

**Resposta (200):**

```json
{
  "success": true,
  "rouletteId": "lightning-roulette",
  "metadata": {
    "lastNumber": 23,
    "lastUpdate": "2024-01-15T10:30:00.000Z",
    "totalSpins": 15234,
    "historyCount": 500,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Resposta de Erro (404):**

```json
{
  "success": false,
  "error": "Metadata não encontrado para esta roleta"
}
```

### GET /api/history/metadata

Retorna os metadados de todas as roletas.

**Exemplo:**

```bash
GET /api/history/metadata
```

**Resposta (200):**

```json
{
  "success": true,
  "count": 9,
  "roulettes": [
    {
      "rouletteId": "lightning-roulette",
      "lastNumber": 23,
      "lastUpdate": "2024-01-15T10:30:00.000Z",
      "totalSpins": 15234,
      "historyCount": 500
    },
    {
      "rouletteId": "speed-roulette",
      "lastNumber": 7,
      "lastUpdate": "2024-01-15T10:29:45.000Z",
      "totalSpins": 12456,
      "historyCount": 500
    }
  ]
}
```

## 🔧 Configuração

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `NODE_ENV` | Ambiente (development/production) | `development` |
| `PORT` | Porta do servidor HTTP | `3001` |
| `SUPABASE_URL` | URL do projeto Supabase | **OBRIGATÓRIO** |
| `SUPABASE_ANON_KEY` | Anon Key do Supabase | **OBRIGATÓRIO** |
| `ALLOWED_ORIGINS` | Origens CORS permitidas (separadas por vírgula) | `http://localhost:3000` |
| `RATE_LIMIT_WINDOW_MS` | Janela de rate limiting (ms) | `60000` (1min) |
| `RATE_LIMIT_MAX_REQUESTS` | Máximo de requests por janela | `100` |
| `LOG_LEVEL` | Nível de log (debug/info/warn/error) | `info` |
| `ENABLE_CACHE` | Habilitar cache em memória | `true` |
| `CACHE_TTL_SECONDS` | TTL do cache (segundos) | `30` |

### Roletas Permitidas

**Evolution Gaming:**
- `first-person-roulette`
- `instant-roulette`
- `lightning-roulette`
- `speed-roulette`

**Pragmatic Play:**
- `pragmatic-auto-roulette`
- `pragmatic-roulette`
- `pragmatic-speed-auto-roulette`
- `pragmatic-mega-roulette`
- `pragmatic-powerup-roulette`

### Limites Permitidos

- `50` - Últimos 50 números
- `100` - Últimos 100 números (padrão)
- `200` - Últimos 200 números
- `300` - Últimos 300 números
- `500` - Últimos 500 números (histórico completo)

## 🏗️ Arquitetura

```
src/
├── index.js                      # Entry point (inicia API)
├── config/
│   ├── index.js                  # Configurações gerais
│   └── database.js               # Supabase client
├── controllers/
│   └── history.controller.js     # Lógica dos endpoints
├── services/
│   ├── history.service.js        # Acesso ao banco de dados
│   └── cache.service.js          # Cache em memória
├── routes/
│   └── history.routes.js         # Definição de rotas
├── middleware/
│   ├── cors.js                   # CORS configurável
│   ├── rate-limit.js             # Rate limiting
│   ├── request-logger.js         # Logging de requests
│   └── error-handler.js          # Tratamento de erros
└── utils/
    ├── logger.js                 # Logger estruturado
    └── validation.js             # Validação de parâmetros
```

### Fluxo de Requisição

1. **Request** chega ao servidor Express
2. **Middlewares** processam (CORS, rate limit, logging)
3. **Router** identifica a rota apropriada
4. **Controller** valida parâmetros
5. **Cache Service** verifica se há cache válido
6. Se cache miss, **History Service** consulta banco via Supabase
7. Resultado é armazenado no cache
8. **Response** é enviada ao cliente

### Cache Strategy

- Cache em memória (Map)
- TTL de 30 segundos (configurável)
- Chave: `roulette_id:limit`
- Invalidação: manual ou expiração

## 🔒 Segurança

### Helmet.js

Adiciona headers de segurança:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`

### Rate Limiting

Limita requests por IP:
- 100 requests/minuto (padrão)
- Resposta `429 Too Many Requests`
- Headers `RateLimit-*` com informações

### CORS

- Origens configuráveis via `.env`
- Métodos permitidos: `GET, OPTIONS`
- Credentials habilitado

### Validação

- Validação de `roulette_id` contra lista permitida
- Validação de `limit` contra valores permitidos
- Sanitização de inputs

## 📝 Logs

```
[2024-01-15T10:30:00.000Z] [INFO] [roulette-history-api] 🚀 Iniciando Roulette History API...
[2024-01-15T10:30:01.000Z] [INFO] [roulette-history-api] ✅ Configurações validadas
[2024-01-15T10:30:02.000Z] [INFO] [roulette-history-api] ✅ Conexão com banco de dados estabelecida
[2024-01-15T10:30:03.000Z] [INFO] [roulette-history-api] ✅ Middlewares configurados
[2024-01-15T10:30:03.000Z] [INFO] [roulette-history-api] ✅ Rotas configuradas
[2024-01-15T10:30:03.000Z] [INFO] [roulette-history-api] ✅ Error handlers configurados
[2024-01-15T10:30:03.000Z] [INFO] [roulette-history-api] ✅ Roulette History API iniciada com sucesso
  {
    "port": 3001,
    "cache": "enabled",
    "rateLimit": "100 req/60s"
  }
[2024-01-15T10:30:05.000Z] [INFO] [roulette-history-api] GET /api/history/lightning-roulette 200 45ms
  {
    "query": { "limit": "200" },
    "params": { "roulette_id": "lightning-roulette" },
    "ip": "::1",
    "userAgent": "Mozilla/5.0 ..."
  }
```

## 🐳 Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["npm", "start"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
```

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  roulette-api:
    build: .
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3001
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - ALLOWED_ORIGINS=https://seu-site.com
      - ENABLE_CACHE=true
      - CACHE_TTL_SECONDS=30
    ports:
      - "3001:3001"
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 5s
      retries: 3
```

## 📈 Performance

### Queries Otimizadas

```sql
-- Usa index idx_roulette_history_position (composite)
SELECT number, timestamp, position
FROM roulette_history
WHERE roulette_id = $1
ORDER BY position ASC
LIMIT $2;
```

**Performance esperada:**
- Com índice: <10ms
- Cache hit: <1ms

### Cache Hit Rate

Exemplo com TTL 30s e 1 request/segundo:
- Cache hit rate: ~97%
- Redução de queries ao banco: ~97%

## 🚨 Tratamento de Erros

### Erros de Validação (400)

```json
{
  "success": false,
  "error": "limit inválido. Valores permitidos: 50, 100, 200, 300, 500"
}
```

### Não Encontrado (404)

```json
{
  "success": false,
  "error": "Metadata não encontrado para esta roleta"
}
```

### Rate Limit (429)

```json
{
  "error": "Too many requests",
  "message": "Limite de 100 requisições por 60 segundos excedido",
  "retryAfter": 60
}
```

### Erro Interno (500)

```json
{
  "error": true,
  "message": "Internal Server Error"
}
```

## 🧪 Testes

### Teste Manual com curl

```bash
# Health check
curl http://localhost:3001/health

# Histórico completo (500 números)
curl http://localhost:3001/api/history/lightning-roulette?limit=500

# Histórico limitado (100 números)
curl http://localhost:3001/api/history/speed-roulette?limit=100

# Metadata de uma roleta
curl http://localhost:3001/api/history/metadata/instant-roulette

# Metadata de todas as roletas
curl http://localhost:3001/api/history/metadata

# Teste de validação (deve retornar 400)
curl http://localhost:3001/api/history/roleta-invalida

# Teste de rate limit (enviar 101 requests rapidamente)
for i in {1..101}; do curl http://localhost:3001/api/history/lightning-roulette; done
```

## 📚 Integração com Front-end

Exemplo de uso em React:

```typescript
// src/hooks/useRouletteHistory.ts
import { useState, useEffect } from 'react'

interface HistoryResponse {
  success: boolean
  rouletteId: string
  limit: number
  count: number
  cached: boolean
  numbers: number[]
  metadata: {
    lastNumber: number
    lastUpdate: string
    totalSpins: number
    historyCount: number
  }
}

export function useRouletteHistory(rouletteId: string, limit: number = 100) {
  const [data, setData] = useState<HistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `http://localhost:3001/api/history/${rouletteId}?limit=${limit}`
        )
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const json = await response.json()
        setData(json)
        setError(null)
      } catch (err) {
        setError(err.message)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
    
    // Refetch a cada 30 segundos
    const interval = setInterval(fetchHistory, 30000)
    
    return () => clearInterval(interval)
  }, [rouletteId, limit])

  return { data, loading, error }
}
```

## 📄 Licença

MIT
