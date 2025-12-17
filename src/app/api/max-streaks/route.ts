import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente Supabase com service role para operações do servidor
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Função para calcular máximos de RED e GREEN
function calculateMaxStreaks(
  historyNumbers: number[],
  strategyNumbers: number[],
  attempts: number
): { maxRed: number; maxGreen: number } {
  if (historyNumbers.length === 0 || strategyNumbers.length === 0) {
    return { maxRed: 0, maxGreen: 0 }
  }

  let maxRed = 0
  let currentRed = 0
  let maxGreen = 0
  let currentGreen = 0

  // Percorrer histórico do mais antigo para o mais recente
  for (let i = 0; i < historyNumbers.length; i++) {
    const num = historyNumbers[i]

    if (strategyNumbers.includes(num)) {
      // É uma ativação da estratégia
      let foundGreen = false

      // Verificar se tem GREEN nas próximas X casas
      for (let j = 1; j <= attempts && i + j < historyNumbers.length; j++) {
        if (strategyNumbers.includes(historyNumbers[i + j])) {
          foundGreen = true
          break
        }
      }

      if (foundGreen) {
        // GREEN: registrar sequência de RED e resetar
        maxRed = Math.max(maxRed, currentRed)
        currentRed = 0
        
        // Incrementar sequência de GREEN
        currentGreen++
        maxGreen = Math.max(maxGreen, currentGreen)
      } else {
        // RED: incrementar sequência
        currentRed++
        maxRed = Math.max(maxRed, currentRed)
        
        // Resetar sequência de GREEN
        maxGreen = Math.max(maxGreen, currentGreen)
        currentGreen = 0
      }
    }
  }

  // Verificar última sequência
  maxRed = Math.max(maxRed, currentRed)
  maxGreen = Math.max(maxGreen, currentGreen)

  return { maxRed, maxGreen }
}

