// ========================================
// GERADOR DE RELATÓRIO DIÁRIO - ROULETTE ANALYZER
// Executa à meia-noite e gera análise via ChatGPT
// ========================================

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { getAllStrategies } from './strategies'
import * as fs from 'fs'
import * as path from 'path'

// Tipos
interface RouletteNumber {
  id: number
  roulette_id: string
  roulette_name: string
  number: number
  timestamp: string
  created_at: string
}

interface CustomStrategy {
  id: number
  name: string
  numbers: number[]
  chip_count: number
  created_by: string
  is_active: boolean
}

interface Strategy {
  id: number | string
  name: string
  numbers: number[]
  source: 'hardcoded' | 'custom'
}

interface ReportConfig {
  supabaseUrl: string
  supabaseKey: string
  openaiKey: string
  outputDir: string
}

// Função principal para gerar relatório diário
export async function generateDailyReport(config: ReportConfig): Promise<string> {
  const supabase = createClient(config.supabaseUrl, config.supabaseKey)
  const openai = new OpenAI({ apiKey: config.openaiKey })
  
  // Definir intervalo do dia (00:00 - 23:59)
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
  
  console.log('📊 Iniciando geração de relatório diário...')
  console.log(`📅 Período: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`)
  
  // 1. Buscar números lançados no dia
  const rouletteData = await fetchRouletteData(supabase, startOfDay, endOfDay)
  console.log(`🎰 ${rouletteData.length} lançamentos encontrados`)
  
  // 2. Buscar todas as estratégias
  const allStrategies = await fetchAllStrategies(supabase)
  console.log(`📋 ${allStrategies.length} estratégias carregadas`)
  
  // 3. Gerar análise com ChatGPT
  const analysis = await generateChatGPTAnalysis(openai, rouletteData, allStrategies, startOfDay)
  
  // 4. Salvar relatório em arquivo .md
  const reportPath = await saveReport(config.outputDir, analysis, startOfDay)
  
  console.log(`✅ Relatório salvo em: ${reportPath}`)
  
  return reportPath
}

// Buscar dados das roletas do dia
async function fetchRouletteData(
  supabase: ReturnType<typeof createClient>,
  startOfDay: Date,
  endOfDay: Date
): Promise<RouletteNumber[]> {
  const { data, error } = await supabase
    .from('roulette_numbers')
    .select('*')
    .gte('timestamp', startOfDay.toISOString())
    .lte('timestamp', endOfDay.toISOString())
    .order('timestamp', { ascending: true })
  
  if (error) {
    console.error('Erro ao buscar dados das roletas:', error)
    return []
  }
  
  return data || []
}

