# 🚀 Guia Completo - Deploy na VPS Hostinger

## Etapa 1: Acessar sua VPS

1. **Acesse o painel Hostinger** (hpanel.hostinger.com)
2. Vá em **VPS** no menu
3. Anote as informações:
   - **IP do servidor**: `xxx.xxx.xxx.xxx`
   - **Usuário root**: geralmente é `root`
   - **Senha**: enviada por email ou gerada no painel

## Etapa 2: Conectar via SSH

### No Windows (PowerShell):

```powershell
ssh root@SEU_IP_AQUI
```

Digite `yes` quando perguntar sobre fingerprint, depois digite a senha.

**Primeira coisa após conectar:**
```bash
# Atualizar sistema
apt update && apt upgrade -y
```

---

## Etapa 3: Instalar CyberPanel

```bash
# Download e instalação do CyberPanel
wget -O installer.sh https://cyberpanel.net/install.sh
chmod +x installer.sh
./installer.sh
```

**Durante a instalação, responda:**
- Install CyberPanel? → `1` (CyberPanel with OpenLiteSpeed)
- Full install? → `Y`
- RAM based on LiteSpeed license? → `Y`
- Remote MySQL? → `N`
- CyberPanel version? → `1` (Latest)
- Password for admin? → Digite uma senha forte
- Memcached? → `Y`
- Redis? → `Y`
- Watchdog? → `Y`

⏱️ **Tempo**: ~10-15 minutos

---

## Etapa 4: Acessar CyberPanel

1. Após instalação, acesse: `https://SEU_IP:8090`
2. **Login:**
   - Usuário: `admin`
   - Senha: a que você definiu
3. Aceite o certificado SSL temporário

---

## Etapa 5: Criar Website no CyberPanel

1. **Menu lateral** → `Websites` → `Create Website`
2. Preencha:
   - **Domain**: seu domínio ou IP (ex: `roleta.seudominio.com` ou `SEU_IP`)
   - **Email**: seu email
   - **Package**: Default
   - **Owner**: admin
   - **PHP**: Selecione `Do not install`
3. Clique em `Create Website`

---

## Etapa 6: Instalar Node.js

Volte para SSH e execute:

```bash
# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar instalação
node -v  # Deve mostrar v20.x.x
npm -v   # Deve mostrar 10.x.x

# Instalar PM2 (gerenciador de processos)
npm install -g pm2
```

---

## Etapa 7: Configurar Git e Clonar Projeto

```bash
# Instalar Git
apt install -y git

# Configurar Git
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"

# Navegar para pasta do website
cd /home/SEU_DOMINIO/public_html

# Remover index.html padrão
rm -rf *

# Clonar seu repositório (se estiver no GitHub)
git clone https://github.com/SEU_USUARIO/SEU_REPO.git .

# OU copiar arquivos via SFTP (FileZilla, WinSCP)
```

---

## Etapa 8: Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env.local
nano .env.local
```

Cole suas variáveis (ajuste conforme necessário):

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
NODE_ENV=production
```

**Salvar**: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## Etapa 9: Instalar Dependências e Build

```bash
# Instalar dependências
npm install

# Build da aplicação Next.js
npm run build
```

---

## Etapa 10: Configurar PM2 para Next.js e WebSocket

```bash
# Iniciar Next.js com PM2
pm2 start npm --name "roleta-nextjs" -- start

# Iniciar WebSocket Server (se separado)
pm2 start websocket-server.js --name "roleta-websocket"

# Configurar PM2 para iniciar no boot
pm2 startup
pm2 save

# Verificar status
pm2 status
pm2 logs  # Ver logs
```

---

## Etapa 11: Configurar Reverse Proxy no CyberPanel

1. **CyberPanel** → `Websites` → `List Websites`
2. Clique em **Manage** no seu site
3. Vá em `vHost Conf`
4. Adicione **antes** do último `</VirtualHost>`:

```apache
ProxyPass / http://localhost:3000/
ProxyPassReverse / http://localhost:3000/

# Para WebSocket
ProxyPass /ws ws://localhost:8080/
ProxyPassReverse /ws ws://localhost:8080/

# Headers para WebSocket
<IfModule mod_headers.c>
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-For "%{REMOTE_ADDR}s"
</IfModule>
```

5. Clique em `Save`
6. **Reiniciar servidor web**:

```bash
systemctl restart lsws
```

---

## Etapa 12: Configurar SSL (HTTPS)

1. **CyberPanel** → `SSL` → `Issue SSL`
2. Selecione seu website
3. Clique em `Issue SSL`
4. Aguarde 1-2 minutos

✅ Seu site agora está em `https://seu-dominio.com`

---

## Etapa 13: Configurar Firewall

```bash
# Permitir portas necessárias
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 8090/tcp  # CyberPanel
ufw allow 22/tcp    # SSH
ufw allow 8080/tcp  # WebSocket (se necessário)

# Ativar firewall
ufw enable
```

---

## Etapa 14: Comandos Úteis PM2

```bash
# Ver logs
pm2 logs roleta-nextjs
pm2 logs roleta-websocket

# Reiniciar aplicação
pm2 restart roleta-nextjs

# Parar aplicação
pm2 stop roleta-nextjs

# Deletar processo
pm2 delete roleta-nextjs

# Ver uso de recursos
pm2 monit
```

---

## Etapa 15: Atualizar Aplicação (Deploy de Updates)

```bash
cd /home/SEU_DOMINIO/public_html

# Puxar mudanças do Git
git pull

# Reinstalar dependências (se houve mudanças)
npm install

# Rebuild
npm run build

# Reiniciar PM2
pm2 restart roleta-nextjs
```

---

## 🔧 Troubleshooting

### Site não abre
```bash
# Verificar se Next.js está rodando
pm2 status
pm2 logs roleta-nextjs

# Verificar porta 3000
netstat -tlnp | grep 3000

# Reiniciar servidor web
systemctl restart lsws
```

### WebSocket não conecta
```bash
# Verificar se WebSocket está rodando
pm2 status
pm2 logs roleta-websocket

# Verificar porta 8080
netstat -tlnp | grep 8080
```

### Erro de memória durante build
```bash
# Build com mais memória
NODE_OPTIONS=--max_old_space_size=2048 npm run build
```

---

## 📊 Monitoramento

### Ver uso de recursos
```bash
# CPU e RAM
htop

# Espaço em disco
df -h

# Logs do sistema
journalctl -xe
```

---

## 🎯 Próximos Passos (Opcional)

1. **Configurar domínio personalizado**
   - Apontar DNS do domínio para o IP da VPS
   - Criar website com domínio no CyberPanel

2. **Configurar backups automáticos**
   - CyberPanel → Backup → Create Backup

3. **Monitoramento de performance**
   - Instalar ferramentas como New Relic, DataDog

4. **CDN (Cloudflare)**
   - Acelerar entrega de conteúdo
   - DDoS protection grátis

---

## ❓ Precisa de Ajuda?

Se encontrar algum erro, me envie:
1. A mensagem de erro completa
2. Logs do PM2: `pm2 logs`
3. Status: `pm2 status`
