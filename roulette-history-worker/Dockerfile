FROM node:20-alpine

# Criar diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Expor porta (Fly.io usa 8080)
EXPOSE 8080

# Iniciar aplicação
CMD ["node", "src/index.js"]
