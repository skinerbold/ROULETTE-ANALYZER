# 🧪 GUIA DE TESTE MANUAL - CORREÇÕES IMPLEMENTADAS

## 🎯 Objetivo
Validar que as Correções 1, 2 e 3 estão funcionando corretamente no navegador.

---

## 📋 PRÉ-REQUISITOS

1. ✅ Servidor deve estar rodando: `npm run dev`
2. ✅ Abrir navegador: http://localhost:3001 (ou porta indicada)
3. ✅ Abrir DevTools (F12) → Aba Console

---

## 🧪 TESTE 1: INICIALIZAÇÃO DO CACHE

### O que verificar:
- Ao carregar a página, deve aparecer no console:
  ```
  🗄️ Inicializando sistema de cache...
  📊 Cache inicializado: { roletas: X, números: Y, armazenamento: 'Z KB' }
  ```

### Resultado esperado:
- ✅ Mensagem de inicialização aparece
- ✅ Sem erros de localStorage

### Se falhar:
- Verificar se localStorage está habilitado no navegador
- Verificar se há erros no console

---

## 🧪 TESTE 2: VALIDAÇÃO DE NÚMEROS RECEBIDOS

### O que fazer:
1. Aguardar conexão WebSocket (deve mostrar "✅ Conectado")
2. Selecionar qualquer roleta da lista
3. Aguardar números chegarem

### O que verificar no console:
- Mensagens de validação:
  ```
  📊 Histórico atualizado: X números
  ✅ Validação: Y válidos, Z inválidos
  ```

- Se houver números inválidos, verá:
  ```
  ❌ [Roleta] Validação falhou: { number: X, errors: [...] }
  ```

### Resultado esperado:
- ✅ Números são validados antes de serem exibidos
- ✅ Números inválidos são corrigidos automaticamente
- ✅ Cor é calculada se ausente na API

### Se falhar:
- Verificar console por erros de validação
- Números devem estar sempre no range 0-37

---

## 🧪 TESTE 3: CACHE PERSISTENTE

### O que fazer:
1. Selecionar uma roleta e aguardar receber ~10-20 números
2. **RECARREGAR A PÁGINA** (F5)
3. Selecionar a MESMA roleta novamente

### O que verificar no console:
- Ao selecionar a roleta após reload:
  ```
  💾 Cache carregado: X números (memória tinha Y)
  ```
  ou
  ```
  ✅ Cache salvo: Roleta (X números)
  ```

### Resultado esperado:
- ✅ Números aparecem INSTANTANEAMENTE (não precisa aguardar API)
- ✅ Histórico é carregado do cache
- ✅ Cache é atualizado conforme novos números chegam

### Se falhar:
- Verificar se localStorage tem dados:
  - DevTools → Application → Local Storage → localhost
  - Procurar chaves começando com `roulette_cache_`

---

## 🧪 TESTE 4: SOLICITAÇÃO ROBUSTA DE HISTÓRICO

### O que fazer:
1. Selecionar uma roleta que NÃO tem cache
2. Observar console imediatamente

### O que verificar:
- Logo após selecionar:
  ```
  ⏳ Aguardando dados... Enviando solicitação de histórico
  📤 Solicitações de histórico enviadas (3 formatos)
  ```

- Seguido de (se API responder):
  ```
  📜 Histórico recebido para [Roleta]: X números
  ✅ Validação: Y válidos, Z inválidos
  ⚡⚡⚡ ATUALIZANDO TELA com histórico completo!
  ```

### Resultado esperado:
- ✅ Sistema solicita histórico ativamente (3 tentativas diferentes)
- ✅ Se API responder com histórico, carrega todos de uma vez
- ✅ Se API não responder, continua acumulando com `result` individual

### Se falhar:
- API pode não suportar solicitação de histórico
- Sistema deve continuar funcionando (acumular gradualmente)

---

## 🧪 TESTE 5: ESTATÍSTICAS DO CACHE

### O que fazer:
1. Abrir DevTools Console
2. Executar:
   ```javascript
   const { getCacheStats } = require('@/lib/roulette-cache')
   console.table(getCacheStats())
   ```

### Resultado esperado:
```
{
  totalRoulettes: X,
  totalNumbers: Y,
  oldestEntry: timestamp,
  newestEntry: timestamp,
  storageUsed: Z bytes
}
```

- ✅ Mostra estatísticas corretas
- ✅ storageUsed > 0 se tem cache

---

## 🧪 TESTE 6: VALIDAÇÃO DE NÚMEROS INVÁLIDOS (Forçado)

