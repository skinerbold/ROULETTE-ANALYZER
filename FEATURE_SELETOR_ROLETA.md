# Feature: Seletor de Roleta (Placeholder UI)

## 🎰 Descrição
Componente visual de seleção de tipo de roleta adicionado ao sistema, servindo como preview de design para futura implementação funcional.

## 🎯 Objetivo
Mostrar ao cliente como ficará a interface de seleção de diferentes tipos de roleta, permitindo feedback de design antes da implementação da lógica completa.

## 📱 Localização nos Layouts

### Desktop 💻
- **Posição**: Lateral esquerda, acima dos 3 botões de categoria
- **Ordem visual**:
  1. 🎰 Seletor de Roleta (NOVO)
  2. Botões: Até 9 | +9 | Todas
  3. Lista de pastas/estratégias

### Mobile 📱
- **Posição**: Topo da tela, antes dos botões de controle
- **Ordem visual**:
  1. 🎰 Seletor de Roleta (NOVO)
  2. Botões: Estratégias | Categoria | Métricas
  3. Input de números
  4. Grid de números

## ✨ Características do Componente

### Opções Disponíveis

1. **🇪🇺 Roleta Europeia (0-36)**
   - Tipo padrão selecionado
   - 37 números (0 a 36)
   - Um único zero

2. **🇺🇸 Roleta Americana (0-00-36)**
   - 38 números (0, 00 e 1-36)
   - Dois zeros (0 e 00)

3. **🇫🇷 Roleta Francesa (0-36)**
   - 37 números (0 a 36)
   - Regras especiais (La Partage, En Prison)

### Design Visual

#### Desktop
```tsx
<div className="space-y-2">
  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
    🎰 Selecionar Roleta
  </label>
  <Select value={selectedRoulette} onValueChange={setSelectedRoulette}>
    <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-650 focus:ring-2 focus:ring-blue-500">
      <SelectValue placeholder="Escolha uma roleta..." />
    </SelectTrigger>
    <SelectContent>
      {/* Opções de roleta */}
    </SelectContent>
  </Select>
  <p className="text-xs text-gray-500 italic">
    * Funcionalidade em desenvolvimento
  </p>
</div>
```

#### Mobile
```tsx
<div className="p-3 bg-gray-800 border-b border-gray-700">
  <div className="space-y-1">
    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
      🎰 Roleta
    </label>
    <Select value={selectedRoulette} onValueChange={setSelectedRoulette}>
      <SelectTrigger className="w-full h-10 bg-gray-700 border-gray-600 text-white text-sm">
        <SelectValue placeholder="Escolha..." />
      </SelectTrigger>
      <SelectContent>
        {/* Opções compactas */}
      </SelectContent>
    </Select>
    <p className="text-xs text-gray-500 italic">
      * Em desenvolvimento
    </p>
  </div>
</div>
```

## 💻 Implementação Técnica

### Estado Adicionado
```tsx
const [selectedRoulette, setSelectedRoulette] = useState<string>('european')
```

