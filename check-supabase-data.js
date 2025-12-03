/**
 * Script para verificar dados no Supabase
 * Execute com: node check-supabase-data.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configuração do Supabase não encontrada');
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('🔍 Verificando dados no Supabase...');
  console.log(`   URL: ${supabaseUrl}\n`);
  
  try {
    // Buscar dados da roleta específica
    const targetRoulette = 'pragmatic-speed-auto-roulette';
    
    console.log(`🎰 Verificando roleta: ${targetRoulette}`);
    console.log('='.repeat(50));
    
    const { data: historyData, error: historyError } = await supabase
      .from('roulette_history')
      .select('number, timestamp, position')
      .eq('roulette_id', targetRoulette)
      .order('position', { ascending: true })
      .limit(30);
    
    if (historyError) {
      console.error('❌ Erro ao buscar histórico:', historyError.message);
      return;
    }
    
    if (!historyData || historyData.length === 0) {
      console.log('⚠️ Nenhum dado encontrado para esta roleta');
      return;
    }
    
    console.log(`\n📋 Primeiros 30 números no banco (position 1 = mais recente):`);
    historyData.forEach((row, i) => {
      const date = new Date(parseInt(row.timestamp));
      console.log(`   [pos ${row.position.toString().padStart(3)}] ${row.number.toString().padStart(2)} - ${date.toLocaleString('pt-BR')}`);
    });
    
    // Contar total
    const { count } = await supabase
      .from('roulette_history')
      .select('*', { count: 'exact', head: true })
      .eq('roulette_id', targetRoulette);
    
    console.log(`\n📊 Total de registros: ${count || 'N/A'}`);
    
  } catch (err) {
    console.error('❌ Exceção:', err.message);
  }
}

checkData().catch(console.error);
