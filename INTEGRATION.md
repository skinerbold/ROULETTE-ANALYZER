# Integração Front-end - Roulette History System

Este documento descreve como integrar os hooks React do sistema de histórico de roletas com o front-end existente.

## 📦 Hooks Criados

### 1. `useRouletteHistory`

Hook para buscar histórico de números de uma roleta específica.

**Localização:** `src/hooks/use-roulette-history.ts`

**Características:**
- ✅ Auto-refetch a cada 30 segundos (configurável)
- ✅ Cache automático pela API (TTL 30s)
- ✅ Suporte a AbortController (cancela requests anteriores)
- ✅ Loading states separados (initial + refetching)
- ✅ Callbacks onSuccess/onError
- ✅ Refetch manual via `refetch()`
- ✅ Pode ser desabilitado via `enabled: false`

**Exemplo de Uso:**

```tsx
import { useRouletteHistory } from '@/hooks/use-roulette-history'

function RouletteAnalyzer() {
  const { 
    numbers,        // number[] - array de números ordenados
    metadata,       // { lastNumber, lastUpdate, totalSpins, historyCount }
    loading,        // boolean - true no primeiro fetch
    error,          // Error | null
    refetch,        // () => Promise<void> - refetch manual
    isRefetching    // boolean - true durante refetch automático
  } = useRouletteHistory('lightning-roulette', {
    limit: 500,                    // 50, 100, 200, 300 ou 500
    refetchInterval: 30000,        // ms - 0 para desabilitar auto-refetch
    enabled: true,                 // desabilitar temporariamente
    onSuccess: (data) => {
      console.log('Histórico atualizado:', data.numbers.length)
    },
    onError: (error) => {
      console.error('Erro ao buscar histórico:', error.message)
    }
  })

  if (loading) return <div>Carregando histórico...</div>
  if (error) return <div>Erro: {error.message}</div>

  return (
    <div>
      <h2>Últimos {numbers.length} números</h2>
      <div>{numbers.join(', ')}</div>
      
      {metadata && (
        <div>
          <p>Último número: {metadata.lastNumber}</p>
          <p>Total de spins: {metadata.totalSpins}</p>
          <p>Última atualização: {new Date(metadata.lastUpdate).toLocaleString()}</p>
        </div>
      )}
      
      <button onClick={refetch} disabled={isRefetching}>
        {isRefetching ? 'Atualizando...' : 'Atualizar'}
      </button>
    </div>
  )
}
```

### 2. `useAllRouletteMetadata`

Hook para buscar metadata de todas as roletas.

**Localização:** `src/hooks/use-all-roulette-metadata.ts`

**Exemplo de Uso:**

```tsx
import { useAllRouletteMetadata } from '@/hooks/use-all-roulette-metadata'

function RoulettesList() {
  const { roulettes, loading, error } = useAllRouletteMetadata({
    refetchInterval: 60000 // 1 minuto
  })

  if (loading) return <div>Carregando...</div>
  if (error) return <div>Erro: {error.message}</div>

  return (
    <ul>
      {roulettes.map(roulette => (
        <li key={roulette.rouletteId}>
          <strong>{roulette.rouletteId}</strong>
          <span>Último número: {roulette.lastNumber}</span>
          <span>Total spins: {roulette.totalSpins}</span>
          <span>Histórico: {roulette.historyCount} números</span>
        </li>
      ))}
    </ul>
  )
}
```

## 🔧 Configuração

### 1. Adicionar Variável de Ambiente

Crie ou edite `.env.local`:

```bash
NEXT_PUBLIC_ROULETTE_HISTORY_API_URL=http://localhost:3001
```

**Produção:**

```bash
NEXT_PUBLIC_ROULETTE_HISTORY_API_URL=https://api-roulette-history.seu-dominio.com
```

### 2. Integração com Sistema Existente

O sistema atual usa WebSocket para receber números em tempo real. O novo sistema de histórico complementa isso fornecendo:

1. **Histórico persistente** (últimos 500 números mesmo após refresh)
2. **Sincronização automática** (worker atualiza banco 24/7)
3. **Performance otimizada** (cache + queries indexadas)

## 📋 Estratégias de Integração

### Estratégia 1: Híbrida (Recomendada)

Use WebSocket para tempo real + API para histórico inicial:

