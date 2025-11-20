# Roulette History Worker

Worker Node.js 24/7 que escuta o WebSocket de roletas e atualiza o banco de dados com os últimos 500 números sorteados de cada roleta.

## 🎯 Funcionalidades

- ✅ Conexão persistente com WebSocket (auto-reconnect com exponential backoff)
- ✅ Atualização atômica do histórico via PL/pgSQL function
- ✅ Fila de processamento com retry automático
- ✅ Health Check Server (HTTP) com endpoints `/health`, `/metrics`, `/status`
- ✅ Logging estruturado com níveis (debug, info, warn, error)
- ✅ Métricas em tempo real
- ✅ Graceful shutdown (aguarda fila esvaziar)
- ✅ Filtro de roletas permitidas

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Copiar arquivo de configuração
cp .env.example .env

# Editar variáveis de ambiente
# SUPABASE_URL=https://seu-projeto.supabase.co
# SUPABASE_SERVICE_KEY=seu-service-role-key
# WEBSOCKET_URL=wss://roulette-websocket-server-production.up.railway.app
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

## 📊 Endpoints de Monitoramento

O worker expõe um servidor HTTP na porta `3000` (configurável via `HEALTH_CHECK_PORT`) com os seguintes endpoints:

### GET /health

Retorna o status de saúde do worker:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": "2h 15m 30s",
  "services": {
    "websocket": {
      "connected": true,
      "reconnectAttempts": 0
    },
    "updater": {
      "queueSize": 0,
      "processing": false,
      "activeRetries": 0
    }
  }
}
```

**Status Codes:**
- `200`: Healthy (WebSocket conectado, fila vazia)
- `503`: Unhealthy (WebSocket desconectado ou fila travada)

### GET /metrics

Retorna métricas detalhadas:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": "2h 15m 30s",
  "websocket": {
    "messagesReceived": 1523,
    "messagesProcessed": 1520,
    "errors": 0,
    "reconnections": 1,
    "isConnected": true
  },
  "updater": {
    "updatesReceived": 1520,
    "updatesSuccessful": 1518,
    "updatesFailed": 2,
    "retries": 2,
    "successRate": "99.87%",
    "averageProcessingTime": "45ms",
    "lastUpdateTime": "2024-01-15T10:29:58.000Z",
    "queueSize": 0,
    "updatesPerRoulette": {
      "lightning-roulette": 350,
      "speed-roulette": 425,
      "instant-roulette": 745
    }
  }
}
```

### GET /status

Retorna status completo do sistema (combinação de `/health` + `/metrics` + configurações):

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": "2h 15m 30s",
  "uptimeMs": 8130000,
  "environment": "production",
  "version": "1.0.0",
  "websocket": {
    "url": "wss://roulette-websocket-server-production.up.railway.app",
    "connected": true,
    "reconnectAttempts": 0,
    "lastPingTime": 1705318195000,
    "lastPongTime": 1705318195100,
    "metrics": { ... }
  },
  "updater": {
    "queueSize": 0,
    "processing": false,
    "activeRetries": 0,
    "metrics": { ... }
  },
  "config": {
    "allowedRoulettes": [...],
    "reconnectDelay": 5000,
    "maxReconnectAttempts": 999999,
    "healthCheckPort": 3000
  }
}
```

## 🔧 Configuração

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `SUPABASE_URL` | URL do projeto Supabase | **OBRIGATÓRIO** |
| `SUPABASE_SERVICE_KEY` | Service Role Key (admin) | **OBRIGATÓRIO** |
| `WEBSOCKET_URL` | URL do WebSocket server | `wss://roulette-websocket-server-production.up.railway.app` |
| `NODE_ENV` | Ambiente (development/production) | `development` |
| `LOG_LEVEL` | Nível de log (debug/info/warn/error) | `info` |
| `RECONNECT_DELAY_MS` | Delay inicial de reconexão (ms) | `5000` |
| `MAX_RECONNECT_ATTEMPTS` | Máximo de tentativas de reconexão | `999999` |
| `HEALTH_CHECK_PORT` | Porta do servidor HTTP de health check | `3000` |
| `ENABLE_METRICS` | Habilitar relatório periódico de métricas | `false` |
| `METRICS_INTERVAL_MS` | Intervalo de relatório de métricas (ms) | `300000` (5min) |

### Roletas Permitidas

O worker está configurado para processar apenas as seguintes roletas:

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

Para modificar, edite `src/config/websocket.js`:

```javascript
allowedRoulettes: [
  'nova-roleta-id',
  // ...
]
```

## 🏗️ Arquitetura

```
src/
├── index.js                      # Entry point (inicia worker)
├── config/
│   ├── database.js               # Supabase client
│   └── websocket.js              # Configurações do WebSocket
├── services/
│   ├── websocket-client.js       # Cliente WebSocket com reconnect
│   ├── history-updater.js        # Processador de atualizações
│   └── health-check.js           # Servidor HTTP de health check
└── utils/
    └── logger.js                 # Logger estruturado
```

### Fluxo de Dados

