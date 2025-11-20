import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Validar variáveis de ambiente
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Variável de ambiente ${envVar} não configurada`)
  }
}

// Criar cliente Supabase com Service Role Key (acesso total)
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
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

// Testar conexão
export async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('roulette_metadata')
      .select('count')
      .limit(1)
    
    if (error) throw error
    return { success: true, message: 'Conexão com banco estabelecida' }
  } catch (error) {
    return { success: false, message: error.message }
  }
}

export default supabase
