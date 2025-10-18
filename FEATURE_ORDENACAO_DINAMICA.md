# ✅ NOVA FEATURE - ORDENAÇÃO DINÂMICA POR DESEMPENHO

## 📋 O QUE FOI IMPLEMENTADO:

### **Ordenação Automática e Dinâmica:**

As **pastas** e **estratégias** agora são organizadas automaticamente conforme o jogo progride, mostrando primeiro aquelas com **melhor desempenho** (maior taxa de GREEN vs RED).

---

## 🎯 COMO FUNCIONA:

### **1. Pastas Ordenadas por Desempenho Médio:**

```
Critério: TAXA DE APROVEITAMENTO MÉDIA
Fórmula: (Total GREEN de todas estratégias da pasta) ÷ (Total de ATIVAÇÕES da pasta)

Exemplo:
Pasta "Pretos e Vermelhos":
- Estratégia A: 8 GREEN / 10 ATIVAÇÕES = 80%
- Estratégia B: 6 GREEN / 10 ATIVAÇÕES = 60%
- Estratégia C: 7 GREEN / 10 ATIVAÇÕES = 70%

Performance média da pasta: (8+6+7) / (10+10+10) = 21/30 = 70%
```

---

### **2. Estratégias Ordenadas Dentro de Cada Pasta:**

```
Critério: TAXA DE APROVEITAMENTO INDIVIDUAL
Fórmula: (GREEN) ÷ (ATIVAÇÕES)
Desempate: PROFIT (se taxa for igual)

Exemplo (mesma pasta):
1º: Estratégia A (80%) - Melhor
2º: Estratégia C (70%)
3º: Estratégia B (60%) - Pior
```

---

## 📊 EXEMPLO VISUAL:

### **Sem Números (Estado Inicial):**

```
┌─────────────────────────────────────┐
│ PASTAS (Ordem Original)             │
├─────────────────────────────────────┤
│ 📁 Pretos e Vermelhos              │
│ 📁 Vizinhos do Zero                │
│ 📁 Terço da Roleta                 │
│ 📁 Cavalos                         │
└─────────────────────────────────────┘
```

---

### **Com Números (Ordenação Dinâmica):**

```
┌─────────────────────────────────────┐
│ PASTAS (Melhor Desempenho Primeiro)│
├─────────────────────────────────────┤
│ 📁 Cavalos (85% aproveitamento) ⭐  │ ← Melhor pasta
│   ├─ Cavalo 1-2 (90%)      ⭐      │ ← Melhor da pasta
│   ├─ Cavalo 3-4 (85%)             │
│   └─ Cavalo 5-6 (80%)             │
│                                    │
│ 📁 Terço da Roleta (72%)           │
│   ├─ Primeiro Terço (80%)  ⭐      │
│   ├─ Segundo Terço (70%)          │
│   └─ Terceiro Terço (65%)         │
│                                    │
│ 📁 Pretos e Vermelhos (70%)        │
│   ├─ Pretos baixos (80%)   ⭐      │
│   ├─ Vermelhos (70%)              │
│   └─ Pretos altos (60%)           │
│                                    │
│ 📁 Vizinhos do Zero (45%)          │ ← Pior pasta
│   ├─ Vizinho A (50%)              │
│   └─ Vizinho B (40%)       ⚠️     │ ← Pior da pasta
└─────────────────────────────────────┘
```

---

## 🔄 ATUALIZAÇÃO EM TEMPO REAL:

### **Cenário: Adicionar Números ao Jogo**

#### **Estado Inicial:**
```
Pastas (sem números):
1. Pretos e Vermelhos (ordem original)
2. Vizinhos do Zero
3. Terço da Roleta
4. Cavalos
```

---

#### **Após Adicionar: [2, 4, 6, 8, 10]**

```
Análise:
- Pretos e Vermelhos: 5/5 ativações = 100% ✅
- Cavalos: 2/5 ativações = 40%
- Terço: 3/5 ativações = 60%
- Vizinhos: 1/5 ativações = 20%

Nova Ordem (automática):
1. Pretos e Vermelhos (100%) ⭐ ← SUBIU!
2. Terço da Roleta (60%)
3. Cavalos (40%)
4. Vizinhos do Zero (20%)
```