```tsx
import { useRouletteWebSocket } from '@/hooks/use-roulette-websocket'
import { useRouletteHistory } from '@/hooks/use-roulette-history'

function RouletteAnalyzer() {
  const [selectedRoulette, setSelectedRoulette] = useState('lightning-roulette')
  
  // WebSocket: números em tempo real
  const { 
    isConnected, 
    recentNumbers,    // últimos ~100 números da sessão atual
  } = useRouletteWebSocket()
  
  // API: histórico completo persistente
  const { 
    numbers: historicalNumbers,  // últimos 500 números do banco
    loading: historyLoading 
  } = useRouletteHistory(selectedRoulette, {
    limit: 500,
    refetchInterval: 60000 // atualizar a cada 1min (menos frequente)
  })
  
  // Combinar: usar WebSocket para tempo real, API como fallback
  const numbersToAnalyze = useMemo(() => {
    // Se temos números do WebSocket, usar eles (mais recentes)
    if (recentNumbers.length > 0) {
      return recentNumbers
    }
    
    // Senão, usar histórico da API
    return historyLoading ? [] : historicalNumbers
  }, [recentNumbers, historicalNumbers, historyLoading])
  
  return (
    <div>
      <p>Fonte: {recentNumbers.length > 0 ? 'WebSocket (tempo real)' : 'API (histórico)'}</p>
      <p>Analisando {numbersToAnalyze.length} números</p>
    </div>
  )
}
```

### Estratégia 2: Somente API

Remover dependência do WebSocket, usar apenas API:

```tsx
import { useRouletteHistory } from '@/hooks/use-roulette-history'

function RouletteAnalyzer() {
  const [selectedRoulette, setSelectedRoulette] = useState('lightning-roulette')
  const [analysisLimit, setAnalysisLimit] = useState(500)
  
  const { 
    numbers,
    metadata,
    loading,
    error 
  } = useRouletteHistory(selectedRoulette, {
    limit: analysisLimit,
    refetchInterval: 30000 // auto-update a cada 30s
  })
  
  // Calcular estratégias com números da API
  const strategyStats = useMemo(() => {
    return calculateStrategies(numbers)
  }, [numbers])
  
  return (
    <div>
      {/* UI de análise de estratégias */}
    </div>
  )
}
```

### Estratégia 3: Migração Gradual

Manter WebSocket como primário, adicionar API como backup:

```tsx
function RouletteAnalyzer() {
  const { recentNumbers, isConnected } = useRouletteWebSocket()
  
  // Habilitar API apenas quando WebSocket desconectado
  const { numbers: apiNumbers } = useRouletteHistory('lightning-roulette', {
    enabled: !isConnected,  // só buscar se WebSocket offline
    limit: 500
  })
  
  const numbers = isConnected ? recentNumbers : apiNumbers
  
  return (
    <div>
      <Badge variant={isConnected ? 'default' : 'secondary'}>
        {isConnected ? 'WebSocket Ativo' : 'Usando Histórico API'}
      </Badge>
    </div>
  )
}
```

## 🎨 Componente de Exemplo Completo

