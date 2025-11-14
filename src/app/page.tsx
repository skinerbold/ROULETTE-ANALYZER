'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, Target, Zap, BarChart3, X, Trash2, Menu, Layers } from 'lucide-react'
import { getAllStrategies, getStrategyById, ChipCategory } from '@/lib/strategies'
import { StrategyStats, UserSession } from '@/lib/types'
import { supabase, getCurrentUser } from '@/lib/supabase'
import AuthForm from '@/components/AuthForm'
import Header from '@/components/Header'
import ProfileEdit from '@/components/ProfileEdit'
import { useRouletteWebSocket } from '@/hooks/use-roulette-websocket'

interface NumberStatus {
  number: number
  status: 'GREEN' | 'RED' | 'ACTIVATION' | 'NEUTRAL'
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [numbers, setNumbers] = useState<number[]>([])
  
  // Estado para categoria de fichas
  const [chipCategory, setChipCategory] = useState<ChipCategory>('up-to-9')
  const [selectedStrategies, setSelectedStrategies] = useState<number[]>([]) // MUDANÇA: Array de IDs
  const [selectAllFolders, setSelectAllFolders] = useState(false) // Estado para "All Pastas"
  
  // Hook do WebSocket - Conecta automaticamente e obtém roletas disponíveis
  const { 
    isConnected, 
    availableRoulettes, 
    recentNumbers,
    selectedRoulette,
    updateVersion, // NOVO: força re-render
    sendMessage,
    connect,
    selectRoulette
  } = useRouletteWebSocket()
  
  // LOG CRÍTICO: Estado do WebSocket
  useEffect(() => {
    console.log('\n🔍🔍🔍 DIAGNÓSTICO DO ESTADO WEBSOCKET:')
    console.log('   ✅ isConnected:', isConnected)
    console.log('   📊 availableRoulettes.length:', availableRoulettes.length)
    console.log('   📋 availableRoulettes:', availableRoulettes.map(r => r.id))
    console.log('   🎯 selectedRoulette:', selectedRoulette)
    console.log('   🔢 recentNumbers.length:', recentNumbers.length)
    console.log('   🚫 Select desabilitado?', !isConnected || availableRoulettes.length === 0)
  }, [isConnected, availableRoulettes, selectedRoulette, recentNumbers])
  
  const [analysisLimit, setAnalysisLimit] = useState<number>(500) // Quantidade de números para analisar
  const [greenRedAttempts, setGreenRedAttempts] = useState<number>(3) // Quantidade de casas para analisar GREEN/RED (1, 2, 3, 4, 5 ou 6)
  
  const [strategyStats, setStrategyStats] = useState<StrategyStats[]>([])
  const [numberStatuses, setNumberStatuses] = useState<NumberStatus[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  
  // Estados para mobile
  const [showStrategiesMenu, setShowStrategiesMenu] = useState(false)
  const [showMetricsPanel, setShowMetricsPanel] = useState(false)
  
  // Estado para controlar scroll do dashboard e estratégias
  const [isDashboardScrolled, setIsDashboardScrolled] = useState(false)
  const [isStrategiesScrolled, setIsStrategiesScrolled] = useState(false)
  
  // Ref para o container de scroll das estratégias
  const strategiesScrollRef = useRef<HTMLDivElement>(null)
  
  // Obter pastas e estratégias da categoria atual
  const FOLDERS = getAllStrategies(chipCategory)
  const STRATEGIES = FOLDERS.flatMap(folder => folder.strategies)

  // Números filtrados com base no limite de análise
  const numbersToAnalyze = useMemo(() => {
    if (numbers.length === 0) return []
    // Pegar apenas os PRIMEIROS N números (mais recentes)
    // O array já vem ordenado do mais recente para o mais antigo
    return numbers.slice(0, analysisLimit)
  }, [numbers, analysisLimit])

  useEffect(() => {
    checkUser()
    initializeStrategies()
    
    // Listener para mudanças de autenticação (sessão expirada, logout, etc)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)
      
      if (event === 'SIGNED_IN' && session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário'
        }
        setUser(userData)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setNumbers([])
        setSessionId(null)
        setSelectedStrategies([])
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully')
      }
    })
    
    // Cleanup: remover listener quando componente desmontar
    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  // useEffect para detectar scroll nas estratégias
  useEffect(() => {
    const scrollContainer = strategiesScrollRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop
      setIsStrategiesScrolled(scrollTop > 20)
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    // CORREÇÃO: Limpar estratégias selecionadas quando mudar de categoria
    // pois os IDs são diferentes entre categorias
    setSelectedStrategies([])
    
    // Recalcular estratégias disponíveis
    initializeStrategies()
    
    // Salvar categoria quando mudar E usuário estiver logado
    if (user && !isLoadingSession && chipCategory) {
      saveUserSession()
    }
    // CORREÇÃO: Recalcular quando categoria mudar
    if (numbers.length > 0) {
      calculateAllStrategies()
      updateNumberStatuses()
    }
  }, [chipCategory])

  useEffect(() => {
    if (user && !isLoadingSession) {
      loadUserSession()
    }
  }, [user, isLoadingSession])

  useEffect(() => {
    if (numbers.length > 0) {
      // OTIMIZAÇÃO: Adicionar debounce para evitar cálculos excessivos
      const debounceTimer = setTimeout(() => {
        calculateAllStrategies()
        updateNumberStatuses()
      }, 100) // Aguardar 100ms antes de recalcular
      
      // Salvar sessão (com debounce maior para evitar muitas escritas)
      const saveTimer = setTimeout(() => {
        if (user && !isLoadingSession) {
          saveUserSession()
        }
      }, 1000) // Aguardar 1 segundo antes de salvar
      
      return () => {
        clearTimeout(debounceTimer)
        clearTimeout(saveTimer)
      }
    } else if (user && !isLoadingSession) {
      // Salvar sessão vazia também
      saveUserSession()
    }
  }, [numbers, selectedStrategies, analysisLimit, greenRedAttempts])

  const checkUser = async () => {
    try {
      // CORREÇÃO: Sempre verificar com Supabase primeiro
      const currentUser = await getCurrentUser()
      
      if (currentUser) {
        const userData = {
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.email?.split('@')[0] || 'Usuário'
        }
        setUser(userData)
      } else {
        // Limpar qualquer dados se não há usuário autenticado
        setUser(null)
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error)
      setUser(null)
    } finally {
      setIsLoadingSession(false)
    }
  }

