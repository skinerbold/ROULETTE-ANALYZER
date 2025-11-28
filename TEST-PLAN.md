# 🧪 PLANO DE TESTES - Resolução do Bug de Números Repetidos

**Objetivo:** Identificar a causa raiz e corrigir o problema de repetição de números  
**Prioridade:** CRÍTICA  
**Tempo Estimado:** 2-4 horas

---

## 📋 FASE 1: DIAGNÓSTICO (30 min)

### Teste 1.1: Verificar Dados no Supabase
**Objetivo:** Confirmar se o banco tem dados corrompidos

```bash
# Executar script de verificação do Supabase
node test-supabase-data.js
```

**Critérios de Sucesso:**
- ✅ Identificar quantos números únicos existem por roleta
- ✅ Verificar se há padrões de repetição no banco
- ✅ Confirmar timestamps únicos

**Resultado Esperado:** Descobrir se Supabase tem < 100 números únicos (problema confirmado)

---

### Teste 1.2: Testar API Fly.io Diretamente
**Objetivo:** Verificar se a fonte original tem dados válidos

```bash
# Executar teste direto da API
node test-flyio-direct.js
```

**Critérios de Sucesso:**
- ✅ API retorna 500 números
- ✅ Números são majoritariamente únicos (300+ diferentes)
- ✅ Distribuição estatística normal (~2.7% por número)

**Resultado Esperado:** API tem dados válidos OU API também está corrompida

---

### Teste 1.3: Analisar Logs do Servidor WebSocket
**Objetivo:** Entender o fluxo de dados no servidor

```bash
# Adicionar logs e reiniciar servidor local
node test-websocket-logs.js
```

**Critérios de Sucesso:**
- ✅ Ver quantos números são buscados do cache
- ✅ Ver quantos números são buscados do Supabase
- ✅ Ver quantos números são buscados da API Fly.io
- ✅ Ver quantos números únicos em cada etapa

**Resultado Esperado:** Identificar em qual etapa os dados se corrompem

---

## 🔧 FASE 2: ISOLAMENTO (45 min)

### Teste 2.1: Testar Função findOverlap()
**Objetivo:** Verificar se a lógica de merge está causando duplicações

```bash
# Executar testes unitários da função
node test-find-overlap.js
```

**Casos de Teste:**
```javascript
// Caso 1: Sem overlap
incoming: [10, 20, 30]
existing: [5, 15, 25]
expected: 3 (todos são novos)

// Caso 2: Overlap completo
incoming: [10, 20, 30]
existing: [10, 20, 30, 40]
expected: 0 (nenhum novo)

// Caso 3: Overlap parcial
incoming: [10, 20, 30, 40]
existing: [30, 40, 50]
expected: 2 (10 e 20 são novos)
```

**Resultado Esperado:** Função está correta OU função tem bug de lógica

---

### Teste 2.2: Testar ensureHistoryLength() com Mock
**Objetivo:** Isolar a função problemática com dados controlados

```bash
node test-ensure-history.js
```

**Cenários:**
1. Cache vazio + Supabase vazio + API com 500 números únicos
2. Cache com 50 + Supabase com 100 + API com 500
3. Cache com 500 + Supabase vazio + API vazio (não deve buscar nada)

**Resultado Esperado:** Identificar qual fonte está sendo ignorada ou corrompida

---

### Teste 2.3: Verificar MAX_CACHE_LENGTH
**Objetivo:** Confirmar se há limitação de tamanho

```bash
# Buscar valor da constante
grep -n "MAX_CACHE_LENGTH" websocket-server.js
```

**Critério:**
- ✅ MAX_CACHE_LENGTH >= 500
- ❌ MAX_CACHE_LENGTH < 500 (problema identificado!)

**Resultado Esperado:** Constante tem valor adequado OU precisa ser aumentada

---

## 🔨 FASE 3: CORREÇÃO (1 hora)

### Baseado nos resultados da Fase 1 e 2, aplicar UMA das correções:

#### Correção A: Limpar Cache Corrompido
**Se:** Supabase tem dados ruins

```javascript
// Adicionar endpoint no servidor
case 'force_refresh': {
    inMemoryHistory.clear();
    rouletteMeta.clear();
    await hydrateFromStore(rouletteId);
    await ensureHistoryLength(rouletteId, 500);
    break;
}
```

**Teste de Validação:**
```bash
node test-after-cache-clear.js
```

---

#### Correção B: Ignorar Supabase Temporariamente
**Se:** Supabase é a fonte do problema

```javascript
async function ensureHistoryLength(rouletteId, limit) {
    const current = inMemoryHistory.get(rouletteId) || [];
    
    if (current.length >= limit) return;
    
    // ⚠️ TEMPORÁRIO: Pular Supabase e ir direto pra API
    console.log('⚠️ BYPASS: Pulando Supabase, buscando direto da API');
    
    const flyApiUrl = 'https://roulette-history-api.fly.dev';
    const apiNumbers = await fetchFromFlyApi(flyApiUrl, rouletteId, limit);
    
    if (apiNumbers && apiNumbers.length > 0) {
        const now = Date.now();
        const entries = apiNumbers.map((num, index) => ({
            value: num,
            timestamp: now - (index * 1000)
        }));
        
        inMemoryHistory.set(rouletteId, entries.slice(0, limit));
        console.log(`✅ ${entries.length} números carregados direto da API`);
    }
}
```

**Teste de Validação:**
```bash
node test-number-integrity.js
# Deve mostrar: 300+ números únicos
```

---

#### Correção C: Corrigir Lógica de Merge
**Se:** findOverlap() ou merge está duplicando

