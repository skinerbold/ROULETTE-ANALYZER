// ========================================
// API ROUTE - GERADOR DE RELATÓRIO DIÁRIO
// Endpoint: /api/daily-report
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { getAllStrategies } from '@/lib/strategies'

// Tipos
interface RouletteNumber {
  id?: number
  roulette_id: string
  number: number
  timestamp: number // bigint em milissegundos na tabela roulette_history
}

interface Strategy {
  id: number | string
  name: string
  numbers: number[]
  source: 'hardcoded' | 'custom'
}

// GET - Gerar relatório do dia atual ou data específica
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date') // formato: YYYY-MM-DD
    
    // Configurar cliente Supabase
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
      reportDate = new Date(dateParam)
    } else {
      // Por padrão, gerar relatório do dia anterior (meia-noite)
      reportDate = new Date()
      reportDate.setDate(reportDate.getDate() - 1)
    }
    
    const startOfDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate(), 0, 0, 0)
    const endOfDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate(), 23, 59, 59)
    
    // Converter para timestamps em milissegundos (formato usado em roulette_history)
    const startTimestamp = startOfDay.getTime()
    const endTimestamp = endOfDay.getTime()
    
    console.log('📊 Gerando relatório para:', startOfDay.toISOString(), '-', endOfDay.toISOString())
    
    // 1. Buscar dados das roletas da tabela roulette_history existente
    const { data: rouletteData, error: rouletteError } = await supabase
      .from('roulette_history')
      .select('*')
      .gte('timestamp', startTimestamp)
      .lte('timestamp', endTimestamp)
      .order('timestamp', { ascending: true })
    
    if (rouletteError) {
      console.error('Erro ao buscar dados:', rouletteError)
      return NextResponse.json({ error: 'Erro ao buscar dados das roletas' }, { status: 500 })
    }
    
    // 2. Buscar todas as estratégias
    const strategies = await fetchAllStrategies(supabase)
    
    // 3. Gerar análise com ChatGPT
    const analysis = await generateAnalysis(openai, rouletteData || [], strategies, startOfDay)
    
    // 4. Salvar relatório no Supabase
    const reportId = await saveReportToSupabase(supabase, analysis, startOfDay, rouletteData?.length || 0, strategies.length)
    
    return NextResponse.json({
      success: true,
      reportId,
      date: startOfDay.toISOString().split('T')[0],
      stats: {
        totalLancamentos: rouletteData?.length || 0,
        totalEstrategias: strategies.length,
        roletasAnalisadas: [...new Set(rouletteData?.map(r => r.roulette_id) || [])].length
      },
      report: analysis
    })
    
  } catch (error) {
    console.error('Erro ao gerar relatório:', error)
    return NextResponse.json({ 
      error: 'Erro interno ao gerar relatório',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// POST - Agendar geração de relatório (para cron jobs)
export async function POST(request: NextRequest) {
  try {
    // Verificar autorização (token secreto para cron jobs)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    // Chamar GET para gerar o relatório
    const response = await GET(request)
    return response
    
  } catch (error) {
    console.error('Erro no cron job:', error)
    return NextResponse.json({ error: 'Erro ao executar cron job' }, { status: 500 })
  }
}

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

// Gerar análise com ChatGPT
async function generateAnalysis(
  openai: OpenAI,
  rouletteData: RouletteNumber[],
  strategies: Strategy[],
  reportDate: Date
): Promise<string> {
  // Agrupar dados por roleta
  const byRoulette: Record<string, RouletteNumber[]> = {}
  for (const entry of rouletteData) {
    const key = entry.roulette_id
    if (!byRoulette[key]) byRoulette[key] = []
    byRoulette[key].push(entry)
  }
  
  // Agrupar por período com sub-horários detalhados
  const getSubPeriod = (hour: number): string => {
    if (hour >= 0 && hour < 2) return 'madrugada_0-2h'
    if (hour >= 2 && hour < 4) return 'madrugada_2-4h'
    if (hour >= 4 && hour < 6) return 'madrugada_4-6h'
    if (hour >= 6 && hour < 8) return 'manha_6-8h'
    if (hour >= 8 && hour < 10) return 'manha_8-10h'
    if (hour >= 10 && hour < 12) return 'manha_10-12h'
    if (hour >= 12 && hour < 14) return 'tarde_12-14h'
    if (hour >= 14 && hour < 16) return 'tarde_14-16h'
    if (hour >= 16 && hour < 18) return 'tarde_16-18h'
    if (hour >= 18 && hour < 20) return 'noite_18-20h'
    if (hour >= 20 && hour < 22) return 'noite_20-22h'
    return 'noite_22-24h'
  }

  const bySubPeriod: Record<string, RouletteNumber[]> = {}
  for (const entry of rouletteData) {
    const hour = new Date(entry.timestamp).getHours()
    const subPeriod = getSubPeriod(hour)
    if (!bySubPeriod[subPeriod]) bySubPeriod[subPeriod] = []
    bySubPeriod[subPeriod].push(entry)
  }
  
  // Dados detalhados por hora
  const byHour: Record<number, RouletteNumber[]> = {}
  for (const entry of rouletteData) {
    const hour = new Date(entry.timestamp).getHours()
    if (!byHour[hour]) byHour[hour] = []
    byHour[hour].push(entry)
  }

  // Calcular sequências GREEN/RED para cada estratégia em cada roleta
  const calculateGreenRedSequences = (numbers: number[], strategyNumbers: number[]): { greens: number, reds: number, sequences: string[] } => {
    let greens = 0
    let reds = 0
    const sequences: string[] = []
    
    for (let i = 0; i < numbers.length - 1; i++) {
      if (strategyNumbers.includes(numbers[i])) {
        // Verificar se próximos 3 números contêm algum da estratégia
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
    return { greens, reds, sequences }
  }

  // Analisar performance de cada estratégia por roleta
  const strategyPerformanceByRoulette: Record<string, Record<string, { greens: number, reds: number, rate: number, sequences: string }>> = {}
  
  for (const [rouletteId, entries] of Object.entries(byRoulette)) {
    strategyPerformanceByRoulette[rouletteId] = {}
    const numbers = entries.map(e => e.number)
    
    for (const strategy of strategies.slice(0, 100)) { // Top 100 estratégias para análise detalhada
      const result = calculateGreenRedSequences(numbers, strategy.numbers)
      const total = result.greens + result.reds
      strategyPerformanceByRoulette[rouletteId][strategy.name] = {
        greens: result.greens,
        reds: result.reds,
        rate: total > 0 ? Math.round((result.greens / total) * 100) : 0,
        sequences: result.sequences.slice(-20).join('')
      }
    }
  }

  // Calcular performance geral de cada estratégia
  const overallStrategyPerformance: { name: string, greens: number, reds: number, rate: number }[] = []
  for (const strategy of strategies) {
    const allNumbers = rouletteData.map(e => e.number)
    const result = calculateGreenRedSequences(allNumbers, strategy.numbers)
    const total = result.greens + result.reds
    overallStrategyPerformance.push({
      name: strategy.name,
      greens: result.greens,
      reds: result.reds,
      rate: total > 0 ? Math.round((result.greens / total) * 100) : 0
    })
  }
  overallStrategyPerformance.sort((a, b) => b.rate - a.rate)

  // Gerar dados completos por roleta
  const detailedRouletteData = Object.entries(byRoulette).map(([rouletteId, entries]) => {
    const numbers = entries.map(e => e.number)
    const frequency: Record<number, number> = {}
    for (const n of numbers) {
      frequency[n] = (frequency[n] || 0) + 1
    }
    const sortedFreq = Object.entries(frequency).sort((a, b) => b[1] - a[1])
    
    // Performance das top 20 estratégias nesta roleta
    const stratPerf = strategyPerformanceByRoulette[rouletteId] || {}
    const topStrategies = Object.entries(stratPerf)
      .sort((a, b) => b[1].rate - a[1].rate)
      .slice(0, 20)
      .map(([name, data]) => `${name}: ${data.rate}% (${data.greens}G/${data.reds}R) [${data.sequences}]`)
    
    const worstStrategies = Object.entries(stratPerf)
      .sort((a, b) => a[1].rate - b[1].rate)
      .slice(0, 10)
      .map(([name, data]) => `${name}: ${data.rate}% (${data.greens}G/${data.reds}R)`)

    // Distribuição por hora nesta roleta
    const hourlyDist: Record<number, number> = {}
    for (const e of entries) {
      const h = new Date(e.timestamp).getHours()
      hourlyDist[h] = (hourlyDist[h] || 0) + 1
    }

    return {
      rouletteId,
      totalLancamentos: entries.length,
      allNumbers: numbers.join(', '),
      mostFrequent: sortedFreq.slice(0, 10).map(([n, c]) => `${n}(${c}x)`).join(', '),
      leastFrequent: sortedFreq.slice(-10).map(([n, c]) => `${n}(${c}x)`).join(', '),
      hourlyDistribution: Object.entries(hourlyDist).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([h, c]) => `${h}h:${c}`).join(', '),
      topStrategies: topStrategies.join('\n    '),
      worstStrategies: worstStrategies.join('\n    ')
    }
  })

  // Gerar dados por sub-período
  const subPeriodData = Object.entries(bySubPeriod)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, entries]) => {
      const numbers = entries.map(e => e.number)
      const frequency: Record<number, number> = {}
      for (const n of numbers) {
        frequency[n] = (frequency[n] || 0) + 1
      }
      const sortedFreq = Object.entries(frequency).sort((a, b) => b[1] - a[1])
      
      return {
        period,
        total: entries.length,
        numbers: numbers.join(', '),
        topNumbers: sortedFreq.slice(0, 5).map(([n, c]) => `${n}(${c}x)`).join(', '),
        roulettes: [...new Set(entries.map(e => e.roulette_id))].join(', ')
      }
    })

  const prompt = `
# 🎰 ANÁLISE COMPLETA E APROFUNDADA DE ROLETAS - ${reportDate.toLocaleDateString('pt-BR')}

Você é um analista ESPECIALISTA em dados de roletas. Preciso de um relatório EXTREMAMENTE DETALHADO e APROFUNDADO.
NÃO RESUMA NADA. Quero TODOS os detalhes possíveis.

---

## 📊 DADOS COMPLETOS DO DIA (${rouletteData.length} LANÇAMENTOS)

### Resumo Geral
- **Total de lançamentos:** ${rouletteData.length}
- **Roletas monitoradas:** ${Object.keys(byRoulette).length}
- **Total de estratégias:** ${strategies.length}
- **Período:** 00:00 até 23:59

### 📅 DISTRIBUIÇÃO POR SUB-PERÍODO (a cada 2 horas)
${subPeriodData.map(p => `
**${p.period}** (${p.total} lançamentos)
- Roletas ativas: ${p.roulettes}
- Números mais frequentes: ${p.topNumbers}
- Sequência completa: [${p.numbers}]
`).join('\n')}

### 🎰 DADOS COMPLETOS POR ROLETA
${detailedRouletteData.map(r => `
#### ROLETA: ${r.rouletteId}
- **Total de lançamentos:** ${r.totalLancamentos}
- **Distribuição por hora:** ${r.hourlyDistribution}
- **Números mais frequentes:** ${r.mostFrequent}
- **Números menos frequentes:** ${r.leastFrequent}
- **SEQUÊNCIA COMPLETA DE NÚMEROS:** [${r.allNumbers}]

**TOP 20 MELHORES ESTRATÉGIAS NESTA ROLETA (com sequências G/R):**
    ${r.topStrategies}

**10 PIORES ESTRATÉGIAS NESTA ROLETA:**
    ${r.worstStrategies}
`).join('\n---\n')}

### 🏆 RANKING GERAL DAS ESTRATÉGIAS (TOP 30)
${overallStrategyPerformance.slice(0, 30).map((s, i) => 
  `${i + 1}. **${s.name}**: ${s.rate}% (${s.greens} GREEN / ${s.reds} RED)`
).join('\n')}

### ❌ PIORES ESTRATÉGIAS DO DIA (BOTTOM 20)
${overallStrategyPerformance.slice(-20).reverse().map((s, i) => 
  `${i + 1}. **${s.name}**: ${s.rate}% (${s.greens} GREEN / ${s.reds} RED)`
).join('\n')}

### 📋 TODAS AS ESTRATÉGIAS DISPONÍVEIS
${strategies.map(s => `- ${s.name}: [${s.numbers.join(', ')}]`).join('\n')}

---

## 📝 INSTRUÇÕES OBRIGATÓRIAS PARA O RELATÓRIO

Gere um relatório COMPLETO e APROFUNDADO com as seguintes seções. NÃO PULE NENHUMA. NÃO RESUMA.

### 1. 📋 RESUMO EXECUTIVO (detalhado)
- Todas as principais descobertas do dia
- Alertas críticos identificados
- Visão geral de desempenho de CADA período do dia

### 2. 🎯 ANÁLISE DETALHADA POR ESTRATÉGIA
- Analise as TOP 50 estratégias individualmente
- Para cada uma: taxa de acerto, melhor horário, melhor roleta, pior roleta
- Inclua as sequências de GREEN/RED observadas
- Identifique padrões de quando cada estratégia funciona melhor

### 3. ⏰ ANÁLISE COMPLETA POR PERÍODO DO DIA
Divida em SUB-PERÍODOS de 2 horas cada:
- **Madrugada 0-2h, 2-4h, 4-6h**
- **Manhã 6-8h, 8-10h, 10-12h**
- **Tarde 12-14h, 14-16h, 16-18h**
- **Noite 18-20h, 20-22h, 22-24h**

Para CADA sub-período:
- Quantidade de lançamentos
- Números mais frequentes
- Estratégias que mais acertaram
- Padrões identificados
- Recomendações específicas

### 4. 🎰 ANÁLISE INDIVIDUAL DE CADA ROLETA
Para CADA roleta listada acima, forneça:
- Análise completa de números (frequência, padrões)
- Ranking das 20 MELHORES estratégias para esta roleta específica (com % e G/R)
- Ranking das 10 PIORES estratégias para esta roleta
- Melhores horários de atividade desta roleta
- Padrões únicos desta roleta
- Recomendações específicas para jogar nesta roleta

### 5. 🏆 RANKINGS COMPLETOS POR ROLETA
Crie uma TABELA DETALHADA para CADA roleta mostrando:
| Posição | Estratégia | Taxa Acerto | Greens | Reds | Sequência G/R |

### 6. 🔍 PADRÕES IDENTIFICADOS (MUITO DETALHADO)
- Sequências de números que se repetem (ex: 14, 25, 36 apareceu 5 vezes seguidas)
- Correlações entre roletas (quando uma roleta tem X, outra tende a ter Y)
- Tendências horárias detalhadas
- Números "quentes" e "frios" por período
- Ciclos identificados (ex: a cada N lançamentos, padrão X se repete)
- Anomalias estatísticas encontradas

### 7. 🔴🟢 ANÁLISE DE SEQUÊNCIAS GREEN/RED
- Maiores sequências de GREEN consecutivos por estratégia
- Maiores sequências de RED consecutivos por estratégia
- Padrões de alternância G/R
- Momentos de virada (quando RED vira GREEN e vice-versa)

### 8. 💡 SUGESTÕES DE NOVAS ESTRATÉGIAS (MÍNIMO 15)
Para cada nova estratégia:
- Nome criativo
- Números exatos: [lista completa]
- Justificativa DETALHADA baseada nos dados analisados
- Horário ideal de uso
- Roleta ideal para uso
- Taxa de acerto esperada baseada nos padrões observados

### 9. 📊 CONCLUSÕES E RECOMENDAÇÕES DETALHADAS
- Resumo de TODAS as descobertas importantes
- Estratégias recomendadas para cada horário
- Estratégias recomendadas para cada roleta
- Alertas e avisos importantes
- Previsões baseadas nos padrões

---

⚠️ IMPORTANTE:
- Use TABELAS Markdown sempre que possível
- Seja EXTREMAMENTE específico com números e porcentagens
- NÃO GENERALIZE - quero dados concretos
- Analise TODOS os dados fornecidos
- O relatório deve ter NO MÍNIMO 3000 palavras
- Inclua TODAS as roletas na análise individual
`

  try {
    console.log('🤖 Enviando para ChatGPT análise completa...')
    console.log(`📊 Dados: ${rouletteData.length} lançamentos, ${strategies.length} estratégias, ${Object.keys(byRoulette).length} roletas`)
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Você é um analista de dados ESPECIALISTA em jogos de roleta com anos de experiência. 
Sua função é gerar relatórios EXTREMAMENTE DETALHADOS e APROFUNDADOS.
NUNCA resuma ou simplifique os dados.
Use tabelas Markdown, emojis e formatação clara.
Seja MUITO específico com números, porcentagens e estatísticas.
Analise TODOS os dados fornecidos sem exceção.
O relatório DEVE ter no mínimo 3000 palavras.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 16000,
      temperature: 0.5
    })
    
    return completion.choices[0]?.message?.content || 'Erro ao gerar análise'
    
  } catch (error) {
    console.error('Erro ChatGPT:', error)
    return generateFallbackReport(rouletteData, strategies, reportDate)
  }
}

