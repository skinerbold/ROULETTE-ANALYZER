# 🔍 Guia de Debug - Mensagens Duplicadas da API

## 🎯 Objetivo
Capturar **EXATAMENTE** o que a API está enviando quando os números "piscam" e são substituídos.

---

## 📋 Sintomas Observados

Você relatou:
> *"toda vez que é sorteado um numero novo, a roleta atualiza e mostra todos os numeros corretos, porem, apos alguns segundos, ela pisca e todos os numeros sao substituidos por outros numeros aleatorios. Aí, quando um novo numero é sorteado, os numeros voltam a piscar e aparecem o novo numero e os antigos todos certinhos, até piscarem e sumir denovo"*

### Padrão Identificado:
1. ✅ Novo número sorteado → **TUDO CERTO** (números corretos aparecem)
2. ⏳ Aguardar alguns segundos...
3. ❌ **PISCA** → todos os números são **SUBSTITUÍDOS por valores aleatórios**
4. 🔄 Próximo número sorteado → **VOLTA A FICAR CERTO**
5. 🔁 Ciclo se repete infinitamente

---

## 🧪 Hipóteses

### Hipótese #1: API envia DUAS mensagens diferentes
- Mensagem 1 (correta): Histórico real da roleta selecionada
- Mensagem 2 (incorreta): Histórico de OUTRA roleta ou dados corrompidos

### Hipótese #2: Problema de sincronização com ref
- `selectedRouletteRef.current` pode estar mudando entre mensagens
- Mensagens de outras roletas sendo processadas como se fossem da selecionada

### Hipótese #3: Race condition entre mensagens
- WebSocket recebe múltiplas mensagens quase simultaneamente
- Última mensagem processada sobrescreve a correta

---

## 🔬 Logs Adicionados

Agora o console vai mostrar **EXATAMENTE**:

### 1️⃣ Quando a API envia mensagens
```
🔥🔥🔥 [10:15:32.456] MENSAGEM DA ROLETA SELECIONADA: evolution-speed-roulette
   📦 Dados COMPLETOS da API: { ... JSON completo ... }
   🎲 Primeiros 15 números: [23, 15, 8, 32, 19, 7, 11, 0, 28, 9, 26, 30, 14, 2, 35]
   📊 Total de números: 500
   🔑 Message keys: ['game', 'game_type', 'results', 'key']
```

### 2️⃣ Comparação de arrays (detecta mudanças)
```
   🔍 Comparação de arrays:
      Atual: [23, 15, 8, 32, 19, 7, 11, 0, 28, 9...] (500)
      Nova:  [23, 15, 8, 32, 19, 7, 11, 0, 28, 9...] (500)
      Arrays iguais? true
```

### 3️⃣ Quando o estado React é atualizado
```
⚡⚡⚡ [10:15:32.458] ATUALIZANDO ESTADO REACT
   🎰 Roleta: evolution-speed-roulette
   📊 ANTES - números na tela: [23, 15, 8, 32, 19, 7, 11, 0, 28, 9...]
   📊 DEPOIS - novos números: [5, 12, 33, 1, 20, 14, 6, 25, 10, 8...]  ← AQUI!
   🔢 Quantidade: 500 → 500
   🆕 É novo spin? false
   ✅ setRecentNumbers e setUpdateVersion chamados
```

### 4️⃣ Mensagens de outras roletas (resumido)
```
📭 [10:15:33.123] Mensagem de outra roleta: pragmatic-speed-auto-roulette (500 números)
```

---

## 📝 O Que Fazer Agora

### Passo 1: Abrir Console do Navegador
1. Pressione **F12**
2. Vá na aba **Console**
3. Limpe o console (botão 🚫 ou CTRL+L)

### Passo 2: Selecionar uma Roleta
Escolha qualquer roleta **EXCETO** `pragmatic-speed-auto-roulette` (já que essa funciona).

### Passo 3: Aguardar o "Piscar"
1. Observe os números na tela
2. Quando **pisc ar e mudar**, IMEDIATAMENTE copie o console
3. Procure por **DOIS** blocos de logs `🔥🔥🔥` próximos

### Passo 4: Capturar os Dados

Você vai ver algo assim (exemplo):

```
🔥🔥🔥 [10:15:32.456] MENSAGEM DA ROLETA SELECIONADA: evolution-speed-roulette
   📦 Dados COMPLETOS da API: { "game": "evolution-speed-roulette", ... }
   🎲 Primeiros 15 números: [23, 15, 8, 32, 19, 7, 11, 0, 28, 9, 26, 30, 14, 2, 35]
   ...

⚡⚡⚡ [10:15:32.458] ATUALIZANDO ESTADO REACT
   📊 ANTES - números na tela: [23, 15, 8, ...]
   📊 DEPOIS - novos números: [23, 15, 8, ...]  ← CORRETO
   ...

// ALGUNS SEGUNDOS DEPOIS...

🔥🔥🔥 [10:15:35.789] MENSAGEM DA ROLETA SELECIONADA: evolution-speed-roulette
   📦 Dados COMPLETOS da API: { "game": "evolution-speed-roulette", ... }
   🎲 Primeiros 15 números: [5, 12, 33, 1, 20, 14, ...]  ← NÚMEROS DIFERENTES!
   ...

⚡⚡⚡ [10:15:35.791] ATUALIZANDO ESTADO REACT
   📊 ANTES - números na tela: [23, 15, 8, ...]
   📊 DEPOIS - novos números: [5, 12, 33, ...]  ← TROCOU!
   ...
```

---

## 🎯 O Que Estou Procurando

Preciso que você me envie:

1. **Timestamp completo** dos dois blocos `🔥🔥🔥`
2. **Primeiros 15 números** de cada mensagem
3. **O campo `game`** de cada mensagem (pode ser que esteja mudando!)
4. **Intervalo de tempo** entre as duas mensagens (diferença em milissegundos)

### Exemplo do que enviar:
```
MENSAGEM 1 (correta):
  Timestamp: 10:15:32.456
  Roleta: evolution-speed-roulette
  Números: [23, 15, 8, 32, 19, 7, 11, 0, 28, 9, 26, 30, 14, 2, 35]

MENSAGEM 2 (incorreta - causa o "piscar"):
  Timestamp: 10:15:35.789
  Roleta: evolution-speed-roulette
  Números: [5, 12, 33, 1, 20, 14, 6, 25, 10, 8, 17, 22, 3, 36, 13]

Intervalo: 3.333 segundos
```

---

## 🔧 Possíveis Cenários

### Cenário A: API envia dados de outra roleta
Se o campo `game` for **DIFERENTE** entre as mensagens:
- ✅ Confirma que a API está bugada
- 🛠️ Solução: Adicionar validação dupla do ID da roleta

### Cenário B: API envia histórico "fantasma"
Se o campo `game` for **IGUAL** mas os números **DIFERENTES**:
- ✅ Confirma que a API mantém múltiplos históricos
- 🛠️ Solução: Adicionar hash/checksum para ignorar mensagens duplicadas

### Cenário C: Problema de timing
Se as mensagens chegarem com **< 100ms de diferença**:
- ✅ Confirma race condition
- 🛠️ Solução: Adicionar debounce de 500ms para atualizações

---

## 🚀 Próximos Passos

Após você me enviar os logs, vou:

1. **Identificar o padrão** das mensagens duplicadas
2. **Implementar filtro** para ignorar mensagens incorretas
3. **Adicionar proteção** contra race conditions
4. **Testar solução** em produção

---

**Desenvolvedor**: GitHub Copilot  
**Data**: 1 de novembro de 2025  
**Status**: ⏳ Aguardando logs do usuário
