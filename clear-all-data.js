// ============================================
// SCRIPT PARA LIMPAR TODOS OS DADOS DE ROLETA
// ============================================
// 
// Execute este script no console do navegador (F12)
// estando na página do seu site em produção
//
// Isso vai:
// 1. Limpar localStorage
// 2. Limpar sessionStorage
// 3. Enviar comando para o WebSocket limpar cache
// 4. Recarregar a página
// ============================================

(async function clearAllRouletteData() {
  console.log('🗑️ Iniciando limpeza de todos os dados...\n');
  
  // 1. Limpar localStorage
  const localStorageKeys = Object.keys(localStorage);
  const rouletteKeys = localStorageKeys.filter(k => 
    k.includes('roulette') || 
    k.includes('numbers') || 
    k.includes('history') ||
    k.includes('cache')
  );
  
  console.log('📦 Chaves encontradas no localStorage:', localStorageKeys);
  console.log('🎰 Chaves relacionadas a roleta:', rouletteKeys);
  
  // Limpar tudo
  localStorage.clear();
  console.log('✅ localStorage limpo!');
  
  // 2. Limpar sessionStorage
  sessionStorage.clear();
  console.log('✅ sessionStorage limpo!');
  
  // 3. Limpar cookies relacionados (se houver)
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  console.log('✅ Cookies limpos!');
  
  // 4. Limpar IndexedDB (se houver)
  if (window.indexedDB) {
    const databases = await window.indexedDB.databases?.() || [];
    for (const db of databases) {
      if (db.name) {
        window.indexedDB.deleteDatabase(db.name);
        console.log(`✅ IndexedDB "${db.name}" deletado!`);
      }
    }
  }
  
  console.log('\n🎉 Limpeza completa!');
  console.log('\n⚠️ IMPORTANTE: Você também precisa:');
  console.log('1. Ir no Supabase e deletar os dados da tabela roulette_history');
  console.log('2. Reiniciar o servidor WebSocket no Railway para limpar cache da memória');
  
  console.log('\n🔄 Recarregando a página em 3 segundos...');
  
  setTimeout(() => {
    location.reload();
  }, 3000);
})();
