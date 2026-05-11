require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('app'));

const TARGET_URL = process.env.API_URL;
const MASTER_KEY = process.env.SECRET_KEY;

// Proxy para chamadas gerais
app.post('/api/proxy', async (req, res) => {
    try {
        const payload = { ...req.body, apiKey: MASTER_KEY };
        const response = await axios.post(TARGET_URL, payload);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Erro na integração RDO' });
    }
});

// Autenticação Híbrida (.env + Banco de Dados/Sheets)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // 1. Verificação do Usuário MASTER (.env)
    if (username === process.env.MASTER_LOGIN && password === process.env.MASTER_PASS) {
        return res.json({ 
            success: true, 
            user: { 
                name: username, 
                role: process.env.MASTER_CARGO, 
                imagem: process.env.MASTER_IMG 
            } 
        });
    }

    // 2. Verificação no Banco (Google Sheets) via API_URL
    try {
        const response = await axios.post(TARGET_URL, {
            action: 'getUsuarios',
            apiKey: MASTER_KEY
        });

        const usuarios = response.data;
        
        // Procura o usuário na lista retornada pela planilha
        // A planilha deve ter colunas: username, password, cargo, imagem
        const userFound = usuarios.find(u => u.username === username && u.password === password);

        if (userFound) {
            return res.json({
                success: true,
                user: {
                    name: userFound.username,
                    role: userFound.cargo || 'Colaborador',
                    imagem: userFound.imagem || '' // Pega a URL da célula da planilha
                }
            });
        }

        res.status(401).json({ success: false, message: 'Usuário ou senha inválidos' });
    } catch (error) {
        console.error('Erro ao acessar banco de dados:', error);
        res.status(500).json({ success: false, message: 'Erro ao conectar ao banco de dados' });
    }
});

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'app', 'index.html')); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { console.log('🚀 RDO System operando na porta ' + PORT); });
