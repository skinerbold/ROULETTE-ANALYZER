/**
 * 🔍 TESTE 1.1: Verificar Integridade dos Dados no Supabase
 * 
 * Este script conecta no Supabase e analisa:
 * - Quantos números únicos existem por roleta
 * - Distribuição de frequência
 * - Timestamps duplicados
 * - Total de registros
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERRO: Variáveis de ambiente não configuradas!');
  console.error('   Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log('cyan', `📊 ${title}`);
  console.log('='.repeat(80));
}

async function analyzeRouletteData(rouletteId) {
  try {
    log('blue', `\n🎰 Analisando: ${rouletteId}`);
    
    // Buscar todos os dados desta roleta
    const { data, error } = await supabase
      .from('roulette_history')
      .select('*')
      .eq('roulette_id', rouletteId)
      .order('occurred_at', { ascending: false })
      .limit(1000); // Limitar a 1000 para não sobrecarregar
    
    if (error) {
      log('red', `   ❌ Erro ao buscar dados: ${error.message}`);
      return null;
    }
    
    if (!data || data.length === 0) {
      log('yellow', '   ⚠️  Nenhum dado encontrado');
      return null;
    }
    
    // Análise
    const totalRecords = data.length;
    const uniqueNumbers = new Set(data.map(row => row.value)).size;
    const uniqueTimestamps = new Set(data.map(row => row.occurred_at)).size;
    
    // Distribuição de números
    const distribution = {};
    data.forEach(row => {
      distribution[row.value] = (distribution[row.value] || 0) + 1;
    });
    
    const mostCommon = Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    const expectedPercentage = (100 / 37).toFixed(2); // ~2.7% para roleta europeia
    
    // Resultados
    log('white', `   Total de registros: ${totalRecords}`);
    log(uniqueNumbers > 30 ? 'green' : 'red', 
      `   Números únicos: ${uniqueNumbers}/37 ${uniqueNumbers > 30 ? '✅' : '❌ PROBLEMA!'}`
    );
    log(uniqueTimestamps === totalRecords ? 'green' : 'red',
      `   Timestamps únicos: ${uniqueTimestamps}/${totalRecords} ${uniqueTimestamps === totalRecords ? '✅' : '❌ DUPLICADOS!'}`
    );
    
    log('white', '\n   Top 5 números mais frequentes:');
    mostCommon.forEach(([num, count]) => {
      const percentage = ((count / totalRecords) * 100).toFixed(2);
      const isSuspicious = percentage > expectedPercentage * 2;
      log(isSuspicious ? 'red' : 'white',
        `      ${num}: ${count}x (${percentage}%) ${isSuspicious ? '⚠️  SUSPEITO!' : ''}`
      );
    });
    
    // Verificar sequências repetidas
    const sequences = [];
    for (let i = 0; i <= data.length - 5; i++) {
      const seq = data.slice(i, i + 5).map(row => row.value).join(',');
      sequences.push(seq);
    }
    
    const sequenceCounts = {};
    sequences.forEach(seq => {
      sequenceCounts[seq] = (sequenceCounts[seq] || 0) + 1;
    });
    
    const repeatedSequences = Object.values(sequenceCounts).filter(count => count > 1).length;
    
    log(repeatedSequences === 0 ? 'green' : 'red',
      `   Sequências repetidas: ${repeatedSequences} ${repeatedSequences === 0 ? '✅' : '❌'}`
    );
    
    return {
      rouletteId,
      totalRecords,
      uniqueNumbers,
      uniqueTimestamps,
      mostCommon,
      repeatedSequences,
      hasIssues: uniqueNumbers < 30 || uniqueTimestamps < totalRecords || repeatedSequences > 5
    };
    
  } catch (err) {
    log('red', `   ❌ Exceção: ${err.message}`);
    return null;
  }
}

async function getRouletteList() {
  try {
    const { data, error } = await supabase
      .from('roulette_history')
      .select('roulette_id')
      .limit(1000);
    
    if (error) {
      log('red', `❌ Erro ao buscar lista de roletas: ${error.message}`);
      return [];
    }
    
    const uniqueRoulettes = [...new Set(data.map(row => row.roulette_id))];
    return uniqueRoulettes;
    
  } catch (err) {
    log('red', `❌ Exceção ao buscar roletas: ${err.message}`);
    return [];
  }
}

async function runTests() {
  console.clear();
  log('cyan', '\n' + '█'.repeat(80));
  log('cyan', '█' + ' '.repeat(78) + '█');
  log('cyan', '█' + '  🔍 TESTE 1.1: VERIFICAÇÃO DE DADOS DO SUPABASE'.padEnd(78) + '█');
  log('cyan', '█' + ' '.repeat(78) + '█');
  log('cyan', '█'.repeat(80));
  
  logSection('CONECTANDO AO SUPABASE');
  log('green', `✅ Conectado: ${SUPABASE_URL}`);
  
  logSection('BUSCANDO LISTA DE ROLETAS');
  const roulettes = await getRouletteList();
  
  if (roulettes.length === 0) {
    log('red', '❌ Nenhuma roleta encontrada no banco!');
    log('yellow', '💡 O banco pode estar vazio ou as credenciais estão incorretas');
    return;
  }
  
  log('green', `✅ ${roulettes.length} roletas encontradas`);
  log('white', `   Primeiras 5: ${roulettes.slice(0, 5).join(', ')}`);
  
  logSection('ANÁLISE DETALHADA POR ROLETA');
  
  const results = [];
  const roulettesToAnalyze = roulettes.slice(0, 5); // Analisar primeiras 5
  
  for (const rouletteId of roulettesToAnalyze) {
    const result = await analyzeRouletteData(rouletteId);
    if (result) {
      results.push(result);
    }
  }
  
  logSection('RESUMO GERAL');
  
  const problematicRoulettes = results.filter(r => r.hasIssues);
  
  if (problematicRoulettes.length === 0) {
    log('green', '\n✅ TODOS OS DADOS PARECEM OK!');
    log('white', '   Todas as roletas têm boa variedade de números e timestamps únicos');
  } else {
    log('red', `\n❌ ${problematicRoulettes.length}/${results.length} ROLETAS COM PROBLEMAS!`);
    log('yellow', '\n   Roletas problemáticas:');
    problematicRoulettes.forEach(r => {
      log('yellow', `      - ${r.rouletteId}`);
      if (r.uniqueNumbers < 30) {
        log('red', `        → Apenas ${r.uniqueNumbers} números únicos!`);
      }
      if (r.uniqueTimestamps < r.totalRecords) {
        log('red', `        → ${r.totalRecords - r.uniqueTimestamps} timestamps duplicados!`);
      }
      if (r.repeatedSequences > 5) {
        log('red', `        → ${r.repeatedSequences} sequências repetidas!`);
      }
    });
  }
  
  logSection('RECOMENDAÇÕES');
  
  if (problematicRoulettes.length > 0) {
    log('yellow', '\n⚠️  AÇÃO NECESSÁRIA:');
    log('white', '   1. Execute: DELETE FROM roulette_history WHERE roulette_id IN (...)');
    log('white', '   2. Reinicie o servidor WebSocket para recarregar dados limpos');
    log('white', '   3. Execute novamente: node test-supabase-data.js');
    log('white', '   4. Execute: node test-number-integrity.js');
  } else {
    log('green', '\n✅ Dados do Supabase estão OK!');
    log('yellow', '   Se ainda há problema de repetição, investigate:');
    log('white', '   - API Fly.io (execute: node test-flyio-direct.js)');
    log('white', '   - Lógica do servidor (execute: node test-websocket-logs.js)');
  }
  
  log('cyan', '\n' + '='.repeat(80));
  log('cyan', '✅ Teste concluído!');
  log('cyan', '='.repeat(80) + '\n');
}

// Executar
runTests().catch(error => {
  log('red', `\n💥 Erro fatal: ${error.message}`);
  console.error(error);
  process.exit(1);
});
