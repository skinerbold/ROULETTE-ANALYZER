// ========================================
// API ROUTE - GERADOR DE RELATÓRIO DIÁRIO
// Sistema de 3 Camadas com 12 Sub-Períodos
// Endpoint: /api/daily-report
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { getAllStrategies } from '@/lib/strategies'

// ========================================
// TIPOS E INTERFACES
// ========================================

interface RouletteNumber {
  id?: number
  roulette_id: string
  number: number
  timestamp: number
}

interface Strategy {
  id: number | string
  name: string
  numbers: number[]
  source: 'hardcoded' | 'custom'
}

interface SubPeriodDefinition {
  name: string
  label: string
  startHour: number
  endHour: number
  order: number
  parentPeriod: string
}

interface IntermediatePeriodDefinition {
  name: string
  label: string
  subPeriods: string[]
  order: number
}

interface ReportPart {
  id: number
  report_date: string
  period_name: string
  period_type: 'sub' | 'intermediate' | 'final'
  period_order: number
  content: string
  total_lancamentos: number
  generated_at: string
}

// ========================================
// CONFIGURAÇÃO DE PERÍODOS (3 CAMADAS)
// ========================================

// CAMADA 1: 12 Sub-períodos de 2 horas cada (~2.500 registros cada)
const SUB_PERIODS: SubPeriodDefinition[] = [
  // Madrugada (00:00-05:59)
  { name: 'sub_00_02', label: '🌙 00:00-01:59', startHour: 0, endHour: 1, order: 1, parentPeriod: 'madrugada' },
  { name: 'sub_02_04', label: '🌙 02:00-03:59', startHour: 2, endHour: 3, order: 2, parentPeriod: 'madrugada' },
  { name: 'sub_04_06', label: '🌙 04:00-05:59', startHour: 4, endHour: 5, order: 3, parentPeriod: 'madrugada' },
  
  // Manhã (06:00-11:59)
  { name: 'sub_06_08', label: '☀️ 06:00-07:59', startHour: 6, endHour: 7, order: 4, parentPeriod: 'manha' },
  { name: 'sub_08_10', label: '☀️ 08:00-09:59', startHour: 8, endHour: 9, order: 5, parentPeriod: 'manha' },
  { name: 'sub_10_12', label: '☀️ 10:00-11:59', startHour: 10, endHour: 11, order: 6, parentPeriod: 'manha' },
  
  // Tarde (12:00-17:59)
  { name: 'sub_12_14', label: '🌤️ 12:00-13:59', startHour: 12, endHour: 13, order: 7, parentPeriod: 'tarde' },
  { name: 'sub_14_16', label: '🌤️ 14:00-15:59', startHour: 14, endHour: 15, order: 8, parentPeriod: 'tarde' },
  { name: 'sub_16_18', label: '🌤️ 16:00-17:59', startHour: 16, endHour: 17, order: 9, parentPeriod: 'tarde' },
  
  // Noite (18:00-23:59)
  { name: 'sub_18_20', label: '🌃 18:00-19:59', startHour: 18, endHour: 19, order: 10, parentPeriod: 'noite' },
  { name: 'sub_20_22', label: '🌃 20:00-21:59', startHour: 20, endHour: 21, order: 11, parentPeriod: 'noite' },
  { name: 'sub_22_24', label: '🌃 22:00-23:59', startHour: 22, endHour: 23, order: 12, parentPeriod: 'noite' },
]

// CAMADA 2: 4 Períodos Intermediários de 6 horas cada
const INTERMEDIATE_PERIODS: IntermediatePeriodDefinition[] = [
  { name: 'madrugada', label: '🌙 MADRUGADA (00:00-05:59)', subPeriods: ['sub_00_02', 'sub_02_04', 'sub_04_06'], order: 1 },
  { name: 'manha', label: '☀️ MANHÃ (06:00-11:59)', subPeriods: ['sub_06_08', 'sub_08_10', 'sub_10_12'], order: 2 },
  { name: 'tarde', label: '🌤️ TARDE (12:00-17:59)', subPeriods: ['sub_12_14', 'sub_14_16', 'sub_16_18'], order: 3 },
  { name: 'noite', label: '🌃 NOITE (18:00-23:59)', subPeriods: ['sub_18_20', 'sub_20_22', 'sub_22_24'], order: 4 },
]

// ========================================
// FUNÇÕES UTILITÁRIAS
// ========================================

