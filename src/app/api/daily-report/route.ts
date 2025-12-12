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
    
    const supabase = createClient(supabaseUrl, supabaseKey)
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
async function fetchAllStrategies(supabase: ReturnType<typeof createClient>): Promise<Strategy[]> {
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
    const key = entry.roulette_id // roulette_history só tem roulette_id
    if (!byRoulette[key]) byRoulette[key] = []
    byRoulette[key].push(entry)
  }
  
  // Agrupar por período (timestamp é número em ms)
  const byPeriod = {
    madrugada: rouletteData.filter(r => {
      const h = new Date(r.timestamp).getHours()
      return h >= 0 && h < 6
    }),
    manha: rouletteData.filter(r => {
      const h = new Date(r.timestamp).getHours()
      return h >= 6 && h < 12
    }),
    tarde: rouletteData.filter(r => {
      const h = new Date(r.timestamp).getHours()
      return h >= 12 && h < 18
    }),
    noite: rouletteData.filter(r => {
      const h = new Date(r.timestamp).getHours()
      return h >= 18 && h < 24
    })
  }
  
  // Dados detalhados por hora
  const byHour: Record<number, number[]> = {}
  for (const entry of rouletteData) {
    const hour = new Date(entry.timestamp).getHours()
    if (!byHour[hour]) byHour[hour] = []
    byHour[hour].push(entry.number)
  }

  const prompt = `
# ANÁLISE DIÁRIA DE ROLETAS - ${reportDate.toLocaleDateString('pt-BR')}

Você é um analista especializado em análise de dados de roletas e estratégias de apostas.
Gere um relatório EXTREMAMENTE DETALHADO em formato Markdown.

## DADOS COLETADOS

### Resumo
- Total de lançamentos: ${rouletteData.length}
- Roletas monitoradas: ${Object.keys(byRoulette).length}
- Estratégias disponíveis: ${strategies.length} (${strategies.filter(s => s.source === 'hardcoded').length} hardcoded + ${strategies.filter(s => s.source === 'custom').length} customizadas)

### Por Período
- Madrugada (00-06h): ${byPeriod.madrugada.length} lançamentos
- Manhã (06-12h): ${byPeriod.manha.length} lançamentos  
- Tarde (12-18h): ${byPeriod.tarde.length} lançamentos
- Noite (18-24h): ${byPeriod.noite.length} lançamentos

### Por Roleta
${Object.entries(byRoulette).map(([name, entries]) => 
  `- **${name}**: ${entries.length} lançamentos | Números: [${entries.slice(-20).map(e => e.number).join(', ')}...]`
).join('\n')}

### Por Hora (quantidade de lançamentos)
${Object.entries(byHour).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([hour, nums]) => 
  `- ${hour}h: ${nums.length} lançamentos`
).join('\n')}

### Estratégias para Análise (amostra)
${strategies.slice(0, 30).map(s => 
  `- **${s.name}** (${s.numbers.length} números): [${s.numbers.slice(0, 10).join(', ')}${s.numbers.length > 10 ? '...' : ''}]`
).join('\n')}

### Sequência de Números (últimos 200)
${rouletteData.slice(-200).map(r => r.number).join(', ')}

---

## INSTRUÇÕES PARA O RELATÓRIO

Gere um relatório completo com as seções:

### 1. 📋 RESUMO EXECUTIVO
- Principais descobertas do dia
- Alertas importantes
- Visão geral de desempenho

### 2. 🎯 ANÁLISE DE DESEMPENHO POR ESTRATÉGIA
Analise as estratégias e calcule aproximadamente:
- Taxa de acerto estimada (se um número da estratégia aparecer e depois outro número da mesma estratégia aparecer nas próximas 3 posições = GREEN)
- Melhores e piores horários
- Melhores e piores roletas para cada estratégia

### 3. ⏰ ANÁLISE POR PERÍODO DO DIA
Para cada período (madrugada, manhã, tarde, noite):
- Estratégias que se destacaram
- Padrões observados
- Recomendações

### 4. 🎰 ANÁLISE POR ROLETA
Para cada roleta:
- Números mais frequentes
- Números menos frequentes
- Estratégias recomendadas
- Horários de pico

### 5. 🏆 RANKING DAS ESTRATÉGIAS
- Top 10 melhores estratégias do dia
- Top 10 piores estratégias do dia
- Justificativa com dados

### 6. 🔍 PADRÕES IDENTIFICADOS
- Sequências repetidas
- Correlações entre roletas
- Tendências por horário

### 7. 💡 SUGESTÕES DE NOVAS ESTRATÉGIAS (MÍNIMO 10)
Para cada nova estratégia sugerida:
- Nome sugerido
- Números que compõem ([lista])
- Justificativa baseada nos dados
- Horário recomendado
- Roleta recomendada (se aplicável)

### 8. 📊 CONCLUSÕES E RECOMENDAÇÕES
- Resumo das descobertas
- Recomendações para amanhã
- Alertas e avisos

---

Use tabelas Markdown, emojis e formatação clara.
Seja MUITO detalhado e específico com números e porcentagens.
`

  try {
    console.log('🤖 Enviando para ChatGPT...')
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Você é um analista de dados especializado em jogos de roleta. Gere relatórios detalhados em Markdown com análises estatísticas. Use tabelas, emojis e formatação clara. Seja específico com números e porcentagens.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 16000,
      temperature: 0.7
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
- **Roletas:** ${[...new Set(rouletteData.map(r => r.roulette_name))].length}

---
*Gerado em ${new Date().toISOString()}*
`
}

// Salvar relatório no Supabase
async function saveReportToSupabase(
  supabase: ReturnType<typeof createClient>,
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
