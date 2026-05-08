require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('app'));

const TARGET_URL = process.env.API_URL;
const MASTER_KEY = process.env.SECRET_KEY;

// Proxy Genérico para Planilha (Incluindo as novas ações)
app.post('/api/proxy', async (req, res) => {
    try {
        const payload = { ...req.body, apiKey: MASTER_KEY };
        const response = await axios.post(TARGET_URL, payload);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Erro na integração RDO' });
    }
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.MASTER_LOGIN && password === process.env.MASTER_PASS) {
        return res.json({ success: true, user: { name: username, role: process.env.MASTER_CARGO } });
    }
    res.status(401).json({ success: false, message: 'Não autorizado' });
});

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'app', 'index.html')); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { console.log('💤 RDO System Humanizado na porta ' + PORT); });
