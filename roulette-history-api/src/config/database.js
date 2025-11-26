import { createClient } from '@supabase/supabase-js'
import config from './index.js'

// Criar cliente Supabase (usando anon key para respeitar RLS)
export const supabase = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
)

export async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('roulette_metadata')
      .select('roulette_id')
      .limit(1)
    
    if (error) {
      throw error
    }
    
    return true
  } catch (error) {
    console.error('❌ Erro ao testar conexão com banco:', error.message)
    return false
  }
}

export default supabase
