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
    
    // Definir data do relatório (considerando fuso horário de Brasília UTC-3)
    let reportDate: Date
    if (dateParam) {
      // Parse manual para evitar problemas de fuso horário
      const [year, month, day] = dateParam.split('-').map(Number)
      reportDate = new Date(year, month - 1, day)
    } else {
      // Por padrão, gerar relatório do dia anterior
      reportDate = new Date()
      reportDate.setDate(reportDate.getDate() - 1)
    }
    
    // Criar timestamps para início e fim do dia em horário local (Brasília)
    const startOfDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate(), 0, 0, 0)
    const endOfDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate(), 23, 59, 59, 999)
    
    // Converter para timestamps em milissegundos (formato usado em roulette_history)
    const startTimestamp = startOfDay.getTime()
    const endTimestamp = endOfDay.getTime()
    
    console.log('📊 Gerando relatório para:', startOfDay.toLocaleDateString('pt-BR'), '00:00 até 23:59')
    console.log('📊 Timestamps:', startTimestamp, '-', endTimestamp)
    
    // 1. Buscar dados das roletas da tabela roulette_history existente
    // IMPORTANTE: Usar paginação para buscar TODOS os dados do dia (Supabase limita a 1000 por padrão)
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
        hasMore = pageData.length === pageSize // Se retornou menos que o pageSize, não há mais dados
        console.log(`📊 Página ${Math.ceil(offset / pageSize)}: ${pageData.length} registros (total: ${allRouletteData.length})`)
      } else {
        hasMore = false
      }
    }
    
    const rouletteData = allRouletteData
    
    console.log(`✅ Total de lançamentos carregados: ${rouletteData.length}`)
    
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

// Definição de períodos do dia
interface PeriodDefinition {
  name: string
  label: string
  startHour: number
  endHour: number
}

const PERIODS: PeriodDefinition[] = [
  { name: 'madrugada', label: '🌙 MADRUGADA (00:00 - 05:59)', startHour: 0, endHour: 5 },
  { name: 'manha', label: '☀️ MANHÃ (06:00 - 11:59)', startHour: 6, endHour: 11 },
  { name: 'tarde', label: '🌤️ TARDE (12:00 - 17:59)', startHour: 12, endHour: 17 },
  { name: 'noite', label: '🌃 NOITE (18:00 - 23:59)', startHour: 18, endHour: 23 },
]

// Calcular sequências GREEN/RED
function calculateGreenRedSequences(numbers: number[], strategyNumbers: number[]): { greens: number, reds: number, sequences: string } {
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
  return { greens, reds, sequences: sequences.join('') }
}

