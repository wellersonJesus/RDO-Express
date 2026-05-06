require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'app')));

// Rota de Autenticação Segura
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (username === process.env.MASTER_USER && bcrypt.compareSync(password, process.env.MASTER_PASS_HASH)) {
        return res.json({ success: true });
    }
    res.status(401).json({ success: false, message: "Credenciais inválidas" });
});

// Proxy
app.post('/api/proxy', async (req, res) => {
    const url = process.env.API_URL;
    const key = process.env.SECRET_KEY;
    if (!url) return res.status(500).json({ status: "error", message: "API_URL não configurada" });
    try {
        const response = await axios.post(url, { ...req.body, apiKey: key });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
