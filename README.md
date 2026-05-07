# [RDO-Express](https://wellersonjesus.github.io/RDO-Express/)

Interface de gestão de entregas.

# RUN

```bash
#Run api/app Acesse seu sistema em http://localhost:3000
npm start 

#Gerar senha hash
node -e 'const bcrypt = require("bcryptjs"); console.log(bcrypt.hashSync("master@123", 10));'

#Popular banco
npm run seed
```

# RUN DOCKER

```bash
# Para e remove qualquer container que sobrou com erro
sudo docker-compose down

# Limpa o cache de imagens que deu erro
sudo docker rmi rdo-express_rdo_app atendai/evolution-api:latest

# Tenta subir do zero
sudo docker-compose up -d --build
```
--- 

<div align="center">

**© JesusWellerson**
Development | SRE | Software Architect | Software Engineer
</div>