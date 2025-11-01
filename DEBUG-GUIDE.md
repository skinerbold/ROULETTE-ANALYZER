# 🐛 GUIA DE DEBUG - Problema de Sincronização

## 📋 Problema Reportado

> "continua dando problema e sequer faz sentido. Por segundo é atualizado +5 numeros, sendo que de cada lançamento tem um intervalo de 30 segundos. Nenhum dos numeros que aparecem correspondem a roleta equivalente selecionada pelo usuário"

## 🔍 O Que Sabemos

### ✅ Lógica do Backend ESTÁ CORRETA

Testes confirmaram:
```
SIMULAÇÃO:
- Greek Roulette selecionada → números corretos ✅
- Speed Roulette selecionada → números corretos ✅  
- Novo spin detectado: 30 → 17 ✅
- Ignora updates de outras 50 roletas ✅
```

### 🤔 Possíveis Causas

1. **Estado `recentNumbers` sendo atualizado por outra fonte**
2. **Múltiplas instâncias do hook rodando**
3. **`selectedRoulette` mudando sem você perceber**
4. **Cache ou estado antigo do navegador**
5. **Algum useEffect descontrolado**

## 🧪 Como Debugar (PASSO A PASSO)

### 1️⃣ Abra o App no Navegador

```bash
npm run dev
# ou
yarn dev
```

Abra: `http://localhost:3000`

### 2️⃣ Abra o Console do Navegador

**Chrome/Edge**: `F12` ou `Ctrl + Shift + J`  
**Firefox**: `F12` ou `Ctrl + Shift + K`

### 3️⃣ Limpe o Console

Clique no ícone 🚫 (Clear console)

### 4️⃣ Selecione UMA Roleta

Por exemplo: **Greek Roulette**

### 5️⃣ Observe os Logs

Você deve ver logs APENAS quando **Greek Roulette** recebe dados:

```
📨 [15:14:52] Mensagem da roleta SELECIONADA: Greek Roulette
📜 [SELECIONADA] Inicializado Greek Roulette: 20 números - [8, 32, 36, 21, 20...]
   ✅ Estado atualizado: [8, 32, 36, 21, 20...]
🔄 [CONVERSÃO] recentNumbers (20) → numbers: [8, 32, 36, 21, 20...]
🌐 [SYNC] Atualizando estado numbers com 20 números do WebSocket
   Roleta selecionada: Greek Roulette
   Primeiros 10: [8, 32, 36, 21, 20, 32, 5, 18, 16, 12]
```

### 6️⃣ Aguarde ~30-40 Segundos

Um novo spin deve ocorrer:

```
📨 [15:15:27] Mensagem da roleta SELECIONADA: Greek Roulette
🎯 [SELECIONADA] NOVO SPIN em Greek Roulette: 8 → 26
   ✅ Estado atualizado: [26, 8, 32, 36, 21...]
🔄 [CONVERSÃO] recentNumbers (20) → numbers: [26, 8, 32, 36, 21...]
🌐 [SYNC] Atualizando estado numbers com 20 números do WebSocket
   Roleta selecionada: Greek Roulette
   Primeiros 10: [26, 8, 32, 36, 21, 20, 32, 5, 18, 16]
```

### 7️⃣ O Que VOCÊ Está Vendo?

## ❌ CENÁRIO PROBLEMÁTICO (Se isso acontecer)

Se você ver logs como:

```
📨 [15:15:28] Mensagem da roleta SELECIONADA: Greek Roulette
📨 [15:15:29] Mensagem da roleta SELECIONADA: Speed Roulette
📨 [15:15:30] Mensagem da roleta SELECIONADA: Immersive Roulette
🌐 [SYNC] Atualizando estado numbers...
🌐 [SYNC] Atualizando estado numbers...
🌐 [SYNC] Atualizando estado numbers...
```

**ISSO INDICA**: `selectedRoulette` está mudando sozinho!

### ⚠️ Possível Causa

Veja no código `page.tsx` linha 443-456:

```tsx
// Selecionar automaticamente a primeira roleta disponível
useEffect(() => {
  if (isConnected && availableRoulettes.length > 0 && !selectedRoulette) {
    const firstRoulette = availableRoulettes[0]
    console.log('🎰 Selecionando primeira roleta disponível:', firstRoulette)
    selectRoulette(firstRoulette.id)
  }
}, [isConnected, availableRoulettes, selectedRoulette, sendMessage, selectRoulette])
```