### O que fazer:
1. Abrir DevTools Console
2. Simular número inválido:
   ```javascript
   const { validateNumber } = require('@/lib/roulette-validation')
   
   // Teste 1: Número fora do range
   console.log(validateNumber(38, 'red', Date.now()))
   // Esperado: { valid: false, errors: [...] }
   
   // Teste 2: Cor incompatível
   console.log(validateNumber(15, 'red', Date.now()))
   // Esperado: { valid: false, errors: [...] }
   
   // Teste 3: Timestamp futuro
   console.log(validateNumber(15, 'black', Date.now() + 10000))
   // Esperado: { valid: false, errors: [...] }
   ```

### Resultado esperado:
- ✅ Todos os testes retornam `valid: false`
- ✅ Arrays de `errors` contêm descrições

---

## 🧪 TESTE 7: QUANTIDADE DE NÚMEROS (PROBLEMA #1)

### O que fazer:
1. Selecionar uma roleta
2. Aguardar 2-3 minutos
3. Verificar quantos números estão disponíveis

### O que verificar:
- Na interface, o histórico de números
- No console:
  ```
  📊 Histórico atualizado: X números
  ```

### Resultado esperado (ANTES):
- ❌ Apenas 4-8 números após 3 minutos

### Resultado esperado (DEPOIS - COM CORREÇÕES):
- ✅ Se API responder com histórico: 50-500 números IMEDIATAMENTE
- ✅ Se API não responder: Acumula gradualmente + cache persiste entre sessões
- ✅ Cache acelera carregamento (instantâneo na segunda visita)

### Se falhar:
- Verificar logs da API (pode não estar enviando histórico)
- Cache deve pelo menos persistir números entre reloads

---

## 📊 CRITÉRIOS DE SUCESSO

### ✅ Cache Persistente (Correção 2)
- [ ] Cache é inicializado ao carregar página
- [ ] Números são salvos no localStorage
- [ ] Números são carregados do cache em reloads
- [ ] Estatísticas do cache funcionam

### ✅ Validação Rigorosa (Correção 3)
- [ ] Números são validados (range, cor, timestamp)
- [ ] Números inválidos são corrigidos automaticamente
- [ ] Logs de erro aparecem para números inválidos
- [ ] Sistema nunca crasheia por número inválido

### ✅ Solicitação Robusta (Correção 1)
- [ ] Ao selecionar roleta, envia 3 formatos de solicitação
- [ ] Se API responder, carrega histórico completo
- [ ] Se API não responder, sistema continua funcionando
- [ ] Cache compensa falta de resposta da API

---

## 🐛 TROUBLESHOOTING

### Erro: "localStorage not defined"
- **Causa:** Executando em ambiente SSR
- **Solução:** Verificar que cache só é usado no cliente (useEffect)

### Erro: "Cannot read property of undefined"
- **Causa:** Função de validação recebendo null/undefined
- **Solução:** Verificar validateAndCorrectNumber com valores ausentes

### Cache não salva
- **Causa:** localStorage cheio ou desabilitado
- **Solução:** Verificar Application → Storage em DevTools

### Números não aparecem
- **Causa:** WebSocket não conectado ou roleta não selecionada
- **Solução:** Verificar console por erros de conexão

---

## 📝 RELATÓRIO DE TESTE

Após executar todos os testes, preencha:

```
TESTE 1 (Cache init): [ ] ✅ PASSOU  [ ] ❌ FALHOU
TESTE 2 (Validação): [ ] ✅ PASSOU  [ ] ❌ FALHOU
TESTE 3 (Cache persistente): [ ] ✅ PASSOU  [ ] ❌ FALHOU
TESTE 4 (Solicitação robusta): [ ] ✅ PASSOU  [ ] ❌ FALHOU
TESTE 5 (Estatísticas): [ ] ✅ PASSOU  [ ] ❌ FALHOU
TESTE 6 (Validação forçada): [ ] ✅ PASSOU  [ ] ❌ FALHOU
TESTE 7 (Quantidade): [ ] ✅ PASSOU  [ ] ❌ FALHOU

OBSERVAÇÕES:
- 
- 
- 

PROBLEMAS ENCONTRADOS:
- 
- 
```

---

## 🎯 PRÓXIMOS PASSOS

Se todos os testes passarem:
1. ✅ Correções 1, 2 e 3 estão funcionando
2. ✅ Problema #1 deve estar resolvido (ou melhorado significativamente)
3. ✅ Preparar para commit e deploy

Se algum teste falhar:
1. 🐛 Documentar o erro exato
2. 🔍 Investigar causa raiz
3. 🔧 Aplicar correção
4. 🔄 Re-testar
