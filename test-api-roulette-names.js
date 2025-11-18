const WebSocket = require('ws');

console.log('🔍 ANALISANDO NOMES DE ROLETAS DA API...\n');

const ws = new WebSocket('wss://roulette-websocket-server-production.up.railway.app');

const discoveredRoulettes = new Set();
let timeout;

ws.on('open', () => {
  console.log('✅ Conectado ao WebSocket\n');
  
  // Desconectar após 30 segundos
  timeout = setTimeout(() => {
    console.log('\n⏱️  Tempo esgotado (30s)\n');
    printResults();
    ws.close();
  }, 30000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    // FORMATO 1: Lista de roletas
    if (message.roulettes && Array.isArray(message.roulettes)) {
      message.roulettes.forEach(name => {
        discoveredRoulettes.add(name);
      });
    }
    
    // FORMATO 2: Resultado individual
    if (message.type === 'result' && message.roulette) {
      discoveredRoulettes.add(message.roulette);
    }
    
    // FORMATO 3: API local com results
    if (message.roulette && message.results) {
      discoveredRoulettes.add(message.roulette);
    }
    
  } catch (err) {
    // Ignorar erros de parsing
  }
});

ws.on('error', (error) => {
  console.error('❌ Erro:', error.message);
});

ws.on('close', () => {
  clearTimeout(timeout);
  console.log('🔌 Conexão fechada');
  process.exit(0);
});

function printResults() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📊 TOTAL DE ROLETAS DESCOBERTAS: ${discoveredRoulettes.size}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const roulettesArray = Array.from(discoveredRoulettes).sort();
  
  // Agrupar por provedor
  const providers = {
    'Playtech': [],
    'Evolution Gaming': [],
    'Pragmatic Play': [],
    'Outros': []
  };
  
  roulettesArray.forEach(name => {
    const lower = name.toLowerCase();
    if (lower.includes('playtech')) {
      providers['Playtech'].push(name);
    } else if (lower.includes('evolution') || lower.includes('ezugi')) {
      providers['Evolution Gaming'].push(name);
    } else if (lower.includes('pragmatic') || lower.includes('pragmaticplay')) {
      providers['Pragmatic Play'].push(name);
    } else {
      providers['Outros'].push(name);
    }
  });
  
  Object.entries(providers).forEach(([provider, roulettes]) => {
    if (roulettes.length > 0) {
      console.log(`\n🎰 ${provider} (${roulettes.length}):`);
      console.log('─────────────────────────────────────────────────────────');
      roulettes.forEach((name, index) => {
        console.log(`  ${(index + 1).toString().padStart(2)}. ${name}`);
      });
    }
  });
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('💡 USE ESSES NOMES EXATOS PARA CRIAR AS PALAVRAS-CHAVE');
  console.log('═══════════════════════════════════════════════════════════\n');
}