**BUG POTENCIAL**: Se `availableRoulettes` estiver mudando constantemente (nova ordem, novos itens), este `useEffect` pode disparar múltiplas vezes!

## 🩺 Diagnósticos Específicos

### TESTE A: Verificar quantas vezes `availableRoulettes` muda

Adicione este log temporário no `page.tsx`:

```tsx
useEffect(() => {
  console.log(`📊 availableRoulettes mudou! Total: ${availableRoulettes.length}`, 
              availableRoulettes.map(r => r.id))
}, [availableRoulettes])
```

**Esperado**: Log apenas UMA VEZ quando conectar  
**Problemático**: Log VÁRIAS VEZES por segundo

### TESTE B: Verificar se `selectedRoulette` está mudando

Adicione:

```tsx
useEffect(() => {
  console.log(`🎯 selectedRoulette mudou: "${selectedRoulette}"`)
}, [selectedRoulette])
```

**Esperado**: Log apenas quando VOCÊ mudar manualmente  
**Problemático**: Log constante sem você fazer nada

### TESTE C: Verificar se há múltiplas instâncias do hook

No `use-roulette-websocket.ts`, adicione no início do hook:

```tsx
useEffect(() => {
  const instanceId = Math.random().toString(36).substring(7)
  console.log(`🔌 Nova instância do hook criada: ${instanceId}`)
  return () => {
    console.log(`🔌 Instância ${instanceId} desmontada`)
  }
}, [])
```

**Esperado**: 1 instância criada, nunca desmontada  
**Problemático**: Múltiplas instâncias ou criação/desmontagem constante

## 🔧 Soluções Potenciais

### SOLUÇÃO 1: Estabilizar `availableRoulettes`

No `use-roulette-websocket.ts`, evitar mutações do array:

```tsx
setAvailableRoulettes(prev => {
  const exists = prev.some(r => r.id === rouletteId)
  if (exists) return prev // IMPORTANTE: retornar mesmo array se nada mudou
  
  const updated = [...prev, newRouletteInfo].sort((a, b) => 
    a.name.localeCompare(b.name)
  )
  return updated
})
```

**Já está assim no código atual** ✅

### SOLUÇÃO 2: Dependências do useEffect (linha 443)

Remover `availableRoulettes` das dependências:

```tsx
useEffect(() => {
  if (isConnected && availableRoulettes.length > 0 && !selectedRoulette) {
    const firstRoulette = availableRoulettes[0]
    selectRoulette(firstRoulette.id)
  }
}, [isConnected, selectedRoulette]) // Removido availableRoulettes
```

### SOLUÇÃO 3: Usar `useRef` para evitar re-seleção

```tsx
const hasSelectedInitialRef = useRef(false)

useEffect(() => {
  if (isConnected && availableRoulettes.length > 0 && 
      !selectedRoulette && !hasSelectedInitialRef.current) {
    const firstRoulette = availableRoulettes[0]
    selectRoulette(firstRoulette.id)
    hasSelectedInitialRef.current = true
  }
}, [isConnected, availableRoulettes, selectedRoulette])
```

## 📸 O Que Enviar Para Mim

**Por favor, tire screenshot ou copie os logs do console mostrando:**

1. ✅ Primeira conexão (logs de inicialização)
2. ✅ Seleção de roleta (qual foi selecionada)
3. ✅ Próximos 60 segundos de logs
4. ✅ Marcar com setas 👉 qualquer log estranho

**Exemplo do que procurar:**

```
❌ RUIM: Logs de [SELECIONADA] para múltiplas roletas diferentes
❌ RUIM: Logs de [SYNC] acontecendo várias vezes por segundo
❌ RUIM: Roleta selecionada mudando sem você clicar
```

```
✅ BOM: Logs apenas da roleta que você escolheu
✅ BOM: [SYNC] apenas quando novo spin (30-40s de intervalo)
✅ BOM: Números na tela batem com os logs
```

## 🎯 Próximos Passos

1. **Rode o app** com os novos logs
2. **Copie TUDO do console** (primeiros 2 minutos)
3. **Me envie** para análise
4. **Implementarei a correção** baseado nos logs reais

---

**Commit atual**: `9548f11` - "debug: adicionar logs detalhados"  
**Status**: 🔍 **AGUARDANDO LOGS DE PRODUÇÃO**
