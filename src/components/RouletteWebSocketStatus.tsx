'use client'

import { useRouletteWebSocket } from '@/hooks/use-roulette-websocket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wifi, WifiOff, RefreshCw, Activity } from 'lucide-react'
import { formatRouletteNumber } from '@/lib/roulette-websocket'
import { useEffect, useRef, useState } from 'react'

interface RouletteWebSocketStatusProps {
  onNumbersReceived?: (numbers: number[]) => void
  onRouletteChange?: (roulette: string) => void
}

export default function RouletteWebSocketStatus({ 
  onNumbersReceived, 
  onRouletteChange
}: RouletteWebSocketStatusProps) {
  const {
    isConnected,
    lastNumber,
    recentNumbers,
    error,
    reconnectAttempts,
    availableRoulettes,
    connect,
    disconnect,
    sendMessage
  } = useRouletteWebSocket()

  const [selectedRoulette, setSelectedRoulette] = useState<string>('')
  const previousRouletteType = useRef<string | undefined>(undefined)

  // Quando lista de roletas disponíveis chegar, solicitar a primeira
  useEffect(() => {
    if (isConnected && availableRoulettes.length > 0 && !selectedRoulette) {
      const firstRoulette = availableRoulettes[0]
      setSelectedRoulette(firstRoulette)
      console.log('🎰 Selecionando primeira roleta disponível:', firstRoulette)
      
      sendMessage(JSON.stringify({
        type: 'subscribe',
        roulette: firstRoulette,
        limit: 500
      }))
      
      if (onRouletteChange) {
        onRouletteChange(firstRoulette)
      }
    }
  }, [isConnected, availableRoulettes, selectedRoulette, sendMessage, onRouletteChange])

  // Quando usuário mudar roleta manualmente
  const handleRouletteChange = (newRoulette: string) => {
    if (newRoulette === selectedRoulette) return
    
    console.log('🎰 Mudança de roleta:', selectedRoulette, '→', newRoulette)
    setSelectedRoulette(newRoulette)
    previousRouletteType.current = newRoulette
    
    if (isConnected) {
      // Solicitar histórico da nova roleta
      sendMessage(JSON.stringify({
        type: 'subscribe',
        roulette: newRoulette,
        limit: 500
      }))
    }
    
    if (onRouletteChange) {
      onRouletteChange(newRoulette)
    }
  }

  // Sincronizar números recebidos com o componente pai
  useEffect(() => {
    if (recentNumbers.length > 0 && onNumbersReceived) {
      // Inverter ordem: mais recente primeiro (índice 0 = mais recente)
      const numbers = [...recentNumbers].reverse().map(n => n.number)
      onNumbersReceived(numbers)
      console.log('📊 Números sincronizados:', numbers.length, '(mais recente primeiro)')
    }
  }, [recentNumbers, onNumbersReceived])

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Roleta ao Vivo
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                Conectado
              </Badge>
            ) : (
              <Badge className="bg-red-600 hover:bg-red-700 flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                Desconectado
              </Badge>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={isConnected ? disconnect : connect}
              className="h-7 px-2 text-gray-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${!isConnected && reconnectAttempts > 0 ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Seletor de Roletas */}
        {availableRoulettes.length > 0 && (
          <div className="mb-3">
            <label className="text-xs text-gray-400 mb-1.5 block">
              Selecionar Roleta:
            </label>
            <Select
              value={selectedRoulette}
              onValueChange={handleRouletteChange}
              disabled={!isConnected}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-9">
                <SelectValue placeholder="Selecione uma roleta..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {availableRoulettes.map((roulette) => (
                  <SelectItem 
                    key={roulette} 
                    value={roulette}
                    className="text-white hover:bg-gray-600"
                  >
                    🎰 {roulette}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="mb-3 p-3 bg-red-500/20 border border-red-500/30 rounded-md text-sm text-red-300 flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="font-medium mb-1">Erro de Conexão</p>
              <p className="text-xs">{error}</p>
              {!isConnected && (
                <Button
                  size="sm"
                  onClick={connect}
                  className="mt-2 h-7 bg-red-600 hover:bg-red-700 text-xs"
                >
                  Tentar Conectar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Tentativas de reconexão */}
        {!isConnected && reconnectAttempts > 0 && !error && (
          <div className="mb-3 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs text-yellow-300">
            🔄 Reconectando... (Tentativa {reconnectAttempts}/10)
          </div>
        )}

        {/* Último número */}
        {lastNumber && (
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-2">Último número:</p>
            <div className="flex items-center gap-3">
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                  lastNumber.color === 'red' 
                    ? 'bg-red-600' 
                    : lastNumber.color === 'black' 
                    ? 'bg-gray-900 border-2 border-white' 
                    : 'bg-green-600'
                }`}
              >
                {formatRouletteNumber(lastNumber.number)}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">
                  {formatRouletteNumber(lastNumber.number)}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(lastNumber.timestamp).toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Histórico recente */}
        {recentNumbers.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-2">
              Últimos números ({recentNumbers.length}):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recentNumbers.slice(0, 20).map((num, index) => (
                <div
                  key={`${num.number}-${index}`}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow ${
                    num.color === 'red'
                      ? 'bg-red-600'
                      : num.color === 'black'
                      ? 'bg-gray-900 border border-white/50'
                      : 'bg-green-600'
                  }`}
                >
                  {formatRouletteNumber(num.number)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {!isConnected && recentNumbers.length === 0 && !error && (
          <div className="text-center py-4 text-gray-500 text-sm">
            <p className="mb-2">🎰</p>
            <p>Aguardando conexão com a roleta...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
