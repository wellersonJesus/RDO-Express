# [RDO-Express](https://wellersonjesus.github.io/RDO-Express/)

Interface de gestão logística e automação de atendimento integrada via WhatsApp.

O ecossistema **RDO-Express** foi projetado para centralizar o fluxo operacional de entregas. Utilizando a **Evolution API** como gateway e **Google Apps Script** como motor de persistência, o sistema automatiza a captura de pedidos, monitoramento de grupos, gestão de colaboradores e cálculos financeiros (tarifas dinâmicas e comissões) em tempo real. A arquitetura atual é totalmente conteinerizada, garantindo escalabilidade e facilidade no deploy via Docker.

##### Stack Tecnológica
- **Backend:** Node.js (Express) com Proxy reverso para Apps Script.
- **Frontend:** Single Page Application (SPA) modular com Bootstrap 5.
- **WhatsApp:** Gateway Evolution API (v1.6.1) via Webhook.
- **Infra:** Docker & Docker Compose para orquestração de serviços.

##### Execução (Local Development)

- Instalar dependencia

```bash
# Instalar dependências e subir servidor (Acesse: http://localhost:3000)
npm install && npm start 
```

- Gerar hash

```bash
# Gerar senha hash segura para o .env
node -e 'const bcrypt = require("bcryptjs"); console.log(bcrypt.hashSync("sua_senha", 10));
```

- Popular dados Docker

```bash
# Popular base de dados inicial
npm run seed
🐳 Operação SRE (Docker)
Reset Total e Limpeza
Use este comando para garantir que nenhum cache ou container órfão interfira na nova versão:
```
- Limpar imagens 

```bash
# Para o ecossistema, limpa imagens com erro e reconstrói do zero
sudo docker-compose down && \
sudo docker rmi rdo-express_rdo_app atendai/evolution-api:v1.6.1 && \
sudo docker-compose up -d --build
Atualização Rápida (Hot Reload)
Para aplicar alterações no código ou variáveis de ambiente sem derrubar todo o gateway:
```

- Reconstruir Docker

```bash
# Reconstrói apenas o container da aplicação RDO
sudo docker-compose up -d --build rdo_app
```

- Monitoramento de Logs

```bash
# Acompanhar mensagens do Webhook e requisições em tempo real
sudo docker logs -f rdo_app
```
---

<div align="center">

**© JesusWellerson**
Development | SRE | Software Architect | Software Engineer
</div>