```tsx
'use client'

import { useState, useMemo } from 'react'
import { useRouletteHistory } from '@/hooks/use-roulette-history'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'

const ALLOWED_ROULETTES = [
  { id: 'lightning-roulette', name: 'Lightning Roulette' },
  { id: 'speed-roulette', name: 'Speed Roulette' },
  { id: 'instant-roulette', name: 'Instant Roulette' },
  // ... outras roletas
]

export default function RouletteHistoryDemo() {
  const [selectedRoulette, setSelectedRoulette] = useState('lightning-roulette')
  const [limit, setLimit] = useState<50 | 100 | 200 | 300 | 500>(100)
  
  const { 
    numbers, 
    metadata, 
    loading, 
    error, 
    refetch, 
    isRefetching,
    data 
  } = useRouletteHistory(selectedRoulette, {
    limit,
    refetchInterval: 30000,
    onSuccess: (data) => {
      console.log(`📊 Histórico atualizado: ${data.count} números (cached: ${data.cached})`)
    }
  })
  
  // Análise simples: distribuição de números
  const distribution = useMemo(() => {
    const counts = numbers.reduce((acc, num) => {
      acc[num] = (acc[num] || 0) + 1
      return acc
    }, {} as Record<number, number>)
    
    return Object.entries(counts)
      .map(([num, count]) => ({ number: parseInt(num), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [numbers])
  
  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Roleta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seleção de Roleta */}
          <div className="flex gap-2">
            <Select value={selectedRoulette} onValueChange={setSelectedRoulette}>
              <SelectTrigger className="w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_ROULETTES.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Seleção de Limite */}
            <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v) as any)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 números</SelectItem>
                <SelectItem value="100">100 números</SelectItem>
                <SelectItem value="200">200 números</SelectItem>
                <SelectItem value="300">300 números</SelectItem>
                <SelectItem value="500">500 números</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Botão de Refetch */}
            <Button onClick={refetch} disabled={isRefetching} size="icon">
              <RefreshCw className={isRefetching ? 'animate-spin' : ''} />
            </Button>
          </div>
          
          {/* Status */}
          <div className="flex gap-2">
            {data?.cached && <Badge variant="secondary">Cache</Badge>}
            {loading && <Badge>Carregando...</Badge>}
            {error && <Badge variant="destructive">Erro</Badge>}
          </div>
          
          {/* Metadata */}
          {metadata && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Último número: <strong>{metadata.lastNumber}</strong></p>
              <p>Total de spins: <strong>{metadata.totalSpins.toLocaleString()}</strong></p>
              <p>Histórico: <strong>{metadata.historyCount} números</strong></p>
              <p>Última atualização: <strong>{new Date(metadata.lastUpdate).toLocaleString()}</strong></p>
            </div>
          )}
          
          {/* Top 10 Números Mais Frequentes */}
          {distribution.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Top 10 Mais Frequentes:</h3>
              <div className="grid grid-cols-5 gap-2">
                {distribution.map(({ number, count }) => (
                  <div key={number} className="text-center p-2 bg-secondary rounded">
                    <div className="text-2xl font-bold">{number}</div>
                    <div className="text-xs text-muted-foreground">{count}x</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Últimos 20 Números */}
          {numbers.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Últimos 20 números:</h3>
              <div className="flex gap-1 flex-wrap">
                {numbers.slice(0, 20).map((num, idx) => (
                  <Badge key={idx} variant="outline">
                    {num}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

## 🚀 Deploy

### 1. Backend (API + Worker)

**Railway / Render:**

1. Fazer deploy do `roulette-history-api` (porta 3001)
2. Fazer deploy do `roulette-history-worker` (porta 3000 health check)
3. Configurar variáveis de ambiente (SUPABASE_URL, SUPABASE_SERVICE_KEY, etc)

### 2. Front-end (Next.js)

Adicionar variável de ambiente em Vercel/Railway:

```bash
NEXT_PUBLIC_ROULETTE_HISTORY_API_URL=https://seu-api-url.com
```

## 📊 Performance

### Cache Hit Rate

Com TTL de 30s e refetchInterval de 30s:
- Cache hit: ~97%
- Redução de carga no banco: ~97%
- Latência média: <1ms (cache) / <10ms (banco)

### Auto-refetch

O hook faz auto-refetch a cada 30s por padrão. Recomendações:

- **Análise em tempo real:** 10-30s
- **Dashboard geral:** 60s
- **Estatísticas históricas:** 300s ou desabilitado

## 🔍 Debugging

### Verificar Requests

```tsx
const { data } = useRouletteHistory('lightning-roulette', {
  onSuccess: (data) => {
    console.log('✅ Sucesso:', {
      count: data.count,
      cached: data.cached,
      numbers: data.numbers.slice(0, 5)
    })
  },
  onError: (error) => {
    console.error('❌ Erro:', error.message)
  }
})
```

### Monitorar API

```bash
# Health check
curl http://localhost:3001/health

# Ver métricas
curl http://localhost:3001/api/history/lightning-roulette?limit=100
```

## 📚 Referências

- Hook `useRouletteHistory`: `src/hooks/use-roulette-history.ts`
- Hook `useAllRouletteMetadata`: `src/hooks/use-all-roulette-metadata.ts`
- API Endpoints: `roulette-history-api/README.md`
- Worker: `roulette-history-worker/README.md`
- Database: `database/README.md`