```javascript
// Melhorar lógica de merge
const updatedHistory = [...newEntries, ...existing]
    .filter((entry, index, self) => 
        index === self.findIndex(e => e.value === entry.value && e.timestamp === entry.timestamp)
    )
    .slice(0, MAX_CACHE_LENGTH);
```

**Teste de Validação:**
```bash
node test-find-overlap.js
node test-number-integrity.js
```

---

#### Correção D: Aumentar MAX_CACHE_LENGTH
**Se:** Constante está muito baixa

```javascript
// Antes
const MAX_CACHE_LENGTH = 100; // ❌ MUITO BAIXO!

// Depois
const MAX_CACHE_LENGTH = 1000; // ✅ Adequado para histórico de 500
```

**Teste de Validação:**
```bash
node test-cache-limit.js
```

---

## ✅ FASE 4: VALIDAÇÃO (30 min)

### Teste 4.1: Re-executar Script de Integridade
```bash
node test-number-integrity.js
```

**Critérios de Aprovação:**
- ✅ 300+ números únicos de 500
- ✅ Nenhuma sequência repetida > 2x
- ✅ Distribuição estatística normal (2-4% por número)
- ✅ Nenhum número com > 8% de frequência

---

### Teste 4.2: Teste de Regressão em Produção
```bash
# Testar no ambiente Railway
node test-production-websocket.js
```

**Cenários:**
1. Solicitar 50 números → verificar unicidade
2. Solicitar 100 números → verificar unicidade
3. Solicitar 500 números → verificar unicidade
4. Mudar de roleta → verificar dados diferentes

---

### Teste 4.3: Teste de Performance
```bash
node test-performance.js
```

**Métricas:**
- ⏱️ Tempo para carregar 500 números < 3 segundos
- 💾 Uso de memória < 100MB
- 🔄 Reconexões bem-sucedidas após falha

---

## 📊 FASE 5: MONITORAMENTO (24h)

### Checklist de Monitoramento:

- [ ] Logs do servidor Railway (verificar erros)
- [ ] Métricas de uso de memória
- [ ] Tempo de resposta das requisições
- [ ] Feedback dos usuários (repetições?)
- [ ] Executar script de integridade 3x por dia

### Alarmes Automáticos:
```javascript
// Adicionar no servidor
setInterval(() => {
    const history = inMemoryHistory.get('speed auto roulette') || [];
    const uniqueCount = new Set(history.map(e => e.value)).size;
    
    if (uniqueCount < 50 && history.length >= 100) {
        console.error('🚨 ALERTA: Apenas', uniqueCount, 'números únicos!');
        // Enviar notificação
    }
}, 60000); // Verificar a cada 1 minuto
```

---

## 📝 SCRIPTS DE TESTE A CRIAR

### 1. test-supabase-data.js
```javascript
// Conectar no Supabase e analisar dados
// - Contar números únicos por roleta
// - Verificar distribuição
// - Identificar timestamps duplicados
```

### 2. test-flyio-direct.js
```javascript
// Testar API Fly.io sem passar pelo servidor
// - Buscar 500 números
// - Analisar unicidade
// - Comparar com resultado do WebSocket
```

### 3. test-websocket-logs.js
```javascript
// Versão modificada do servidor com logs detalhados
// - Log em cada etapa do ensureHistoryLength()
// - Mostrar números únicos em cada fonte
// - Rastrear origem de cada número
```

### 4. test-find-overlap.js
```javascript
// Testes unitários da função findOverlap()
// - Casos de edge
// - Casos normais
// - Casos de stress (arrays grandes)
```

### 5. test-ensure-history.js
```javascript
// Testar ensureHistoryLength() com mocks
// - Simular diferentes estados do cache
// - Mockar Supabase e API
// - Verificar lógica de merge
```

### 6. test-after-cache-clear.js
```javascript
// Testar após limpar cache
// - Forçar refresh
// - Verificar se dados novos são válidos
// - Confirmar persistência
```

### 7. test-production-websocket.js
```javascript
// Testar WebSocket em produção (Railway)
// - Conectar e solicitar dados
// - Verificar integridade
// - Testar múltiplas roletas
```

### 8. test-performance.js
```javascript
// Métricas de performance
// - Tempo de carregamento
// - Uso de memória
// - Throughput
```

---

## 🎯 CRITÉRIOS DE SUCESSO FINAL

### Todos os seguintes devem ser verdadeiros:

- [x] Script de integridade retorna 300+ números únicos
- [x] Nenhuma sequência de 5 números repetida > 2x
- [x] Distribuição estatística normal (~2.7% ± 2%)
- [x] Nenhum número com frequência > 8%
- [x] Timestamps únicos (sem duplicatas)
- [x] Performance < 3s para 500 números
- [x] Funciona em múltiplas roletas
- [x] Zero feedback negativo de usuários em 24h

---

## 📞 COMUNICAÇÃO

### Durante Testes:
- Atualizar este documento com resultados
- Commitar logs importantes
- Documentar descobertas

### Após Correção:
- Atualizar BUG-REPORT-NUMERO-REPETIDO.md
- Criar CHANGELOG.md com a correção
- Notificar usuários se necessário

---

## ⏱️ CRONOGRAMA

| Fase | Tempo | Status |
|------|-------|--------|
| Diagnóstico | 30 min | ⏳ Pendente |
| Isolamento | 45 min | ⏳ Pendente |
| Correção | 1h | ⏳ Pendente |
| Validação | 30 min | ⏳ Pendente |
| Monitoramento | 24h | ⏳ Pendente |

**Início:** Aguardando aprovação  
**Fim Estimado:** +3h 45min + 24h monitoramento

---

*Plano criado automaticamente - Atualizar conforme progresso*
