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
# Instala o pacote localmente apenas para gerar o hash inicial
npm install bcryptjs

# Gera o Hash na tela de forma limpa
node -e 'const bcrypt = require("bcryptjs"); console.log(bcrypt.hashSync("master@123", 10));'
```

- Baixar mapa para docker

```bash
#link para dowunload
https://download.geofabrik.de/south-america/brazil/sudeste.html
#renomear mapa
mv mapas/sudeste-260601.osm.pbf mapas/minas-gerais-latest.osm.pbf
#extração mapa
sudo docker run -t -v "$(pwd)/mapas:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/minas-gerais-latest.osm.pbf
#particionamento
docker run -t -v "$(pwd)/mapas:/data" osrm/osrm-backend osrm-partition /data/minas-gerais-latest.osrm
#customização
docker run -t -v "$(pwd)/mapas:/data" osrm/osrm-backend osrm-customize /data/minas-gerais-latest.osrm
#verificar
ls -l mapas/
```
- Docker

```bash
#Para subir tudo pela primeira vez:
docker-compose up -d --build

#Para reiniciar apenas o seu app (após mudar o código):
docker-compose restart rdo_app

#Para ver logs e identificar erros (em tempo real):
docker-compose logs -f rdo_app

#Para parar o sistema sem excluir os dados:
docker-compose stop

#Para subir novamente (sem reconstruir):
docker-compose start
```
---

<div align="center">

**© JesusWellerson**
Development | SRE | Software Architect | Software Engineer
</div>