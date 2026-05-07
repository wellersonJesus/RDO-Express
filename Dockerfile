FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
# O Docker ignora o .env por padrão se não for copiado
EXPOSE 3000
CMD ["node", "server.js"]
