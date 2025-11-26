# 🎰 Roulette Analyzer - Sistema Completo Implantado

## ✅ Status do Sistema

### **Infraestrutura Completa (3 Camadas)**

1. **Worker de Coleta (Fly.io)**
   - 🌐 URL: https://roulette-history-worker.fly.dev/
   - ✅ Status: **Operacional 24/7**
   - 📊 Função: Coleta números do WebSocket e salva no Supabase
   - 🔄 Processamento: ~5-10 números/minuto de 5 roletas simultaneamente

2. **API REST (Fly.io)**
   - 🌐 URL: https://roulette-history-api.fly.dev/
   - ✅ Status: **Operacional 24/7**
   - 📡 Função: Serve históricos e estatísticas via REST API
   - ⚡ Cache: Habilitado (30s TTL)

3. **Front-End Next.js (Localhost)**
   - 🌐 URL: http://localhost:3000
   - ✅ Status: **Rodando**
   - 🎨 Função: Interface do usuário com análise de estratégias
   - 📊 Integração: WebSocket + API de histórico

---

## 🗄️ Banco de Dados (Supabase)

### **Tabelas**

1. **roulette_history** (500 registros/roleta - circular queue)
   - `roulette_id` (TEXT): ID da roleta
   - `number` (INTEGER): Número sorteado (0-36)
   - `timestamp` (BIGINT): Timestamp em milliseconds
   - `position` (INTEGER): Posição no histórico (0-499)

2. **roulette_metadata** (1 registro/roleta)
   - `roulette_id` (TEXT): ID da roleta (PK)
   - `total_spins` (INTEGER): Total de spins coletados
   - `last_number` (INTEGER): Último número sorteado
   - `last_update` (TIMESTAMPTZ): Última atualização
   - `number_frequency` (JSONB): Frequência de cada número

### **Função PL/pgSQL**
```sql
update_roulette_history(p_roulette_id TEXT, p_number INTEGER, p_timestamp BIGINT)
```
- Gerencia circular queue automático
- Atualiza metadados e frequências
- Converte timestamps milliseconds → TIMESTAMPTZ

### **Dados Coletados**
- ✅ **133+ spins** coletados em produção
- ✅ **5 roletas ativas**:
  - `lightning-roulette` (Evolution)
  - `speed-roulette` (Evolution)
  - `pragmatic-auto-roulette` (Pragmatic Play)
  - `pragmatic-speed-auto-roulette` (Pragmatic Play)
  - `pragmatic-roulette` (Pragmatic Play)

---

## 🔌 API Endpoints

### **1. Health Check**
```
GET https://roulette-history-api.fly.dev/health
```
Retorna status do servidor.

### **2. Histórico de Roleta**
```
GET https://roulette-history-api.fly.dev/api/history/:rouletteId?limit=50
```
**Parâmetros:**
- `rouletteId`: ID da roleta (ex: `lightning-roulette`)
- `limit`: 50, 100, 200, 300 ou 500 (padrão: 100)

**Resposta:**
```json
{
  "success": true,
  "rouletteId": "lightning-roulette",
  "limit": 50,
  "count": 50,
  "cached": false,
  "numbers": [7, 28, 0, 6, 15, ...],
  "metadata": {
    "lastNumber": 24,
    "lastUpdate": "2025-11-23T20:01:09.414+00:00",
    "totalSpins": 62,
    "historyCount": 50
  }
}
```

### **3. Metadados de Roleta**
```
GET https://roulette-history-api.fly.dev/api/metadata/:rouletteId
```
Retorna estatísticas de uma roleta.

### **4. Metadados de Todas as Roletas**
```
GET https://roulette-history-api.fly.dev/api/metadata
```
Retorna estatísticas de todas as roletas monitoradas.

---

## 🚀 Integração Front-End

### **Hooks React Customizados**

1. **`useRouletteHistory`**
   ```typescript
   const {
     data,           // Resposta completa da API
     numbers,        // Array de números
     metadata,       // Metadados da roleta
     loading,        // Estado de carregamento
     error,          // Erros
     refetch,        // Função para recarregar
     isRefetching    // Estado de refetch
   } = useRouletteHistory(selectedRoulette, {
     limit: 500,
     refetchInterval: 30000,  // Atualiza a cada 30s
     enabled: !!selectedRoulette
   })
   ```

2. **`useAllRouletteMetadata`**
   ```typescript
   const {
     data,           // Resposta completa
     roulettes,      // Array de metadados de todas as roletas
     loading,        // Estado de carregamento
     error,          // Erros
     refetch         // Função para recarregar
   } = useAllRouletteMetadata({
     refetchInterval: 60000,  // Atualiza a cada 60s
     enabled: true
   })
   ```

### **Variáveis de Ambiente (.env)**