// Calcular sequências GREEN/RED para uma estratégia
function calculateGreenRedSequences(numbers: number[], strategyNumbers: number[]): { 
  greens: number
  reds: number
  sequences: string
  maxGreenStreak: number
  maxRedStreak: number 
} {
  let greens = 0
  let reds = 0
  const sequences: string[] = []
  
  for (let i = 0; i < numbers.length - 1; i++) {
    if (strategyNumbers.includes(numbers[i])) {
      let foundGreen = false
      for (let j = 1; j <= 3 && i + j < numbers.length; j++) {
        if (strategyNumbers.includes(numbers[i + j])) {
          foundGreen = true
          break
        }
      }
      if (foundGreen) {
        greens++
        sequences.push('G')
      } else {
        reds++
        sequences.push('R')
      }
    }
  }
  
  // Calcular streaks máximos
  let maxGreenStreak = 0, maxRedStreak = 0
  let currentGreen = 0, currentRed = 0
  
  for (const s of sequences) {
    if (s === 'G') {
      currentGreen++
      currentRed = 0
      maxGreenStreak = Math.max(maxGreenStreak, currentGreen)
    } else {
      currentRed++
      currentGreen = 0
      maxRedStreak = Math.max(maxRedStreak, currentRed)
    }
  }
  
  return { greens, reds, sequences: sequences.join(''), maxGreenStreak, maxRedStreak }
}

// Calcular análise de gap de 3 intervalos
function calculateGapAnalysis(numbers: number[], strategyNumbers: number[]): {
  totalGaps: number
  gapsOf3: number
  gapsOf4Plus: number
  avgGap: number
} {
  const gaps: number[] = []
  let lastHitIndex = -1
  
  for (let i = 0; i < numbers.length; i++) {
    if (strategyNumbers.includes(numbers[i])) {
      if (lastHitIndex >= 0) {
        gaps.push(i - lastHitIndex - 1)
      }
      lastHitIndex = i
    }
  }
  
  const gapsOf3 = gaps.filter(g => g === 3).length
  const gapsOf4Plus = gaps.filter(g => g >= 4).length
  const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0
  
  return { totalGaps: gaps.length, gapsOf3, gapsOf4Plus, avgGap: Math.round(avgGap * 10) / 10 }
}

// Calcular números quentes e frios
function calculateHotColdNumbers(numbers: number[]): {
  hot: Array<{ number: number; count: number; percentage: number }>
  cold: Array<{ number: number; count: number; percentage: number }>
  frequency: Record<number, number>
} {
  const frequency: Record<number, number> = {}
  
  // Inicializar todos os números (0-36) com 0
  for (let i = 0; i <= 36; i++) {
    frequency[i] = 0
  }
  
  // Contar frequências
  for (const n of numbers) {
    frequency[n] = (frequency[n] || 0) + 1
  }
  
  // Ordenar por frequência
  const sorted = Object.entries(frequency)
    .map(([num, count]) => ({
      number: parseInt(num),
      count,
      percentage: Math.round((count / numbers.length) * 100 * 10) / 10
    }))
    .sort((a, b) => b.count - a.count)
  
  return {
    hot: sorted.slice(0, 10),
    cold: sorted.slice(-10).reverse(),
    frequency
  }
}

// ========================================
// FUNÇÕES DE BANCO DE DADOS
// ========================================

// Buscar todas as estratégias
async function fetchAllStrategies(supabase: any): Promise<Strategy[]> {
  const strategies: Strategy[] = []
  
  // Hardcoded - até 9 fichas
  const foldersUpTo9 = getAllStrategies('up-to-9')
  for (const folder of foldersUpTo9) {
    for (const strategy of folder.strategies) {
      strategies.push({
        id: strategy.id,
        name: `[${folder.name}] ${strategy.name}`,
        numbers: strategy.numbers,
        source: 'hardcoded'
      })
    }
  }
  
  // Hardcoded - mais de 9 fichas
  const foldersMoreThan9 = getAllStrategies('more-than-9')
  for (const folder of foldersMoreThan9) {
    for (const strategy of folder.strategies) {
      strategies.push({
        id: strategy.id,
        name: `[${folder.name}] ${strategy.name}`,
        numbers: strategy.numbers,
        source: 'hardcoded'
      })
    }
  }
  
  // Customizadas do banco
  const { data, error } = await supabase
    .from('custom_strategies')
    .select('*')
    .eq('is_active', true)
  
  if (!error && data) {
    for (const cs of data) {
      strategies.push({
        id: `custom_${cs.id}`,
        name: `[Customizada] ${cs.name}`,
        numbers: Array.isArray(cs.numbers) 
          ? cs.numbers.map((n: any) => typeof n === 'string' ? parseInt(n, 10) : n)
          : [],
        source: 'custom'
      })
    }
  }
  
  return strategies
}

