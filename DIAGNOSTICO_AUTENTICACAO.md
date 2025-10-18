# 🔍 DIAGNÓSTICO - Problemas de Autenticação no Supabase

## 🐛 **Problema Identificado:**
Mesmo com **email e senha corretos**, o sistema indica **"Credenciais inválidas"**.

---

## ✅ **CORREÇÕES APLICADAS:**

### **1. Logs de Debug Adicionados**
Adicionei console.logs detalhados no `AuthForm.tsx` para rastrear:
- ✅ Tentativa de login
- ✅ Resposta do Supabase
- ✅ Erros específicos

### **2. Mensagens de Erro Melhoradas**
Agora o sistema mostra mensagens mais específicas:
- ❌ "Email ou senha incorretos"
- ❌ "Email não confirmado"
- ❌ "Email já cadastrado"

---

## 🧪 **TESTE AGORA:**

### **Passo 1: Reiniciar o Servidor**

```powershell
# Parar o servidor (Ctrl+C)
# Limpar cache
Remove-Item -Recurse -Force .next

# Reiniciar
npm run dev
```

### **Passo 2: Abrir Console do Navegador**

1. Acesse http://localhost:3000 (ou porta atual)
2. Pressione **F12** (DevTools)
3. Vá na aba **Console**

### **Passo 3: Tentar Fazer Login**

Preencha email e senha e clique em "Entrar"

### **Passo 4: Ver os Logs**

No console, você verá algo como:

```
🔐 Tentando autenticação... { email: "admin@roleta.com", isLogin: true }
📧 Fazendo login com: admin@roleta.com
🔍 Resposta do login: { data: {...}, error: null }
✅ Login bem-sucedido!
```

**OU**

```
🔐 Tentando autenticação...
📧 Fazendo login com: admin@roleta.com
❌ Erro de autenticação: { message: "Invalid login credentials" }
🔴 Erro capturado: Invalid login credentials
```

---

## 🔍 **POSSÍVEIS CAUSAS E SOLUÇÕES:**

### **Causa 1: Email não confirmado**

**Sintoma no console:**
```
❌ Erro: Email not confirmed
```

**Solução:**

1. Vá no Supabase Dashboard
2. **Authentication** → **Settings**
3. **DESLIGUE** "Enable email confirmations"
4. **Save**
5. **OU** vá em **Authentication** → **Users**
6. Encontre o usuário
7. Clique nele → **Confirm email**

---

### **Causa 2: Senha incorreta no banco**

**Sintoma no console:**
```
❌ Erro: Invalid login credentials
```

**Solução - Resetar senha do usuário:**

1. Vá no Supabase Dashboard
2. **Authentication** → **Users**
3. Encontre o usuário
4. Clique nos **3 pontinhos** → **Reset Password**
5. Digite nova senha: `Admin@123`
6. **Save**

---

### **Causa 3: Usuário não existe**

**Sintoma no console:**
```
❌ Erro: Invalid login credentials
```

**Solução - Criar usuário manualmente:**

1. Supabase Dashboard → **Authentication** → **Users**
2. **Add User** → **Create new user**
3. Preencha:
   - **Email**: admin@roleta.com
   - **Password**: Admin@123
   - ✅ **Auto Confirm User**: MARQUE ESTA OPÇÃO
4. **Create user**

---

### **Causa 4: Variáveis de ambiente não carregadas**

**Sintoma no console:**
```
🔍 Resposta: { error: { message: "Invalid API key" } }
```

**Solução:**

```powershell
# Verificar se variáveis estão corretas
echo $env:NEXT_PUBLIC_SUPABASE_URL
echo $env:NEXT_PUBLIC_SUPABASE_ANON_KEY

# Se retornar vazio, reiniciar terminal e servidor
```

---

### **Causa 5: Projeto Supabase pausado**

**Sintoma:**
```
🔴 Erro: Failed to fetch
```

**Solução:**

1. Acesse https://supabase.com/dashboard
2. Veja se tem aviso: 🔴 **"Project is paused"**
3. Clique em **"Restore project"**
4. Aguarde 2-3 minutos

---

## 🛠️ **SCRIPT DE TESTE DE CONEXÃO:**

Crie o arquivo `test-supabase.js`:

```javascript
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://snrzuqjuvqkisrrgbhmg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucnp1cWp1dnFraXNycmdiaG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDQyOTcsImV4cCI6MjA3NTY4MDI5N30.GTQYGwyd5dKdYm5kLqcJ2wIMmgD7dLxYV8Ax0ykx8iM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testLogin(email, password) {
  console.log('🧪 Testando login...')
  console.log('📧 Email:', email)
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('❌ ERRO:', error.message)
    console.error('📋 Detalhes:', error)
  } else {
    console.log('✅ LOGIN FUNCIONOU!')
    console.log('👤 Usuário:', data.user?.email)
    console.log('🆔 ID:', data.user?.id)
  }
}

// Testar com suas credenciais
testLogin('admin@roleta.com', 'Admin@123')
```

**Executar:**

```powershell
node test-supabase.js
```

---

## 📋 **CHECKLIST DE VERIFICAÇÃO:**

Execute este checklist:

### **No Supabase Dashboard:**
- [ ] Projeto está **ATIVO** (não pausado)
- [ ] **Authentication** → **Settings** → "Enable email confirmations" está **OFF**
- [ ] **Authentication** → **Users** → Usuário existe
- [ ] **Authentication** → **Users** → Email do usuário está **confirmado** (✅)
- [ ] **Settings** → **API** → Project URL está correto
- [ ] **Settings** → **API** → anon key está correto

### **No Código Local:**
- [ ] Arquivo `.env.local` existe
- [ ] Variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão preenchidas
- [ ] Cache limpo (`.next` deletado)
- [ ] Servidor reiniciado
- [ ] Console do navegador aberto (F12)

---

## 🎯 **TESTE FINAL:**

Depois de verificar tudo acima:

1. **Reinicie o servidor:**
   ```powershell
   npm run dev
   ```

2. **Abra o navegador:**
   - Acesse http://localhost:3000
   - Pressione F12 (Console)

3. **Tente fazer login:**
   - Email: admin@roleta.com
   - Senha: Admin@123

4. **Veja os logs no console**

5. **Me envie a mensagem que apareceu!**

---

## 🆘 **AINDA COM ERRO?**

Me diga **exatamente** o que aparece no console do navegador após tentar fazer login.

Os logs vão mostrar:
- 🔐 Tentando autenticação...
- 📧 Fazendo login com...
- 🔍 Resposta do login...
- ❌ OU ✅ (erro ou sucesso)

**Com essa informação consigo te ajudar melhor!** 🚀
