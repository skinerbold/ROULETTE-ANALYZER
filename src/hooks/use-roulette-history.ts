import { useState, useEffect, useCallback, useRef } from 'react'

export interface RouletteHistoryMetadata {
  lastNumber: number
  lastUpdate: string
  totalSpins: number
  historyCount: number
}

export interface RouletteHistoryResponse {
  success: boolean
  rouletteId: string
  limit: number
  count: number
  cached: boolean
  numbers: number[]
  metadata: RouletteHistoryMetadata | null
}

export interface UseRouletteHistoryOptions {
  limit?: 50 | 100 | 200 | 300 | 500
  refetchInterval?: number // ms
  enabled?: boolean
  onSuccess?: (data: RouletteHistoryResponse) => void
  onError?: (error: Error) => void
}

export interface UseRouletteHistoryResult {
  data: RouletteHistoryResponse | null
  numbers: number[]
  metadata: RouletteHistoryMetadata | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  isRefetching: boolean
}

const API_BASE_URL = process.env.NEXT_PUBLIC_ROULETTE_HISTORY_API_URL || 'https://roulette-history-api.fly.dev'

export function useRouletteHistory(
  rouletteId: string | null,
  options: UseRouletteHistoryOptions = {}
): UseRouletteHistoryResult {
  const {
    limit = 100,
    refetchInterval = 30000, // 30 segundos padrão
    enabled = true,
    onSuccess,
    onError
  } = options

  const [data, setData] = useState<RouletteHistoryResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isRefetching, setIsRefetching] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchHistory = useCallback(async (isInitialFetch = false) => {
    // Não buscar se desabilitado ou sem rouletteId
    if (!enabled || !rouletteId) {
      return
    }

    try {
      // Cancelar request anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Criar novo AbortController
      abortControllerRef.current = new AbortController()

      // Definir loading states
      if (isInitialFetch) {
        setLoading(true)
      } else {
        setIsRefetching(true)
      }

      // Fazer request
      const response = await fetch(
        `${API_BASE_URL}/api/history/${rouletteId}?limit=${limit}`,
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const json: RouletteHistoryResponse = await response.json()

      setData(json)
      setError(null)

      // Callback de sucesso
      if (onSuccess) {
        onSuccess(json)
      }

    } catch (err) {
      // Ignorar erros de abort
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }

      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      setError(error)
      setData(null)

      // Callback de erro
      if (onError) {
        onError(error)
      }

    } finally {
      setLoading(false)
      setIsRefetching(false)
    }
  }, [rouletteId, limit, enabled, onSuccess, onError])

  // Refetch manual
  const refetch = useCallback(async () => {
    await fetchHistory(false)
  }, [fetchHistory])

  // Effect para fetch inicial e refetch automático
  useEffect(() => {
    // Fetch inicial
    fetchHistory(true)

    // Configurar refetch automático
    if (refetchInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchHistory(false)
      }, refetchInterval)
    }

    // Cleanup
    return () => {
      // Cancelar request em andamento
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Limpar interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchHistory, refetchInterval])

  return {
    data,
    numbers: data?.numbers || [],
    metadata: data?.metadata || null,
    loading,
    error,
    refetch,
    isRefetching
  }
}

export default useRouletteHistory
