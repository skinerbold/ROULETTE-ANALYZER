// Script de Migração: Supabase → PostgreSQL Local
// Execute: node migrate-to-postgres.js

const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

// Configurações Supabase (ORIGEM)
const supabaseUrl = 'https://ohgpjizogwpbhinghmob.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZ3BqaXpvZ3dwYmhpbmdobW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzMzOTUwMCwiZXhwIjoyMDcyOTE1NTAwfQ.A_j3ZouoOZUVLmDZRA5J9PrJixFRsAJdrHXw88z4nU8';
const supabase = createClient(supabaseUrl, supabaseKey);

// Configurações PostgreSQL Local (DESTINO)
const pgClient = new Client({
  host: 'localhost',
  port: 5432,
  database: 'roleta_db',
  user: 'roleta_user',
  password: 'SenhaForte123!@#'
});

async function migrateTable(tableName, batchSize = 1000) {
  console.log(`\n🔄 Migrando tabela: ${tableName}`);
  
  let offset = 0;
  let totalMigrated = 0;
  
  while (true) {
    // Buscar lote de dados do Supabase
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .range(offset, offset + batchSize - 1);
    
    if (error) {
      console.error(`❌ Erro ao buscar dados de ${tableName}:`, error);
      break;
    }
    
    if (!data || data.length === 0) {
      break;
    }
    
    // Inserir no PostgreSQL local
    for (const row of data) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;
      
      try {
        await pgClient.query(query, values);
      } catch (err) {
        console.error(`⚠️ Erro ao inserir registro:`, err.message);
      }
    }
    
    totalMigrated += data.length;
    console.log(`  ✓ Migrado: ${totalMigrated} registros`);
    
    offset += batchSize;
    
    // Se pegou menos que batchSize, acabou
    if (data.length < batchSize) {
      break;
    }
  }
  
  console.log(`✅ ${tableName}: ${totalMigrated} registros migrados`);
  return totalMigrated;
}

async function main() {
  console.log('🚀 Iniciando migração Supabase → PostgreSQL...\n');
  
  try {
    // Conectar ao PostgreSQL
    await pgClient.connect();
    console.log('✓ Conectado ao PostgreSQL local');
    
    // Migrar cada tabela
    await migrateTable('users');
    await migrateTable('user_sessions');
    await migrateTable('historico_da_roleta');
    await migrateTable('daily_max_streaks');
    
    console.log('\n🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro na migração:', error);
  } finally {
    await pgClient.end();
  }
}

main();
