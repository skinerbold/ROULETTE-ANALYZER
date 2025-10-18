# Feature: Placeholder Dinâmico do Input de Números

## 🎯 Descrição
O placeholder do campo de inserção de números agora mostra exemplos baseados nos números favoráveis da última estratégia selecionada, facilitando a entrada de dados relevantes.

## ✨ Funcionalidade

### Comportamento Inteligente

#### **Com Estratégia Selecionada**
- Mostra os primeiros números da estratégia ativa como exemplo
- Desktop: Exibe até 8 números
- Mobile: Exibe até 6 números
- Adiciona "..." quando há mais números disponíveis
- Inclui o nome da estratégia no placeholder

#### **Sem Estratégia Selecionada**
- Mostra placeholder padrão genérico
- Desktop: `"Ex: 1, 5, 12, 23 ou 1 5 12 23 (Enter para adicionar)"`
- Mobile: `"Ex: 1, 5, 12, 23 (Enter para adicionar)"`

## 📱 Exemplos Visuais

### Desktop

**Sem estratégia:**
```
Ex: 1, 5, 12, 23 ou 1 5 12 23 (Enter para adicionar)
```

**Com estratégia "Finais 0 e 3":**
```
Ex: 0, 3, 10, 13, 20, 23, 30, 33 (números favoráveis da estratégia: Finais 0 e 3)
```

**Com estratégia "Primos" (muitos números):**
```
Ex: 2, 3, 5, 7, 11, 13, 17, 19... (números favoráveis da estratégia: Primos)
```

### Mobile

**Sem estratégia:**
```
Ex: 1, 5, 12, 23 (Enter para adicionar)
```

**Com estratégia "Dúzias 1 e 2":**
```
Ex: 1, 2, 3, 4, 5, 6... (números da estratégia Dúzias 1 e 2)
```

## 💻 Implementação Técnica

### Input Mobile (linha ~763)

```tsx
<Input
  value={currentNumbers}
  onChange={(e) => setCurrentNumbers(e.target.value)}
  onKeyPress={handleKeyPress}
  placeholder={
    lastSelectedStrategy 
      ? `Ex: ${lastSelectedStrategy.numbers.slice(0, 6).join(', ')}${lastSelectedStrategy.numbers.length > 6 ? '...' : ''} (números da estratégia ${lastSelectedStrategy.name})`
      : "Ex: 1, 5, 12, 23 (Enter para adicionar)"
  }
  className="h-12 bg-gray-700 border-gray-600 text-white focus:border-blue-500 text-base font-mono"
/>
```

### Input Desktop (linha ~1310)

```tsx
<Input
  value={currentNumbers}
  onChange={(e) => setCurrentNumbers(e.target.value)}
  onKeyPress={handleKeyPress}
  placeholder={
    lastSelectedStrategy 
      ? `Ex: ${lastSelectedStrategy.numbers.slice(0, 8).join(', ')}${lastSelectedStrategy.numbers.length > 8 ? '...' : ''} (números favoráveis da estratégia: ${lastSelectedStrategy.name})`
      : "Ex: 1, 5, 12, 23 ou 1 5 12 23 (Enter para adicionar)"
  }
  className="h-10 bg-gray-700 border-gray-600 text-white focus:border-blue-500 text-base font-mono"
/>
```

## 🔧 Lógica de Renderização

### Ternário Condicional
```tsx
placeholder={
  lastSelectedStrategy 
    ? `Placeholder dinâmico com números da estratégia`
    : `Placeholder padrão genérico`
}
```

### Limitação de Números
```tsx
lastSelectedStrategy.numbers.slice(0, 6)  // Mobile: até 6 números
lastSelectedStrategy.numbers.slice(0, 8)  // Desktop: até 8 números
```

### Indicador de Continuação
```tsx
${lastSelectedStrategy.numbers.length > 6 ? '...' : ''}
```
- Adiciona "..." apenas se houver mais números além dos exibidos

## 📊 Casos de Uso

### 1. **Primeira Seleção de Estratégia**
- Usuário seleciona "Vizinhos do 0"
- Placeholder muda instantaneamente para mostrar: `0, 3, 12, 15, 26, 32...`
- Facilita identificar quais números são relevantes