// Relatório de fallback
function generateFallbackReport(
  rouletteData: RouletteNumber[],
  strategies: Strategy[],
  reportDate: Date
): string {
  return `
# 📊 Relatório Diário - ${reportDate.toLocaleDateString('pt-BR')}

## ⚠️ Relatório Simplificado
A análise via ChatGPT não estava disponível.

## Dados Coletados
- **Lançamentos:** ${rouletteData.length}
- **Estratégias:** ${strategies.length}
- **Roletas:** ${[...new Set(rouletteData.map(r => r.roulette_id))].length}

---
*Gerado em ${new Date().toISOString()}*
`
}

// Salvar relatório no Supabase
async function saveReportToSupabase(
  supabase: any,
  content: string,
  reportDate: Date,
  totalLancamentos: number,
  totalEstrategias: number
): Promise<number | null> {
  const { data, error } = await supabase
    .from('daily_reports')
    .insert({
      report_date: reportDate.toISOString().split('T')[0],
      content: content,
      total_lancamentos: totalLancamentos,
      total_estrategias: totalEstrategias,
      generated_at: new Date().toISOString()
    })
    .select('id')
    .single()
  
  if (error) {
    console.error('Erro ao salvar relatório:', error)
    // Se a tabela não existir, retornar null mas não falhar
    return null
  }
  
  return data?.id || null
}