// Buscar todas as estratégias (hardcoded + custom)
async function fetchAllStrategies(
  supabase: ReturnType<typeof createClient>
): Promise<Strategy[]> {
  const strategies: Strategy[] = []
  
  // 1. Adicionar estratégias hardcoded (até 9 fichas)
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
  
  // 2. Adicionar estratégias hardcoded (mais de 9 fichas)
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
  
  // 3. Buscar estratégias customizadas do banco
  const { data, error } = await supabase
    .from('custom_strategies')
    .select('*')
    .eq('is_active', true)
  
  if (error) {
    console.error('Erro ao buscar estratégias customizadas:', error)
  } else if (data) {
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

// Gerar análise detalhada com ChatGPT
async function generateChatGPTAnalysis(
  openai: OpenAI,
  rouletteData: RouletteNumber[],
  strategies: Strategy[],
  reportDate: Date
): Promise<string> {
  // Agrupar dados por roleta
  const byRoulette: Record<string, RouletteNumber[]> = {}
  for (const entry of rouletteData) {
    const key = entry.roulette_name || entry.roulette_id
    if (!byRoulette[key]) byRoulette[key] = []
    byRoulette[key].push(entry)
  }
  
  // Agrupar dados por período do dia
  const byPeriod: Record<string, RouletteNumber[]> = {
    'madrugada_00-06': [],
    'manha_06-12': [],
    'tarde_12-18': [],
    'noite_18-24': []
  }
  
  for (const entry of rouletteData) {
    const hour = new Date(entry.timestamp).getHours()
    if (hour >= 0 && hour < 6) byPeriod['madrugada_00-06'].push(entry)
    else if (hour >= 6 && hour < 12) byPeriod['manha_06-12'].push(entry)
    else if (hour >= 12 && hour < 18) byPeriod['tarde_12-18'].push(entry)
    else byPeriod['noite_18-24'].push(entry)
  }
  
  // Preparar resumo dos dados para o prompt
  const dataResume = {
    totalLancamentos: rouletteData.length,
    roletas: Object.keys(byRoulette).map(name => ({
      nome: name,
      totalLancamentos: byRoulette[name].length,
      numeros: byRoulette[name].map(r => r.number)
    })),
    porPeriodo: {
      madrugada: byPeriod['madrugada_00-06'].length,
      manha: byPeriod['manha_06-12'].length,
      tarde: byPeriod['tarde_12-18'].length,
      noite: byPeriod['noite_18-24'].length
    },
    estrategias: strategies.map(s => ({
      id: s.id,
      nome: s.name,
      numeros: s.numbers,
      quantidadeNumeros: s.numbers.length,
      fonte: s.source
    }))
  }
  
  // Preparar dados detalhados por roleta e hora
  const detailedByRouletteAndHour: Record<string, Record<number, number[]>> = {}
  for (const entry of rouletteData) {
    const rouletteName = entry.roulette_name || entry.roulette_id
    const hour = new Date(entry.timestamp).getHours()
    
    if (!detailedByRouletteAndHour[rouletteName]) {
      detailedByRouletteAndHour[rouletteName] = {}
    }
    if (!detailedByRouletteAndHour[rouletteName][hour]) {
      detailedByRouletteAndHour[rouletteName][hour] = []
    }
    detailedByRouletteAndHour[rouletteName][hour].push(entry.number)
  }

  const prompt = `
# ANÁLISE DIÁRIA DE ROLETAS - ${reportDate.toLocaleDateString('pt-BR')}

Você é um analista especializado em análise de dados de roletas e estratégias de apostas.
Analise os dados abaixo e gere um relatório EXTREMAMENTE DETALHADO em formato Markdown.

## DADOS DO DIA

### Resumo Geral
- Total de lançamentos: ${dataResume.totalLancamentos}
- Quantidade de roletas: ${Object.keys(byRoulette).length}
- Quantidade de estratégias: ${strategies.length}

### Distribuição por Período
- Madrugada (00:00-06:00): ${dataResume.porPeriodo.madrugada} lançamentos
- Manhã (06:00-12:00): ${dataResume.porPeriodo.manha} lançamentos
- Tarde (12:00-18:00): ${dataResume.porPeriodo.tarde} lançamentos
- Noite (18:00-24:00): ${dataResume.porPeriodo.noite} lançamentos

### Dados Detalhados por Roleta e Hora
${JSON.stringify(detailedByRouletteAndHour, null, 2)}

### Lista de Estratégias (${strategies.length} total)
${strategies.slice(0, 50).map(s => `- ${s.name}: [${s.numbers.join(', ')}] (${s.numbers.length} números)`).join('\n')}
${strategies.length > 50 ? `\n... e mais ${strategies.length - 50} estratégias` : ''}

### Dados Completos dos Lançamentos (últimos 500 para análise)
${JSON.stringify(rouletteData.slice(-500).map(r => ({
  roleta: r.roulette_name,
  numero: r.number,
  hora: new Date(r.timestamp).toLocaleTimeString('pt-BR')
})), null, 2)}

---

## INSTRUÇÕES PARA O RELATÓRIO

Gere um relatório em Markdown com as seguintes seções OBRIGATÓRIAS:

### 1. RESUMO EXECUTIVO
- Visão geral do dia
- Principais descobertas
- Alertas importantes

### 2. ANÁLISE DE DESEMPENHO POR ESTRATÉGIA
Para cada estratégia (ou as top 20 mais relevantes), calcule e informe:
- Taxa de acerto (GREEN) dentro de 3 tentativas
- Melhor horário de desempenho
- Pior horário de desempenho
- Roleta onde performou melhor
- Roleta onde performou pior

### 3. ANÁLISE POR PERÍODO DO DIA
- Madrugada (00:00-06:00): Quais estratégias se destacaram?
- Manhã (06:00-12:00): Quais estratégias se destacaram?
- Tarde (12:00-18:00): Quais estratégias se destacaram?
- Noite (18:00-24:00): Quais estratégias se destacaram?
- Horários de PICO (melhor desempenho geral)
- Horários de VALE (pior desempenho geral)

### 4. ANÁLISE POR ROLETA
Para cada roleta:
- Total de lançamentos
- Números mais frequentes
- Números menos frequentes
- Estratégias recomendadas para essa roleta
- Horários de melhor aproveitamento

### 5. RANKING DAS MELHORES ESTRATÉGIAS
- Top 10 estratégias do dia (com métricas)
- Top 10 piores estratégias do dia (com métricas)

### 6. PADRÕES IDENTIFICADOS
- Sequências repetidas encontradas
- Padrões por horário
- Correlações entre roletas

### 7. SUGESTÕES DE NOVAS ESTRATÉGIAS
**OBRIGATÓRIO: Mínimo de 10 sugestões de novas estratégias**
Para cada sugestão, informe:
- Nome sugerido para a estratégia
- Números que compõem a estratégia
- Justificativa baseada nos dados
- Horário recomendado de uso
- Roleta recomendada (se aplicável)

### 8. CONCLUSÕES E RECOMENDAÇÕES
- Resumo das principais descobertas
- Recomendações para o próximo dia
- Alertas e avisos

---

IMPORTANTE:
- Use tabelas Markdown quando apropriado
- Inclua emojis para melhor visualização
- Seja MUITO detalhado e específico
- Base todas as análises nos dados fornecidos
- Formate números e porcentagens de forma clara
`

  try {
    console.log('🤖 Enviando dados para análise do ChatGPT...')
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Você é um analista de dados especializado em jogos de roleta. Gere relatórios detalhados em Markdown com análises estatísticas precisas. Sempre inclua dados numéricos e porcentagens em suas análises.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 16000,
      temperature: 0.7
    })
    
    const analysis = completion.choices[0]?.message?.content || 'Erro ao gerar análise'
    console.log('✅ Análise do ChatGPT concluída')
    
    return analysis
  } catch (error) {
    console.error('❌ Erro ao chamar ChatGPT:', error)
    return generateFallbackReport(rouletteData, strategies, reportDate)
  }
}

