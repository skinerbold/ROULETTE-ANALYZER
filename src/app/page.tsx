'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, TrendingUp, Target, Zap, BarChart3, X, Trash2, Menu, ChevronLeft, Layers } from 'lucide-react'
import { getAllStrategies, getStrategyById, ChipCategory } from '@/lib/strategies'
import { StrategyStats, UserSession } from '@/lib/types'
import { supabase, getCurrentUser } from '@/lib/supabase'
import AuthForm from '@/components/AuthForm'
import Header from '@/components/Header'
import ProfileEdit from '@/components/ProfileEdit'

interface NumberStatus {
  number: number
  status: 'GREEN' | 'RED' | 'ACTIVATION' | 'NEUTRAL'
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [numbers, setNumbers] = useState<number[]>([])
  const [currentNumbers, setCurrentNumbers] = useState('')
  
  // Estado para categoria de fichas
  const [chipCategory, setChipCategory] = useState<ChipCategory>('up-to-9')
  const [selectedStrategies, setSelectedStrategies] = useState<number[]>([]) // MUDANÇA: Array de IDs
  const [selectedRoulette, setSelectedRoulette] = useState<string>('european') // Estado para roleta selecionada (placeholder)
  const [selectAllFolders, setSelectAllFolders] = useState(false) // Estado para "All Pastas"
  