// Verificar partes já geradas
async function getExistingParts(supabase: any, reportDate: string): Promise<ReportPart[]> {
  const { data, error } = await supabase
    .from('daily_report_parts')
    .select('*')
    .eq('report_date', reportDate)
    .order('period_order', { ascending: true })
  
  if (error) {
    console.error('Erro ao buscar partes existentes:', error)
    return []
  }
  
  return data || []
}

// Salvar parte do relatório
async function saveReportPart(
  supabase: any,
  reportDate: string,
  periodName: string,
  periodType: 'sub' | 'intermediate' | 'final',
  periodOrder: number,
  content: string,
  totalLancamentos: number
): Promise<boolean> {
  const { error } = await supabase
    .from('daily_report_parts')
    .upsert({
      report_date: reportDate,
      period_name: periodName,
      period_type: periodType,
      period_order: periodOrder,
      content: content,
      total_lancamentos: totalLancamentos,
      generated_at: new Date().toISOString()
    }, {
      onConflict: 'report_date,period_name,period_type'
    })
  
  if (error) {
    console.error(`Erro ao salvar parte ${periodName}:`, error)
    return false
  }
  
  console.log(`✅ Parte ${periodName} salva com sucesso!`)
  return true
}

// ========================================
// GERAÇÃO DE RELATÓRIOS - CAMADA 1 (SUB-PERÍODOS)
// ========================================

