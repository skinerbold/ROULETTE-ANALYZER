// ========================================
// API ROUTE - LISTAR E BUSCAR RELATÓRIOS
// Endpoint: /api/reports
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET - Listar relatórios ou buscar um específico
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date') // formato: YYYY-MM-DD
    const limit = parseInt(searchParams.get('limit') || '30')
    const format = searchParams.get('format') || 'json' // json ou md
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Se data específica, buscar relatório único
    if (dateParam) {
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('report_date', dateParam)
        .single()
      
      if (error || !data) {
        return NextResponse.json({ 
          error: 'Relatório não encontrado',
          date: dateParam 
        }, { status: 404 })
      }
      
      // Retornar como Markdown se solicitado
      if (format === 'md') {
        return new NextResponse(data.content, {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="relatorio-${dateParam}.md"`
          }
        })
      }
      
      return NextResponse.json({
        success: true,
        report: data
      })
    }
    
    // Listar todos os relatórios
    const { data, error } = await supabase
      .from('daily_reports')
      .select('id, report_date, total_lancamentos, total_estrategias, generated_at')
      .order('report_date', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Erro ao buscar relatórios:', error)
      return NextResponse.json({ error: 'Erro ao buscar relatórios' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      total: data?.length || 0,
      reports: data || []
    })
    
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ 
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