```env
# Supabase (apenas front-end)
NEXT_PUBLIC_SUPABASE_URL=https://ohgpjizogwpbhinghmob.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Roulette History API
NEXT_PUBLIC_ROULETTE_HISTORY_API_URL=https://roulette-history-api.fly.dev
```

### **Interface Visual**

O `page.tsx` agora exibe:
- ✅ **Card de Status** no topo da página
- 📊 **Dados em tempo real** do histórico salvo
- 🔄 **Botão de refresh** para atualizar manualmente
- 📈 **Estatísticas globais** de todas as roletas
- 💾 **Contador de números salvos** vs. números ao vivo

---

## 🎯 Funcionalidades Implementadas

### **Worker (Coleta)**
- ✅ Conexão WebSocket estável com Railway
- ✅ Mapeamento de nomes → IDs (10 roletas)
- ✅ Validação de mensagens
- ✅ Queue de processamento
- ✅ Retry automático em erros
- ✅ Health checks configurados

### **API (Consulta)**
- ✅ CORS configurado (aceita todas as origens)
- ✅ Rate limiting (100 req/min)
- ✅ Helmet para segurança
- ✅ Cache em memória (30s TTL)
- ✅ Logs estruturados
- ✅ Tratamento de erros
- ✅ Validação de parâmetros

### **Front-End (Interface)**
- ✅ Hooks React customizados
- ✅ Auto-refetch configurável
- ✅ Loading states
- ✅ Error handling
- ✅ UI responsiva
- ✅ Badges de status
- ✅ Contadores em tempo real

---

## 📝 Próximos Passos (Opcionais)

### **Melhorias Sugeridas**

1. **Gráficos de Frequência**
   - Visualizar distribuição de números (number_frequency)
   - Usar Chart.js ou Recharts
   - Exibir números "quentes" e "frios"

2. **Análise Histórica**
   - Comparar performance de estratégias com dados salvos
   - Backtesting automático
   - Relatórios de ROI histórico

3. **Notificações**
   - Alertas quando estratégia atingir condições específicas
   - Push notifications para padrões detectados

4. **Dashboard de Monitoramento**
   - Página separada com métricas do sistema
   - Uptime dos serviços
   - Latência da API
   - Taxa de coleta de dados

5. **Export de Dados**
   - Exportar histórico em CSV/JSON
   - Backup manual dos dados
   - Compartilhamento de análises

---

## 🔧 Comandos Úteis

### **Worker**
```bash
# Ver logs em tempo real
flyctl logs -a roulette-history-worker

# Restart
flyctl apps restart roulette-history-worker

# Status
flyctl status -a roulette-history-worker
```

### **API**
```bash
# Ver logs em tempo real
flyctl logs -a roulette-history-api

# Restart
flyctl apps restart roulette-history-api

# Status
flyctl status -a roulette-history-api
```

### **Front-End**
```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm start
```

---

## 📊 Monitoramento

### **URLs de Health Check**

- Worker: https://roulette-history-worker.fly.dev/health
- API: https://roulette-history-api.fly.dev/health

### **Métricas Esperadas**

- **Worker**: 5-10 mensagens/minuto processadas com sucesso
- **API**: Latência < 200ms para requests não-cached
- **Database**: ~500 registros/roleta no máximo (circular queue)

### **Alertas**

Se encontrar:
- ❌ "column does not exist" → Schema desatualizado
- ❌ "Invalid API key" → Credenciais incorretas
- ❌ "Connection refused" → Serviço offline
- ❌ "Out of range" → Tipo de dados incorreto

Execute:
```sql
-- Verificar schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'roulette_history';
```

---

## ✅ Checklist de Funcionamento

- [x] Worker conectado ao WebSocket
- [x] Worker salvando dados no Supabase
- [x] Função PL/pgSQL operacional
- [x] Circular queue funcionando (0-499)
- [x] number_frequency sendo atualizado
- [x] API respondendo em produção
- [x] Endpoints retornando dados corretos
- [x] Front-end conectado à API
- [x] Hooks React funcionando
- [x] UI exibindo dados históricos
- [x] Auto-refresh configurado
- [x] Error handling implementado

---

## 🎉 Resultado Final

**Sistema totalmente funcional com:**
- ✅ Coleta automática 24/7
- ✅ Armazenamento persistente
- ✅ API REST pública
- ✅ Interface web integrada
- ✅ Dados em tempo real
- ✅ Histórico de 500 números/roleta

**Tempo total de desenvolvimento:** ~2 horas
**Bugs corrigidos:** 8 (schema, tipos, constraints, etc.)
**Status:** **PRODUÇÃO** ✅

---

## 📞 Suporte

Acesse os logs em caso de problemas:
- Worker: `flyctl logs -a roulette-history-worker`
- API: `flyctl logs -a roulette-history-api`
- Front-end: Console do navegador (F12)

Dashboard Fly.io: https://fly.io/dashboard
Dashboard Supabase: https://supabase.com/dashboard