async function generateSubPeriodReport(
  openai: OpenAI,
  periodData: RouletteNumber[],
  strategies: Strategy[],
  reportDate: Date,
  period: SubPeriodDefinition
): Promise<string> {
  
  if (periodData.length === 0) {
    return `\n## ${period.label}\n\n⚠️ Nenhum dado disponível para este período (${period.startHour}:00-${period.endHour}:59).\n`
  }

  // Agrupar por roleta
  const byRoulette: Record<string, RouletteNumber[]> = {}
  for (const entry of periodData) {
    if (!byRoulette[entry.roulette_id]) byRoulette[entry.roulette_id] = []
    byRoulette[entry.roulette_id].push(entry)
  }

  const roletasCount = Object.keys(byRoulette).length

  // Gerar dados detalhados por roleta com TODOS os números
  const roletasData = Object.entries(byRoulette).map(([rouletteId, entries]) => {
    const numbers = entries.map(e => e.number)
    
    // Análise de números quentes/frios
    const hotCold = calculateHotColdNumbers(numbers)
    
    // Calcular performance das TOP 30 estratégias nesta roleta
    const strategyPerformance = strategies.map(strategy => {
      const result = calculateGreenRedSequences(numbers, strategy.numbers)
      const gapAnalysis = calculateGapAnalysis(numbers, strategy.numbers)
      const total = result.greens + result.reds
      return {
        name: strategy.name,
        numbers: strategy.numbers,
        greens: result.greens,
        reds: result.reds,
        rate: total > 0 ? Math.round((result.greens / total) * 100) : 0,
        sequences: result.sequences,
        maxGreenStreak: result.maxGreenStreak,
        maxRedStreak: result.maxRedStreak,
        gapAnalysis
      }
    }).sort((a, b) => b.rate - a.rate)

    // Estatísticas de cores
    const redsNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
    let redCount = 0, blackCount = 0, greenCount = 0
    for (const n of numbers) {
      if (n === 0) greenCount++
      else if (redsNumbers.includes(n)) redCount++
      else blackCount++
    }

    // Criar sequência completa com horários
    const numbersWithTime = entries.map(e => {
      const time = new Date(e.timestamp)
      return `${e.number}(${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')})`
    })

    return {
      rouletteId,
      totalLancamentos: entries.length,
      numbersWithTime: numbersWithTime.join(', '),
      allNumbers: numbers.join(', '),
      hotNumbers: hotCold.hot.map(h => `${h.number}(${h.count}x/${h.percentage}%)`).join(', '),
      coldNumbers: hotCold.cold.map(c => `${c.number}(${c.count}x/${c.percentage}%)`).join(', '),
      frequencyTable: Object.entries(hotCold.frequency)
        .sort((a, b) => b[1] - a[1])
        .map(([n, c]) => `${n}:${c}`)
        .join(', '),
      redCount, blackCount, greenCount,
      redPercent: Math.round((redCount / numbers.length) * 100),
      blackPercent: Math.round((blackCount / numbers.length) * 100),
      greenPercent: Math.round((greenCount / numbers.length) * 100),
      topStrategies: strategyPerformance.slice(0, 10),
      worstStrategies: strategyPerformance.slice(-5)
    }
  })

  // Calcular ranking geral de estratégias para o sub-período
  const allPeriodNumbers = periodData.map(e => e.number)
  const overallStrategyRanking = strategies.map(strategy => {
    const result = calculateGreenRedSequences(allPeriodNumbers, strategy.numbers)
    const gapAnalysis = calculateGapAnalysis(allPeriodNumbers, strategy.numbers)
    const total = result.greens + result.reds
    return {
      name: strategy.name,
      numbers: strategy.numbers,
      greens: result.greens,
      reds: result.reds,
      rate: total > 0 ? Math.round((result.greens / total) * 100) : 0,
      sequences: result.sequences,
      maxGreenStreak: result.maxGreenStreak,
      maxRedStreak: result.maxRedStreak,
      gapAnalysis
    }
  }).sort((a, b) => b.rate - a.rate)

  // Números quentes/frios gerais do período
  const overallHotCold = calculateHotColdNumbers(allPeriodNumbers)

  // Montar o prompt para este sub-período (REDUZIDO para caber em 30k tokens)
  const prompt = `
# 🎰 SUB-PERÍODO: ${period.label}
## Data: ${reportDate.toLocaleDateString('pt-BR')}

## 📊 ESTATÍSTICAS
- Total: ${periodData.length} lançamentos
- Roletas: ${roletasCount}

## 🔥 QUENTES: ${overallHotCold.hot.slice(0,5).map((h, i) => `${h.number}(${h.count}x)`).join(', ')}
## ❄️ FRIOS: ${overallHotCold.cold.slice(0,5).map((c, i) => `${c.number}(${c.count}x)`).join(', ')}

## 🎰 DADOS POR ROLETA

${roletasData.slice(0, 8).map(r => `
### ${r.rouletteId.toUpperCase()} (${r.totalLancamentos})
🔴${r.redPercent}% ⚫${r.blackPercent}% 🟢${r.greenPercent}%
**Quentes:** ${r.hotNumbers.split(',').slice(0,5).join(',')}
**Frios:** ${r.coldNumbers.split(',').slice(0,5).join(',')}
**Números:** ${r.numbersWithTime}
**Top 5 Estratégias:**
${r.topStrategies.slice(0,5).map((s, i) => `${i+1}. ${s.name}: ${s.rate}% (${s.greens}G/${s.reds}R)`).join('\n')}
`).join('\n---\n')}

## 🏆 TOP 20 ESTRATÉGIAS DO SUB-PERÍODO

${overallStrategyRanking.slice(0, 20).map((s, i) => 
  `${i+1}. ${s.name}: ${s.rate}% (${s.greens}G/${s.reds}R) MaxG:${s.maxGreenStreak} MaxR:${s.maxRedStreak}`
).join('\n')}

---

Gere análise DETALHADA (mínimo 600 palavras):
1. RESUMO do sub-período
2. ANÁLISE por roleta
3. ESTRATÉGIAS dominantes
4. PADRÕES identificados
5. RECOMENDAÇÕES
`

  try {
    console.log(`🤖 Gerando sub-relatório ${period.name}... (${periodData.length} lançamentos, ${roletasCount} roletas)`)
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Analista ESPECIALISTA em roletas. Gere relatórios DETALHADOS. Use Markdown.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.5
    })
    
    return completion.choices[0]?.message?.content || `Erro ao gerar análise do sub-período ${period.name}`
    
  } catch (error: any) {
    console.error(`❌ Erro ao gerar sub-relatório ${period.name}:`, error?.message || error)
    throw error
  }
}

// ========================================
// GERAÇÃO DE RELATÓRIOS - CAMADA 2 (INTERMEDIÁRIOS)
// ========================================