// Gerar relatório parcial para um período específico
async function generatePeriodReport(
  openai: OpenAI,
  periodData: RouletteNumber[],
  strategies: Strategy[],
  reportDate: Date,
  period: PeriodDefinition
): Promise<string> {
  
  if (periodData.length === 0) {
    return `\n## ${period.label}\n\n⚠️ Nenhum dado disponível para este período.\n`
  }

  // Agrupar por roleta
  const byRoulette: Record<string, RouletteNumber[]> = {}
  for (const entry of periodData) {
    if (!byRoulette[entry.roulette_id]) byRoulette[entry.roulette_id] = []
    byRoulette[entry.roulette_id].push(entry)
  }

  // Gerar dados detalhados por roleta com TODOS os números
  const roletasData = Object.entries(byRoulette).map(([rouletteId, entries]) => {
    const numbers = entries.map(e => e.number)
    
    // Frequência de cada número
    const frequency: Record<number, number> = {}
    for (const n of numbers) {
      frequency[n] = (frequency[n] || 0) + 1
    }
    const sortedFreq = Object.entries(frequency).sort((a, b) => b[1] - a[1])
    
    // Calcular performance das estratégias nesta roleta
    const strategyPerformance = strategies.map(strategy => {
      const result = calculateGreenRedSequences(numbers, strategy.numbers)
      const total = result.greens + result.reds
      return {
        name: strategy.name,
        numbers: strategy.numbers,
        greens: result.greens,
        reds: result.reds,
        rate: total > 0 ? Math.round((result.greens / total) * 100) : 0,
        sequences: result.sequences
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
      frequencyTable: sortedFreq.map(([n, c]) => `${n}:${c}`).join(', '),
      topNumbers: sortedFreq.slice(0, 10).map(([n, c]) => `${n}(${c}x)`).join(', '),
      coldNumbers: sortedFreq.slice(-10).map(([n, c]) => `${n}(${c}x)`).join(', '),
      redCount, blackCount, greenCount,
      redPercent: Math.round((redCount / numbers.length) * 100),
      blackPercent: Math.round((blackCount / numbers.length) * 100),
      topStrategies: strategyPerformance.slice(0, 20),
      worstStrategies: strategyPerformance.slice(-10)
    }
  })

  // Calcular ranking geral de estratégias para o período
  const allPeriodNumbers = periodData.map(e => e.number)
  const overallStrategyRanking = strategies.map(strategy => {
    const result = calculateGreenRedSequences(allPeriodNumbers, strategy.numbers)
    const total = result.greens + result.reds
    return {
      name: strategy.name,
      numbers: strategy.numbers,
      greens: result.greens,
      reds: result.reds,
      rate: total > 0 ? Math.round((result.greens / total) * 100) : 0,
      sequences: result.sequences
    }
  }).sort((a, b) => b.rate - a.rate)

  // Montar o prompt para este período
  const prompt = `
# 🎰 ANÁLISE DETALHADA DO PERÍODO: ${period.label}
## Data: ${reportDate.toLocaleDateString('pt-BR')}

---

## 📊 ESTATÍSTICAS GERAIS DO PERÍODO

- **Total de lançamentos:** ${periodData.length}
- **Roletas ativas:** ${Object.keys(byRoulette).length}
- **Horário:** ${period.startHour.toString().padStart(2, '0')}:00 até ${period.endHour.toString().padStart(2, '0')}:59

---

## 🎰 DADOS COMPLETOS POR ROLETA (COM TODOS OS NÚMEROS E HORÁRIOS)

${roletasData.map(r => `
### ROLETA: ${r.rouletteId.toUpperCase()}

**📊 Estatísticas:**
- Total de lançamentos: ${r.totalLancamentos}
- 🔴 Vermelho: ${r.redCount} (${r.redPercent}%)
- ⚫ Preto: ${r.blackCount} (${r.blackPercent}%)
- 🟢 Zero: ${r.greenCount}

**🔥 Números mais frequentes:** ${r.topNumbers}
**❄️ Números menos frequentes:** ${r.coldNumbers}

**📈 FREQUÊNCIA COMPLETA DE TODOS OS NÚMEROS:**
${r.frequencyTable}

**⏰ SEQUÊNCIA COMPLETA DE NÚMEROS COM HORÁRIO DE ENTRADA:**
${r.numbersWithTime}

**🏆 TOP 20 MELHORES ESTRATÉGIAS NESTA ROLETA:**
${r.topStrategies.map((s, i) => `${i + 1}. ${s.name}: ${s.rate}% (${s.greens}G/${s.reds}R) - Sequência: [${s.sequences.slice(-30)}]`).join('\n')}

**❌ 10 PIORES ESTRATÉGIAS:**
${r.worstStrategies.map((s, i) => `${i + 1}. ${s.name}: ${s.rate}% (${s.greens}G/${s.reds}R)`).join('\n')}
`).join('\n\n========================================\n\n')}

---

## 🏆 RANKING GERAL DE ESTRATÉGIAS DO PERÍODO (TOP 50)

${overallStrategyRanking.slice(0, 50).map((s, i) => 
  `${i + 1}. **${s.name}** [${s.numbers.join(',')}]: ${s.rate}% (${s.greens}G/${s.reds}R) - Seq: [${s.sequences.slice(-20)}]`
).join('\n')}

---

## ❌ PIORES ESTRATÉGIAS DO PERÍODO (BOTTOM 20)

${overallStrategyRanking.slice(-20).reverse().map((s, i) => 
  `${i + 1}. **${s.name}**: ${s.rate}% (${s.greens}G/${s.reds}R)`
).join('\n')}

---

## 📝 INSTRUÇÕES PARA ANÁLISE

Gere uma análise COMPLETA e APROFUNDADA deste período (${period.label}) incluindo:

1. **RESUMO DO PERÍODO**: Principais descobertas e alertas
2. **ANÁLISE DE CADA ROLETA**: Para CADA uma das ${Object.keys(byRoulette).length} roletas:
   - Padrões identificados nos números
   - Sequências que se repetem
   - Melhores estratégias específicas
   - Horários mais produtivos dentro do período
3. **ANÁLISE DAS ESTRATÉGIAS**: 
   - Quais estratégias dominaram este período
   - Sequências de GREEN/RED mais longas
   - Padrões de alternância
4. **NÚMEROS QUENTES E FRIOS**: Detalhamento por roleta
5. **CORRELAÇÕES**: Entre roletas e entre estratégias
6. **RECOMENDAÇÕES**: Específicas para este período

⚠️ IMPORTANTE:
- Analise TODOS os dados de TODAS as ${Object.keys(byRoulette).length} roletas
- Seja EXTREMAMENTE detalhado e específico
- Use tabelas Markdown quando apropriado
- Inclua números e porcentagens concretos
- O relatório deste período deve ter NO MÍNIMO 1500 palavras
`

  try {
    console.log(`🤖 Gerando relatório para ${period.name}... (${periodData.length} lançamentos)`)
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Você é um analista de dados ESPECIALISTA em jogos de roleta.
Gere relatórios EXTREMAMENTE DETALHADOS e APROFUNDADOS.
NUNCA resuma ou simplifique os dados.
Use tabelas Markdown, emojis e formatação clara.
Seja MUITO específico com números, porcentagens e estatísticas.
Analise TODOS os dados fornecidos para TODAS as roletas sem exceção.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 8000,
      temperature: 0.5
    })
    
    return completion.choices[0]?.message?.content || `Erro ao gerar análise do período ${period.name}`
    
  } catch (error) {
    console.error(`Erro ao gerar relatório do período ${period.name}:`, error)
    return `\n## ${period.label}\n\n⚠️ Erro ao gerar análise deste período.\n`
  }
}

