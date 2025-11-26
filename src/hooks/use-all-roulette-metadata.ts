import { useState, useEffect, useCallback } from 'react'

export interface RouletteMetadata {
  rouletteId: string
  lastNumber: number
  lastUpdate: string
  totalSpins: number
  historyCount: number
}

export interface AllRouletteMetadataResponse {
  success: boolean
  count: number
  roulettes: RouletteMetadata[]
}

export interface UseAllRouletteMetadataOptions {
  refetchInterval?: number // ms
  enabled?: boolean
  onSuccess?: (data: AllRouletteMetadataResponse) => void
  onError?: (error: Error) => void
}

export interface UseAllRouletteMetadataResult {
  data: AllRouletteMetadataResponse | null
  roulettes: RouletteMetadata[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const API_BASE_URL = process.env.NEXT_PUBLIC_ROULETTE_HISTORY_API_URL || 'https://roulette-history-api.fly.dev'

export function useAllRouletteMetadata(
  options: UseAllRouletteMetadataOptions = {}
): UseAllRouletteMetadataResult {
  const {
    refetchInterval = 60000, // 1 minuto padrão
    enabled = true,
    onSuccess,
    onError
  } = options

  const [data, setData] = useState<AllRouletteMetadataResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchMetadata = useCallback(async () => {
    if (!enabled) {
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`${API_BASE_URL}/api/history/metadata`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const json: AllRouletteMetadataResponse = await response.json()

      setData(json)
      setError(null)

      if (onSuccess) {
        onSuccess(json)
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      setError(error)
      setData(null)

      if (onError) {
        onError(error)
      }

    } finally {
      setLoading(false)
    }
  }, [enabled, onSuccess, onError])

  const refetch = useCallback(async () => {
    await fetchMetadata()
  }, [fetchMetadata])

  useEffect(() => {
    fetchMetadata()

    if (refetchInterval > 0) {
      const interval = setInterval(fetchMetadata, refetchInterval)
      return () => clearInterval(interval)
    }
  }, [fetchMetadata, refetchInterval])

  return {
    data,
    roulettes: data?.roulettes || [],
    loading,
    error,
    refetch
  }
}

export default useAllRouletteMetadata