async function generateIntermediateReport(
  openai: OpenAI,
  subReports: string[],
  periodData: RouletteNumber[],
  strategies: Strategy[],
  reportDate: Date,
  period: IntermediatePeriodDefinition
): Promise<string> {

  // Calcular estatísticas consolidadas do período intermediário
  const allNumbers = periodData.map(e => e.number)
  const hotCold = calculateHotColdNumbers(allNumbers)
  
  const byRoulette: Record<string, RouletteNumber[]> = {}
  for (const entry of periodData) {
    if (!byRoulette[entry.roulette_id]) byRoulette[entry.roulette_id] = []
    byRoulette[entry.roulette_id].push(entry)
  }

  // Ranking de estratégias do período
  const strategyRanking = strategies.map(strategy => {
    const result = calculateGreenRedSequences(allNumbers, strategy.numbers)
    const total = result.greens + result.reds
    return {
      name: strategy.name,
      greens: result.greens,
      reds: result.reds,
      rate: total > 0 ? Math.round((result.greens / total) * 100) : 0,
      maxGreenStreak: result.maxGreenStreak,
      maxRedStreak: result.maxRedStreak
    }
  }).sort((a, b) => b.rate - a.rate)

  const consolidationPrompt = `
# 🎰 CONSOLIDAÇÃO: ${period.label}
## Data: ${reportDate.toLocaleDateString('pt-BR')}

## 📊 ESTATÍSTICAS (6 HORAS)
- Total: ${periodData.length} lançamentos
- Roletas: ${Object.keys(byRoulette).length}

## 🔥 QUENTES: ${hotCold.hot.slice(0,5).map(h => `${h.number}(${h.count}x)`).join(', ')}
## ❄️ FRIOS: ${hotCold.cold.slice(0,5).map(c => `${c.number}(${c.count}x)`).join(', ')}

## 🏆 TOP 25 ESTRATÉGIAS

${strategyRanking.slice(0, 25).map((s, i) => 
  `${i+1}. ${s.name}: ${s.rate}% (${s.greens}G/${s.reds}R)`
).join('\n')}

## 📋 SUB-RELATÓRIOS:

${subReports.join('\n\n---\n\n')}

---

Gere CONSOLIDAÇÃO (mínimo 1000 palavras):
1. RESUMO do período
2. COMPARAÇÃO entre sub-períodos
3. EVOLUÇÃO temporal
4. ESTRATÉGIAS consistentes
5. PADRÕES
6. RECOMENDAÇÕES
`

  try {
    console.log(`🤖 Gerando consolidação ${period.name}...`)
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analista ESPECIALISTA em roletas. Consolide relatórios mantendo detalhes. Use Markdown.`
        },
        {
          role: 'user',
          content: consolidationPrompt
        }
      ],
      max_tokens: 6000,
      temperature: 0.5
    })
    
    return completion.choices[0]?.message?.content || `Erro ao gerar consolidação ${period.name}`
    
  } catch (error: any) {
    console.error(`❌ Erro ao gerar consolidação ${period.name}:`, error?.message || error)
    throw error
  }
}

// ========================================
// GERAÇÃO DE RELATÓRIOS - CAMADA 3 (FINAL)
// ========================================

async function generateFinalReport(
  openai: OpenAI,
  intermediateReports: string[],
  rouletteData: RouletteNumber[],
  strategies: Strategy[],
  reportDate: Date
): Promise<string> {

  const byRoulette: Record<string, RouletteNumber[]> = {}
  for (const entry of rouletteData) {
    if (!byRoulette[entry.roulette_id]) byRoulette[entry.roulette_id] = []
    byRoulette[entry.roulette_id].push(entry)
  }

  const allNumbers = rouletteData.map(e => e.number)
  const hotCold = calculateHotColdNumbers(allNumbers)

  // Ranking geral do dia
  const overallRanking = strategies.map(strategy => {
    const result = calculateGreenRedSequences(allNumbers, strategy.numbers)
    const total = result.greens + result.reds
    return {
      name: strategy.name,
      greens: result.greens,
      reds: result.reds,
      rate: total > 0 ? Math.round((result.greens / total) * 100) : 0,
      maxGreenStreak: result.maxGreenStreak,
      maxRedStreak: result.maxRedStreak
    }
  }).sort((a, b) => b.rate - a.rate)

  const finalPrompt = `
# 🎰 RELATÓRIO FINAL - ${reportDate.toLocaleDateString('pt-BR')}

## 📊 ESTATÍSTICAS DO DIA
- Total: ${rouletteData.length} lançamentos
- Roletas: ${Object.keys(byRoulette).length}
- Estratégias: ${strategies.length}

## 🔥 TOP 10 QUENTES
${hotCold.hot.map((h, i) => `${i+1}. ${h.number}: ${h.count}x (${h.percentage}%)`).join('\n')}

## ❄️ TOP 10 FRIOS
${hotCold.cold.map((c, i) => `${i+1}. ${c.number}: ${c.count}x (${c.percentage}%)`).join('\n')}

## 🏆 TOP 30 ESTRATÉGIAS

${overallRanking.slice(0, 30).map((s, i) => 
  `${i+1}. ${s.name}: ${s.rate}% (${s.greens}G/${s.reds}R)`
).join('\n')}

## 📋 CONSOLIDAÇÕES (4 PERÍODOS):

${intermediateReports.join('\n\n---\n\n')}

---

Gere RELATÓRIO FINAL (mínimo 2000 palavras):
1. RESUMO EXECUTIVO
2. COMPARAÇÃO entre períodos
3. CONSOLIDAÇÃO por roleta
4. PADRÕES do dia
5. SUGESTÕES de novas estratégias (mínimo 8)
6. CONCLUSÕES e recomendações
`

  try {
    console.log('🤖 Gerando relatório FINAL...')
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analista ESPECIALISTA em roletas. Gere RELATÓRIO FINAL COMPLETO. Mínimo 2000 palavras. Use Markdown.`
        },
        {
          role: 'user',
          content: finalPrompt
        }
      ],
      max_tokens: 10000,
      temperature: 0.5
    })
    
    return completion.choices[0]?.message?.content || 'Erro ao gerar relatório final'
    
  } catch (error: any) {
    console.error('❌ Erro ao gerar relatório final:', error?.message || error)
    throw error
  }
}

