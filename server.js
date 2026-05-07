require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('app'));

// Helper para chamadas ao Google Apps Script
const callSheetAPI = async (action, data = {}) => {
    try {
        const response = await axios.post(process.env.API_URL, {
            ...data,
            action: action,
            apiKey: process.env.SECRET_KEY
        });
        return response.data;
    } catch (error) {
        console.error(`❌ Erro na API Google (${action}):`, error.message);
        throw error;
    }
};

// Rota de Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const users = await callSheetAPI('getusuarios');
        const userFound = Array.isArray(users) ? users.find(u => 
            u.username && u.username.toString().trim().toLowerCase() === username.trim().toLowerCase()
        ) : null;

        if (!userFound || !(await bcrypt.compare(password, userFound.password))) {
            return res.status(401).json({ success: false, message: "Acesso negado!" });
        }

        res.json({ 
            success: true, 
            user: { name: userFound.username, role: userFound.cargo || 'Membro' } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro no servidor" });
    }
});

// Rota de Proxy (FUNDAMENTAL para carregar as listas)
app.post('/api/proxy', async (req, res) => {
    try {
        const { action, ...data } = req.body;
        console.log(`📡 Proxy requisitando: ${action}`);
        const result = await callSheetAPI(action, data);
        res.json(result);
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 RDO-Express Operacional na porta ${PORT}`));
