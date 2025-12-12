// ========================================
// SCRIPT PARA GERAR RELATÓRIO MANUALMENTE
// Execute: npx ts-node scripts/generate-daily-report.ts
// ========================================

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })
dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function main() {
  console.log('========================================')
  console.log('🎰 GERADOR DE RELATÓRIO DIÁRIO')
  console.log('========================================\n')
  
  // Verificar variáveis de ambiente
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: Variáveis do Supabase não configuradas')
    console.error('   Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
    process.exit(1)
  }
  
  if (!openaiKey) {
    console.error('❌ Erro: OPENAI_API_KEY não configurada')
    console.error('   Adicione sua chave da OpenAI no .env.local')
    process.exit(1)
  }
  
  console.log('✅ Configurações verificadas')
  console.log(`   Supabase URL: ${supabaseUrl.substring(0, 30)}...`)
  console.log(`   OpenAI Key: ${openaiKey.substring(0, 10)}...`)
  
  // Obter data do argumento ou usar ontem
  const dateArg = process.argv[2]
  let reportDate: Date
  
  if (dateArg) {
    reportDate = new Date(dateArg)
    if (isNaN(reportDate.getTime())) {
      console.error('❌ Data inválida. Use formato: YYYY-MM-DD')
      process.exit(1)
    }
  } else {
    reportDate = new Date()
    reportDate.setDate(reportDate.getDate() - 1) // Ontem por padrão
  }
  
  console.log(`\n📅 Gerando relatório para: ${reportDate.toLocaleDateString('pt-BR')}`)
  
  // Chamar API local ou fazer request direto
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const apiUrl = `${baseUrl}/api/daily-report?date=${reportDate.toISOString().split('T')[0]}`
  
  console.log(`\n🌐 Chamando API: ${apiUrl}`)
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Erro na API:', error)
      process.exit(1)
    }
    
    const result = await response.json()
    
    console.log('\n========================================')
    console.log('✅ RELATÓRIO GERADO COM SUCESSO!')
    console.log('========================================')
    console.log(`📊 Estatísticas:`)
    console.log(`   - Lançamentos: ${result.stats?.totalLancamentos}`)
    console.log(`   - Estratégias: ${result.stats?.totalEstrategias}`)
    console.log(`   - Roletas: ${result.stats?.roletasAnalisadas}`)
    
    // Salvar relatório localmente
    const reportsDir = path.join(__dirname, '..', 'reports')
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }
    
    const filename = `relatorio-${reportDate.toISOString().split('T')[0]}.md`
    const filepath = path.join(reportsDir, filename)
    
    fs.writeFileSync(filepath, result.report, 'utf-8')
    console.log(`\n📁 Relatório salvo em: ${filepath}`)
    
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

main()
