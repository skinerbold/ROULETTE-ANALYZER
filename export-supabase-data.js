// Exportar dados do Supabase para SQL
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://ohgpjizogwpbhinghmob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZ3BqaXpvZ3dwYmhpbmdobW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzMzOTUwMCwiZXhwIjoyMDcyOTE1NTAwfQ.A_j3ZouoOZUVLmDZRA5J9PrJixFRsAJdrHXw88z4nU8'
);

function escapeString(str) {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'boolean') return str;
  if (typeof str === 'number') return str;
  if (typeof str === 'object') return `'${JSON.stringify(str).replace(/'/g, "''")}'`;
  return `'${String(str).replace(/'/g, "''")}'`;
}

async function exportTable(tableName) {
  console.log(`\n📤 Exportando ${tableName}...`);
  
  let sql = `\n-- Tabela: ${tableName}\n`;
  let offset = 0;
  let total = 0;
  const batchSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(offset, offset + batchSize - 1);
    
    if (error) {
      console.error(`❌ Erro:`, error.message);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    for (const row of data) {
      const columns = Object.keys(row);
      const values = Object.values(row).map(escapeString).join(', ');
      sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
    }
    
    total += data.length;
    console.log(`  ✓ ${total} registros`);
    
    offset += batchSize;
    if (data.length < batchSize) break;
  }
  
  return sql;
}

async function main() {
  console.log('🚀 Exportando dados do Supabase...');
  
  let fullSQL = '-- Dados exportados do Supabase\n';
  fullSQL += '-- Data: ' + new Date().toISOString() + '\n\n';
  
  const tables = ['users', 'user_sessions', 'historico_da_roleta', 'daily_max_streaks'];
  
  for (const table of tables) {
    fullSQL += await exportTable(table);
  }
  
  fs.writeFileSync('dados-supabase.sql', fullSQL);
  console.log('\n✅ Arquivo gerado: dados-supabase.sql');
  console.log('📋 Agora copie este arquivo para a VPS e execute:');
  console.log('   sudo -u postgres psql -d roleta_db -f dados-supabase.sql');
}

main();
