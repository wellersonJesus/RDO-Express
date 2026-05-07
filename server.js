require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('app'));

const TARGET_URL = process.env.API_URL;
const MASTER_KEY = process.env.SECRET_KEY;

const AUTH_USER = process.env.MASTER_LOGIN || "Master";
const AUTH_PASS = process.env.MASTER_PASS || "master@123";
const AUTH_CARGO = process.env.MASTER_CARGO || "SRE Architect";

// Login Local
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === AUTH_USER && password === AUTH_PASS) {
        return res.json({ success: true, user: { name: AUTH_USER, role: AUTH_CARGO } });
    }
    res.status(401).json({ success: false, message: 'Usuário ou senha inválidos' });
});

// Proxy para o Google Sheets
app.post('/api/proxy', async (req, res) => {
    try {
        // CORREÇÃO: Enviando como 'apiKey' para bater com o GAS
        const payload = { 
            ...req.body, 
            apiKey: MASTER_KEY 
        };
        
        const response = await axios.post(TARGET_URL, payload);
        res.json(response.data);
    } catch (error) {
        console.error('❌ Erro no Proxy:', error.message);
        res.status(500).json({ status: 'error', message: 'Erro na comunicação com a planilha' });
    }
});

app.get('/login', (req, res) => { res.sendFile(path.join(__dirname, 'app', 'login.html')); });
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'app', 'index.html')); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Servidor RDO Online em http://localhost:' + PORT);
});