// GET: Buscar máximo de RED/GREEN para uma estratégia específica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rouletteId = searchParams.get('rouletteId')
    const strategyId = searchParams.get('strategyId')
    const date = searchParams.get('date') // Formato: YYYY-MM-DD
    const attempts = parseInt(searchParams.get('attempts') || '1')
    const strategyNumbersParam = searchParams.get('strategyNumbers') // JSON array

    if (!rouletteId || !strategyId || !date) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: rouletteId, strategyId, date' },
        { status: 400 }
      )
    }

    // Verificar se já temos o valor calculado no banco
    const { data: cachedData, error: cacheError } = await supabase
      .from('daily_max_streaks')
      .select('*')
      .eq('roulette_id', rouletteId)
      .eq('strategy_id', parseInt(strategyId))
      .eq('analysis_date', date)
      .single()

    if (cachedData && !cacheError) {
      // Retornar valor do cache baseado na quantidade de casas
      const maxRedField = attempts === 1 ? 'max_red_1_casa' : 
                          attempts === 2 ? 'max_red_2_casas' : 'max_red_3_casas'
      const maxGreenField = attempts === 1 ? 'max_green_1_casa' : 
                            attempts === 2 ? 'max_green_2_casas' : 'max_green_3_casas'
      
      console.log(`📦 [CACHE HIT] Estratégia ID=${strategyId} na roleta ${rouletteId.substring(0, 20)}... para ${date}`)
      console.log(`   → maxRed (${attempts} casa${attempts > 1 ? 's' : ''}): ${cachedData[maxRedField]}`)
      
      return NextResponse.json({
        maxRed: cachedData[maxRedField],
        maxGreen: cachedData[maxGreenField],
        totalSpins: cachedData.total_spins,
        fromCache: true,
        date: date,
        rouletteId,
        strategyId: parseInt(strategyId),
        attempts
      })
    }

    // Não temos cache, precisamos calcular
    if (!strategyNumbersParam) {
      return NextResponse.json(
        { error: 'Parâmetro strategyNumbers é obrigatório para cálculo' },
        { status: 400 }
      )
    }

    const strategyNumbers: number[] = JSON.parse(strategyNumbersParam)

    // Buscar histórico da roleta para o dia especificado (00:00 até 23:59)
    const startOfDay = new Date(date + 'T00:00:00.000Z')
    const endOfDay = new Date(date + 'T23:59:59.999Z')

    console.log(`🔍 [CALCULANDO] Estratégia ID=${strategyId} na roleta ${rouletteId.substring(0, 20)}...`)
    console.log(`   Data: ${date} (${startOfDay.toISOString()} até ${endOfDay.toISOString()})`)
    console.log(`   Números da estratégia: [${strategyNumbers.join(', ')}]`)
    console.log(`   Tentativas (casas): ${attempts}`)

    const { data: historyData, error: historyError } = await supabase
      .from('roulette_history')
      .select('number, timestamp')
      .eq('roulette_id', rouletteId)
      .gte('timestamp', startOfDay.getTime())
      .lte('timestamp', endOfDay.getTime())
      .order('timestamp', { ascending: true })

    if (historyError) {
      console.error('Erro ao buscar histórico:', historyError)
      return NextResponse.json(
        { error: 'Erro ao buscar histórico da roleta' },
        { status: 500 }
      )
    }

    if (!historyData || historyData.length === 0) {
      console.log(`   ⚠️ Sem dados para esta data`)
      return NextResponse.json({
        maxRed: 0,
        maxGreen: 0,
        totalSpins: 0,
        fromCache: false,
        date: date,
        rouletteId,
        strategyId: parseInt(strategyId),
        attempts,
        message: 'Sem dados para esta data'
      })
    }

    const historyNumbers = historyData.map(h => h.number)
    console.log(`   📊 ${historyNumbers.length} lançamentos encontrados`)

    // Calcular para todas as quantidades de casas (1, 2 e 3)
    const results1 = calculateMaxStreaks(historyNumbers, strategyNumbers, 1)
    const results2 = calculateMaxStreaks(historyNumbers, strategyNumbers, 2)
    const results3 = calculateMaxStreaks(historyNumbers, strategyNumbers, 3)

    console.log(`   ✅ Resultados calculados:`)
    console.log(`      1 casa:  maxRed=${results1.maxRed}, maxGreen=${results1.maxGreen}`)
    console.log(`      2 casas: maxRed=${results2.maxRed}, maxGreen=${results2.maxGreen}`)
    console.log(`      3 casas: maxRed=${results3.maxRed}, maxGreen=${results3.maxGreen}`)

    // Salvar no banco de dados
    const { error: upsertError } = await supabase
      .from('daily_max_streaks')
      .upsert({
        roulette_id: rouletteId,
        strategy_id: parseInt(strategyId),
        analysis_date: date,
        max_red_1_casa: results1.maxRed,
        max_red_2_casas: results2.maxRed,
        max_red_3_casas: results3.maxRed,
        max_green_1_casa: results1.maxGreen,
        max_green_2_casas: results2.maxGreen,
        max_green_3_casas: results3.maxGreen,
        total_spins: historyNumbers.length
      }, {
        onConflict: 'roulette_id,strategy_id,analysis_date'
      })

    if (upsertError) {
      console.error('Erro ao salvar cache:', upsertError)
      // Não falhar a requisição, apenas logar o erro
    } else {
      console.log(`   💾 Salvo no cache do banco de dados`)
    }

    // Retornar resultado baseado na quantidade de casas solicitada
    const result = attempts === 1 ? results1 : attempts === 2 ? results2 : results3

    console.log(`   🎯 RETORNANDO: maxRed=${result.maxRed}, maxGreen=${result.maxGreen} (${attempts} casa${attempts > 1 ? 's' : ''})`)

    return NextResponse.json({
      maxRed: result.maxRed,
      maxGreen: result.maxGreen,
      totalSpins: historyNumbers.length,
      fromCache: false,
      date: date,
      rouletteId,
      strategyId: parseInt(strategyId),
      attempts,
      // Incluir todos os valores calculados
      allResults: {
        casa1: results1,
        casa2: results2,
        casa3: results3
      }
    })

  } catch (error) {
    console.error('Erro na API max-streaks:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST: Forçar recálculo (ignorar cache)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rouletteId, strategyId, date, strategyNumbers } = body as {
      rouletteId: string
      strategyId: number
      date: string
      strategyNumbers: number[]
    }

    if (!rouletteId || !strategyId || !date || !strategyNumbers) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: rouletteId, strategyId, date, strategyNumbers' },
        { status: 400 }
      )
    }

    // Buscar histórico da roleta para o dia especificado
    const startOfDay = new Date(date + 'T00:00:00.000Z')
    const endOfDay = new Date(date + 'T23:59:59.999Z')

    const { data: historyData, error: historyError } = await supabase
      .from('roulette_history')
      .select('number, timestamp')
      .eq('roulette_id', rouletteId)
      .gte('timestamp', startOfDay.getTime())
      .lte('timestamp', endOfDay.getTime())
      .order('timestamp', { ascending: true })

    if (historyError) {
      return NextResponse.json(
        { error: 'Erro ao buscar histórico da roleta' },
        { status: 500 }
      )
    }

    if (!historyData || historyData.length === 0) {
      return NextResponse.json({
        maxRed: 0,
        maxGreen: 0,
        totalSpins: 0,
        message: 'Sem dados para esta data'
      })
    }

    const historyNumbers = historyData.map(h => h.number)

    // Calcular para todas as quantidades de casas
    const results1 = calculateMaxStreaks(historyNumbers, strategyNumbers, 1)
    const results2 = calculateMaxStreaks(historyNumbers, strategyNumbers, 2)
    const results3 = calculateMaxStreaks(historyNumbers, strategyNumbers, 3)

    // Atualizar/inserir no banco
    await supabase
      .from('daily_max_streaks')
      .upsert({
        roulette_id: rouletteId,
        strategy_id: strategyId,
        analysis_date: date,
        max_red_1_casa: results1.maxRed,
        max_red_2_casas: results2.maxRed,
        max_red_3_casas: results3.maxRed,
        max_green_1_casa: results1.maxGreen,
        max_green_2_casas: results2.maxGreen,
        max_green_3_casas: results3.maxGreen,
        total_spins: historyNumbers.length
      }, {
        onConflict: 'roulette_id,strategy_id,analysis_date'
      })

    return NextResponse.json({
      message: 'Máximos recalculados com sucesso',
      totalSpins: historyNumbers.length,
      date,
      rouletteId,
      strategyId,
      results: {
        casa1: results1,
        casa2: results2,
        casa3: results3
      }
    })

  } catch (error) {
    console.error('Erro no POST max-streaks:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