---

#### **Após Adicionar Mais: [15, 18, 21, 24, 27]**

```
Análise atualizada:
- Cavalos: 8/10 ativações = 80% ✅ ← MELHOROU!
- Pretos e Vermelhos: 7/10 = 70% ⚠️ ← CAIU!
- Terço: 6/10 = 60%
- Vizinhos: 2/10 = 20%

Nova Ordem (atualizada):
1. Cavalos (80%) ⭐ ← PASSOU NA FRENTE!
2. Pretos e Vermelhos (70%) ⬇️ ← DESCEU!
3. Terço da Roleta (60%)
4. Vizinhos do Zero (20%)
```

---

## 💡 LÓGICA DE CÁLCULO:

### **Performance de Pasta:**

```typescript
// 1. Pegar todas as estratégias da pasta
const folderStrategies = folder.strategies

// 2. Buscar estatísticas de cada estratégia
const folderStats = folderStrategies
  .map(strategy => strategyStats.find(s => s.id === strategy.id))
  .filter(Boolean)

// 3. Calcular totais da pasta
const totalActivations = folderStats.reduce((sum, s) => 
  sum + s.activations, 0
)
const totalGreen = folderStats.reduce((sum, s) => 
  sum + s.totalGreen, 0
)

// 4. Calcular performance média
const avgPerformance = totalActivations > 0 
  ? totalGreen / totalActivations 
  : 0

// Exemplo:
// totalGreen = 21
// totalActivations = 30
// avgPerformance = 21 / 30 = 0.70 (70%)
```

---

### **Performance de Estratégia:**

```typescript
// 1. Pegar estatísticas da estratégia
const stats = strategyStats.find(s => s.id === strategy.id)

// 2. Calcular taxa de aproveitamento
const performance = stats.activations > 0
  ? stats.totalGreen / stats.activations
  : 0

// Exemplo:
// totalGreen = 8
// activations = 10
// performance = 8 / 10 = 0.80 (80%)
```

---

### **Ordenação de Pastas:**

```typescript
const sortedFolders = folders.sort((a, b) => {
  return b.avgPerformance - a.avgPerformance
  // Maior performance primeiro
})

// Exemplo:
// Pasta A: 0.85 (85%)
// Pasta B: 0.70 (70%)
// Pasta C: 0.45 (45%)
//
// Resultado:
// [Pasta A, Pasta B, Pasta C]
```

---

### **Ordenação de Estratégias:**

```typescript
const sortedStrategies = strategies.sort((a, b) => {
  const perfA = statsA.activations > 0 
    ? statsA.totalGreen / statsA.activations 
    : 0
  const perfB = statsB.activations > 0 
    ? statsB.totalGreen / statsB.activations 
    : 0
  
  // Em caso de empate, usar profit como desempate
  if (perfB === perfA) {
    return statsB.profit - statsA.profit
  }
  
  return perfB - perfA
})

// Exemplo:
// Estratégia A: 80% (8/10)
// Estratégia B: 80% (8/10) - Profit +5
// Estratégia C: 80% (8/10) - Profit +3
// Estratégia D: 70% (7/10)
//
// Resultado:
// [B (80%, +5), C (80%, +3), A (80%, 0), D (70%)]
```

---

## 🎯 CRITÉRIOS DE DESEMPENHO:

### **Taxa de Aproveitamento:**

| Taxa | Classificação | Emoji |
|------|---------------|-------|
| **90-100%** | Excelente | ⭐⭐⭐ |
| **75-89%** | Muito Bom | ⭐⭐ |
| **60-74%** | Bom | ⭐ |
| **50-59%** | Regular | ⚠️ |
| **30-49%** | Ruim | ❌ |
| **0-29%** | Muito Ruim | ❌❌ |

---

### **Exemplo de Análise:**

```
Pasta "Cavalos":
- 3 estratégias
- Total: 25 GREEN / 30 ATIVAÇÕES
- Taxa: 83.3%
- Classificação: Muito Bom ⭐⭐

Estratégias da pasta (ordenadas):
1. Cavalo 1-2: 9/10 = 90% (Excelente ⭐⭐⭐)
2. Cavalo 3-4: 8/10 = 80% (Muito Bom ⭐⭐)
3. Cavalo 5-6: 8/10 = 80%, Profit +4 (Muito Bom ⭐⭐)
```