1. **WebSocket Client** conecta ao servidor de roletas
2. Recebe mensagem `roulette-update` com `{ rouletteId, number, timestamp }`
3. Valida se roleta está na lista permitida e número é válido (0-36)
4. Emite evento `roulette-number` para **History Updater**
5. **History Updater** adiciona à fila de processamento
6. Chama função PL/pgSQL `update_roulette_history(p_roulette_id, p_number, p_timestamp)`
7. Função executa atomicamente:
   - `DELETE` position = 500
   - `UPDATE` todas positions = position + 1
   - `INSERT` novo número na position = 1
   - `UPDATE` metadata (last_number, total_spins, last_update)
8. Se falhar, retenta até 3x com exponential backoff (2s, 4s, 8s)
9. **Health Check Server** expõe métricas via HTTP

## 📝 Logs

O logger estruturado registra todos os eventos com níveis de severidade:

```
[2024-01-15T10:30:00.000Z] [INFO] [roulette-history-worker] 🚀 Iniciando Roulette History Worker...
[2024-01-15T10:30:01.000Z] [INFO] [roulette-history-worker] ✅ Conexão com banco de dados estabelecida
[2024-01-15T10:30:02.000Z] [INFO] [roulette-history-worker] ✅ Health Check Server iniciado
  {
    "port": 3000,
    "endpoints": ["/health", "/metrics", "/status"]
  }
[2024-01-15T10:30:03.000Z] [INFO] [roulette-history-worker] 🔌 Conectando ao WebSocket...
  {
    "url": "wss://roulette-websocket-server-production.up.railway.app"
  }
[2024-01-15T10:30:04.000Z] [INFO] [roulette-history-worker] ✅ Conectado ao WebSocket
[2024-01-15T10:30:05.000Z] [INFO] [roulette-history-worker] 📊 Nova atualização para roleta: lightning-roulette
  {
    "rouletteId": "lightning-roulette",
    "number": 17,
    "timestamp": "2024-01-15T10:30:05.000Z"
  }
[2024-01-15T10:30:05.500Z] [INFO] [roulette-history-worker] ✅ Operação DB concluída: update_roulette_history
  {
    "rouletteId": "lightning-roulette",
    "number": 17,
    "historyCount": 500,
    "processingTime": "45ms",
    "totalDelay": "500ms"
  }
```

## 🚨 Tratamento de Erros

### Reconexão WebSocket

- Usa **exponential backoff**: 5s, 10s, 20s, 40s, ... até max 5 minutos
- Máximo de tentativas: 999,999 (essencialmente infinito)
- Em caso de desconexão, continua tentando reconectar indefinidamente
- Health check reportará status `unhealthy` quando desconectado

### Retry de Atualizações

- Cada atualização tem até **3 tentativas**
- Delays: 2s, 4s, 8s (exponential backoff)
- Após 3 falhas, emite evento `update-failed` e descarta atualização
- Logs detalham cada tentativa e motivo da falha

### Graceful Shutdown

Ao receber `SIGTERM` ou `SIGINT`:

1. Para de aceitar novas mensagens do WebSocket
2. Aguarda até **30 segundos** para fila esvaziar
3. Se timeout atingido, registra quantas atualizações foram perdidas
4. Para Health Check Server
5. Registra métricas finais
6. Encerra processo com exit code apropriado

## 🐳 Docker (Opcional)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

ENV NODE_ENV=production

CMD ["npm", "start"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
```

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  roulette-worker:
    build: .
    restart: unless-stopped
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - WEBSOCKET_URL=${WEBSOCKET_URL}
      - NODE_ENV=production
      - LOG_LEVEL=info
      - ENABLE_METRICS=true
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

## 📈 Monitoramento em Produção

### Usando Railway/Render

1. Faça deploy do worker
2. Configure variáveis de ambiente
3. Adicione health check endpoint: `/health`
4. Configure alerts para status `503`

### Usando PM2

```bash
# Instalar PM2
npm install -g pm2

# Iniciar worker
pm2 start src/index.js --name roulette-worker

# Monitorar
pm2 monit

# Ver logs
pm2 logs roulette-worker

# Restart
pm2 restart roulette-worker

# Parar
pm2 stop roulette-worker
```

### Usando systemd

```ini
# /etc/systemd/system/roulette-worker.service
[Unit]
Description=Roulette History Worker
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/opt/roulette-worker
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Ativar serviço
sudo systemctl enable roulette-worker
sudo systemctl start roulette-worker

# Ver status
sudo systemctl status roulette-worker

# Ver logs
sudo journalctl -u roulette-worker -f
```

## 🧪 Testes

```bash
# Executar testes (quando implementados)
npm test

# Executar com watch mode
npm run test:watch
```

## 📚 Referências

- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [ws - WebSocket Client](https://github.com/websockets/ws)
- [Node.js EventEmitter](https://nodejs.org/api/events.html)
- [PostgreSQL PL/pgSQL Functions](https://www.postgresql.org/docs/current/plpgsql.html)

## 🤝 Contribuição

Este worker faz parte do projeto Roulette History System. Para contribuir:

1. Mantenha logs estruturados
2. Adicione testes para novas funcionalidades
3. Documente mudanças no README
4. Siga o padrão de código existente

## 📄 Licença

MIT
