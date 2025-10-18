// 🧪 SCRIPT DE TESTE DE AUTENTICAÇÃO SUPABASE
// Execute: node test-auth.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://snrzuqjuvqkisrrgbhmg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucnp1cWp1dnFraXNycmdiaG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDQyOTcsImV4cCI6MjA3NTY4MDI5N30.GTQYGwyd5dKdYm5kLqcJ2wIMmgD7dLxYV8Ax0ykx8iM'

console.log('🔧 Configurando cliente Supabase...')
console.log('🌐 URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('1️⃣  TESTE DE CONEXÃO')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.log('❌ Erro na conexão:', error.message)
      return false
    }
    console.log('✅ Conexão com Supabase OK!\n')
    return true
  } catch (err) {
    console.error('❌ ERRO CRÍTICO:', err.message)
    return false
  }
}

async function testLogin(email, password) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('2️⃣  TESTE DE LOGIN')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  console.log('📧 Email:', email)
  console.log('🔑 Senha:', '*'.repeat(password.length))
  console.log('\n⏳ Tentando fazer login...\n')
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('❌ LOGIN FALHOU!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('🔴 Erro:', error.message)
    console.log('📋 Código:', error.status || 'N/A')
    console.log('\n💡 POSSÍVEIS CAUSAS:\n')
    
    if (error.message.includes('Invalid login credentials')) {
      console.log('   • Email ou senha incorretos')
      console.log('   • Usuário não existe no Supabase')
      console.log('   • Email pode ser case-sensitive')
      console.log('\n🔧 SOLUÇÕES:\n')
      console.log('   1. Vá no Supabase Dashboard')
      console.log('   2. Authentication → Users')
      console.log('   3. Verifique se o usuário existe')
      console.log('   4. Se não existir, clique "Add User"')
      console.log('   5. Marque "Auto Confirm User"')
    } else if (error.message.includes('Email not confirmed')) {
      console.log('   • Email precisa ser confirmado')
      console.log('\n🔧 SOLUÇÕES:\n')
      console.log('   1. Supabase Dashboard → Authentication → Users')
      console.log('   2. Encontre o usuário → Clique "Confirm email"')
      console.log('   OU')
      console.log('   1. Authentication → Settings')
      console.log('   2. Desligue "Enable email confirmations"')
    } else {
      console.log('   • Erro desconhecido')
      console.log('   • Projeto pode estar pausado')
      console.log('   • Verifique o Supabase Dashboard')
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    return false
  } else {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ LOGIN BEM-SUCEDIDO!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('👤 Email:', data.user?.email)
    console.log('🆔 ID:', data.user?.id)
    console.log('📅 Criado em:', new Date(data.user?.created_at).toLocaleString('pt-BR'))
    console.log('🔐 Último login:', new Date(data.user?.last_sign_in_at).toLocaleString('pt-BR'))
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    return true
  }
}

async function testSignup(email, password) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('3️⃣  TESTE DE CADASTRO')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  console.log('📧 Email:', email)
  console.log('🔑 Senha:', '*'.repeat(password.length))
  console.log('\n⏳ Tentando criar usuário...\n')
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.log('❌ CADASTRO FALHOU!')
    console.log('🔴 Erro:', error.message)
    
    if (error.message.includes('User already registered')) {
      console.log('\n💡 Usuário já existe! Tente fazer login.\n')
    }
    return false
  } else {
    console.log('✅ CADASTRO BEM-SUCEDIDO!')
    console.log('👤 Email:', data.user?.email)
    console.log('🆔 ID:', data.user?.id)
    console.log('\n⚠️  ATENÇÃO: Verifique se precisa confirmar o email!\n')
    return true
  }
}

async function runTests() {
  console.log('\n')
  console.log('╔═══════════════════════════════════════╗')
  console.log('║  🧪 TESTE DE AUTENTICAÇÃO SUPABASE   ║')
  console.log('╚═══════════════════════════════════════╝')
  console.log('\n')

  // Teste de conexão
  const connected = await testConnection()
  if (!connected) {
    console.log('⚠️  Não foi possível conectar ao Supabase. Verifique a URL e a chave.')
    process.exit(1)
  }

  // Suas credenciais
  const email = 'admin@roleta.com'
  const password = 'Admin@123'

  // Teste de login
  const loginSuccess = await testLogin(email, password)

  // Se login falhar, tenta criar usuário
  if (!loginSuccess) {
    console.log('💡 Como o login falhou, vou tentar criar o usuário...\n')
    await testSignup(email, password)
  }

  console.log('╔═══════════════════════════════════════╗')
  console.log('║         🏁 TESTES CONCLUÍDOS         ║')
  console.log('╚═══════════════════════════════════════╝')
  console.log('\n')
}

runTests()