  const [strategyStats, setStrategyStats] = useState<StrategyStats[]>([])
  const [numberStatuses, setNumberStatuses] = useState<NumberStatus[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  
  // Estados para mobile
  const [showStrategiesMenu, setShowStrategiesMenu] = useState(false)
  const [showMetricsPanel, setShowMetricsPanel] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  
  // Estado para controlar scroll do dashboard
  const [isDashboardScrolled, setIsDashboardScrolled] = useState(false)
  
  // Obter pastas e estratégias da categoria atual
  const FOLDERS = getAllStrategies(chipCategory)
  const STRATEGIES = FOLDERS.flatMap(folder => folder.strategies)

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
      calculateAllStrategies()
      updateNumberStatuses()
      // Salvar sessão sempre que os números mudarem
      if (user && !isLoadingSession) {
        saveUserSession()
      }
    } else if (user && !isLoadingSession) {
      // Salvar sessão vazia também
      saveUserSession()
    }
  }, [numbers, selectedStrategies]) // MUDANÇA: selectedStrategies no lugar de selectedStrategy

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
          if (error.message?.includes('chip_category') || error.message?.includes('selected_strategies') || !error.message) {
            console.warn('Colunas chip_category/selected_strategies não existem no banco. Execute a migração SQL.')
            const { chip_category, selected_strategies, ...dataWithoutNewColumns } = sessionData
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
          if (error.message?.includes('chip_category') || error.message?.includes('selected_strategies') || !error.message) {
            console.warn('Colunas chip_category/selected_strategies não existem no banco. Execute a migração SQL.')
            const { chip_category, selected_strategies, ...dataWithoutNewColumns } = sessionData
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
      setCurrentNumbers('')
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
      profit: 0
    }))
    setStrategyStats(initialStats)
  }

  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => 
      prev.includes(folderName) 
        ? prev.filter(name => name !== folderName)
        : [...prev, folderName]
    )
  }

  const isFolderExpanded = (folderName: string) => {
    return expandedFolders.includes(folderName)
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

  const selectAllInFolder = (folderName: string) => {
    const folder = FOLDERS.find(f => f.name === folderName)
    if (!folder) return

    const folderStrategyIds = folder.strategies.map(s => s.id)
    const allSelected = folderStrategyIds.every(id => selectedStrategies.includes(id))

    if (allSelected) {
      // Se todas já estão selecionadas, desselecionar todas
      setSelectedStrategies(prev => prev.filter(id => !folderStrategyIds.includes(id)))
    } else {
      // Selecionar todas que ainda não estão
      setSelectedStrategies(prev => {
        const newIds = folderStrategyIds.filter(id => !prev.includes(id))
        return [...prev, ...newIds]
      })
    }
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

  const isFolderFullySelected = (folderName: string) => {
    const folder = FOLDERS.find(f => f.name === folderName)
    if (!folder) return false
    return folder.strategies.every(s => selectedStrategies.includes(s.id))
  }


  const parseNumbers = (text: string): number[] => {
    // Remove espaços extras e divide por vírgulas e quebras de linha
    const cleanText = text.replace(/\s+/g, ' ').trim()
    const parts = cleanText.split(/[,\n\r\s]+/).filter(part => part.length > 0)
    
    const validNumbers: number[] = []
    for (const part of parts) {
      const num = parseInt(part.trim())
      if (!isNaN(num) && num >= 0 && num <= 36) {
        validNumbers.push(num)
      }
    }
    
    return validNumbers
  }

  const addNumbers = () => {
    const newNumbers = parseNumbers(currentNumbers)
    if (newNumbers.length > 0) {
      const totalNumbers = numbers.length + newNumbers.length
      if (totalNumbers <= 1000) {
        // CORREÇÃO PRINCIPAL: Adiciona os novos números no FINAL do array
        // Assim mantém a ordem cronológica correta (mais antigos no início, mais novos no final)
        setNumbers(prev => [...prev, ...newNumbers])
        setCurrentNumbers('')
      } else {
        // Adiciona apenas os que cabem no limite
        const remainingSpace = 1000 - numbers.length
        const numbersToAdd = newNumbers.slice(0, remainingSpace)
        // Também no final quando há limite
        setNumbers(prev => [...prev, ...numbersToAdd])
        setCurrentNumbers('')
      }
    }
  }

  const removeNumber = (indexToRemove: number) => {
    setNumbers(prev => prev.filter((_, index) => index !== indexToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addNumbers()
    }
  }

  const clearNumbers = () => {
    setNumbers([])
    setNumberStatuses([])
    initializeStrategies()
  }

  const analyzeStrategy = (strategyId: number, numbersArray: number[]) => {
    const strategy = STRATEGIES.find(s => s.id === strategyId)
    if (!strategy) return null

    const allNumbers = [...strategy.numbers]
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
    
    const activationCounts: {[key: number]: number} = {}
    
    // CORREÇÃO: Processa do primeiro para o último (ordem cronológica correta)
    // Como agora os números mais recentes ficam no final, processamos normalmente
    let i = 0
    while (i < numbersArray.length) {
      const currentNum = numbersArray[i]
      
      // Verifica se é um número de ativação (não proteção)
      if (strategy.numbers.includes(currentNum)) {
        activationCounts[currentNum] = (activationCounts[currentNum] || 0) + 1
        
        // Procura por GREEN nas próximas 3 posições
        let found = false
        let attempts = 0
        
        for (let j = i + 1; j <= i + 3 && j < numbersArray.length; j++) {
          attempts++
          if (allNumbers.includes(numbersArray[j])) {
            // GREEN encontrado
            totalGreen++
            currentGreenSequence++
            currentRedSequence = 0
            maxGreenSequence = Math.max(maxGreenSequence, currentGreenSequence)
            
            if (attempts === 1) firstAttemptHits++
            else if (attempts === 2) secondAttemptHits++
            else if (attempts === 3) thirdAttemptHits++
            
            activations.push({
              position: i,
              activatingNumber: currentNum,
              result: 'GREEN',
              attempts
            })
            
            found = true
            i = j + 1 // Pula para depois do GREEN
            break
          }
        }
        
        if (!found) {
          // RED - não encontrou em 3 tentativas
          totalRed++
          currentRedSequence++
          currentGreenSequence = 0
          maxRedSequence = Math.max(maxRedSequence, currentRedSequence)
          
          activations.push({
            position: i,
            activatingNumber: currentNum,
            result: 'RED',
            attempts: 3
          })
          
          i += 4 // Pula 3 posições após RED + 1 para próxima iteração
        }
      } else {
        i++
      }
    }
    
    const mostActivatingNumber = Object.keys(activationCounts).reduce((a, b) => 
      activationCounts[parseInt(a)] > activationCounts[parseInt(b)] ? a : b, '0')
    
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
      activations: activations.length
    }
  }

  const calculateAllStrategies = () => {
    const updatedStats = STRATEGIES.map(strategy => {
      const analysis = analyzeStrategy(strategy.id, numbers)
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
        profit
      }
    }).sort((a, b) => b.profit - a.profit)

    setStrategyStats(updatedStats)
  }

  const updateNumberStatuses = () => {
    // CORREÇÃO: Se nenhuma estratégia selecionada, todos os números ficam NEUTROS (cinza)
    if (selectedStrategies.length === 0) {
      const statuses: NumberStatus[] = numbers.map(number => ({ number, status: 'NEUTRAL' as const }))
      setNumberStatuses(statuses)
      return
    }
    
    // Pegar a ÚLTIMA estratégia selecionada (última do array)
    const lastSelectedId = selectedStrategies[selectedStrategies.length - 1]
    const strategy = STRATEGIES.find(s => s.id === lastSelectedId)
    if (!strategy) {
      // Se não encontrou a estratégia, deixa tudo neutro
      const statuses: NumberStatus[] = numbers.map(number => ({ number, status: 'NEUTRAL' as const }))
      setNumberStatuses(statuses)
      return
    }

    // Inicializa todos os status como NEUTRAL
    const statuses: NumberStatus[] = numbers.map(number => ({ number, status: 'NEUTRAL' as const }))
    const allNumbers = [...strategy.numbers]
    
    // CORREÇÃO COMPLETA DA LÓGICA: Processa do primeiro para o último (ordem cronológica correta)
    let i = 0
    while (i < numbers.length) {
      const currentNum = numbers[i]
      
      // Verifica se é um número de ativação (apenas números principais, não proteção)
      if (strategy.numbers.includes(currentNum)) {
        // Marca como ACTIVATION (amarelo)
        statuses[i] = { number: currentNum, status: 'ACTIVATION' }
        
        // Procura por GREEN nas próximas 3 posições
        let found = false
        let greenPosition = -1
        
        // Verifica as próximas 3 posições
        for (let j = i + 1; j <= i + 3 && j < numbers.length; j++) {
          if (allNumbers.includes(numbers[j])) {
            // GREEN encontrado
            found = true
            greenPosition = j
            break
          }
        }
        
        if (found) {
          // GREEN: marca o GREEN como GREEN
          statuses[greenPosition] = { number: numbers[greenPosition], status: 'GREEN' }
          // Próxima iteração começa APÓS o GREEN
          i = greenPosition + 1
        } else {
          // RED: marca a 3ª posição como RED (se existir)
          const redPosition = i + 3
          if (redPosition < numbers.length) {
            statuses[redPosition] = { number: numbers[redPosition], status: 'RED' }
          }
          // Pula 3 posições após RED
          i += 4
        }
      } else {
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

  // NOVA FUNCIONALIDADE: Ordenar pastas e estratégias dinamicamente por desempenho
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
      
      if (folderStrategiesStats.length === 0) {
        return {
          ...folder,
          avgPerformance: 0,
          strategies: folder.strategies // Manter ordem original
        }
      }

      // Performance = taxa de aproveitamento (GREEN / ATIVAÇÕES)
      const totalActivations = folderStrategiesStats.reduce((sum, s) => sum + (s?.activations || 0), 0)
      const totalGreen = folderStrategiesStats.reduce((sum, s) => sum + (s?.totalGreen || 0), 0)
      const avgPerformance = totalActivations > 0 ? (totalGreen / totalActivations) : 0

      // Ordenar estratégias dentro da pasta por desempenho
      const sortedStrategies = [...folder.strategies].sort((a, b) => {
        const statsA = strategyStats.find(s => s.id === a.id)
        const statsB = strategyStats.find(s => s.id === b.id)
        
        if (!statsA || !statsB) return 0
        
        // Performance individual = GREEN / ATIVAÇÕES
        const perfA = statsA.activations > 0 ? (statsA.totalGreen / statsA.activations) : 0
        const perfB = statsB.activations > 0 ? (statsB.totalGreen / statsB.activations) : 0
        
        // Em caso de empate, usar profit como desempate
        if (perfB === perfA) {
          return (statsB.profit || 0) - (statsA.profit || 0)
        }
        
        return perfB - perfA // Maior performance primeiro
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

  // Memoizar estratégias selecionadas ordenadas por desempenho (OTIMIZAÇÃO)
  const sortedSelectedStrategies = useMemo(() => {
    // Limitar a 50 estratégias por vez para evitar travamento
    const MAX_DISPLAY = 50
    
    const strategies = selectedStrategies
      .map(strategyId => strategyStats.find(s => s.id === strategyId))
      .filter(Boolean)
      .sort((a, b) => {
        if (!a || !b) return 0
        
        // Ordenar por taxa de aproveitamento (GREEN / ATIVAÇÕES)
        const perfA = a.activations > 0 ? (a.totalGreen / a.activations) : 0
        const perfB = b.activations > 0 ? (b.totalGreen / b.activations) : 0
        
        // Em caso de empate, usar profit como desempate
        if (perfB === perfA) {
          return b.profit - a.profit
        }
        
        return perfB - perfA // Melhor desempenho primeiro
      })
    
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
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              🎰 Roleta
            </label>
            <Select value={selectedRoulette} onValueChange={setSelectedRoulette}>
              <SelectTrigger className="w-full h-10 bg-gray-700 border-gray-600 text-white text-sm">
                <SelectValue placeholder="Escolha..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="european" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                  🇪🇺 Europeia (0-36)
                </SelectItem>
                <SelectItem value="american" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                  🇺🇸 Americana (0-00-36)
                </SelectItem>
                <SelectItem value="french" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                  🇫🇷 Francesa (0-36)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 italic">
              * Em desenvolvimento
            </p>
          </div>
        </div>

        {/* Botões de controle mobile */}
        <div className="flex justify-between items-stretch gap-2 p-3 bg-gray-800 border-b border-gray-700">
          <Button
            onClick={() => setShowStrategiesMenu(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 h-auto min-h-[44px] flex-shrink-0"
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
            className={`flex items-center justify-center gap-2 px-3 py-2 h-auto min-h-[44px] flex-shrink-0 ${
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
          
          <div className="text-sm text-center flex-1 min-w-0 px-2 flex flex-col justify-center">
            {lastSelectedStrategy ? (
              <>
                <p className="text-blue-400 font-medium truncate text-xs sm:text-sm leading-tight" title={lastSelectedStrategy.name}>
                  {lastSelectedStrategy.name}
                </p>
                {selectedStrategies.length > 1 && (
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                    (+{selectedStrategies.length - 1} outra{selectedStrategies.length > 2 ? 's' : ''})
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-400 text-xs leading-tight">Nenhuma estratégia selecionada</p>
            )}
          </div>
          
          <Button
            onClick={() => setShowMetricsPanel(true)}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 px-3 py-2 h-auto min-h-[44px] flex-shrink-0"
          >
            <BarChart3 className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">Métricas</span>
          </Button>
        </div>

        {/* Input de números - mobile */}
        <div className="p-3 bg-gray-800 border-b border-gray-700">
          <div className="space-y-2.5">
            <Input
              value={currentNumbers}
              onChange={(e) => setCurrentNumbers(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                lastSelectedStrategy 
                  ? `Ex: ${lastSelectedStrategy.numbers.slice(0, 6).join(', ')}${lastSelectedStrategy.numbers.length > 6 ? '...' : ''} (números da estratégia ${lastSelectedStrategy.name})`
                  : "Ex: 1, 5, 12, 23 (Enter para adicionar)"
              }
              className="h-11 bg-gray-700 border-gray-600 text-white focus:border-blue-500 text-sm font-mono"
            />
            
            <div className="flex gap-2 items-center">
              <Button 
                onClick={addNumbers}
                disabled={!currentNumbers.trim() || numbers.length >= 1000}
                className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Adicionar
              </Button>
              <Button 
                onClick={clearNumbers}
                variant="outline"
                className="h-9 px-3 border-gray-600 text-gray-300 hover:bg-gray-700 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <div className="text-xs text-gray-400 bg-gray-700 px-2.5 py-1.5 rounded-lg flex-shrink-0">
                {numbers.length}/1000
              </div>
            </div>
          </div>
        </div>

        {/* Grid de números - tela cheia mobile */}
        <div className="flex-1 p-3 min-h-[calc(100vh-240px)] overflow-y-auto">
          {numbers.length > 0 ? (
            <div className="flex justify-center">
              <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2 justify-items-center w-full max-w-4xl">
                {[...numbers].reverse().map((number, reversedIndex) => {
                  const realIndex = numbers.length - 1 - reversedIndex
                  return (
                    <div
                      key={realIndex}
                      className={`relative group w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-base sm:text-lg md:text-xl flex items-center justify-center rounded-lg font-bold ${getNumberColor(number, realIndex)} transition-all duration-200 hover:scale-110`}
                    >
                      {number}
                      <button
                        onClick={() => removeNumber(realIndex)}
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
                <h3 className="text-lg font-semibold mb-2 text-gray-400">Adicione números para começar</h3>
                <p className="text-gray-500">Digite números de 0 a 36 para ver a análise</p>
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
                  <ChevronLeft className="w-5 h-5" />
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
                  {sortedFolders.map((folder) => (
                    <div key={folder.name} className="border border-gray-700 rounded-lg overflow-hidden">
                      {/* Header da pasta */}
                      <div className="bg-gray-700">
                        <button
                          onClick={() => toggleFolder(folder.name)}
                          className="w-full p-3 hover:bg-gray-600 transition-all flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">{folder.name}</span>
                            <span className="text-xs text-gray-400">({folder.strategies.length})</span>
                          </div>
                          <ChevronLeft 
                            className={`w-5 h-5 text-gray-400 transition-transform ${
                              isFolderExpanded(folder.name) ? '-rotate-90' : 'rotate-180'
                            }`} 
                          />
                        </button>
                        {/* Botão "Selecionar todas da pasta" */}
                        {isFolderExpanded(folder.name) && (
                          <button
                            onClick={() => selectAllInFolder(folder.name)}
                            className={`w-full px-3 py-2 text-xs font-medium transition-colors border-t border-gray-600 ${
                              isFolderFullySelected(folder.name)
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                            }`}
                          >
                            {isFolderFullySelected(folder.name) ? '✓ Todas selecionadas' : 'Selecionar todas'}
                          </button>
                        )}
                      </div>
                      
                      {/* Estratégias da pasta */}
                      {isFolderExpanded(folder.name) && (
                        <div className="bg-gray-800 p-2 space-y-2">
                          {folder.strategies.map((strategy) => {
                            const stats = strategyStats.find(s => s.id === strategy.id)
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
                          })}
                        </div>
                      )}
                    </div>
                  ))}
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

                    {/* Tabela de Números Quentes e Frios */}
                    {lastSelectedStrategy && numbers.length > 0 && (
                      <Card className="bg-gray-700 border-gray-600 shadow-enhanced">
                        <CardHeader className="pb-3 pt-3 px-4">
                          <CardTitle className="text-sm text-gray-300">🔥 Números Quentes & ❄️ Frios</CardTitle>
                          <p className="text-xs text-gray-500 mt-1">Baseado na estratégia: {lastSelectedStrategy.name}</p>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3 px-4">
                          {(() => {
                            // Obter números da estratégia
                            const strategyNumbers = lastSelectedStrategy.numbers
                            
                            // Contar aparições de cada número da estratégia
                            const numberCounts = strategyNumbers.map(num => ({
                              number: num,
                              count: numbers.filter(n => n === num).length
                            }))
                            
                            // Separar em Quentes (que apareceram) e Frios (que não apareceram)
                            const hotNumbers = numberCounts
                              .filter(nc => nc.count > 0)
                              .sort((a, b) => b.count - a.count) // Mais apareceram primeiro
                            
                            const coldNumbers = numberCounts
                              .filter(nc => nc.count === 0)
                              .map(nc => nc.number)
                              .sort((a, b) => a - b) // Ordem crescente
                            
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
                                      {hotNumbers.map(({ number, count }) => (
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
                                      {coldNumbers.map(number => (
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
          <div className="p-6 border-b border-gray-700 space-y-4 flex-shrink-0">
            {/* Seletor de Roleta */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                🎰 Selecionar Roleta
              </label>
              <Select value={selectedRoulette} onValueChange={setSelectedRoulette}>
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-650 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="Escolha uma roleta..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="european" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                    🇪🇺 Roleta Europeia (0-36)
                  </SelectItem>
                  <SelectItem value="american" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                    🇺🇸 Roleta Americana (0-00-36)
                  </SelectItem>
                  <SelectItem value="french" className="text-white hover:bg-gray-600 focus:bg-gray-600">
                    🇫🇷 Roleta Francesa (0-36)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 italic">
                * Funcionalidade em desenvolvimento
              </p>
            </div>

            {/* Grupo de botões de categoria */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => setChipCategory('up-to-9')}
                className={`flex items-center justify-center py-2 text-xs font-semibold transition-all ${
                  chipCategory === 'up-to-9' 
                    ? 'bg-purple-600 hover:bg-purple-700 ring-2 ring-purple-400' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                Até 9
              </Button>
              
              <Button
                onClick={() => setChipCategory('more-than-9')}
                className={`flex items-center justify-center py-2 text-xs font-semibold transition-all ${
                  chipCategory === 'more-than-9' 
                    ? 'bg-orange-600 hover:bg-orange-700 ring-2 ring-orange-400' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                +9
              </Button>
              
              <Button
                onClick={() => setChipCategory('all')}
                className={`flex items-center justify-center py-2 text-xs font-semibold transition-all ${
                  chipCategory === 'all' 
                    ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                Todas
              </Button>
            </div>

            {/* Botão All Pastas */}
            <div>
              <Button
                onClick={toggleSelectAllFolders}
                className={`w-full py-2.5 text-sm font-semibold transition-all ${
                  selectAllFolders
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 ring-2 ring-green-400 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {selectAllFolders ? '✓ All Pastas Selecionadas' : '📁 Selecionar All Pastas'}
              </Button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {selectAllFolders 
                  ? `${selectedStrategies.length} estratégias selecionadas` 
                  : `Clique para selecionar todas (${STRATEGIES.length} estratégias)`
                }
              </p>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Estratégias</h2>
              <p className="text-sm text-gray-400">Ordenadas por aproveitamento</p>
            </div>
          </div>
          
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-2">
              {sortedFolders.map((folder) => (
                <div key={folder.name} className="border border-gray-700 rounded-lg overflow-hidden">
                  {/* Header da pasta */}
                  <div className="bg-gray-700">
                    <button
                      onClick={() => toggleFolder(folder.name)}
                      className="w-full p-3 hover:bg-gray-600 transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm">{folder.name}</span>
                        <span className="text-xs text-gray-400">({folder.strategies.length})</span>
                      </div>
                      <ChevronLeft 
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          isFolderExpanded(folder.name) ? '-rotate-90' : 'rotate-180'
                        }`} 
                      />
                    </button>
                    {/* Botão "Selecionar todas da pasta" */}
                    {isFolderExpanded(folder.name) && (
                      <button
                        onClick={() => selectAllInFolder(folder.name)}
                        className={`w-full px-3 py-2 text-xs font-medium transition-colors border-t border-gray-600 ${
                          isFolderFullySelected(folder.name)
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                      >
                        {isFolderFullySelected(folder.name) ? '✓ Todas selecionadas' : 'Selecionar todas'}
                      </button>
                    )}
                  </div>
                  
                  {/* Estratégias da pasta */}
                  {isFolderExpanded(folder.name) && (
                    <div className="bg-gray-800 p-2 space-y-2">
                      {folder.strategies.map((strategy) => {
                        const stats = strategyStats.find(s => s.id === strategy.id)
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
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Área Central */}
        <div className="flex-1 flex flex-col bg-gray-800 border border-gray-700 rounded-xl shadow-enhanced-lg overflow-hidden">
          {/* Input de Números */}
          <div className="p-6 border-b border-gray-700 flex-shrink-0">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Adicionar números (0-36) - separe por vírgula ou espaço
                </label>
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
              </div>
              
              <div className="flex gap-4 items-center justify-center">
                <Button 
                  onClick={addNumbers}
                  disabled={!currentNumbers.trim() || numbers.length >= 1000}
                  className="h-10 px-6 bg-blue-600 hover:bg-blue-700 shadow-enhanced rounded-lg font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
                <Button 
                  onClick={clearNumbers}
                  variant="outline"
                  className="h-10 px-6 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500 rounded-lg font-medium"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
                <div className="text-sm text-gray-400 bg-gray-700 px-3 py-2 rounded-lg">
                  <span className="font-medium">{numbers.length}</span>/1000
                </div>
              </div>
              
              {currentNumbers.trim() && (
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-xs text-gray-400 mb-2">
                    Preview ({parseNumbers(currentNumbers).length} números):
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
                    {parseNumbers(currentNumbers).slice(0, 30).map((num, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                        {num}
                      </span>
                    ))}
                    {parseNumbers(currentNumbers).length > 30 && (
                      <span className="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs rounded">
                        +{parseNumbers(currentNumbers).length - 30}...
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Grid de Números */}
          <div className="flex-1 p-4 overflow-auto">
            {numbers.length > 0 ? (
              <div className="flex justify-center">
                <div className="grid grid-cols-12 gap-1 sm:gap-1.5 md:gap-1.5 lg:gap-2 xl:gap-2.5 2xl:gap-3 justify-items-center">
                  {[...numbers].reverse().map((number, reversedIndex) => {
                    const realIndex = numbers.length - 1 - reversedIndex
                    return (
                      <div
                        key={realIndex}
                        className={`relative group 
                          w-6 h-6 text-xs
                          sm:w-7 sm:h-7 sm:text-xs
                          md:w-8 md:h-8 md:text-sm
                          lg:w-10 lg:h-10 lg:text-base
                          xl:w-12 xl:h-12 xl:text-lg
                          2xl:w-16 2xl:h-16 2xl:text-2xl
                          flex items-center justify-center rounded font-bold ${getNumberColor(number, realIndex)} transition-all duration-200 hover:scale-110`}
                      >
                        {number}
                        <button
                          onClick={() => removeNumber(realIndex)}
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
                  <h3 className="text-xl font-semibold mb-3 text-gray-400">Adicione números para começar</h3>
                  <p className="text-gray-500">Digite números de 0 a 36 para ver a análise em tempo real</p>
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

                {/* Tabela de Números Quentes e Frios */}
                {lastSelectedStrategy && numbers.length > 0 && (
                  <Card className="bg-gray-700 border-gray-600 shadow-enhanced">
                    <CardHeader className="pb-3 pt-3 px-4">
                      <CardTitle className="text-sm text-gray-300">🔥 Números Quentes & ❄️ Frios</CardTitle>
                      <p className="text-xs text-gray-500 mt-1">Baseado na estratégia: {lastSelectedStrategy.name}</p>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3 px-4">
                      {(() => {
                        // Obter números da estratégia
                        const strategyNumbers = lastSelectedStrategy.numbers
                        
                        // Contar aparições de cada número da estratégia
                        const numberCounts = strategyNumbers.map(num => ({
                          number: num,
                          count: numbers.filter(n => n === num).length
                        }))
                        
                        // Separar em Quentes (que apareceram) e Frios (que não apareceram)
                        const hotNumbers = numberCounts
                          .filter(nc => nc.count > 0)
                          .sort((a, b) => b.count - a.count) // Mais apareceram primeiro
                        
                        const coldNumbers = numberCounts
                          .filter(nc => nc.count === 0)
                          .map(nc => nc.number)
                          .sort((a, b) => a - b) // Ordem crescente
                        
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
                                  {hotNumbers.map(({ number, count }) => (
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
                                  {coldNumbers.map(number => (
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