  const loadUserSession = async () => {
    if (!user) return

    try {
      // Buscar a sessão mais recente do usuário
      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Erro ao carregar sessão:', error)
        return
      }

      if (sessions && sessions.length > 0) {
        const session = sessions[0]
        setSessionId(session.id)
        setNumbers(session.numbers || [])
        // MUDANÇA: Carregar array de estratégias selecionadas
        const strategies = session.selected_strategies || session.selected_strategy 
          ? [session.selected_strategy] 
          : []
        setSelectedStrategies(Array.isArray(strategies) ? strategies : [strategies].filter(Boolean))
        setChipCategory(session.chip_category || 'up-to-9')
        setGreenRedAttempts(session.green_red_attempts || 3) // NOVO: Carregar casas GREEN/RED (padrão: 3)
        console.log('Sessão carregada:', session.numbers?.length || 0, 'números')
      } else {
        console.log('Nenhuma sessão encontrada, criando nova')
      }
    } catch (error) {
      console.error('Erro ao carregar sessão do usuário:', error)
    }
  }

  const saveUserSession = async () => {
    if (!user) return

    try {
      const sessionData: UserSession = {
        user_id: user.id,
        numbers: numbers,
        chip_category: chipCategory,
        selected_strategies: selectedStrategies, // MUDANÇA: Array de IDs
        green_red_attempts: greenRedAttempts, // NOVO: Casas para GREEN/RED
        updated_at: new Date().toISOString()
      }

      if (sessionId) {
        // Atualizar sessão existente
        const { error } = await supabase
          .from('user_sessions')
          .update(sessionData)
          .eq('id', sessionId)
        
        if (error) {
          // Se erro for de coluna inexistente, tentar sem chip_category e selected_strategies
          if (error.message?.includes('chip_category') || error.message?.includes('selected_strategies') || error.message?.includes('green_red_attempts') || !error.message) {
            console.warn('Colunas chip_category/selected_strategies/green_red_attempts não existem no banco. Execute a migração SQL.')
            const { chip_category, selected_strategies, green_red_attempts, ...dataWithoutNewColumns } = sessionData
            await supabase
              .from('user_sessions')
              .update(dataWithoutNewColumns)
              .eq('id', sessionId)
          } else {
            console.error('Erro ao atualizar sessão:', error)
          }
        } else {
          console.log('Sessão atualizada:', numbers.length, 'números')
        }
      } else {
        // Criar nova sessão
        const { data, error } = await supabase
          .from('user_sessions')
          .insert(sessionData)
          .select()
          .single()

        if (error) {
          // Se erro for de coluna inexistente, tentar sem chip_category e selected_strategies
          if (error.message?.includes('chip_category') || error.message?.includes('selected_strategies') || error.message?.includes('green_red_attempts') || !error.message) {
            console.warn('Colunas chip_category/selected_strategies/green_red_attempts não existem no banco. Execute a migração SQL.')
            const { chip_category, selected_strategies, green_red_attempts, ...dataWithoutNewColumns } = sessionData
            const result = await supabase
              .from('user_sessions')
              .insert(dataWithoutNewColumns)
              .select()
              .single()
            
            if (result.data) {
              setSessionId(result.data.id)
              console.log('Nova sessão criada (somente com numbers):', result.data.id)
            } else if (result.error) {
              console.error('Erro ao criar sessão (fallback):', result.error)
            }
          } else {
            console.error('Erro ao criar sessão:', error)
          }
        } else if (data) {
          setSessionId(data.id)
          console.log('Nova sessão criada:', data.id)
        }
      }
    } catch (error) {
      console.error('Erro ao salvar sessão:', error)
      // Não fazer nada que cause logout
    }
  }

  const handleLogin = (userData: any) => {
    setUser(userData)
    setIsLoadingSession(false)
  }

  const handleLogout = async () => {
    try {
      // Fazer logout no Supabase
      await supabase.auth.signOut()
      
      // Limpar estado local
      setUser(null)
      setNumbers([])
      setSessionId(null)
      setSelectedStrategies([]) // MUDANÇA: Limpar array de estratégias
      setNumberStatuses([])
      initializeStrategies()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  const handleProfileUpdate = (updatedUser: any) => {
    setUser(updatedUser)
  }

  const initializeStrategies = () => {
    const initialStats = STRATEGIES.map(strategy => ({
      id: strategy.id,
      name: strategy.name,
      totalGreen: 0,
      totalRed: 0,
      maxGreenSequence: 0,
      maxRedSequence: 0,
      firstAttemptHits: 0,
      secondAttemptHits: 0,
      thirdAttemptHits: 0,
      mostActivatingNumber: 0,
      mostActivatingCount: 0,
      activations: 0,
      profit: 0,
      // Novas métricas
      maxConsecutiveGreens: 0,
      maxConsecutiveReds: 0,
      bestEntryPattern: 'neutral' as const,
      postGreenWins: 0,
      postRedWins: 0
    }))
    setStrategyStats(initialStats)
  }

  // Funções para seleção múltipla de estratégias
  const toggleStrategy = (strategyId: number) => {
    setSelectedStrategies(prev => 
      prev.includes(strategyId)
        ? prev.filter(id => id !== strategyId)
        : [...prev, strategyId]
    )
  }

  const isStrategySelected = (strategyId: number) => {
    return selectedStrategies.includes(strategyId)
  }

  // Função para selecionar/desselecionar todas as estratégias da categoria atual (otimizada)
  const toggleSelectAllFolders = useCallback(() => {
    if (selectAllFolders) {
      // Desselecionar todas
      setSelectedStrategies([])
      setSelectAllFolders(false)
    } else {
      // Selecionar todas as estratégias da categoria atual
      const allStrategyIds = STRATEGIES.map(s => s.id)
      setSelectedStrategies(allStrategyIds)
      setSelectAllFolders(true)
    }
  }, [selectAllFolders, STRATEGIES])

  // Verificar se todas as estratégias da categoria estão selecionadas (memoizada)
  const areAllFoldersSelected = useCallback(() => {
    if (STRATEGIES.length === 0) return false
    const allStrategyIds = STRATEGIES.map(s => s.id)
    return allStrategyIds.every(id => selectedStrategies.includes(id))
  }, [STRATEGIES, selectedStrategies])

  // Atualizar o estado selectAllFolders quando as seleções mudarem (com debounce implícito)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectAllFolders(areAllFoldersSelected())
    }, 100) // Pequeno debounce para evitar muitas atualizações
    
    return () => clearTimeout(timer)
  }, [selectedStrategies, chipCategory, areAllFoldersSelected])

  const removeNumber = (indexToRemove: number) => {
    setNumbers(prev => prev.filter((_, index) => index !== indexToRemove))
  }

  const clearNumbers = () => {
    setNumbers([])
    setNumberStatuses([])
    initializeStrategies()
  }

  // Sincronizar números do WebSocket com o estado local
  // OTIMIZAÇÃO: Usar useMemo para evitar conversões desnecessárias
  const numbersFromWebSocket = useMemo(() => {
    if (recentNumbers.length === 0) return []
    const converted = recentNumbers.map(rn => rn.number)
    console.log(`\n🔄 [CONVERSÃO v${updateVersion}] recentNumbers mudou!`)
    console.log(`   Length: ${recentNumbers.length}`)
    console.log(`   Números: [${converted.slice(0, 10).join(', ')}...]`)
    console.log(`   Timestamps: [${recentNumbers.slice(0, 3).map(n => new Date(n.timestamp).toLocaleTimeString()).join(', ')}...]`)
    return converted
  }, [recentNumbers, updateVersion]) // Adicionar updateVersion como dependência

  useEffect(() => {
    console.log(`\n🌐 [SYNC v${updateVersion}] useEffect disparado!`)
    console.log(`   numbersFromWebSocket.length: ${numbersFromWebSocket.length}`)
    console.log(`   selectedRoulette: ${selectedRoulette}`)
    
    if (numbersFromWebSocket.length > 0) {
      console.log(`   ✅ Atualizando estado 'numbers'`)
      console.log(`   ANTES - numbers.length: ${numbers.length}`)
      console.log(`   Primeiros 10: [${numbersFromWebSocket.slice(0, 10).join(', ')}]`)
      setNumbers(numbersFromWebSocket)
      console.log(`   DEPOIS - setNumbers chamado\n`)
    } else {
      console.log(`   ⚠️ numbersFromWebSocket vazio, não atualizando\n`)
    }
  }, [numbersFromWebSocket, selectedRoulette, updateVersion])

  // Selecionar automaticamente a primeira roleta disponível
  useEffect(() => {
    if (isConnected && availableRoulettes.length > 0 && !selectedRoulette) {
      // Tentar selecionar pragmatic-speed-auto-roulette primeiro (é a mais estável)
      const preferredRoulette = availableRoulettes.find(r => r.id === 'pragmatic-speed-auto-roulette')
      const rouletteToSelect = preferredRoulette || availableRoulettes[0]
      
      console.log('🎰 Selecionando roleta automaticamente:', rouletteToSelect)
      console.log('   Preferida (pragmatic)? ', !!preferredRoulette)
      console.log('   Total disponível:', availableRoulettes.length)
      
      selectRoulette(rouletteToSelect.id) // Usar selectRoulette do hook
      
      // Enviar mensagem de inscrição
      sendMessage(JSON.stringify({
        type: 'subscribe',
        roulette: rouletteToSelect.id,
        limit: 500
      }))
    }
  }, [isConnected, availableRoulettes, selectedRoulette, sendMessage, selectRoulette])

  // Handler para mudança manual de roleta pelo usuário
  const handleRouletteChange = useCallback((roulette: string) => {
    console.log(`📱 [handleRouletteChange] CHAMADO com: "${roulette}"`)
    console.log(`   selectedRoulette atual: "${selectedRoulette}"`)
    
    if (!roulette || roulette === selectedRoulette) {
      console.log(`   ⏭️ Ignorando (vazio ou já selecionada)`)
      return
    }
    
    console.log('🎰 Mudança de roleta:', selectedRoulette, '→', roulette)
    selectRoulette(roulette) // Usar selectRoulette do hook
    
    // Enviar mensagem de inscrição na nova roleta
    if (isConnected) {
      sendMessage(JSON.stringify({
        type: 'subscribe',
        roulette: roulette,
        limit: 500
      }))
    }
  }, [selectedRoulette, isConnected, sendMessage, selectRoulette])

  // Obter informações da roleta selecionada
  const selectedRouletteInfo = useMemo(() => {
    return availableRoulettes.find(r => r.id === selectedRoulette)
  }, [availableRoulettes, selectedRoulette])

  const analyzeStrategy = (strategyId: number, numbersArray: number[]) => {
    const strategy = STRATEGIES.find(s => s.id === strategyId)
    if (!strategy) return null

    // Import getStrategyNumbers para suportar estratégias dinâmicas
    const { getStrategyNumbers } = require('@/lib/strategies')
    const allNumbers = getStrategyNumbers(strategyId, numbersArray)
    
    const activations: Array<{position: number, activatingNumber: number, result: 'GREEN' | 'RED', attempts: number}> = []
    
    let totalGreen = 0
    let totalRed = 0
    let currentGreenSequence = 0
    let currentRedSequence = 0
    let maxGreenSequence = 0
    let maxRedSequence = 0
    let firstAttemptHits = 0
    let secondAttemptHits = 0
    let thirdAttemptHits = 0
    
    // Novas métricas
    let maxConsecutiveGreens = 0
    let maxConsecutiveReds = 0
    let currentConsecutiveGreens = 0
    let currentConsecutiveReds = 0
    let postGreenWins = 0
    let postRedWins = 0
    let lastResult: 'GREEN' | 'RED' | null = null
    
    const activationCounts: {[key: number]: number} = {}
    
    // CORREÇÃO: Inverter array para processar do mais antigo para o mais recente
    // Array original: [RECENTE → ANTIGO], precisamos: [ANTIGO → RECENTE]
    const reversedArray = [...numbersArray].reverse()
    
    // Processa do índice 0 até o final (agora do mais antigo para o mais recente)
    let i = 0
    while (i < reversedArray.length) {
      const currentNum = reversedArray[i]
      
      // Verifica se é um número da estratégia (ativação)
      if (allNumbers.includes(currentNum)) {
        activationCounts[currentNum] = (activationCounts[currentNum] || 0) + 1
        
        // Procura por GREEN nas próximas 3 posições
        let foundGreen = false
        let attemptsCount = 0
        let greenIndex = -1
        
        // Verifica as próximas N posições (configurável: 1, 2, 3, 4, 5 ou 6)
        for (let j = 1; j <= greenRedAttempts; j++) {
          const checkIndex = i + j
          if (checkIndex >= reversedArray.length) break // Fim do array
          
          attemptsCount = j
          if (allNumbers.includes(reversedArray[checkIndex])) {
            // GREEN encontrado!
            foundGreen = true
            greenIndex = checkIndex
            break
          }
        }
        
        if (foundGreen) {
          // GREEN: acertou dentro das N tentativas configuradas
          totalGreen++
          currentGreenSequence++
          currentRedSequence = 0
          maxGreenSequence = Math.max(maxGreenSequence, currentGreenSequence)
          
          // Atualizar sequências consecutivas
          currentConsecutiveGreens++
          currentConsecutiveReds = 0
          maxConsecutiveGreens = Math.max(maxConsecutiveGreens, currentConsecutiveGreens)
          
          // Verificar padrão de entrada (pós-GREEN ou pós-RED)
          if (lastResult === 'GREEN') {
            postGreenWins++
          } else if (lastResult === 'RED') {
            postRedWins++
          }
          lastResult = 'GREEN'
          
          // Contar em qual tentativa acertou
          if (attemptsCount === 1) firstAttemptHits++
          else if (attemptsCount === 2) secondAttemptHits++
          else if (attemptsCount === 3) thirdAttemptHits++
          
          activations.push({
            position: i,
            activatingNumber: currentNum,
            result: 'GREEN',
            attempts: attemptsCount
          })
          
          // Continua após o GREEN
          i = greenIndex + 1
        } else {
          // RED: não encontrou nas N tentativas configuradas (ou chegou no fim do array)
          totalRed++
          currentRedSequence++
          currentGreenSequence = 0
          maxRedSequence = Math.max(maxRedSequence, currentRedSequence)
          
          // Atualizar sequências consecutivas
          currentConsecutiveReds++
          currentConsecutiveGreens = 0
          maxConsecutiveReds = Math.max(maxConsecutiveReds, currentConsecutiveReds)
          
          lastResult = 'RED'
          
          activations.push({
            position: i,
            activatingNumber: currentNum,
            result: 'RED',
            attempts: Math.min(greenRedAttempts, reversedArray.length - i - 1)
          })
          
          // Continua após as N tentativas configuradas
          i = i + greenRedAttempts + 1
        }
      } else {
        // Não é número da estratégia, continua
        i++
      }
    }
    
    const mostActivatingNumber = Object.keys(activationCounts).reduce((a, b) => 
      activationCounts[parseInt(a)] > activationCounts[parseInt(b)] ? a : b, '0')
    
    // Determinar melhor padrão de entrada
    let bestEntryPattern: 'post-green' | 'post-red' | 'neutral' = 'neutral'
    if (postGreenWins > postRedWins && postGreenWins > 0) {
      bestEntryPattern = 'post-green'
    } else if (postRedWins > postGreenWins && postRedWins > 0) {
      bestEntryPattern = 'post-red'
    }
    
    return {
      totalGreen,
      totalRed,
      maxGreenSequence,
      maxRedSequence,
      firstAttemptHits,
      secondAttemptHits,
      thirdAttemptHits,
      mostActivatingNumber: parseInt(mostActivatingNumber) || 0,
      mostActivatingCount: activationCounts[parseInt(mostActivatingNumber)] || 0,
      activations: activations.length,
      maxConsecutiveGreens,
      maxConsecutiveReds,
      bestEntryPattern,
      postGreenWins,
      postRedWins
    }
  }

  const calculateAllStrategies = () => {
    const updatedStats = STRATEGIES.map(strategy => {
      const analysis = analyzeStrategy(strategy.id, numbersToAnalyze)
      const profit = analysis ? analysis.totalGreen - analysis.totalRed : 0
      return {
        id: strategy.id,
        name: strategy.name,
        totalGreen: analysis?.totalGreen || 0,
        totalRed: analysis?.totalRed || 0,
        maxGreenSequence: analysis?.maxGreenSequence || 0,
        maxRedSequence: analysis?.maxRedSequence || 0,
        firstAttemptHits: analysis?.firstAttemptHits || 0,
        secondAttemptHits: analysis?.secondAttemptHits || 0,
        thirdAttemptHits: analysis?.thirdAttemptHits || 0,
        mostActivatingNumber: analysis?.mostActivatingNumber || 0,
        mostActivatingCount: analysis?.mostActivatingCount || 0,
        activations: analysis?.activations || 0,
        profit,
        // Novas métricas
        maxConsecutiveGreens: analysis?.maxConsecutiveGreens || 0,
        maxConsecutiveReds: analysis?.maxConsecutiveReds || 0,
        bestEntryPattern: analysis?.bestEntryPattern || 'neutral',
        postGreenWins: analysis?.postGreenWins || 0,
        postRedWins: analysis?.postRedWins || 0
      }
    }).sort((a, b) => b.profit - a.profit)

    setStrategyStats(updatedStats)
  }

  const updateNumberStatuses = () => {
    // Se nenhuma estratégia selecionada, todos os números ficam NEUTROS (cinza)
    if (selectedStrategies.length === 0) {
      const statuses: NumberStatus[] = numbersToAnalyze.map(number => ({ number, status: 'NEUTRAL' as const }))
      setNumberStatuses(statuses)
      return
    }
    
    // Pegar a ÚLTIMA estratégia selecionada (última do array)
    const lastSelectedId = selectedStrategies[selectedStrategies.length - 1]
    const strategy = STRATEGIES.find(s => s.id === lastSelectedId)
    if (!strategy) {
      // Se não encontrou a estratégia, deixa tudo neutro
      const statuses: NumberStatus[] = numbersToAnalyze.map(number => ({ number, status: 'NEUTRAL' as const }))
      setNumberStatuses(statuses)
      return
    }

    // Import getStrategyNumbers para suportar estratégias dinâmicas
    const { getStrategyNumbers } = require('@/lib/strategies')
    const allNumbers = getStrategyNumbers(lastSelectedId, numbersToAnalyze)

    // Inicializa todos os status como NEUTRAL
    const statuses: NumberStatus[] = numbersToAnalyze.map(number => ({ number, status: 'NEUTRAL' as const }))
    
    // CORREÇÃO: Inverter array para processar do mais antigo para o mais recente
    // Array original: [RECENTE → ANTIGO], precisamos: [ANTIGO → RECENTE]
    const reversedArray = [...numbersToAnalyze].reverse()
    
    // Processa do índice 0 até o final (agora do mais antigo para o mais recente)
    let i = 0
    while (i < reversedArray.length) {
      const currentNum = reversedArray[i]
      
      // Verifica se é um número da estratégia (ativação)
      if (allNumbers.includes(currentNum)) {
        // CORREÇÃO: Calcular índice original (não invertido) para marcar status correto
        const originalIndex = reversedArray.length - 1 - i
        
        // Marca como ACTIVATION (amarelo)
        statuses[originalIndex] = { number: currentNum, status: 'ACTIVATION' }
        
        // Procura por GREEN nas próximas N posições (configurável: 1, 2, 3, 4, 5 ou 6)
        let foundGreen = false
        let greenIndex = -1
        
        // Verifica as próximas N posições
        for (let j = 1; j <= greenRedAttempts; j++) {
          const checkIndex = i + j
          if (checkIndex >= reversedArray.length) break // Fim do array
          
          if (allNumbers.includes(reversedArray[checkIndex])) {
            // GREEN encontrado!
            foundGreen = true
            greenIndex = checkIndex
            break
          }
        }
        
        if (foundGreen) {
          // GREEN: marca o número GREEN
          const originalGreenIndex = reversedArray.length - 1 - greenIndex
          statuses[originalGreenIndex] = { number: reversedArray[greenIndex], status: 'GREEN' }
          // Continua após o GREEN
          i = greenIndex + 1
        } else {
          // RED: NÃO marca nenhum número como RED na pintura
          // (A análise conta o RED, mas visualmente não marcamos nenhum número específico)
          // Apenas pula as próximas N tentativas configuradas
          i = i + greenRedAttempts + 1
        }
      } else {
        // Não é número da estratégia, continua
        i++
      }
    }
    
    setNumberStatuses(statuses)
  }

  const getNumberColor = (number: number, index: number) => {
    const status = numberStatuses[index]?.status || 'NEUTRAL'
    
    switch (status) {
      case 'ACTIVATION':
        return 'bg-yellow-500 text-black'
      case 'GREEN':
        return 'bg-green-500 text-white'
      case 'RED':
        return 'bg-red-500 text-white'
      default:
        return 'bg-gray-700 text-gray-300'
    }
  }

  // CORREÇÃO: Pegar a ÚLTIMA estratégia selecionada para dashboard e cores
  // Determinar qual estratégia mostrar no resumo/tabela
  // Se "All Pastas" ativo: melhor estratégia por desempenho
  // Se seleção manual: última selecionada
  const getActiveStrategyId = () => {
    if (selectedStrategies.length === 0) return null
    
    if (selectAllFolders) {
      // "All Pastas" ativo: retornar a melhor estratégia por desempenho
      const bestStrategy = strategyStats
        .filter(s => selectedStrategies.includes(s.id))
        .sort((a, b) => {
          const perfA = a.activations > 0 ? (a.totalGreen / a.activations) : 0
          const perfB = b.activations > 0 ? (b.totalGreen / b.activations) : 0
          
          if (perfB === perfA) {
            return b.profit - a.profit
          }
          
          return perfB - perfA
        })[0]
      
      return bestStrategy?.id || selectedStrategies[selectedStrategies.length - 1]
    }
    
    // Seleção manual: última selecionada
    return selectedStrategies[selectedStrategies.length - 1]
  }

  const lastSelectedStrategyId = getActiveStrategyId()
  
  const lastSelectedStrategy = lastSelectedStrategyId 
    ? STRATEGIES.find(s => s.id === lastSelectedStrategyId) 
    : null
  
  const lastSelectedStrategyStats = lastSelectedStrategyId 
    ? strategyStats.find(s => s.id === lastSelectedStrategyId) 
    : null

  // Calcular números da estratégia dinamicamente (para estratégias dinâmicas como Terminais Cruzados)
  const currentStrategyNumbers = useMemo(() => {
    if (!lastSelectedStrategy) return []
    
    // Import getStrategyNumbers
    const { getStrategyNumbers } = require('@/lib/strategies')
    return getStrategyNumbers(lastSelectedStrategy.id, numbersToAnalyze)
  }, [lastSelectedStrategy, numbersToAnalyze])

  // NOVA ANÁLISE: Calcular intervalos entre acertos da estratégia
  const intervalAnalysis = useMemo(() => {
    if (!lastSelectedStrategy || numbersToAnalyze.length === 0 || currentStrategyNumbers.length === 0) {
      return {
        intervals: [],
        frequencyMap: new Map<string, number>(),
        totalIntervals: 0
      }
    }

    const strategyNumbersSet = new Set(currentStrategyNumbers)
    const intervals: number[] = []
    let currentInterval = 0
    let hasFoundFirstHit = false

    // Percorrer os números do mais antigo para o mais recente (inverter array)
    const numbersReversed = [...numbersToAnalyze].reverse()

    for (const num of numbersReversed) {
      if (strategyNumbersSet.has(num)) {
        // Encontrou um acerto
        if (hasFoundFirstHit) {
          // Só registrar intervalo após o primeiro acerto
          intervals.push(currentInterval)
        }
        hasFoundFirstHit = true
        currentInterval = 0
      } else {
        // Não é um número da estratégia
        if (hasFoundFirstHit) {
          currentInterval++
        }
      }
    }

    // Criar mapa de frequência
    const frequencyMap = new Map<string, number>()
    
    intervals.forEach(interval => {
      const key = interval > 10 ? 'Mais de 10' : interval.toString()
      frequencyMap.set(key, (frequencyMap.get(key) || 0) + 1)
    })

    return {
      intervals,
      frequencyMap,
      totalIntervals: intervals.length
    }
  }, [lastSelectedStrategy, numbersToAnalyze, currentStrategyNumbers])

  // Memoizar estratégias selecionadas ordenadas por desempenho (OTIMIZAÇÃO)
  const sortedSelectedStrategies = useMemo(() => {
    // Limitar a 50 estratégias por vez para evitar travamento
    const MAX_DISPLAY = 50
    
    const strategies = selectedStrategies
      .map(strategyId => strategyStats.find(s => s.id === strategyId))
      .filter((s): s is NonNullable<typeof s> => Boolean(s)) // Type guard
      .sort((a, b) => {
        // Ordenar por taxa de aproveitamento (GREEN / ATIVAÇÕES)
        const perfA = a.activations > 0 ? (a.totalGreen / a.activations) : 0
        const perfB = b.activations > 0 ? (b.totalGreen / b.activations) : 0
        
        // Em caso de empate, usar profit como desempate
        if (Math.abs(perfB - perfA) < 0.0001) { // Comparação com tolerância
          return b.profit - a.profit
        }
        
        return perfB - perfA // Melhor desempenho primeiro
      })
    
    // Debug log para verificar ordenação
    if (strategies.length > 0) {
      console.log('🔄 Estratégias ordenadas:', strategies.slice(0, 5).map(s => ({
        nome: s.name,
        profit: s.profit,
        taxa: s.activations > 0 ? (s.totalGreen / s.activations).toFixed(2) : '0'
      })))
    }
    
    // Retornar apenas as primeiras 50 para performance
    return {
      displayed: strategies.slice(0, MAX_DISPLAY),
      total: strategies.length,
      hasMore: strategies.length > MAX_DISPLAY
    }
  }, [selectedStrategies, strategyStats])

  // Mostrar loading enquanto verifica autenticação
  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header 
        user={user} 
        onLogout={handleLogout} 
        onEditProfile={() => setShowProfileEdit(true)} 
      />
      
      {/* Layout Mobile/Tablet - Tela cheia para números */}
      <div className="lg:hidden">
        {/* Seletor de Roleta - Mobile */}
        <div className="p-3 bg-gray-800 border-b border-gray-700">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-2">
              🎰 Roleta ao Vivo
              {isConnected ? (
                <span className="text-green-500 text-xs">● Conectado</span>
              ) : (
                <span className="text-red-500 text-xs">● Desconectado</span>
              )}
            </label>
            <Select 
              key={`roulette-select-${isConnected}-${availableRoulettes.length}`}
              value={selectedRoulette} 
              onValueChange={handleRouletteChange}
              disabled={!isConnected || availableRoulettes.length === 0}
            >
              <SelectTrigger className="w-full h-10 bg-gray-700 border-gray-600 text-white text-sm">
                <SelectValue>
                  {selectedRouletteInfo ? (
                    <div className="flex items-center gap-2">
                      <span>🎰 {selectedRouletteInfo.name}</span>
                      {selectedRouletteInfo.provider && (
                        <span className="text-xs text-gray-400">
                          ({selectedRouletteInfo.provider})
                        </span>
                      )}
                    </div>
                  ) : (
                    !isConnected 
                      ? "Aguardando conexão..." 
                      : availableRoulettes.length === 0 
                        ? "Nenhuma roleta disponível" 
                        : "Selecione uma roleta"
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {availableRoulettes.map((rouletteInfo) => (
                  <SelectItem 
                    key={rouletteInfo.id} 
                    value={rouletteInfo.id} 
                    className="text-white hover:bg-gray-600 focus:bg-gray-600"
                  >
                    <div className="flex items-center gap-2">
                      🎰 <span className="font-medium">{rouletteInfo.name}</span>
                      {rouletteInfo.provider && (
                        <span className="text-xs text-gray-400 ml-2">
                          ({rouletteInfo.provider})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Seletor de Limite de Análise - Mobile */}
        <div className="p-3 bg-gray-800 border-b border-gray-700">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              📊 Analisar últimos
            </label>
            <Select 
              value={analysisLimit.toString()} 
              onValueChange={(value) => setAnalysisLimit(Number(value))}
            >
              <SelectTrigger className="w-full h-10 bg-gray-700 border-gray-600 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="50" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                  50 números
                </SelectItem>
                <SelectItem value="100" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                  100 números
                </SelectItem>
                <SelectItem value="200" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                  200 números
                </SelectItem>
                <SelectItem value="300" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                  300 números
                </SelectItem>
                <SelectItem value="400" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                  400 números
                </SelectItem>
                <SelectItem value="500" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                  500 números
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Analisando {numbersToAnalyze.length} de {numbers.length} números disponíveis
            </p>
          </div>
        </div>

        {/* Seletor de Casas GREEN/RED - Mobile */}
        <div className="p-3 bg-gray-800 border-b border-gray-700">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              🎯 Casas para GREEN/RED
            </label>
            <Select 
              value={greenRedAttempts.toString()} 
              onValueChange={(value) => setGreenRedAttempts(Number(value))}
            >
              <SelectTrigger className="w-full h-10 bg-gray-700 border-gray-600 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="1" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                  1 casa
                </SelectItem>
                <SelectItem value="2" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                  2 casas
                </SelectItem>
                <SelectItem value="3" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                  3 casas
                </SelectItem>
                <SelectItem value="4" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                  4 casas
                </SelectItem>
                <SelectItem value="5" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                  5 casas
                </SelectItem>
                <SelectItem value="6" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                  6 casas
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Analisando {greenRedAttempts} casas após ativação
            </p>
          </div>
        </div>

        {/* Botões de controle mobile */}
        <div className="bg-gray-800 border-b border-gray-700">
          {/* Linha de botões */}
          <div className="flex justify-between items-stretch gap-2 p-3">
            <Button
              onClick={() => setShowStrategiesMenu(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 h-auto min-h-[44px]"
            >
              <Menu className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">Estratégias</span>
            </Button>
            
            <Button
              onClick={() => {
                // Ciclar entre as 3 categorias: até 9 → +9 → todas → até 9
                const nextCategory = 
                  chipCategory === 'up-to-9' ? 'more-than-9' :
                  chipCategory === 'more-than-9' ? 'all' :
                  'up-to-9'
                setChipCategory(nextCategory)
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 h-auto min-h-[44px] ${
                chipCategory === 'up-to-9' 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : chipCategory === 'more-than-9'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Layers className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">{chipCategory === 'up-to-9' ? 'Até 9' : chipCategory === 'more-than-9' ? '+9' : 'Todas'}</span>
            </Button>
            
            <Button
              onClick={() => setShowMetricsPanel(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 px-3 py-2 h-auto min-h-[44px]"
            >
              <BarChart3 className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">Métricas</span>
            </Button>
          </div>
          
          {/* Nome da estratégia selecionada */}
          <div className="px-3 pb-3 pt-0">
            {lastSelectedStrategy ? (
              <div className="bg-gray-700 rounded-lg px-3 py-2 border border-gray-600">
                <p className="text-blue-400 font-medium truncate text-sm leading-tight" title={lastSelectedStrategy.name}>
                  {lastSelectedStrategy.name}
                </p>
                {selectedStrategies.length > 1 && (
                  <p className="text-xs text-gray-400 mt-1">
                    +{selectedStrategies.length - 1} outra{selectedStrategies.length > 2 ? 's' : ''} selecionada{selectedStrategies.length > 2 ? 's' : ''}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-gray-700 rounded-lg px-3 py-2 border border-gray-600">
                <p className="text-gray-400 text-sm text-center leading-tight">Nenhuma estratégia selecionada</p>
              </div>
            )}
          </div>
        </div>

        {/* Exibição dos números da estratégia selecionada - mobile */}
        <div className="p-3 bg-gray-800 border-b border-gray-700">
          {lastSelectedStrategy ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  📋 Números da Estratégia
                </label>
                <Badge variant="outline" className="bg-blue-600/20 text-blue-400 border-blue-500/50 text-xs">
                  {currentStrategyNumbers.length} números
                </Badge>
              </div>
              <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                <p className="text-sm text-white font-mono leading-relaxed">
                  {currentStrategyNumbers.join(', ')}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {lastSelectedStrategy.name}
                </p>
                <Button 
                  onClick={clearNumbers}
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Limpar
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 text-center">
              <p className="text-sm text-gray-400">
                Selecione uma estratégia para ver os números
              </p>
            </div>
          )}
        </div>

        {/* Grid de números - tela cheia mobile */}
        <div className="flex-1 p-3 min-h-[calc(100vh-240px)] overflow-y-auto">
          {numbersToAnalyze.length > 0 ? (
            <div className="flex justify-center">
              <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2 justify-items-center w-full max-w-4xl">
                {numbersToAnalyze.map((number, index) => {
                  return (
                    <div
                      key={index}
                      className={`relative group w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-base sm:text-lg md:text-xl flex items-center justify-center rounded-lg font-bold ${getNumberColor(number, index)} transition-all duration-200 hover:scale-110`}
                    >
                      {number}
                      <button
                        onClick={() => removeNumber(numbers.indexOf(number))}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg z-10"
                        title="Remover este número"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <Target className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-lg font-semibold mb-2 text-gray-400">
                  {numbers.length > 0 
                    ? `Ajuste o limite de análise (${analysisLimit} números)` 
                    : "Aguardando números da roleta"}
                </h3>
                <p className="text-gray-500">
                  {numbers.length > 0 
                    ? `${numbers.length} números disponíveis` 
                    : "Os números aparecerão aqui automaticamente"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Menu lateral de estratégias - mobile */}
        {showStrategiesMenu && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
            <div className="fixed left-0 top-0 h-full w-80 bg-gray-800 border-r border-gray-700 transform transition-transform duration-300">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Estratégias COR</h2>
                <Button
                  onClick={() => setShowStrategiesMenu(false)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Botão All Pastas - Mobile */}
              <div className="p-3 border-b border-gray-700">
                <Button
                  onClick={toggleSelectAllFolders}
                  className={`w-full py-2.5 text-sm font-semibold transition-all ${
                    selectAllFolders
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 ring-2 ring-green-400 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {selectAllFolders ? '✓ All Pastas' : '📁 All Pastas'}
                </Button>
                <p className="text-xs text-gray-500 mt-1.5 text-center">
                  {selectAllFolders 
                    ? `${selectedStrategies.length} selecionadas` 
                    : `${STRATEGIES.length} estratégias disponíveis`
                  }
                </p>
              </div>
              
              <ScrollArea className="h-[calc(100vh-220px)] pb-20">
                <div className="p-4 space-y-2 pb-8">
                  {/* Listar TODAS as estratégias individuais, ordenadas por desempenho - MOBILE */}
                  {FOLDERS
                    .flatMap(folder => 
                      folder.strategies.map(strategy => ({
                        strategy,
                        folderName: folder.name,
                        stats: strategyStats.find(s => s.id === strategy.id)
                      }))
                    )
                    .sort((a, b) => {
                      // Ordenar por profit (melhor desempenho primeiro)
                      const profitA = a.stats?.profit ?? 0
                      const profitB = b.stats?.profit ?? 0
                      return profitB - profitA
                    })
                    .map(({ strategy, folderName, stats }) => {
                      const isSelected = isStrategySelected(strategy.id)
                      return (
                        <button
                          key={strategy.id}
                          onClick={() => toggleStrategy(strategy.id)}
                          className={`w-full p-3 rounded-lg text-left transition-all duration-300 flex items-start gap-2 ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-lg border border-blue-500'
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                            isSelected ? 'bg-white border-white' : 'border-gray-400'
                          }`}>
                            {isSelected && <span className="text-blue-600 font-bold text-sm">✓</span>}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm mb-1">{strategy.name}</div>
                            <div className="text-[10px] text-gray-400 mb-1">📁 {folderName}</div>
                            {stats && (
                              <div className="flex justify-between items-center text-xs">
                                <div className="flex gap-3">
                                  <span className="text-green-400 font-medium">G: {stats.totalGreen}</span>
                                  <span className="text-red-400 font-medium">R: {stats.totalRed}</span>
                                </div>
                                <div className={`font-bold ${stats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {stats.profit >= 0 ? '+' : ''}{stats.profit}
                                </div>
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })
                  }
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Painel de métricas - mobile */}
        {showMetricsPanel && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
            <div className="fixed right-0 top-0 h-full w-80 bg-gray-800 border-l border-gray-700 transform transition-transform duration-300">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-white">Dashboard</h2>
                  {lastSelectedStrategy && (
                    <p className="text-xs text-blue-400 truncate mt-1" title={lastSelectedStrategy.name}>
                      {lastSelectedStrategy.name}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => setShowMetricsPanel(false)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white ml-2 flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {lastSelectedStrategyStats && numbers.length > 0 ? (
                <ScrollArea className="h-[calc(100vh-100px)] pb-20">
                  <div className="p-4 space-y-4 pb-8">
                    {/* Resumo Geral */}
                    <Card className="bg-gray-700 border-gray-600">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-gray-300 flex items-center gap-2">
                          <BarChart3 className="w-5 h-5" />
                          Resumo
                        </CardTitle>
                        <p className="text-xs text-gray-400 mt-2 truncate" title={lastSelectedStrategy?.name}>
                          {lastSelectedStrategy?.name}
                        </p>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="text-center p-3 bg-gray-800 rounded-lg">
                            <div className="text-xl font-bold text-green-400">
                              {lastSelectedStrategyStats.totalGreen}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">GREEN</div>
                          </div>
                          <div className="text-center p-3 bg-gray-800 rounded-lg">
                            <div className="text-xl font-bold text-red-400">
                              {lastSelectedStrategyStats.totalRed}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">RED</div>
                          </div>
                        </div>
                        <div className="text-center p-3 bg-gray-800 rounded-lg">
                          <div className={`text-2xl font-bold ${lastSelectedStrategyStats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {lastSelectedStrategyStats.profit >= 0 ? '+' : ''}{lastSelectedStrategyStats.profit}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">APROVEITAMENTO</div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* NOVAS MÉTRICAS: Sequências e Padrão de Entrada */}
                    <Card className="bg-gray-700 border-gray-600">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-gray-300 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          Padrões de Entrada
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {/* Maior sequência de GREEN */}
                        <div className="p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">🟢 Sequência GREEN</span>
                            <span className="text-lg font-bold text-green-400">
                              {lastSelectedStrategyStats.maxConsecutiveGreens}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Maior sequência de GREEN seguidos
                          </p>
                        </div>

                        {/* Maior sequência de RED */}
                        <div className="p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">🔴 Sequência RED</span>
                            <span className="text-lg font-bold text-red-400">
                              {lastSelectedStrategyStats.maxConsecutiveReds}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Maior sequência de RED seguidos
                          </p>
                        </div>

                        {/* Melhor entrada: Pós-GREEN ou Pós-RED */}
                        <div className={`p-3 rounded-lg ${
                          lastSelectedStrategyStats.bestEntryPattern === 'post-green' 
                            ? 'bg-green-900/30 border border-green-600/30' 
                            : lastSelectedStrategyStats.bestEntryPattern === 'post-red'
                            ? 'bg-red-900/30 border border-red-600/30'
                            : 'bg-gray-800'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-300">
                              ✨ Melhor Entrada
                            </span>
                            <span className={`text-sm font-bold ${
                              lastSelectedStrategyStats.bestEntryPattern === 'post-green'
                                ? 'text-green-400'
                                : lastSelectedStrategyStats.bestEntryPattern === 'post-red'
                                ? 'text-red-400'
                                : 'text-gray-400'
                            }`}>
                              {lastSelectedStrategyStats.bestEntryPattern === 'post-green' 
                                ? '🟢 PÓS-GREEN' 
                                : lastSelectedStrategyStats.bestEntryPattern === 'post-red'
                                ? '🔴 PÓS-RED'
                                : '⚪ SEM PADRÃO'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-center p-2 bg-gray-900/50 rounded">
                              <div className="text-green-400 font-bold">
                                {lastSelectedStrategyStats.postGreenWins}
                              </div>
                              <div className="text-gray-500">Pós-GREEN</div>
                            </div>
                            <div className="text-center p-2 bg-gray-900/50 rounded">
                              <div className="text-red-400 font-bold">
                                {lastSelectedStrategyStats.postRedWins}
                              </div>
                              <div className="text-gray-500">Pós-RED</div>
                            </div>
                          </div>
                          {lastSelectedStrategyStats.bestEntryPattern !== 'neutral' && (
                            <p className="text-xs text-gray-400 mt-2">
                              💡 {lastSelectedStrategyStats.bestEntryPattern === 'post-green' 
                                ? 'Entrar após um GREEN tem melhor taxa de acerto'
                                : 'Entrar após um RED tem melhor taxa de acerto'}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Tabela de Números Quentes e Frios */}
                    {lastSelectedStrategy && numbers.length > 0 && (
                      <Card className="bg-gray-700 border-gray-600 shadow-enhanced">
                        <CardHeader className="pb-3 pt-3 px-4">
                          <CardTitle className="text-sm text-gray-300">🔥 Números Quentes & ❄️ Frios</CardTitle>
                          <p className="text-xs text-gray-500 mt-1">Baseado na estratégia: {lastSelectedStrategy.name}</p>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3 px-4">
                          {(() => {
                            // Obter números da estratégia dinamicamente
                            const strategyNumbers = currentStrategyNumbers
                            
                            // Contar aparições de cada número da estratégia
                            const numberCounts = strategyNumbers.map((num: number) => ({
                              number: num,
                              count: numbers.filter((n: number) => n === num).length
                            }))
                            
                            // Separar em Quentes (que apareceram) e Frios (que não apareceram)
                            const hotNumbers = numberCounts
                              .filter((nc: { number: number; count: number }) => nc.count > 0)
                              .sort((a: { count: number }, b: { count: number }) => b.count - a.count) // Mais apareceram primeiro
                            
                            const coldNumbers = numberCounts
                              .filter((nc: { number: number; count: number }) => nc.count === 0)
                              .map((nc: { number: number; count: number }) => nc.number)
                              .sort((a: number, b: number) => a - b) // Ordem crescente
                            
                            return (
                              <div className="space-y-3">
                                {/* Números Quentes */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="text-xs font-semibold text-orange-400">🔥 QUENTES</div>
                                    <div className="text-xs text-gray-500">({hotNumbers.length})</div>
                                  </div>
                                  {hotNumbers.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {hotNumbers.map(({ number, count }: { number: number; count: number }) => (
                                        <div 
                                          key={number}
                                          className="relative inline-flex items-center justify-center"
                                        >
                                          <div className="w-8 h-8 rounded-md bg-orange-600 text-white font-bold text-xs flex items-center justify-center border border-orange-400">
                                            {number}
                                          </div>
                                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border border-gray-900">
                                            {count}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-500 italic">Nenhum número da estratégia apareceu ainda</p>
                                  )}
                                </div>
                                
                                {/* Números Frios */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="text-xs font-semibold text-cyan-400">❄️ FRIOS</div>
                                    <div className="text-xs text-gray-500">({coldNumbers.length})</div>
                                  </div>
                                  {coldNumbers.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {coldNumbers.map((number: number) => (
                                        <div 
                                          key={number}
                                          className="w-8 h-8 rounded-md bg-cyan-700 text-white font-bold text-xs flex items-center justify-center border border-cyan-500"
                                        >
                                          {number}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-500 italic">Todos os números da estratégia já apareceram!</p>
                                  )}
                                </div>
                              </div>
                            )
                          })()}
                        </CardContent>
                      </Card>
                    )}

                    {/* NOVA ANÁLISE: Intervalos entre Acertos - MOBILE */}
                    {lastSelectedStrategy && numbers.length > 0 && intervalAnalysis.totalIntervals > 0 && (
                      <Card className="bg-gray-700 border-gray-600 shadow-enhanced">
                        <CardHeader className="pb-3 pt-3 px-4">
                          <CardTitle className="text-sm text-gray-300">📊 Análise de Intervalos</CardTitle>
                          <p className="text-xs text-gray-500 mt-1">
                            Casas entre acertos: {lastSelectedStrategy.name}
                          </p>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3 px-4">
                          <div className="space-y-3">
                            {/* Tabela de Frequências */}
                            <div>
                              <div className="text-xs font-semibold text-blue-400 mb-2">
                                📈 Frequência ({intervalAnalysis.totalIntervals} registros)
                              </div>
                              <div className="space-y-1.5">
                                {Array.from({ length: 10 }, (_, i) => i + 1).map(interval => {
                                  const count = intervalAnalysis.frequencyMap.get(interval.toString()) || 0
                                  const percentage = intervalAnalysis.totalIntervals > 0 
                                    ? ((count / intervalAnalysis.totalIntervals) * 100).toFixed(1)
                                    : '0.0'
                                  
                                  return (
                                    <div 
                                      key={interval}
                                      className="flex items-center justify-between p-2 bg-gray-800 rounded text-xs"
                                    >
                                      <span className="text-gray-300">
                                        {interval} casa{interval > 1 ? 's' : ''}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <div className="w-16 bg-gray-700 rounded-full h-2">
                                          <div 
                                            className="bg-blue-500 h-2 rounded-full transition-all"
                                            style={{ width: `${percentage}%` }}
                                          />
                                        </div>
                                        <span className="text-blue-400 font-bold w-14 text-right text-[10px]">
                                          {count}x ({percentage}%)
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                                
                                {/* Mais de 10 casas */}
                                {(() => {
                                  const count = intervalAnalysis.frequencyMap.get('Mais de 10') || 0
                                  const percentage = intervalAnalysis.totalIntervals > 0 
                                    ? ((count / intervalAnalysis.totalIntervals) * 100).toFixed(1)
                                    : '0.0'
                                  
                                  return (
                                    <div 
                                      className="flex items-center justify-between p-2 bg-red-900/30 border border-red-600/30 rounded text-xs"
                                    >
                                      <span className="text-red-300 font-semibold">
                                        +10 casas
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <div className="w-16 bg-gray-700 rounded-full h-2">
                                          <div 
                                            className="bg-red-500 h-2 rounded-full transition-all"
                                            style={{ width: `${percentage}%` }}
                                          />
                                        </div>
                                        <span className="text-red-400 font-bold w-14 text-right text-[10px]">
                                          {count}x ({percentage}%)
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>

                            {/* Lista Completa de Intervalos */}
                            <div>
                              <div className="text-xs font-semibold text-purple-400 mb-2">
                                📋 Lista Completa
                              </div>
                              <div className="bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                                <div className="flex flex-wrap gap-1">
                                  {[...intervalAnalysis.intervals].reverse().map((interval, index) => (
                                    <span 
                                      key={index}
                                      className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
                                        interval === 0 
                                          ? 'bg-green-600 text-white'
                                          : interval <= 3
                                          ? 'bg-blue-600 text-white'
                                          : interval <= 6
                                          ? 'bg-yellow-600 text-white'
                                          : interval <= 10
                                          ? 'bg-orange-600 text-white'
                                          : 'bg-red-600 text-white'
                                      }`}
                                    >
                                      {interval}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <p className="text-[10px] text-gray-500 mt-1.5 italic">
                                💡 Recente → Antigo
                              </p>
                            </div>

                            {/* Estatísticas Resumidas */}
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-center p-2 bg-gray-800 rounded">
                                <div className="text-lg font-bold text-green-400">
                                  {Math.min(...intervalAnalysis.intervals)}
                                </div>
                                <div className="text-[10px] text-gray-400">Menor</div>
                              </div>
                              <div className="text-center p-2 bg-gray-800 rounded">
                                <div className="text-lg font-bold text-blue-400">
                                  {(intervalAnalysis.intervals.reduce((a, b) => a + b, 0) / intervalAnalysis.intervals.length).toFixed(1)}
                                </div>
                                <div className="text-[10px] text-gray-400">Média</div>
                              </div>
                              <div className="text-center p-2 bg-gray-800 rounded">
                                <div className="text-lg font-bold text-red-400">
                                  {Math.max(...intervalAnalysis.intervals)}
                                </div>
                                <div className="text-[10px] text-gray-400">Maior</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Outras métricas... */}
                    <Card className="bg-gray-700 border-gray-600">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-gray-300">Legenda</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                            <span className="text-sm text-gray-400">Ativação</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-green-500 rounded"></div>
                            <span className="text-sm text-gray-400">GREEN</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-red-500 rounded"></div>
                            <span className="text-sm text-gray-400">RED</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Título da seção de Análise Individual */}
                    <div className="mt-4 mb-3">
                      <h3 className="text-base font-semibold text-white mb-1">Análise Individual</h3>
                      <p className="text-xs text-gray-400">Desempenho de cada estratégia selecionada</p>
                    </div>

                    {/* Lista de estratégias selecionadas ordenadas por desempenho (OTIMIZADA) */}
                    {sortedSelectedStrategies.displayed.map((stats, index) => {
                        if (!stats) return null
                        const isProfitable = stats.profit >= 0
                        const isTopPerformer = index === 0 && isProfitable
                        const isWorstPerformer = index === sortedSelectedStrategies.displayed.length - 1 && !isProfitable
                        
                        return (
                          <Card 
                            key={stats.id} 
                            className={`border shadow-enhanced transition-all mb-3 ${
                              isTopPerformer 
                                ? 'bg-green-900 border-green-600 ring-2 ring-green-500' 
                                : isWorstPerformer 
                                ? 'bg-red-900 border-red-600 ring-2 ring-red-500' 
                                : isProfitable
                                ? 'bg-gray-700 border-green-700'
                                : 'bg-gray-700 border-red-700'
                            }`}
                          >
                            <CardHeader className="pb-2 pt-3 px-4">
                              <div className="flex items-start justify-between gap-3 overflow-hidden">
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <CardTitle className="text-sm font-semibold text-white leading-tight truncate">
                                    {stats.name}
                                  </CardTitle>
                                  {isTopPerformer && (
                                    <span className="text-xs text-green-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis block">🏆 Melhor desempenho</span>
                                  )}
                                  {isWorstPerformer && (
                                    <span className="text-xs text-red-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis block">⚠️ Pior desempenho</span>
                                  )}
                                </div>
                                <div className={`text-lg font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'} flex-shrink-0 text-right whitespace-nowrap`}>
                                  {isProfitable ? '+' : ''}{stats.profit}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0 pb-3 px-4">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="text-center p-2 bg-gray-800 rounded overflow-hidden">
                                  <div className="text-lg font-bold text-green-400 truncate">{stats.totalGreen}</div>
                                  <div className="text-xs text-gray-400">GREEN</div>
                                </div>
                                <div className="text-center p-2 bg-gray-800 rounded overflow-hidden">
                                  <div className="text-lg font-bold text-red-400 truncate">{stats.totalRed}</div>
                                  <div className="text-xs text-gray-400">RED</div>
                                </div>
                              </div>
                              <div className="mt-2 text-xs text-gray-400 text-center truncate">
                                {stats.activations} ativações
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    
                    {/* Aviso quando há mais estratégias */}
                    {sortedSelectedStrategies.hasMore && (
                      <div className="mt-3 p-4 bg-blue-900/30 border border-blue-600/30 rounded-lg text-center">
                        <p className="text-sm text-blue-300 font-medium">
                          📊 Mostrando top 50 de {sortedSelectedStrategies.total} estratégias
                        </p>
                        <p className="text-xs text-blue-400 mt-1">
                          Para melhor performance, limitamos a exibição
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <p className="text-base">Adicione números para ver as métricas</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Layout Desktop - mantém o layout original */}
      <main className="hidden lg:flex h-[calc(100vh-64px)] gap-6 p-6 overflow-hidden">
        {/* Menu Lateral Esquerdo - Estratégias */}
        <div className="w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-enhanced-lg flex flex-col overflow-hidden">
          <div className={`border-b border-gray-700 space-y-4 flex-shrink-0 transition-all ${
            isStrategiesScrolled ? 'p-3 space-y-3' : 'p-6 space-y-4'
          }`}>
            {/* Seletor de Roleta */}
            <div className="space-y-2">
              <label className={`font-medium text-gray-400 uppercase tracking-wide transition-all flex items-center gap-2 ${
                isStrategiesScrolled ? 'text-[10px]' : 'text-xs'
              }`}>
                🎰 Roleta ao Vivo
                {isConnected ? (
                  <span className="text-green-500 text-xs">● Conectado</span>
                ) : (
                  <span className="text-red-500 text-xs">● Desconectado</span>
                )}
              </label>
              <Select 
                key={`roulette-select-desktop-${isConnected}-${availableRoulettes.length}`}
                value={selectedRoulette} 
                onValueChange={handleRouletteChange}
                disabled={!isConnected || availableRoulettes.length === 0}
              >
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-650 focus:ring-2 focus:ring-blue-500">
                  <SelectValue>
                    {selectedRouletteInfo ? (
                      <div className="flex items-center gap-2">
                        <span>🎰 {selectedRouletteInfo.name}</span>
                        {selectedRouletteInfo.provider && (
                          <span className="text-xs text-gray-400">
                            ({selectedRouletteInfo.provider})
                          </span>
                        )}
                      </div>
                    ) : (
                      !isConnected 
                        ? "Aguardando conexão..." 
                        : availableRoulettes.length === 0 
                          ? "Nenhuma roleta disponível" 
                          : "Selecione uma roleta"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {availableRoulettes.map((rouletteInfo) => (
                    <SelectItem 
                      key={rouletteInfo.id} 
                      value={rouletteInfo.id} 
                      className="text-white hover:bg-gray-600 focus:bg-gray-600"
                    >
                      <div className="flex items-center gap-2">
                        🎰 <span className="font-medium">{rouletteInfo.name}</span>
                        {rouletteInfo.provider && (
                          <span className="text-xs text-gray-400 ml-2">
                            ({rouletteInfo.provider})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seletor de Limite de Análise - Desktop */}
            <div className="space-y-2">
              <label className={`font-medium text-gray-400 uppercase tracking-wide transition-all ${
                isStrategiesScrolled ? 'text-[10px]' : 'text-xs'
              }`}>
                📊 Analisar últimos
              </label>
              <Select 
                value={analysisLimit.toString()} 
                onValueChange={(value) => setAnalysisLimit(Number(value))}
              >
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-650 focus:ring-2 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="50" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                    50 números
                  </SelectItem>
                  <SelectItem value="100" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                    100 números
                  </SelectItem>
                  <SelectItem value="200" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                    200 números
                  </SelectItem>
                  <SelectItem value="300" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                    300 números
                  </SelectItem>
                  <SelectItem value="400" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                    400 números
                  </SelectItem>
                  <SelectItem value="500" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                    500 números
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className={`text-gray-500 transition-all ${
                isStrategiesScrolled ? 'text-[10px]' : 'text-xs'
              }`}>
                {numbersToAnalyze.length} de {numbers.length} números
              </p>
            </div>

            {/* Seletor de Casas GREEN/RED - Desktop */}
            <div className="space-y-2">
              <label className={`font-medium text-gray-400 uppercase tracking-wide transition-all ${
                isStrategiesScrolled ? 'text-[10px]' : 'text-xs'
              }`}>
                🎯 Casas para GREEN/RED
              </label>
              <Select 
                value={greenRedAttempts.toString()} 
                onValueChange={(value) => setGreenRedAttempts(Number(value))}
              >
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-650 focus:ring-2 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="1" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                    1 casa
                  </SelectItem>
                  <SelectItem value="2" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                    2 casas
                  </SelectItem>
                  <SelectItem value="3" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                    3 casas
                  </SelectItem>
                  <SelectItem value="4" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                    4 casas
                  </SelectItem>
                  <SelectItem value="5" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                    5 casas
                  </SelectItem>
                  <SelectItem value="6" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                    6 casas
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className={`text-gray-500 transition-all ${
                isStrategiesScrolled ? 'text-[10px]' : 'text-xs'
              }`}>
                Analisando {greenRedAttempts} casas após ativação
              </p>
            </div>

            {/* Grupo de botões de categoria */}
            <div className="transition-all duration-300">
              <div className={`overflow-hidden transition-all duration-300 ${
                isStrategiesScrolled ? 'max-h-0 opacity-0 mb-0' : 'max-h-10 opacity-100 mb-2'
              }`}>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  📊 Categorias de Fichas
                </label>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
              <Button
                onClick={() => setChipCategory('up-to-9')}
                className={`flex items-center justify-center py-1.5 text-[11px] font-semibold transition-all ${
                  chipCategory === 'up-to-9' 
                    ? 'bg-purple-600 hover:bg-purple-700 ring-2 ring-purple-400' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                Até 9
              </Button>
              
              <Button
                onClick={() => setChipCategory('more-than-9')}
                className={`flex items-center justify-center py-1.5 text-[11px] font-semibold transition-all ${
                  chipCategory === 'more-than-9' 
                    ? 'bg-orange-600 hover:bg-orange-700 ring-2 ring-orange-400' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                +9
              </Button>
              
              <Button
                onClick={() => setChipCategory('all')}
                className={`flex items-center justify-center py-1.5 text-[11px] font-semibold transition-all ${
                  chipCategory === 'all' 
                    ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                Todas
              </Button>
              </div>
            </div>

            {/* Botão "Selecionar Todas" */}
            <div>
              <Button
                onClick={toggleSelectAllFolders}
                className={`w-full py-1.5 text-[11px] font-semibold transition-all ${
                  selectAllFolders
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 ring-2 ring-green-400 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {selectAllFolders ? '✓ Todas Selecionadas' : '� Selecionar Todas'}
              </Button>
              {/* Texto descritivo - desaparece ao rolar */}
              {!isStrategiesScrolled && (
                <p className="text-gray-500 text-center text-xs mt-2 animate-in fade-in duration-300">
                  {selectAllFolders 
                    ? `${selectedStrategies.length} estratégias selecionadas` 
                    : `Clique para selecionar todas (${STRATEGIES.length} estratégias)`
                  }
                </p>
              )}
            </div>
            
            {/* Título "Estratégias" - desaparece ao rolar */}
            {!isStrategiesScrolled && (
              <h2 className="text-xl font-semibold text-white mb-2 animate-in fade-in duration-300">
                Estratégias
              </h2>
            )}
          </div>
          
          <div 
            ref={strategiesScrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-2"
          >
            {/* Listar TODAS as estratégias individuais, ordenadas por desempenho */}
            {FOLDERS
              .flatMap(folder => 
                folder.strategies.map(strategy => ({
                  strategy,
                  folderName: folder.name,
                  stats: strategyStats.find(s => s.id === strategy.id)
                }))
              )
              .sort((a, b) => {
                // Ordenar por profit (melhor desempenho primeiro)
                const profitA = a.stats?.profit ?? 0
                const profitB = b.stats?.profit ?? 0
                return profitB - profitA
              })
              .map(({ strategy, folderName, stats }) => {
                const isSelected = isStrategySelected(strategy.id)
                return (
                  <button
                    key={strategy.id}
                    onClick={() => toggleStrategy(strategy.id)}
                    className={`w-full p-3 rounded-lg text-left transition-all duration-300 flex items-start gap-2 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-enhanced-lg border border-blue-500'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                      isSelected ? 'bg-white border-white' : 'border-gray-400'
                    }`}>
                      {isSelected && <span className="text-blue-600 font-bold text-sm">✓</span>}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm mb-1">{strategy.name}</div>
                      <div className="text-[10px] text-gray-400 mb-1">📁 {folderName}</div>
                      {stats && (
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex gap-3">
                            <span className="text-green-400 font-medium">G: {stats.totalGreen}</span>
                            <span className="text-red-400 font-medium">R: {stats.totalRed}</span>
                          </div>
                          <div className={`font-bold ${stats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stats.profit >= 0 ? '+' : ''}{stats.profit}
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })
            }
          </div>
        </div>

        {/* Área Central */}
        <div className="flex-1 flex flex-col bg-gray-800 border border-gray-700 rounded-xl shadow-enhanced-lg overflow-hidden">
          {/* Exibição dos números da estratégia selecionada - desktop */}
          <div className="p-6 border-b border-gray-700 flex-shrink-0">
            <div className="max-w-4xl mx-auto">
              {lastSelectedStrategy ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        📋 Números da Estratégia Selecionada
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        {lastSelectedStrategy.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-blue-600/20 text-blue-400 border-blue-500/50">
                        {currentStrategyNumbers.length} números
                      </Badge>
                      <Button 
                        onClick={clearNumbers}
                        variant="outline"
                        className="h-9 px-4 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Limpar
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div className="flex flex-wrap gap-2">
                      {currentStrategyNumbers.map((num: number, idx: number) => (
                        <span 
                          key={idx} 
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg font-mono font-medium"
                        >
                          {num}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-700 rounded-lg p-8 border border-gray-600 text-center">
                  <p className="text-gray-400">
                    Selecione uma estratégia para visualizar os números
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Os números aparecerão aqui automaticamente
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Grid de Números */}
          <div className="flex-1 p-4 overflow-auto">
            {numbersToAnalyze.length > 0 ? (
              <div className="flex justify-center">
                <div className="grid grid-cols-12 gap-1 sm:gap-1.5 md:gap-1.5 lg:gap-2 xl:gap-2.5 2xl:gap-3 justify-items-center">
                  {numbersToAnalyze.map((number, index) => {
                    return (
                      <div
                        key={index}
                        className={`relative group 
                          w-6 h-6 text-xs
                          sm:w-7 sm:h-7 sm:text-xs
                          md:w-8 md:h-8 md:text-sm
                          lg:w-10 lg:h-10 lg:text-base
                          xl:w-12 xl:h-12 xl:text-lg
                          2xl:w-16 2xl:h-16 2xl:text-2xl
                          flex items-center justify-center rounded font-bold ${getNumberColor(number, index)} transition-all duration-200 hover:scale-110`}
                      >
                        {number}
                        <button
                          onClick={() => removeNumber(numbers.indexOf(number))}
                          className={`absolute -top-0.5 -right-0.5 
                            w-3 h-3 text-xs
                            sm:w-3 sm:h-3 sm:text-xs
                            md:w-3.5 md:h-3.5 md:text-xs
                            lg:w-4 lg:h-4 lg:text-sm
                            xl:w-5 xl:h-5 xl:text-base
                            2xl:w-6 2xl:h-6 2xl:text-lg
                            bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg z-10`}
                          title="Remover este número"
                        >
                          <X className={`
                            w-2 h-2
                            sm:w-2 sm:h-2
                            md:w-2 md:h-2
                            lg:w-2.5 lg:h-2.5
                            xl:w-3 xl:h-3
                            2xl:w-3.5 2xl:h-3.5
                          `} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <Target className="w-20 h-20 mx-auto mb-6 text-gray-600" />
                  <h3 className="text-xl font-semibold mb-3 text-gray-400">
                    {numbers.length > 0 
                      ? `Ajuste o limite de análise (${analysisLimit} números)` 
                      : "Aguardando números da roleta"}
                  </h3>
                  <p className="text-gray-500">
                    {numbers.length > 0 
                      ? `${numbers.length} números disponíveis` 
                      : "Os números aparecerão aqui em tempo real"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Painel Direito - Métricas */}
        <div className="w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-enhanced-lg flex flex-col overflow-hidden">
          
          <div className={`border-b border-gray-700 flex-shrink-0 transition-all duration-300 ${
            isDashboardScrolled ? 'p-3' : 'p-6'
          }`}>
            <h2 className={`font-semibold text-white transition-all duration-300 ${
              isDashboardScrolled ? 'text-base' : 'text-xl'
            }`}>
              Dashboard
            </h2>
            {lastSelectedStrategy ? (
              <div className={`transition-all duration-300 ${
                isDashboardScrolled ? 'mt-1' : 'mt-2'
              }`}>
                {!isDashboardScrolled && (
                  <p className="text-xs text-gray-500 mb-1">Estratégia Ativa:</p>
                )}
                <p className={`text-blue-400 font-medium truncate transition-all duration-300 ${
                  isDashboardScrolled ? 'text-xs' : 'text-sm'
                }`} title={lastSelectedStrategy.name}>
                  {lastSelectedStrategy.name}
                </p>
                {selectedStrategies.length > 1 && (
                  <p className={`text-gray-500 transition-all duration-300 ${
                    isDashboardScrolled ? 'text-[10px] mt-0.5' : 'text-xs mt-1'
                  }`}>
                    (+{selectedStrategies.length - 1} outra{selectedStrategies.length > 2 ? 's' : ''} selecionada{selectedStrategies.length > 2 ? 's' : ''})
                  </p>
                )}
              </div>
            ) : (
              <p className={`text-gray-400 transition-all duration-300 ${
                isDashboardScrolled ? 'text-xs mt-1' : 'text-sm mt-1'
              }`}>
                Selecione estratégias para analisar
              </p>
            )}
          </div>

          {selectedStrategies.length > 0 && numbers.length > 0 ? (
            <ScrollArea 
              className="flex-1 overflow-y-auto"
              onScrollCapture={(e) => {
                const target = e.target as HTMLElement
                const scrollTop = target.scrollTop
                setIsDashboardScrolled(scrollTop > 20)
              }}
            >
              <div className="p-5 space-y-3">
                {/* Box de Resumo da Última Estratégia Selecionada */}
                {lastSelectedStrategyStats && (
                  <Card className={`border-2 shadow-enhanced-lg ${
                    lastSelectedStrategyStats.profit >= 0 
                      ? 'bg-gradient-to-br from-green-900 to-gray-800 border-green-500' 
                      : 'bg-gradient-to-br from-red-900 to-gray-800 border-red-500'
                  }`}>
                    <CardHeader className="pb-3 pt-4 px-4">
                      <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                        📊 Resumo da Estratégia Ativa
                      </CardTitle>
                      <p className="text-xs text-gray-300 mt-1 truncate" title={lastSelectedStrategyStats.name}>
                        {lastSelectedStrategyStats.name}
                      </p>
                    </CardHeader>
                    <CardContent className="pt-0 pb-4 px-4">
                      <div className="grid grid-cols-3 gap-2">
                        {/* GREEN */}
                        <div className="text-center p-3 bg-gray-900/50 rounded-lg border border-green-600/30">
                          <div className="text-2xl font-bold text-green-400">
                            {lastSelectedStrategyStats.totalGreen}
                          </div>
                          <div className="text-xs text-gray-300 font-medium mt-1">GREEN</div>
                        </div>
                        
                        {/* RED */}
                        <div className="text-center p-3 bg-gray-900/50 rounded-lg border border-red-600/30">
                          <div className="text-2xl font-bold text-red-400">
                            {lastSelectedStrategyStats.totalRed}
                          </div>
                          <div className="text-xs text-gray-300 font-medium mt-1">RED</div>
                        </div>
                        
                        {/* APROVEITAMENTO */}
                        <div className="text-center p-3 bg-gray-900/50 rounded-lg border border-blue-600/30">
                          <div className="text-2xl font-bold text-blue-400">
                            {lastSelectedStrategyStats.activations > 0 
                              ? Math.round((lastSelectedStrategyStats.totalGreen / lastSelectedStrategyStats.activations) * 100)
                              : 0}%
                          </div>
                          <div className="text-xs text-gray-300 font-medium mt-1">TAXA</div>
                        </div>
                      </div>
                      
                      {/* Profit */}
                      <div className="mt-3 text-center p-3 bg-gray-900/50 rounded-lg border border-gray-600">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs text-gray-400">PROFIT:</span>
                          <span className={`text-xl font-bold ${
                            lastSelectedStrategyStats.profit >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {lastSelectedStrategyStats.profit >= 0 ? '+' : ''}{lastSelectedStrategyStats.profit}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {lastSelectedStrategyStats.activations} ativações
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* NOVAS MÉTRICAS: Sequências e Padrão de Entrada - DESKTOP */}
                {lastSelectedStrategyStats && (
                  <Card className="bg-gray-700 border-gray-600">
                    <CardHeader className="pb-3 pt-4 px-4">
                      <CardTitle className="text-base text-gray-300 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Padrões de Entrada
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-4 px-4 space-y-3">
                      {/* Maior sequência de GREEN */}
                      <div className="p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">🟢 Sequência GREEN</span>
                          <span className="text-xl font-bold text-green-400">
                            {lastSelectedStrategyStats.maxConsecutiveGreens}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Maior sequência de GREEN seguidos
                        </p>
                      </div>

                      {/* Maior sequência de RED */}
                      <div className="p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">🔴 Sequência RED</span>
                          <span className="text-xl font-bold text-red-400">
                            {lastSelectedStrategyStats.maxConsecutiveReds}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Maior sequência de RED seguidos
                        </p>
                      </div>

                      {/* Melhor entrada: Pós-GREEN ou Pós-RED */}
                      <div className={`p-3 rounded-lg ${
                        lastSelectedStrategyStats.bestEntryPattern === 'post-green' 
                          ? 'bg-green-900/30 border border-green-600/30' 
                          : lastSelectedStrategyStats.bestEntryPattern === 'post-red'
                          ? 'bg-red-900/30 border border-red-600/30'
                          : 'bg-gray-800'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-300">
                            ✨ Melhor Entrada
                          </span>
                          <span className={`text-sm font-bold ${
                            lastSelectedStrategyStats.bestEntryPattern === 'post-green'
                              ? 'text-green-400'
                              : lastSelectedStrategyStats.bestEntryPattern === 'post-red'
                              ? 'text-red-400'
                              : 'text-gray-400'
                          }`}>
                            {lastSelectedStrategyStats.bestEntryPattern === 'post-green' 
                              ? '🟢 PÓS-GREEN' 
                              : lastSelectedStrategyStats.bestEntryPattern === 'post-red'
                              ? '🔴 PÓS-RED'
                              : '⚪ SEM PADRÃO'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-center p-2 bg-gray-900/50 rounded">
                            <div className="text-green-400 font-bold">
                              {lastSelectedStrategyStats.postGreenWins}
                            </div>
                            <div className="text-gray-500">Pós-GREEN</div>
                          </div>
                          <div className="text-center p-2 bg-gray-900/50 rounded">
                            <div className="text-red-400 font-bold">
                              {lastSelectedStrategyStats.postRedWins}
                            </div>
                            <div className="text-gray-500">Pós-RED</div>
                          </div>
                        </div>
                        {lastSelectedStrategyStats.bestEntryPattern !== 'neutral' && (
                          <p className="text-xs text-gray-400 mt-2">
                            💡 {lastSelectedStrategyStats.bestEntryPattern === 'post-green' 
                              ? 'Entrar após um GREEN tem melhor taxa de acerto'
                              : 'Entrar após um RED tem melhor taxa de acerto'}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tabela de Números Quentes e Frios */}
                {lastSelectedStrategy && numbers.length > 0 && (
                  <Card className="bg-gray-700 border-gray-600 shadow-enhanced">
                    <CardHeader className="pb-3 pt-3 px-4">
                      <CardTitle className="text-sm text-gray-300">🔥 Números Quentes & ❄️ Frios</CardTitle>
                      <p className="text-xs text-gray-500 mt-1">Baseado na estratégia: {lastSelectedStrategy.name}</p>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3 px-4">
                      {(() => {
                        // Obter números da estratégia dinamicamente
                        const strategyNumbers = currentStrategyNumbers
                        
                        // Contar aparições de cada número da estratégia
                        const numberCounts = strategyNumbers.map((num: number) => ({
                          number: num,
                          count: numbers.filter((n: number) => n === num).length
                        }))
                        
                        // Separar em Quentes (que apareceram) e Frios (que não apareceram)
                        const hotNumbers = numberCounts
                          .filter((nc: { number: number; count: number }) => nc.count > 0)
                          .sort((a: { count: number }, b: { count: number }) => b.count - a.count) // Mais apareceram primeiro
                        
                        const coldNumbers = numberCounts
                          .filter((nc: { number: number; count: number }) => nc.count === 0)
                          .map((nc: { number: number; count: number }) => nc.number)
                          .sort((a: number, b: number) => a - b) // Ordem crescente
                        
                        return (
                          <div className="space-y-3">
                            {/* Números Quentes */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="text-xs font-semibold text-orange-400">🔥 QUENTES</div>
                                <div className="text-xs text-gray-500">({hotNumbers.length})</div>
                              </div>
                              {hotNumbers.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {hotNumbers.map(({ number, count }: { number: number; count: number }) => (
                                    <div 
                                      key={number}
                                      className="relative inline-flex items-center justify-center"
                                    >
                                      <div className="w-8 h-8 rounded-md bg-orange-600 text-white font-bold text-xs flex items-center justify-center border border-orange-400">
                                        {number}
                                      </div>
                                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border border-gray-900">
                                        {count}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500 italic">Nenhum número da estratégia apareceu ainda</p>
                              )}
                            </div>
                            
                            {/* Números Frios */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="text-xs font-semibold text-cyan-400">❄️ FRIOS</div>
                                <div className="text-xs text-gray-500">({coldNumbers.length})</div>
                              </div>
                              {coldNumbers.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {coldNumbers.map((number: number) => (
                                    <div 
                                      key={number}
                                      className="w-8 h-8 rounded-md bg-cyan-700 text-white font-bold text-xs flex items-center justify-center border border-cyan-500"
                                    >
                                      {number}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500 italic">Todos os números da estratégia já apareceram!</p>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </CardContent>
                  </Card>
                )}

                {/* NOVA ANÁLISE: Intervalos entre Acertos */}
                {lastSelectedStrategy && numbers.length > 0 && intervalAnalysis.totalIntervals > 0 && (
                  <Card className="bg-gray-700 border-gray-600 shadow-enhanced">
                    <CardHeader className="pb-3 pt-3 px-4">
                      <CardTitle className="text-sm text-gray-300">📊 Análise de Intervalos</CardTitle>
                      <p className="text-xs text-gray-500 mt-1">
                        Casas entre acertos da estratégia: {lastSelectedStrategy.name}
                      </p>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3 px-4">
                      <div className="space-y-3">
                        {/* Tabela de Frequências */}
                        <div>
                          <div className="text-xs font-semibold text-blue-400 mb-2">
                            📈 Frequência de Intervalos ({intervalAnalysis.totalIntervals} registros)
                          </div>
                          <div className="space-y-1.5">
                            {Array.from({ length: 10 }, (_, i) => i + 1).map(interval => {
                              const count = intervalAnalysis.frequencyMap.get(interval.toString()) || 0
                              const percentage = intervalAnalysis.totalIntervals > 0 
                                ? ((count / intervalAnalysis.totalIntervals) * 100).toFixed(1)
                                : '0.0'
                              
                              return (
                                <div 
                                  key={interval}
                                  className="flex items-center justify-between p-2 bg-gray-800 rounded text-xs"
                                >
                                  <span className="text-gray-300">
                                    {interval} casa{interval > 1 ? 's' : ''}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 bg-gray-700 rounded-full h-2">
                                      <div 
                                        className="bg-blue-500 h-2 rounded-full transition-all"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <span className="text-blue-400 font-bold w-16 text-right">
                                      {count}x ({percentage}%)
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                            
                            {/* Mais de 10 casas */}
                            {(() => {
                              const count = intervalAnalysis.frequencyMap.get('Mais de 10') || 0
                              const percentage = intervalAnalysis.totalIntervals > 0 
                                ? ((count / intervalAnalysis.totalIntervals) * 100).toFixed(1)
                                : '0.0'
                              
                              return (
                                <div 
                                  className="flex items-center justify-between p-2 bg-red-900/30 border border-red-600/30 rounded text-xs"
                                >
                                  <span className="text-red-300 font-semibold">
                                    Mais de 10 casas
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 bg-gray-700 rounded-full h-2">
                                      <div 
                                        className="bg-red-500 h-2 rounded-full transition-all"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <span className="text-red-400 font-bold w-16 text-right">
                                      {count}x ({percentage}%)
                                    </span>
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        </div>

                        {/* Lista Completa de Intervalos */}
                        <div>
                          <div className="text-xs font-semibold text-purple-400 mb-2">
                            📋 Lista Completa de Intervalos
                          </div>
                          <div className="bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                            <div className="flex flex-wrap gap-1">
                              {[...intervalAnalysis.intervals].reverse().map((interval, index) => (
                                <span 
                                  key={index}
                                  className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
                                    interval === 0 
                                      ? 'bg-green-600 text-white'
                                      : interval <= 3
                                      ? 'bg-blue-600 text-white'
                                      : interval <= 6
                                      ? 'bg-yellow-600 text-white'
                                      : interval <= 10
                                      ? 'bg-orange-600 text-white'
                                      : 'bg-red-600 text-white'
                                  }`}
                                >
                                  {interval}
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1.5 italic">
                            💡 Intervalos mostrados em ordem cronológica (mais recente → mais antigo)
                          </p>
                        </div>

                        {/* Estatísticas Resumidas */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-gray-800 rounded">
                            <div className="text-lg font-bold text-green-400">
                              {Math.min(...intervalAnalysis.intervals)}
                            </div>
                            <div className="text-xs text-gray-400">Menor</div>
                          </div>
                          <div className="text-center p-2 bg-gray-800 rounded">
                            <div className="text-lg font-bold text-blue-400">
                              {(intervalAnalysis.intervals.reduce((a, b) => a + b, 0) / intervalAnalysis.intervals.length).toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-400">Média</div>
                          </div>
                          <div className="text-center p-2 bg-gray-800 rounded">
                            <div className="text-lg font-bold text-red-400">
                              {Math.max(...intervalAnalysis.intervals)}
                            </div>
                            <div className="text-xs text-gray-400">Maior</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Legenda */}
                <Card className="bg-gray-700 border-gray-600 shadow-enhanced">
                  <CardHeader className="pb-3 pt-3 px-4">
                    <CardTitle className="text-sm text-gray-300">Legenda</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 px-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg">
                        <div className="w-5 h-5 bg-yellow-500 rounded-lg flex-shrink-0"></div>
                        <span className="text-sm text-gray-400">Ativação</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg">
                        <div className="w-5 h-5 bg-green-500 rounded-lg flex-shrink-0"></div>
                        <span className="text-sm text-gray-400">GREEN</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg">
                        <div className="w-5 h-5 bg-red-500 rounded-lg flex-shrink-0"></div>
                        <span className="text-sm text-gray-400">RED</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Título da seção de Análise Individual */}
                <div className="mt-4 mb-4">
                  <h3 className="text-lg font-semibold text-white mb-1">Análise Individual</h3>
                  <p className="text-xs text-gray-400">Desempenho de cada estratégia selecionada</p>
                </div>

                {/* Lista de estratégias selecionadas ordenadas por desempenho (OTIMIZADA) */}
                {sortedSelectedStrategies.displayed.map((stats, index) => {
                    if (!stats) return null
                    const isProfitable = stats.profit >= 0
                    const isTopPerformer = index === 0 && isProfitable
                    const isWorstPerformer = index === sortedSelectedStrategies.displayed.length - 1 && !isProfitable
                    
                    return (
                      <Card 
                        key={stats.id} 
                        className={`border shadow-enhanced transition-all ${
                          isTopPerformer 
                            ? 'bg-green-900 border-green-600 ring-2 ring-green-500' 
                            : isWorstPerformer 
                            ? 'bg-red-900 border-red-600 ring-2 ring-red-500' 
                            : isProfitable
                            ? 'bg-gray-700 border-green-700'
                            : 'bg-gray-700 border-red-700'
                        }`}
                      >
                        <CardHeader className="pb-2 pt-3 px-4">
                          <div className="flex items-start justify-between gap-3 overflow-hidden">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <CardTitle className="text-sm font-semibold text-white leading-tight truncate">
                                {stats.name}
                              </CardTitle>
                              {isTopPerformer && (
                                <span className="text-xs text-green-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis block">🏆 Melhor desempenho</span>
                              )}
                              {isWorstPerformer && (
                                <span className="text-xs text-red-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis block">⚠️ Pior desempenho</span>
                              )}
                            </div>
                            <div className={`text-lg font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'} flex-shrink-0 text-right whitespace-nowrap`}>
                              {isProfitable ? '+' : ''}{stats.profit}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3 px-4">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-center p-2 bg-gray-800 rounded overflow-hidden">
                              <div className="text-lg font-bold text-green-400 truncate">{stats.totalGreen}</div>
                              <div className="text-xs text-gray-400">GREEN</div>
                            </div>
                            <div className="text-center p-2 bg-gray-800 rounded overflow-hidden">
                              <div className="text-lg font-bold text-red-400 truncate">{stats.totalRed}</div>
                              <div className="text-xs text-gray-400">RED</div>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-400 text-center truncate">
                            {stats.activations} ativações
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                
                {/* Aviso quando há mais estratégias */}
                {sortedSelectedStrategies.hasMore && (
                  <div className="mt-3 p-4 bg-blue-900/30 border border-blue-600/30 rounded-lg text-center">
                    <p className="text-sm text-blue-300 font-medium">
                      📊 Mostrando top 50 de {sortedSelectedStrategies.total} estratégias selecionadas
                    </p>
                    <p className="text-xs text-blue-400 mt-1">
                      Limitado para melhor performance. As melhores estratégias estão sendo exibidas.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p className="text-base">Adicione números para ver as métricas</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Edição de Perfil */}
      {showProfileEdit && (
        <ProfileEdit
          user={user}
          onClose={() => setShowProfileEdit(false)}
          onUpdate={handleProfileUpdate}
        />
      )}
    </div>
  )
}