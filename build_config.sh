#!/bin/bash

# Carrega as variáveis do .env ignorando comentários
export $(grep -v '^#' api/.env | xargs)

# Substitui as variáveis no template e gera o arquivo final
envsubst < app/js/config.template.js > app/js/config.js

echo "Arquivo app/js/config.js gerado com sucesso!"
