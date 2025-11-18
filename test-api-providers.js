const WebSocket = require('ws');

console.log('🔍 ANALISANDO PROVEDORES E NOMES DE ROLETAS...\n');

const ws = new WebSocket('wss://roulette-websocket-server-production.up.railway.app');

const roulettesByProvider = new Map();
let timeout;

function detectProvider(name) {
  const lower = name.toLowerCase();
  
  // Detectar por palavras-chave no nome
  if (lower.includes('playtech')) return 'Playtech';
  if (lower.includes('pragmatic')) return 'Pragmatic Play';
  if (lower.includes('evolution')) return 'Evolution Gaming';
  if (lower.includes('ezugi')) return 'Evolution Gaming';
  
  // Roletas específicas conhecidas de cada provedor
  // Evolution Gaming
  if (lower.includes('immersive') || 
      lower.includes('lightning') || 
      lower.includes('relampago') ||
      lower.includes('speed auto') ||
      lower.includes('auto-roulette') ||
      lower.includes('quantum') ||
      lower.includes('prestige') ||
      lower.includes('power up') ||
      lower.includes('grand roulette') ||
      lower.includes('vip roulette') ||
      lower.includes('arabic') ||
      lower.includes('turkish') ||
      lower.includes('greek') ||
      lower.includes('spread bet')) {
    return 'Evolution Gaming';
  }
  
  // Playtech
  if (lower.includes('bet365') ||
      lower.includes('azure') ||
      lower.includes('italiana')) {
    return 'Playtech';
  }
  
  // Pragmatic Play
  if (lower.includes('mega roulette') ||
      lower.includes('auto mega')) {
    return 'Pragmatic Play';
  }
  
  return 'Desconhecido';
}

ws.on('open', () => {
  console.log('✅ Conectado ao WebSocket\n');
  
  timeout = setTimeout(() => {
    console.log('\n⏱️  Tempo esgotado (30s)\n');
    printResults();
    ws.close();
  }, 30000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    let rouletteName = null;
    
    if (message.roulettes && Array.isArray(message.roulettes)) {
      message.roulettes.forEach(name => {
        const provider = detectProvider(name);
        if (!roulettesByProvider.has(provider)) {
          roulettesByProvider.set(provider, new Set());
        }
        roulettesByProvider.get(provider).add(name);
      });
    }
    
    if (message.type === 'result' && message.roulette) {
      const provider = detectProvider(message.roulette);
      if (!roulettesByProvider.has(provider)) {
        roulettesByProvider.set(provider, new Set());
      }
      roulettesByProvider.get(provider).add(message.roulette);
    }
    
    if (message.roulette && message.results) {
      const provider = detectProvider(message.roulette);
      if (!roulettesByProvider.has(provider)) {
        roulettesByProvider.set(provider, new Set());
      }
      roulettesByProvider.get(provider).add(message.roulette);
    }
    
  } catch (err) {
    // Ignorar
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
  console.log('📊 ROLETAS POR PROVEDOR');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const sortedProviders = ['Evolution Gaming', 'Playtech', 'Pragmatic Play', 'Desconhecido'];
  
  sortedProviders.forEach(provider => {
    if (roulettesByProvider.has(provider)) {
      const roulettes = Array.from(roulettesByProvider.get(provider)).sort();
      console.log(`\n🎰 ${provider} (${roulettes.length}):`);
      console.log('─────────────────────────────────────────────────────────');
      roulettes.forEach((name, index) => {
        const lower = name.toLowerCase();
        console.log(`  ${(index + 1).toString().padStart(2)}. ${name}`);
        console.log(`      → Palavra-chave: '${lower}'`);
      });
    }
  });
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}