// ========================================
// FUNÇÃO PRINCIPAL DE GERAÇÃO
// ========================================

async function generateAnalysis(
  openai: OpenAI,
  supabase: any,
  rouletteData: RouletteNumber[],
  strategies: Strategy[],
  reportDate: Date,
  reportDateStr: string
): Promise<{ report: string; progress: string; completed: boolean }> {
  
  console.log(`\n📊 ========================================`)
  console.log(`📊 SISTEMA DE 3 CAMADAS - 12 SUB-PERÍODOS`)
  console.log(`📊 Data: ${reportDate.toLocaleDateString('pt-BR')}`)
  console.log(`📊 Total: ${rouletteData.length} lançamentos`)
  console.log(`📊 Estratégias: ${strategies.length}`)
  console.log(`📊 ========================================\n`)

  // Verificar partes já geradas (para retomar se houver timeout)
  const existingParts = await getExistingParts(supabase, reportDateStr)
  const existingSubParts = existingParts.filter(p => p.period_type === 'sub')
  const existingIntermediateParts = existingParts.filter(p => p.period_type === 'intermediate')
  const existingFinalPart = existingParts.find(p => p.period_type === 'final')

  console.log(`📋 Partes existentes:`)
  console.log(`   - Sub-períodos: ${existingSubParts.length}/12`)
  console.log(`   - Intermediários: ${existingIntermediateParts.length}/4`)
  console.log(`   - Final: ${existingFinalPart ? 'SIM' : 'NÃO'}`)

  // Se já tem relatório final, retornar ele
  if (existingFinalPart) {
    console.log(`✅ Relatório final já existe! Retornando...`)
    return {
      report: assembleFullReport(existingParts, rouletteData, strategies, reportDate),
      progress: 'Relatório completo já gerado anteriormente',
      completed: true
    }
  }

  // Separar dados por sub-período
  const dataBySubPeriod: Record<string, RouletteNumber[]> = {}
  for (const subPeriod of SUB_PERIODS) {
    dataBySubPeriod[subPeriod.name] = []
  }

  for (const entry of rouletteData) {
    const hour = new Date(entry.timestamp).getHours()
    const subPeriod = SUB_PERIODS.find(sp => hour >= sp.startHour && hour <= sp.endHour)
    if (subPeriod) {
      dataBySubPeriod[subPeriod.name].push(entry)
    }
  }

  console.log(`\n📊 Distribuição por sub-período:`)
  for (const sp of SUB_PERIODS) {
    console.log(`   ${sp.label}: ${dataBySubPeriod[sp.name].length} lançamentos`)
  }

  // ========================================
  // CAMADA 1: Gerar sub-relatórios faltantes
  // ========================================
  
  const existingSubNames = new Set(existingSubParts.map(p => p.period_name))
  let generatedCount = existingSubParts.length

  for (const subPeriod of SUB_PERIODS) {
    if (existingSubNames.has(subPeriod.name)) {
      console.log(`⏭️ Sub-período ${subPeriod.name} já existe, pulando...`)
      continue
    }

    const subData = dataBySubPeriod[subPeriod.name]
    console.log(`\n🔄 Gerando ${subPeriod.label} (${subData.length} lançamentos)...`)

    try {
      const report = await generateSubPeriodReport(openai, subData, strategies, reportDate, subPeriod)
      await saveReportPart(supabase, reportDateStr, subPeriod.name, 'sub', subPeriod.order, report, subData.length)
      generatedCount++
      
      // Pequena pausa entre chamadas
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error: any) {
      console.error(`❌ Falha no sub-período ${subPeriod.name}:`, error?.message)
      return {
        report: '',
        progress: `Gerados ${generatedCount}/12 sub-relatórios. Erro em ${subPeriod.name}. Chame novamente para continuar.`,
        completed: false
      }
    }
  }

  // Recarregar partes após gerar sub-relatórios
  const updatedParts = await getExistingParts(supabase, reportDateStr)
  const allSubParts = updatedParts.filter(p => p.period_type === 'sub')

  if (allSubParts.length < 12) {
    return {
      report: '',
      progress: `Gerados ${allSubParts.length}/12 sub-relatórios. Chame novamente para continuar.`,
      completed: false
    }
  }

  console.log(`\n✅ Todos os 12 sub-relatórios gerados!`)

  // ========================================
  // CAMADA 2: Gerar relatórios intermediários
  // ========================================

  const existingIntermediateNames = new Set(updatedParts.filter(p => p.period_type === 'intermediate').map(p => p.period_name))

  for (const intPeriod of INTERMEDIATE_PERIODS) {
    if (existingIntermediateNames.has(intPeriod.name)) {
      console.log(`⏭️ Intermediário ${intPeriod.name} já existe, pulando...`)
      continue
    }

    // Buscar sub-relatórios deste período intermediário
    const subReports = intPeriod.subPeriods.map(spName => {
      const part = allSubParts.find(p => p.period_name === spName)
      return part?.content || ''
    }).filter(Boolean)

    // Dados do período intermediário
    const intData = intPeriod.subPeriods.flatMap(spName => dataBySubPeriod[spName] || [])

    console.log(`\n🔄 Gerando consolidação ${intPeriod.label} (${intData.length} lançamentos)...`)

    try {
      const report = await generateIntermediateReport(openai, subReports, intData, strategies, reportDate, intPeriod)
      await saveReportPart(supabase, reportDateStr, intPeriod.name, 'intermediate', intPeriod.order, report, intData.length)
      
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error: any) {
      console.error(`❌ Falha no intermediário ${intPeriod.name}:`, error?.message)
      return {
        report: '',
        progress: `Sub-relatórios completos. Erro na consolidação ${intPeriod.name}. Chame novamente para continuar.`,
        completed: false
      }
    }
  }

  // Recarregar partes
  const finalParts = await getExistingParts(supabase, reportDateStr)
  const allIntermediateParts = finalParts.filter(p => p.period_type === 'intermediate')

  if (allIntermediateParts.length < 4) {
    return {
      report: '',
      progress: `Intermediários: ${allIntermediateParts.length}/4. Chame novamente para continuar.`,
      completed: false
    }
  }

  console.log(`\n✅ Todas as 4 consolidações intermediárias geradas!`)

  // ========================================
  // CAMADA 3: Gerar relatório final
  // ========================================

  console.log(`\n🔄 Gerando relatório FINAL...`)

  const intermediateReports = INTERMEDIATE_PERIODS.map(ip => {
    const part = allIntermediateParts.find(p => p.period_name === ip.name)
    return part?.content || ''
  }).filter(Boolean)

  try {
    const finalReport = await generateFinalReport(openai, intermediateReports, rouletteData, strategies, reportDate)
    await saveReportPart(supabase, reportDateStr, 'final', 'final', 1, finalReport, rouletteData.length)
    
    // Montar relatório completo
    const allParts = await getExistingParts(supabase, reportDateStr)
    const completeReport = assembleFullReport(allParts, rouletteData, strategies, reportDate)

    return {
      report: completeReport,
      progress: 'Relatório completo gerado com sucesso!',
      completed: true
    }
  } catch (error: any) {
    console.error(`❌ Falha no relatório final:`, error?.message)
    return {
      report: '',
      progress: `Todas as partes geradas. Erro no relatório final. Chame novamente para continuar.`,
      completed: false
    }
  }
}