### Import do Componente Select
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
```

### Valores das Opções
- `european`: Roleta Europeia (padrão)
- `american`: Roleta Americana
- `french`: Roleta Francesa

## 🎨 Detalhes de Design

### Desktop
- **Largura**: Full width do painel lateral (320px)
- **Label**: 
  - Tamanho: `text-xs`
  - Cor: `text-gray-400`
  - Estilo: `uppercase tracking-wide`
- **Select**:
  - Background: `bg-gray-700`
  - Border: `border-gray-600`
  - Hover: `hover:bg-gray-650`
  - Focus: `focus:ring-2 focus:ring-blue-500`
- **Aviso**: "* Funcionalidade em desenvolvimento"
- **Espaçamento**: `space-y-2` (gap de 8px)

### Mobile
- **Padding**: `p-3` (12px)
- **Background**: `bg-gray-800`
- **Border**: `border-b border-gray-700`
- **Label**: Mais compacta (`text-xs`)
- **Select**:
  - Altura: `h-10` (40px)
  - Texto: `text-sm`
- **Aviso**: "* Em desenvolvimento" (texto mais curto)
- **Espaçamento**: `space-y-1` (gap de 4px)

### Dropdown (ambos)
- **Background**: `bg-gray-700`
- **Border**: `border-gray-600`
- **Items**:
  - Cor: `text-white`
  - Hover: `hover:bg-gray-600`
  - Focus: `focus:bg-gray-600`

## 🌍 Emojis e Textos

| Tipo | Emoji | Texto Desktop | Texto Mobile |
|------|-------|---------------|--------------|
| Europeia | 🇪🇺 | Roleta Europeia (0-36) | Europeia (0-36) |
| Americana | 🇺🇸 | Roleta Americana (0-00-36) | Americana (0-00-36) |
| Francesa | 🇫🇷 | Roleta Francesa (0-36) | Francesa (0-36) |

## 📊 Hierarquia Visual

### Desktop - Painel Lateral Esquerdo
```
┌─────────────────────────────────┐
│ 🎰 SELECIONAR ROLETA            │
│ [▼ 🇪🇺 Roleta Europeia (0-36)]  │ ← NOVO
│ * Funcionalidade em desenvolvimento
├─────────────────────────────────┤
│ [Até 9] [+9] [Todas]            │
├─────────────────────────────────┤
│ 📁 Pastas e Estratégias         │
└─────────────────────────────────┘
```

### Mobile - Topo da Tela
```
┌─────────────────────────────────┐
│ 🎰 ROLETA                       │
│ [▼ 🇪🇺 Europeia (0-36)]         │ ← NOVO
│ * Em desenvolvimento            │
├─────────────────────────────────┤
│ [Estratégias] [+9] [Métricas]   │
├─────────────────────────────────┤
│ [Input de números...]           │
└─────────────────────────────────┘
```

## 🔮 Funcionalidade Futura (Não Implementada)

### O que será adicionado posteriormente:

1. **Lógica de Validação**
   - Europeia/Francesa: Validar apenas 0-36
   - Americana: Validar 0, 00, 1-36

2. **Adaptação de Estratégias**
   - Filtrar estratégias compatíveis com cada tipo
   - Ajustar cálculos para roleta americana (00)

3. **Estatísticas Específicas**
   - RTP (Return to Player) diferente por tipo
   - House edge diferente (Europeia: 2.7%, Americana: 5.26%)

4. **Visual do Grid**
   - Europeia/Francesa: Grid 0-36
   - Americana: Grid 0-00-36 (layout diferente)

5. **Salvamento de Preferência**
   - Persistir escolha no Supabase
   - Carregar preferência ao login

6. **Indicadores Visuais**
   - Badge mostrando tipo de roleta ativa
   - Cor diferente para cada tipo no header

## ✅ Status Atual

### Implementado ✅
- [x] Componente Select visível no desktop
- [x] Componente Select visível no mobile
- [x] 3 opções de roleta disponíveis
- [x] Estado `selectedRoulette` controlado
- [x] Valor padrão: 'european'
- [x] Aviso de "em desenvolvimento"
- [x] Design integrado ao tema escuro
- [x] Emojis de bandeiras para identificação

### Não Implementado ⏳
- [ ] Lógica de validação de números
- [ ] Filtro de estratégias por compatibilidade
- [ ] Cálculos específicos por tipo de roleta
- [ ] Persistência da escolha
- [ ] Mudança visual do grid de números
- [ ] Estatísticas diferenciadas

## 🎨 Preview Visual

### Desktop - Estado Fechado
```
🎰 SELECIONAR ROLETA
┌──────────────────────────────────┐
│ 🇪🇺 Roleta Europeia (0-36)    ▼ │
└──────────────────────────────────┘
* Funcionalidade em desenvolvimento
```

### Desktop - Estado Aberto
```
🎰 SELECIONAR ROLETA
┌──────────────────────────────────┐
│ 🇪🇺 Roleta Europeia (0-36)    ▲ │
├──────────────────────────────────┤
│ 🇪🇺 Roleta Europeia (0-36)    ✓ │ ← Selecionado
│ 🇺🇸 Roleta Americana (0-00-36)  │
│ 🇫🇷 Roleta Francesa (0-36)      │
└──────────────────────────────────┘
```

### Mobile - Compacto
```
🎰 ROLETA
┌────────────────────────┐
│ 🇪🇺 Europeia (0-36)  ▼ │
└────────────────────────┘
* Em desenvolvimento
```

## 📝 Observações Importantes

### Para o Cliente
1. **Este é apenas um preview visual** - a funcionalidade ainda será desenvolvida
2. **A seleção muda visualmente** mas não afeta o comportamento do sistema
3. **Feedback é bem-vindo** - design pode ser ajustado conforme necessidade
4. **Implementação futura** será priorizada conforme demanda

### Para Desenvolvimento
1. **Estado já criado**: `selectedRoulette` pronto para uso
2. **UI completa**: Desktop e mobile implementados
3. **Próximos passos**: Conectar lógica de validação e filtros
4. **Persistência**: Adicionar campo `roulette_type` no banco de dados

## 🚀 Roadmap de Implementação

### Fase 1: Preview Visual (ATUAL) ✅
- [x] Adicionar componente Select
- [x] Criar estado controlado
- [x] Integrar ao design existente
- [x] Adicionar aviso de desenvolvimento

### Fase 2: Validação Básica ⏳
- [ ] Validar range de números por tipo
- [ ] Mostrar erro ao inserir número inválido
- [ ] Ajustar placeholder do input

### Fase 3: Lógica Completa ⏳
- [ ] Filtrar estratégias compatíveis
- [ ] Ajustar cálculos de estatísticas
- [ ] Implementar regras específicas

### Fase 4: Persistência ⏳
- [ ] Salvar preferência no banco
- [ ] Carregar ao iniciar sessão
- [ ] Sincronizar entre dispositivos

### Fase 5: Visual Avançado ⏳
- [ ] Grid adaptativo (layout americano)
- [ ] Indicadores no header
- [ ] Animações de transição

---

**Status**: ✅ Implementado (Placeholder UI)  
**Funcionalidade**: ⏳ Aguardando desenvolvimento  
**Feedback**: 🎨 Aberto para ajustes de design  
**Erros TypeScript**: 0
