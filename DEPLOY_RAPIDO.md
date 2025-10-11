# 🚀 DEPLOY RÁPIDO - 5 MINUTOS

## ⚡ **MÉTODO 1: Script Automático (Recomendado)**

### **Passo Único:**

Abra o PowerShell na pasta do projeto e execute:

```powershell
.\deploy-github.ps1
```

O script vai:
- ✅ Inicializar Git
- ✅ Adicionar todos os arquivos
- ✅ Fazer commit
- ✅ Conectar ao GitHub
- ✅ Fazer push

**Depois, siga as instruções para deploy na Vercel!**

---

## 📝 **MÉTODO 2: Manual (Passo a Passo)**

### **No PowerShell:**

```powershell
# 1. Inicializar Git
git init

# 2. Adicionar arquivos
git add .

# 3. Commit
git commit -m "Initial commit: Roulette Analyzer"

# 4. Configurar branch
git branch -M main

# 5. Conectar ao GitHub
git remote add origin https://github.com/skinerbold/ROULETTE-ANALYZER.git

# 6. Push
git push -u origin main
```

**⚠️ Importante**: Use seu **Personal Access Token** do GitHub, não senha!

---

## 🌐 **Deploy na Vercel**

### **Depois do push no GitHub:**

1. Acesse: https://vercel.com
2. Sign Up → **Continue with GitHub**
3. Autorize a Vercel
4. **Add New...** → **Project**
5. Selecione: **ROULETTE-ANALYZER**
6. Clique em **Import**

### **Configure as variáveis de ambiente:**

Clique em **Environment Variables** e adicione:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://seu-projeto.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sua-chave-anon-aqui` |

**📝 Onde pegar:**
1. https://supabase.com/dashboard
2. Seu projeto → Settings → API
3. Copie Project URL e anon public key

### **Deploy:**

Clique em **Deploy** e aguarde 2-5 minutos!

---

## ✅ **Pronto!**

Seu app estará online em:
```
https://roulette-analyzer-[seu-usuario].vercel.app
```

---

## 🆘 **Problemas?**

### **Erro ao fazer push no Git:**
```powershell
# Se der erro de autenticação, crie um Personal Access Token:
# 1. https://github.com/settings/tokens
# 2. Generate new token (classic)
# 3. Marque: repo (full control)
# 4. Use o token como senha ao fazer push
```

### **Build falha na Vercel:**
- Verifique se as variáveis de ambiente estão corretas
- URL do Supabase deve começar com `https://`
- Chave anon deve ser completa (começa com `eyJ...`)

---

## 📖 **Guia Completo**

Para instruções detalhadas, veja:
- **DEPLOY.md** - Guia completo de deploy
- **README.md** - Documentação do projeto
- **COMO_EXECUTAR.md** - Como rodar localmente

---

**🎉 Em 5 minutos seu Roulette Analyzer estará no ar!**