// Montar relatório completo a partir das partes
function assembleFullReport(
  parts: ReportPart[],
  rouletteData: RouletteNumber[],
  strategies: Strategy[],
  reportDate: Date
): string {
  const subParts = parts.filter(p => p.period_type === 'sub').sort((a, b) => a.period_order - b.period_order)
  const intermediateParts = parts.filter(p => p.period_type === 'intermediate').sort((a, b) => a.period_order - b.period_order)
  const finalPart = parts.find(p => p.period_type === 'final')

  return `
# 🎰 RELATÓRIO COMPLETO DE ROLETAS - ${reportDate.toLocaleDateString('pt-BR')}

## 📊 ESTATÍSTICAS GERAIS
- **Data:** ${reportDate.toLocaleDateString('pt-BR')}
- **Total de lançamentos:** ${rouletteData.length}
- **Roletas monitoradas:** ${[...new Set(rouletteData.map(r => r.roulette_id))].length}
- **Estratégias analisadas:** ${strategies.length}

---

# 📑 PARTE 1: RELATÓRIOS DOS 12 SUB-PERÍODOS (2H CADA)

${subParts.map(p => p.content).join('\n\n---\n\n')}

---

# 📑 PARTE 2: CONSOLIDAÇÕES INTERMEDIÁRIAS (6H CADA)

${intermediateParts.map(p => p.content).join('\n\n---\n\n')}

---

# 📑 PARTE 3: RELATÓRIO FINAL CONSOLIDADO

${finalPart?.content || 'Relatório final ainda não gerado.'}

---

*Relatório gerado em ${new Date().toLocaleString('pt-BR')}*
*Sistema de Análise de Roletas v3.0 - 3 Camadas*
`
}