---

## 🔄 COMPORTAMENTO EM DIFERENTES CENÁRIOS:

### **Cenário 1: Jogo Iniciando (Poucos Números)**

```
Números adicionados: [2, 15, 4]

Análise:
- Algumas estratégias ativaram
- Poucas têm GREEN/RED
- Ordenação começa a se formar

Pastas:
1. Pasta com 100% (poucas ativações)
2. Pasta com 66% 
3. Pasta com 33%
4. Pasta sem ativações (ordem original)
```

---

### **Cenário 2: Jogo Avançado (Muitos Números)**

```
Números adicionados: [50+ números]

Análise:
- Todas estratégias testadas
- Dados estatisticamente relevantes
- Ordenação consolidada

Pastas:
1. Melhor desempenho consistente (85%)
2. Bom desempenho (72%)
3. Regular (58%)
4. Pior desempenho (35%)
```

---

### **Cenário 3: Empate de Performance**

```
Pasta A: 80% (8/10)
Pasta B: 80% (16/20)

Critério de desempate: Mantém ordem original
(ou pode usar outro critério futuro)

Estratégia X: 80%, Profit +5
Estratégia Y: 80%, Profit +3

Critério de desempate: PROFIT
Resultado: X fica antes de Y
```

---

## 📊 INDICADORES VISUAIS (FUTURO):

### **Possíveis Melhorias:**

```
┌─────────────────────────────────────┐
│ 📁 Cavalos ⭐⭐⭐ (90%)             │ ← Badge de excelência
│   ↗️ +5% desde último jogo         │ ← Tendência
│                                    │
│ 📁 Terço da Roleta ⭐ (65%)        │
│   ↘️ -3% desde último jogo         │
│                                    │
│ 📁 Vizinhos ❌ (25%)               │ ← Alerta de baixo desempenho
│   ↘️ -10% desde último jogo        │
└─────────────────────────────────────┘
```

---

## 🧪 TESTES:

### **Teste 1: Ordenação Inicial**
```
1. Sem números adicionados
2. ✅ Pastas mantêm ordem original
3. ✅ Estratégias mantêm ordem original
4. Adicionar primeiro número
5. ✅ Ordenação ativa automaticamente
```

---

### **Teste 2: Mudança de Ordem**
```
1. Pasta A no topo (85%)
2. Adicionar números que favorecem Pasta B
3. ✅ Pasta B sobe para o topo (90%)
4. ✅ Pasta A desce para 2ª posição
5. ✅ Transição suave
```

---

### **Teste 3: Estratégias Dentro da Pasta**
```
1. Abrir pasta "Cavalos"
2. ✅ Estratégias ordenadas por desempenho
3. Melhor no topo
4. Pior no final
5. ✅ Stats visíveis (G/R/Profit)
```

---

### **Teste 4: Empate de Performance**
```
1. Estratégia A: 80%, Profit +5
2. Estratégia B: 80%, Profit +3
3. ✅ Estratégia A aparece primeiro
4. ✅ Desempate por profit funciona
```

---

### **Teste 5: Sem Ativações**
```
1. Pasta com estratégias que não ativaram
2. ✅ Performance = 0%
3. ✅ Fica no final da lista
4. ✅ Mantém ordem original dentro dela
```

---

## 🎨 VISUAL ATUALIZADO:

### **Menu de Estratégias:**

```
┌─────────────────────────────────────┐
│ Estratégias                         │
│ Ordenadas por aproveitamento    ✨  │ ← Novo subtítulo
├─────────────────────────────────────┤
│                                    │
│ 📁 Cavalos (3) ⭐               ▼ │
│   ├─ Cavalo 1-2                   │
│   │  G: 9 | R: 1 | +8             │ ← Stats visíveis
│   ├─ Cavalo 3-4                   │
│   │  G: 8 | R: 2 | +6             │
│   └─ Cavalo 5-6                   │
│      G: 7 | R: 3 | +4             │
│                                    │
│ 📁 Pretos e Vermelhos (9)      ▼ │
│   ├─ Pretos baixos  ⭐            │
│   │  G: 8 | R: 2 | +6             │
│   ├─ Vermelhos                    │
│   │  G: 7 | R: 3 | +4             │
│   └─ ...                          │
└─────────────────────────────────────┘
```

