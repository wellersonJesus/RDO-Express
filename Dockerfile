# Use uma versão LTS estável do Node.js
FROM node:18-slim

# Instala ferramentas essenciais para construção (caso algum módulo precise)
# e limpa o cache do apt para manter a imagem leve
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho
WORKDIR /app

# Copia arquivos de dependência primeiro (otimização de cache do Docker)
COPY package*.json ./

# Instala as dependências (certifique-se que axios está em "dependencies")
RUN npm install

# Copia todo o código da aplicação
COPY . .

# Expõe a porta 3000
EXPOSE 3000

# Executa o servidor
CMD ["node", "server.js"]