// ========================================
// ENDPOINTS HTTP
// ========================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    
    // Configurar clientes
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const openaiKey = process.env.OPENAI_API_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 })
    }
    
    if (!openaiKey) {
      return NextResponse.json({ error: 'OpenAI API Key não configurada' }, { status: 500 })
    }
    
    const supabase = createClient<any>(supabaseUrl, supabaseKey)
    const openai = new OpenAI({ apiKey: openaiKey })
    
    // Definir data do relatório
    let reportDate: Date
    if (dateParam) {
      const [year, month, day] = dateParam.split('-').map(Number)
      reportDate = new Date(year, month - 1, day)
    } else {
      reportDate = new Date()
      reportDate.setDate(reportDate.getDate() - 1)
    }
    
    const reportDateStr = reportDate.toISOString().split('T')[0]
    
    // Timestamps para busca
    const startOfDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate(), 0, 0, 0)
    const endOfDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate(), 23, 59, 59, 999)
    const startTimestamp = startOfDay.getTime()
    const endTimestamp = endOfDay.getTime()
    
    console.log('📊 Gerando relatório para:', reportDateStr)
    
    // Buscar TODOS os dados do dia com paginação
    let allRouletteData: RouletteNumber[] = []
    let hasMore = true
    let offset = 0
    const pageSize = 1000
    
    while (hasMore) {
      const { data: pageData, error: pageError } = await supabase
        .from('roulette_history')
        .select('*')
        .gte('timestamp', startTimestamp)
        .lte('timestamp', endTimestamp)
        .order('timestamp', { ascending: true })
        .range(offset, offset + pageSize - 1)
      
      if (pageError) {
        console.error('Erro ao buscar dados:', pageError)
        return NextResponse.json({ error: 'Erro ao buscar dados das roletas' }, { status: 500 })
      }
      
      if (pageData && pageData.length > 0) {
        allRouletteData = allRouletteData.concat(pageData)
        offset += pageSize
        hasMore = pageData.length === pageSize
        console.log(`📊 Página ${Math.ceil(offset / pageSize)}: ${pageData.length} registros (total: ${allRouletteData.length})`)
      } else {
        hasMore = false
      }
    }
    
    console.log(`✅ Total: ${allRouletteData.length} lançamentos`)
    
    // Buscar estratégias
    const strategies = await fetchAllStrategies(supabase)
    
    // Gerar análise (com sistema de retomada)
    const result = await generateAnalysis(openai, supabase, allRouletteData, strategies, reportDate, reportDateStr)
    
    // Salvar relatório completo na tabela principal (se completou)
    let reportId = null
    if (result.completed) {
      reportId = await saveReportToSupabase(supabase, result.report, reportDate, allRouletteData.length, strategies.length)
    }
    
    return NextResponse.json({
      success: result.completed,
      reportId,
      date: reportDateStr,
      progress: result.progress,
      stats: {
        totalLancamentos: allRouletteData.length,
        totalEstrategias: strategies.length,
        roletasAnalisadas: [...new Set(allRouletteData.map(r => r.roulette_id))].length
      },
      report: result.completed ? result.report : undefined
    })
    
  } catch (error) {
    console.error('Erro ao gerar relatório:', error)
    return NextResponse.json({ 
      error: 'Erro interno ao gerar relatório',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    return await GET(request)
    
  } catch (error) {
    console.error('Erro no cron job:', error)
    return NextResponse.json({ error: 'Erro ao executar cron job' }, { status: 500 })
  }
}

// Salvar relatório completo no Supabase
async function saveReportToSupabase(
  supabase: any,
  content: string,
  reportDate: Date,
  totalLancamentos: number,
  totalEstrategias: number
): Promise<number | null> {
  const { data, error } = await supabase
    .from('daily_reports')
    .upsert({
      report_date: reportDate.toISOString().split('T')[0],
      content: content,
      total_lancamentos: totalLancamentos,
      total_estrategias: totalEstrategias,
      generated_at: new Date().toISOString()
    }, {
      onConflict: 'report_date'
    })
    .select('id')
    .single()
  
  if (error) {
    console.error('Erro ao salvar relatório:', error)
    return null
  }
  
  return data?.id || null
}