// Relatório de fallback caso ChatGPT falhe
function generateFallbackReport(
  rouletteData: RouletteNumber[],
  strategies: Strategy[],
  reportDate: Date
): string {
  return `
# 📊 Relatório Diário de Roletas - ${reportDate.toLocaleDateString('pt-BR')}

## ⚠️ Aviso
Este é um relatório simplificado gerado automaticamente.
A análise via ChatGPT não estava disponível no momento da geração.

## Resumo do Dia

- **Total de Lançamentos:** ${rouletteData.length}
- **Estratégias Analisadas:** ${strategies.length}
- **Data:** ${reportDate.toLocaleDateString('pt-BR')}

## Dados Coletados

### Roletas Monitoradas
${[...new Set(rouletteData.map(r => r.roulette_name))].map(name => `- ${name}`).join('\n')}

### Estratégias Disponíveis
- Hardcoded: ${strategies.filter(s => s.source === 'hardcoded').length}
- Customizadas: ${strategies.filter(s => s.source === 'custom').length}

---

*Relatório gerado automaticamente em ${new Date().toISOString()}*
`
}

// Salvar relatório em arquivo
async function saveReport(
  outputDir: string,
  content: string,
  reportDate: Date
): Promise<string> {
  // Criar diretório se não existir
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // Nome do arquivo com data
  const dateStr = reportDate.toISOString().split('T')[0]
  const filename = `relatorio-diario-${dateStr}.md`
  const filepath = path.join(outputDir, filename)
  
  // Adicionar cabeçalho ao relatório
  const fullReport = `---
title: Relatório Diário de Roletas
date: ${reportDate.toISOString()}
generated_at: ${new Date().toISOString()}
---

${content}

---

*Este relatório foi gerado automaticamente pelo sistema Roulette Analyzer*
*Análise realizada via OpenAI GPT-4o*
`

  // Salvar arquivo
  fs.writeFileSync(filepath, fullReport, 'utf-8')
  
  return filepath
}

// Exportar função para execução manual
export async function runDailyReportManually() {
  const config: ReportConfig = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    openaiKey: process.env.OPENAI_API_KEY || '',
    outputDir: path.join(process.cwd(), 'reports')
  }
  
  if (!config.supabaseUrl || !config.supabaseKey || !config.openaiKey) {
    console.error('❌ Configurações faltando. Verifique as variáveis de ambiente:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY')
    console.error('   - OPENAI_API_KEY')
    return
  }
  
  return generateDailyReport(config)
}
