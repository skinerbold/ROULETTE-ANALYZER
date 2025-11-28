# 🚨 RELATÓRIO CRÍTICO: Problema de Repetição de Números

**Data:** 28/11/2025  
**Severidade:** CRÍTICA  
**Status:** IDENTIFICADO - AGUARDANDO CORREÇÃO

---

## 📊 PROBLEMA IDENTIFICADO

Quando o usuário solicita 500 números, apenas **26 números únicos** estão sendo retornados em um padrão repetitivo.

### Evidências do Script de Teste:

```
✅ Total de números recebidos: 500
❌ Números únicos: 26 (esperado: 300-400 diferentes)
❌ 42 sequências de 5 números repetidas!
```

### Distribuição Anômala:

| Número | Frequência | Porcentagem | Esperado |
|--------|-----------|-------------|----------|
| 10     | 72x       | 14.4%       | ~2.7%    |
| 29     | 63x       | 12.6%       | ~2.7%    |
| 7      | 34x       | 6.8%        | ~2.7%    |
| 23     | 31x       | 6.2%        | ~2.7%    |
| 17     | 29x       | 5.8%        | ~2.7%    |

**Análise:** Em uma roleta europeia justa, cada número (0-36) deveria aparecer aproximadamente 2.7% das vezes (1/37). Os números acima estão aparecendo 2-5x mais que o esperado.

---

## 🔍 ANÁLISE TÉCNICA

### 1. Onde o Problema Está

O teste comprovou que:
- ✅ WebSocket Railway retorna 500 números
- ❌ Apenas 26 valores únicos
- ❌ Padrões de sequência repetidos 42 vezes
- ❌ Distribuição estatística impossível

### 2. Causa Raiz Provável

**Localização:** `websocket-server.js` - função `ensureHistoryLength()`

```javascript
// Linhas 568-608
async function ensureHistoryLength(rouletteId, limit) {
    const current = inMemoryHistory.get(rouletteId) || [];

    if (current.length >= limit) {
        return; // ⚠️ RETORNA SE JÁ TEM O LIMITE
    }

    console.log(`📊 Cache tem ${current.length} números, mas precisa de ${limit}. Buscando mais...`);

    // Busca do Supabase
    const missing = limit - current.length;
    const olderEntries = await fetchOlderFromStore(rouletteId, current.length, missing);
    
    if (olderEntries.length > 0) {
        const merged = [...current, ...olderEntries].slice(0, MAX_CACHE_LENGTH);
        inMemoryHistory.set(rouletteId, merged);
    }

    // Busca da API Fly.io
    const afterSupabase = inMemoryHistory.get(rouletteId) || [];
    if (afterSupabase.length < limit) {
        const apiNumbers = await fetchFromFlyApi(flyApiUrl, rouletteId, limit);
        
        if (apiNumbers && apiNumbers.length > 0) {
            // ⚠️ POTENCIAL PROBLEMA: conversão e armazenamento
            const now = Date.now();
            const entries = apiNumbers.map((num, index) => ({
                value: num,
                timestamp: now - (index * 1000)
            }));
            
            inMemoryHistory.set(rouletteId, entries.slice(0, MAX_CACHE_LENGTH));
        }
    }
}
```

### 3. Hipóteses do Bug

**Hipótese 1: Cache corrompido no Supabase**
- O Supabase pode ter apenas ~60 números reais armazenados
- Quando busca mais, retorna os mesmos números

**Hipótese 2: API Fly.io retornando dados limitados**
- A API pode estar retornando apenas 60 números reais
- O resto é preenchido com repetições

**Hipótese 3: Lógica de merge incorreta**
- Ao mesclar dados de diferentes fontes, números estão sendo duplicados
- A função `findOverlap()` pode estar causando problemas

---

## 🧪 TESTES REALIZADOS

### Script de Teste Completo (`test-number-integrity.js`)

**Funcionalidades:**
1. ✅ Conexão WebSocket
2. ✅ Detecção de duplicatas exatas
3. ✅ Detecção de timestamps duplicados
4. ✅ Detecção de loops (10-100 números)
5. ✅ Análise de sequências repetidas
6. ✅ Análise estatística de distribuição
7. ✅ Comparação com API Fly.io original

**Resultado:** Ambas as fontes (WebSocket e API) retornam os mesmos dados problemáticos.

---

## 🔧 PRÓXIMOS PASSOS (INVESTIGAÇÃO)

### 1. Verificar Banco Supabase
```sql
-- Contar registros únicos por roleta
SELECT roulette_id, COUNT(DISTINCT value) as unique_numbers, COUNT(*) as total
FROM roulette_history
GROUP BY roulette_id;

-- Ver distribuição de números
SELECT value, COUNT(*) as frequency
FROM roulette_history
WHERE roulette_id = 'speed auto roulette'
GROUP BY value
ORDER BY frequency DESC
LIMIT 10;
```

### 2. Testar API Fly.io Diretamente
```bash
# Buscar 500 números diretamente da fonte
curl "https://roulette-history-api.fly.dev/api/history/speed%20auto%20roulette?limit=500"
```

### 3. Adicionar Logs no Servidor
```javascript
// Em ensureHistoryLength(), adicionar:
console.log('🔍 DEBUG - Números únicos no cache:', new Set(current.map(e => e.value)).size);
console.log('🔍 DEBUG - Números da API Fly.io:', apiNumbers.length);
console.log('🔍 DEBUG - Números únicos da API:', new Set(apiNumbers).size);
```

### 4. Verificar MAX_CACHE_LENGTH
```javascript
// Verificar se MAX_CACHE_LENGTH está limitando incorretamente
const MAX_CACHE_LENGTH = 500; // Deve ser >= 500
```

---

## 💡 SOLUÇÃO PROPOSTA

### Opção 1: Limpar Cache e Recarregar
```javascript
// Adicionar endpoint para limpar cache
case 'clear_cache': {
    inMemoryHistory.clear();
    rouletteMeta.clear();
    console.log('🗑️ Cache limpo!');
    break;
}
```

### Opção 2: Verificar Fonte de Dados
- Confirmar que API Fly.io tem 500+ números únicos
- Se não tiver, buscar de fonte alternativa

### Opção 3: Corrigir Lógica de Merge
- Revisar `findOverlap()` para evitar duplicações
- Garantir que números novos não sobrescrevam números válidos

---

## 📈 IMPACTO

**Usuários Afetados:** TODOS  
**Funcionalidades Afetadas:** 
- Análise de estratégias (resultados incorretos)
- Estatísticas de desempenho (dados falsos)
- Visualização de números (padrões irreais)

**Urgência:** ALTA - Sistema está gerando análises baseadas em dados incorretos

---

## ✅ CHECKLIST DE CORREÇÃO

- [ ] Verificar dados no Supabase
- [ ] Testar API Fly.io diretamente
- [ ] Adicionar logs de debug no servidor
- [ ] Identificar causa raiz exata
- [ ] Implementar correção
- [ ] Limpar cache corrompido
- [ ] Validar com script de teste
- [ ] Deploy da correção
- [ ] Monitorar por 24h

---

## 📞 CONTATO

**Script de Teste:** `test-number-integrity.js`  
**Executar:** `node test-number-integrity.js`  
**Servidor:** `websocket-server.js` (linhas 568-608)  

---

*Relatório gerado automaticamente pelo sistema de testes*
