# --- STAGE 1: Builder ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copiar manifesto de pacotes
COPY package*.json tsconfig.json ./

# Instalar todas as dependências (incluindo devDependencies para compilação)
RUN npm ci

# Copiar arquivos de código fonte
COPY src/ ./src/

# Compilar TypeScript para JavaScript (dist/)
RUN npm run build

# --- STAGE 2: Runner (Production) ---
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Definir ambiente como produção
ENV NODE_ENV=production

# Copiar arquivos de pacotes
COPY package*.json ./

# Instalar todas as dependências (necessárias para dev e build)
RUN npm ci --include=dev

# Copiar o código transpilado do Builder
COPY --from=builder /usr/src/app/dist ./dist

# Expõe a porta padrão da API Fastify
EXPOSE 5000

# Por padrão inicia a API, mas pode ser sobrescrito no docker-compose
CMD ["node", "dist/apis/core/server.js"]
