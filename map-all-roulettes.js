const WebSocket = require('ws');
const fs = require('fs');

const ws = new WebSocket('ws://177.93.108.140:8777');
const allRoulettes = new Map(); // Map<rouletteName, {provider, lastNumber}>
let messageCount = 0;

ws.on('open', () => {
  console.log('✅ Conectado à API');
  console.log('⏳ Coletando TODAS as roletas disponíveis (aguarde 45 segundos)...\n');
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data);
    messageCount++;
    
    // A API envia: {game: 'nome-roleta', game_type: 'roleta', results: [...]}
    if (msg.game && msg.game_type === 'roleta') {
      const gameName = msg.game;
      
      if (!allRoulettes.has(gameName)) {
        // Tentar identificar o provedor pelo nome
        let provider = 'Desconhecido';
        const lowerName = gameName.toLowerCase();
        
        if (lowerName.includes('pragmatic') || lowerName.includes('mega roulette') || 
            lowerName.includes('auto mega') || lowerName.includes('power up')) {
          provider = 'Pragmatic Play';
        } else if (lowerName.includes('evolution') || lowerName.includes('lightning') || 
                   lowerName.includes('immersive') || lowerName.includes('xxxtreme')) {
          provider = 'Evolution Gaming';
        } else if (lowerName.includes('playtech') || lowerName.includes('mega fire blaze')) {
          provider = 'Playtech';
        } else if (lowerName.includes('ezugi') || lowerName.includes('ruby') || 
                   lowerName.includes('azure')) {
          provider = 'Ezugi';
        } else if (lowerName.includes('bet365') || lowerName.includes('bet 365')) {
          provider = 'Bet365';
        }
        
        allRoulettes.set(gameName, {
          provider: provider,
          lastNumber: msg.results && msg.results[0] ? msg.results[0] : 'N/A'
        });
        
        console.log(`   ✓ [${provider}] ${gameName}`);
      }
    }
  } catch(e) {
    // Ignora mensagens que não são JSON
  }
});

ws.on('error', (error) => {
  console.error('❌ Erro na conexão:', error.message);
  process.exit(1);
});

// Aguardar 45 segundos para coletar todas as roletas
setTimeout(() => {
  console.log('\n=== PROCESSANDO RESULTADOS ===');
  console.log(`Total de mensagens recebidas: ${messageCount}`);
  console.log(`Total de roletas únicas encontradas: ${allRoulettes.size}\n`);
  
  // Organizar por provedor
  const byProvider = {};
  allRoulettes.forEach((info, name) => {
    if (!byProvider[info.provider]) {
      byProvider[info.provider] = [];
    }
    byProvider[info.provider].push({ name, lastNumber: info.lastNumber });
  });
  
  // Ordenar provedores alfabeticamente
  const sortedProviders = Object.keys(byProvider).sort();
  
  // Gerar markdown
  let markdown = `# Mapeamento Completo de Roletas da API\n\n`;
  markdown += `**Data de coleta:** ${new Date().toLocaleString('pt-BR')}\n`;
  markdown += `**Total de roletas:** ${allRoulettes.size}\n`;
  markdown += `**Duração da coleta:** 45 segundos\n\n`;
  markdown += `---\n\n`;
  
  let totalCount = 0;
  sortedProviders.forEach(provider => {
    const roulettes = byProvider[provider].sort((a, b) => a.name.localeCompare(b.name));
    markdown += `## ${provider} (${roulettes.length} roletas)\n\n`;
    
    roulettes.forEach((r, index) => {
      markdown += `${index + 1}. **${r.name}**\n`;
      markdown += `   - Último número: ${r.lastNumber}\n\n`;
      totalCount++;
    });
    
    markdown += `---\n\n`;
  });
  
  markdown += `## Resumo por Provedor\n\n`;
  markdown += `| Provedor | Quantidade |\n`;
  markdown += `|----------|------------|\n`;
  sortedProviders.forEach(provider => {
    markdown += `| ${provider} | ${byProvider[provider].length} |\n`;
  });
  markdown += `| **TOTAL** | **${totalCount}** |\n\n`;
  
  markdown += `---\n\n`;
  markdown += `## Notas\n\n`;
  markdown += `- As roletas foram coletadas em tempo real da API WebSocket\n`;
  markdown += `- A identificação do provedor foi feita por análise do nome\n`;
  markdown += `- Algumas roletas podem ter provedor "Desconhecido" se não foi possível identificar\n`;
  markdown += `- O "Último número" é o número mais recente que estava sendo transmitido no momento da coleta\n`;
  
  // Salvar arquivo
  const filename = 'mapeamento-roletas-api.md';
  fs.writeFileSync(filename, markdown, 'utf-8');
  
  console.log(`✅ Mapeamento salvo em: ${filename}`);
  console.log(`\n📊 Resumo:`);
  sortedProviders.forEach(provider => {
    console.log(`   ${provider}: ${byProvider[provider].length} roletas`);
  });
  console.log(`   TOTAL: ${totalCount} roletas\n`);
  
  ws.close();
  process.exit(0);
}, 45000); // 45 segundos