// Gerar relatório final consolidado
async function generateFinalConsolidatedReport(
  openai: OpenAI,
  partialReports: string[],
  rouletteData: RouletteNumber[],
  strategies: Strategy[],
  reportDate: Date
): Promise<string> {
  
  const byRoulette: Record<string, RouletteNumber[]> = {}
  for (const entry of rouletteData) {
    if (!byRoulette[entry.roulette_id]) byRoulette[entry.roulette_id] = []
    byRoulette[entry.roulette_id].push(entry)
  }

  // Calcular ranking geral do dia
  const allNumbers = rouletteData.map(e => e.number)
  const overallRanking = strategies.map(strategy => {
    const result = calculateGreenRedSequences(allNumbers, strategy.numbers)
    const total = result.greens + result.reds
    return {
      name: strategy.name,
      greens: result.greens,
      reds: result.reds,
      rate: total > 0 ? Math.round((result.greens / total) * 100) : 0
    }
  }).sort((a, b) => b.rate - a.rate)

  const consolidationPrompt = `
# 🎰 CONSOLIDAÇÃO FINAL - RELATÓRIO COMPLETO DO DIA ${reportDate.toLocaleDateString('pt-BR')}

Você recebeu 4 relatórios parciais detalhados (Madrugada, Manhã, Tarde e Noite).
Sua tarefa é UNIFICAR todos em um RELATÓRIO FINAL COMPLETO.

---

## 📊 ESTATÍSTICAS GERAIS DO DIA COMPLETO

- **Total de lançamentos no dia:** ${rouletteData.length}
- **Roletas monitoradas:** ${Object.keys(byRoulette).length}
- **Total de estratégias analisadas:** ${strategies.length}
- **Média de lançamentos por hora:** ${Math.round(rouletteData.length / 24)}

---

## 🏆 RANKING GERAL DAS ESTRATÉGIAS (DIA COMPLETO - TOP 50)

${overallRanking.slice(0, 50).map((s, i) => 
  `${i + 1}. **${s.name}**: ${s.rate}% (${s.greens}G/${s.reds}R)`
).join('\n')}

---

## ❌ PIORES ESTRATÉGIAS DO DIA (BOTTOM 30)

${overallRanking.slice(-30).reverse().map((s, i) => 
  `${i + 1}. **${s.name}**: ${s.rate}% (${s.greens}G/${s.reds}R)`
).join('\n')}

---

## 📋 RELATÓRIOS PARCIAIS POR PERÍODO:

${partialReports.join('\n\n---\n\n')}

---

## 📝 INSTRUÇÕES PARA CONSOLIDAÇÃO FINAL

Com base em TODOS os relatórios parciais acima, gere um RELATÓRIO FINAL CONSOLIDADO contendo:

### 1. 📋 RESUMO EXECUTIVO DO DIA
- Visão geral de como foi o dia
- Destaques de cada período
- Principais alertas e descobertas

### 2. 🎯 COMPARAÇÃO ENTRE PERÍODOS
- Qual período teve melhor desempenho?
- Diferenças significativas entre Madrugada, Manhã, Tarde e Noite
- Estratégias que funcionaram em múltiplos períodos vs apenas em um

### 3. 🎰 CONSOLIDAÇÃO POR ROLETA
Para CADA roleta, faça um resumo do dia inteiro:
- Desempenho geral
- Melhores horários
- Melhores estratégias

### 4. 🔍 PADRÕES DO DIA
- Padrões que se repetiram ao longo do dia
- Tendências identificadas
- Anomalias encontradas

### 5. 💡 SUGESTÕES DE NOVAS ESTRATÉGIAS (MÍNIMO 15)
Baseado em TODOS os dados do dia, sugira no mínimo 15 novas estratégias:
- Nome criativo
- Números exatos: [lista completa]
- Justificativa DETALHADA
- Horário ideal
- Roleta ideal
- Taxa de acerto esperada

### 6. 📊 CONCLUSÕES E RECOMENDAÇÕES
- Melhores estratégias para cada período
- Melhores estratégias para cada roleta
- O que evitar
- Previsões para próximos dias

⚠️ IMPORTANTE:
- Este é o RELATÓRIO FINAL - deve ser MUITO completo
- Mínimo de 3000 palavras
- Use tabelas Markdown
- Seja específico com números e porcentagens
- Inclua TODAS as roletas e períodos
`

  try {
    console.log('🤖 Gerando relatório final consolidado...')
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Você é um analista de dados ESPECIALISTA em jogos de roleta.
Sua tarefa é consolidar relatórios parciais em um RELATÓRIO FINAL COMPLETO e APROFUNDADO.
Use tabelas Markdown, emojis e formatação clara.
Seja MUITO específico com números e estatísticas.
O relatório final DEVE ter no mínimo 3000 palavras.`
        },
        {
          role: 'user',
          content: consolidationPrompt
        }
      ],
      max_tokens: 16000,
      temperature: 0.5
    })
    
    return completion.choices[0]?.message?.content || 'Erro ao gerar relatório consolidado'
    
  } catch (error) {
    console.error('Erro ao gerar relatório consolidado:', error)
    // Retornar relatórios parciais concatenados como fallback
    return `# 📊 Relatório Diário - ${reportDate.toLocaleDateString('pt-BR')}\n\n${partialReports.join('\n\n---\n\n')}`
  }
}

