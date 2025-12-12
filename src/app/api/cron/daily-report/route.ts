// ========================================
// CRON JOB PARA VERCEL - RELATÓRIO DIÁRIO
// Este endpoint é chamado automaticamente à meia-noite
// Configurar no vercel.json
// ========================================

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Verificar se é uma chamada do Vercel Cron
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Se CRON_SECRET estiver configurado, validar
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('⚠️ Tentativa de acesso não autorizado ao cron')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    console.log('🕐 Cron job iniciado para geração de relatório diário')
    
    // Chamar a API de geração de relatório
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
    
    const response = await fetch(`${baseUrl}/api/daily-report`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cronSecret ? `Bearer ${cronSecret}` : ''
      }
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Erro ao gerar relatório:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Falha ao gerar relatório',
        details: error
      }, { status: 500 })
    }
    
    const result = await response.json()
    
    console.log('✅ Relatório diário gerado com sucesso!')
    console.log(`   - Data: ${result.date}`)
    console.log(`   - Lançamentos: ${result.stats?.totalLancamentos}`)
    console.log(`   - Estratégias: ${result.stats?.totalEstrategias}`)
    
    return NextResponse.json({
      success: true,
      message: 'Relatório diário gerado com sucesso',
      ...result
    })
    
  } catch (error) {
    console.error('❌ Erro no cron job:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno no cron job',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// Também aceitar POST para compatibilidade
export async function POST(request: NextRequest) {
  return GET(request)
}