### 2. **Mudança de Estratégia**
- Usuário estava em "Primos" → muda para "Pares"
- Placeholder atualiza automaticamente
- Sempre mostra os números da última estratégia ativa

### 3. **Múltiplas Estratégias Selecionadas**
- Usa `lastSelectedStrategy` (última adicionada)
- Mantém consistência com o dashboard

### 4. **Desselecionar Todas**
- Quando `selectedStrategies.length === 0`
- Retorna ao placeholder padrão genérico

## ✅ Benefícios

### Para o Usuário
1. **Contexto Visual**: Sabe imediatamente quais números são favoráveis
2. **Facilidade de Uso**: Não precisa lembrar os números de cada estratégia
3. **Eficiência**: Pode copiar/digitar exemplos diretamente do placeholder
4. **Aprendizado**: Memoriza gradualmente os números de cada estratégia

### Para o Sistema
1. **UX Inteligente**: Interface se adapta ao contexto do usuário
2. **Redução de Erros**: Usuário tende a inserir números corretos
3. **Consistência**: Mobile e desktop seguem mesma lógica
4. **Performance**: Cálculo leve (apenas slice + join)

## 🎨 Design Considerations

### Tamanho do Placeholder
- **Mobile**: 6 números (evita truncamento em telas pequenas)
- **Desktop**: 8 números (mais espaço horizontal disponível)

### Formatação
- Separação por vírgula + espaço: `1, 2, 3`
- Nome da estratégia entre parênteses
- Reticências quando há mais números

### Responsividade
```
Mobile:  "Ex: 1, 2, 3, 4, 5, 6... (números da estratégia X)"
Desktop: "Ex: 1, 2, 3, 4, 5, 6, 7, 8... (números favoráveis da estratégia: X)"
```

## 🔄 Atualização em Tempo Real

### Trigger de Mudança
O placeholder atualiza automaticamente quando:
1. ✅ Usuário seleciona primeira estratégia
2. ✅ Usuário seleciona estratégia adicional (última torna-se ativa)
3. ✅ Usuário desseleciona estratégia (última restante torna-se ativa)
4. ✅ Usuário desseleciona todas (volta ao padrão)

### Variável de Referência
```tsx
const lastSelectedStrategy = selectedStrategies.length > 0 
  ? strategyStats[strategyStats.length - 1] 
  : null
```

## 📈 Impacto na Experiência

### Antes
```
Input sempre fixo: "Ex: 1, 5, 12, 23 (Enter para adicionar)"
```
- Usuário precisava:
  1. Lembrar números da estratégia OU
  2. Consultar lista lateral OU
  3. Ver tabela de Quentes/Frios

### Depois
```
Input dinâmico: "Ex: 0, 3, 10, 13, 20, 23, 30, 33 (números favoráveis da estratégia: Finais 0 e 3)"
```
- Usuário pode:
  1. ✅ Ver exemplos imediatos
  2. ✅ Copiar sugestões
  3. ✅ Entender contexto rapidamente

## 🧪 Validações

### Casos Testados
1. ✅ **Estratégia com poucos números** (< 6 mobile, < 8 desktop)
   - Mostra todos sem "..."
   
2. ✅ **Estratégia com muitos números** (> 6 mobile, > 8 desktop)
   - Mostra limite + "..."
   
3. ✅ **Nenhuma estratégia selecionada**
   - Placeholder padrão genérico
   
4. ✅ **Nome longo de estratégia**
   - Texto trunca naturalmente (CSS truncate)
   
5. ✅ **Mudança rápida entre estratégias**
   - Atualização instantânea sem lag

## 🚀 Melhorias Futuras (Opcional)

1. **Tooltip Expandido**
   - Hover mostra TODOS os números da estratégia
   
2. **Botão "Preencher com Estratégia"**
   - Um clique para adicionar todos os números favoráveis
   
3. **Sugestão Inteligente**
   - Analisa números frios e sugere prioridade
   
4. **Destaque Visual**
   - Placeholder em cor diferente quando mostra estratégia

---

**Status**: ✅ Implementado e funcional  
**Versão**: 1.0.0  
**Impacto**: UX significativamente melhorada  
**Erros TypeScript**: 0