// Gerar análise completa com ChatGPT (sistema de relatórios parciais)
async function generateAnalysis(
  openai: OpenAI,
  rouletteData: RouletteNumber[],
  strategies: Strategy[],
  reportDate: Date
): Promise<string> {
  
  console.log(`📊 Iniciando geração de relatório para ${rouletteData.length} lançamentos...`)
  
  // Separar dados por período
  const dataByPeriod: Record<string, RouletteNumber[]> = {
    madrugada: [],
    manha: [],
    tarde: [],
    noite: []
  }
  
  for (const entry of rouletteData) {
    const hour = new Date(entry.timestamp).getHours()
    if (hour >= 0 && hour <= 5) dataByPeriod.madrugada.push(entry)
    else if (hour >= 6 && hour <= 11) dataByPeriod.manha.push(entry)
    else if (hour >= 12 && hour <= 17) dataByPeriod.tarde.push(entry)
    else dataByPeriod.noite.push(entry)
  }
  
  console.log(`📊 Distribuição por período:`)
  console.log(`   🌙 Madrugada: ${dataByPeriod.madrugada.length} lançamentos`)
  console.log(`   ☀️ Manhã: ${dataByPeriod.manha.length} lançamentos`)
  console.log(`   🌤️ Tarde: ${dataByPeriod.tarde.length} lançamentos`)
  console.log(`   🌃 Noite: ${dataByPeriod.noite.length} lançamentos`)
  
  // Gerar relatórios parciais para cada período
  const partialReports: string[] = []
  
  for (const period of PERIODS) {
    const periodData = dataByPeriod[period.name]
    console.log(`\n🔄 Processando ${period.label}...`)
    
    const report = await generatePeriodReport(openai, periodData, strategies, reportDate, period)
    partialReports.push(report)
    
    // Pequena pausa entre chamadas para não sobrecarregar a API
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // Gerar relatório final consolidado
  console.log('\n🔄 Gerando relatório final consolidado...')
  const finalReport = await generateFinalConsolidatedReport(
    openai,
    partialReports,
    rouletteData,
    strategies,
    reportDate
  )
  
  // Montar relatório completo com todos os parciais + consolidação
  const fullReport = `
# 🎰 RELATÓRIO COMPLETO DE ROLETAS - ${reportDate.toLocaleDateString('pt-BR')}

## 📊 ESTATÍSTICAS GERAIS
- **Data:** ${reportDate.toLocaleDateString('pt-BR')}
- **Total de lançamentos:** ${rouletteData.length}
- **Roletas monitoradas:** ${[...new Set(rouletteData.map(r => r.roulette_id))].length}
- **Estratégias analisadas:** ${strategies.length}

---

# 📑 PARTE 1: RELATÓRIOS DETALHADOS POR PERÍODO

${partialReports.join('\n\n---\n\n')}

---

# 📑 PARTE 2: CONSOLIDAÇÃO E CONCLUSÕES

${finalReport}

---

*Relatório gerado em ${new Date().toLocaleString('pt-BR')}*
*Sistema de Análise de Roletas v2.0*
`

  return fullReport
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