---

## 💡 BENEFÍCIOS:

### **1. Decisão Mais Rápida:**
- 🎯 Melhores estratégias sempre no topo
- 👁️ Fácil identificação visual
- ⚡ Menos scroll necessário

---

### **2. Análise Inteligente:**
- 📊 Dados em tempo real
- 🔄 Atualização automática
- 📈 Tendências visíveis

---

### **3. UX Profissional:**
- ✨ Ordenação dinâmica
- 🎨 Visual limpo e informativo
- 🚀 Performance otimizada

---

### **4. Estratégia Baseada em Dados:**
- 📊 Focar nas melhores
- ⚠️ Evitar as piores
- 🎲 Decisões inteligentes

---

## 🔧 CÓDIGO IMPLEMENTADO:

### **Função de Ordenação:**

```typescript
const getSortedFolders = () => {
  if (numbers.length === 0) {
    // Sem números, manter ordem original
    return FOLDERS
  }

  return FOLDERS.map(folder => {
    // Calcular desempenho médio da pasta
    const folderStrategiesStats = folder.strategies
      .map(strategy => strategyStats.find(s => s.id === strategy.id))
      .filter(Boolean)
    
    const totalActivations = folderStrategiesStats.reduce(
      (sum, s) => sum + (s?.activations || 0), 0
    )
    const totalGreen = folderStrategiesStats.reduce(
      (sum, s) => sum + (s?.totalGreen || 0), 0
    )
    const avgPerformance = totalActivations > 0 
      ? totalGreen / totalActivations 
      : 0

    // Ordenar estratégias dentro da pasta
    const sortedStrategies = [...folder.strategies].sort((a, b) => {
      const statsA = strategyStats.find(s => s.id === a.id)
      const statsB = strategyStats.find(s => s.id === b.id)
      
      if (!statsA || !statsB) return 0
      
      const perfA = statsA.activations > 0 
        ? statsA.totalGreen / statsA.activations 
        : 0
      const perfB = statsB.activations > 0 
        ? statsB.totalGreen / statsB.activations 
        : 0
      
      // Desempate por profit
      if (perfB === perfA) {
        return (statsB.profit || 0) - (statsA.profit || 0)
      }
      
      return perfB - perfA
    })

    return {
      ...folder,
      avgPerformance,
      strategies: sortedStrategies
    }
  }).sort((a, b) => {
    // Ordenar pastas por performance média
    return b.avgPerformance - a.avgPerformance
  })
}

const sortedFolders = getSortedFolders()
```

---

### **Uso nos Componentes:**

```typescript
// ANTES:
{FOLDERS.map((folder) => (
  // ...
))}

// DEPOIS:
{sortedFolders.map((folder) => (
  // ...
))}
```

---

## ✅ STATUS:

- [x] Função `getSortedFolders()` criada
- [x] Cálculo de performance de pastas
- [x] Cálculo de performance de estratégias
- [x] Ordenação de pastas por desempenho médio
- [x] Ordenação de estratégias dentro das pastas
- [x] Desempate por profit
- [x] Mantém ordem original quando sem números
- [x] Substituído `FOLDERS` por `sortedFolders` em mobile
- [x] Substituído `FOLDERS` por `sortedFolders` em desktop
- [x] Subtítulo atualizado: "Ordenadas por aproveitamento"
- [x] Sem erros de código

**Feature implementada com sucesso!** 🎉

---

## 🎯 RESUMO:

### **O Que Mudou:**

1. **Pastas agora são ordenadas** por desempenho médio (GREEN/ATIVAÇÕES)
2. **Estratégias dentro de cada pasta** ordenadas por desempenho individual
3. **Atualização automática** conforme números são adicionados
4. **Desempate inteligente** usando profit
5. **Sem números = ordem original** (não quebra a experiência inicial)

### **Fórmulas:**

```
Performance da Pasta = (Total GREEN) ÷ (Total ATIVAÇÕES)
Performance da Estratégia = (GREEN) ÷ (ATIVAÇÕES)
Desempate = PROFIT (maior primeiro)
```

**Pronto para testar!** 🚀
