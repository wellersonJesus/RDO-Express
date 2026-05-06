require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('app'));

// Middleware de Autenticação Simples
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader === 'true') {
        next();
    } else {
        res.status(401).json({ success: false, message: "Não autorizado" });
    }
};

const callSheetAPI = async (action, data = {}) => {
    return await axios.post(process.env.API_URL, {
        ...data,
        action: action,
        apiKey: process.env.SECRET_KEY
    });
};

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const isMatch = await bcrypt.compare(password, process.env.MASTER_PASS_HASH);
    
    if (username !== process.env.MASTER_LOGIN || !isMatch) {
        return res.status(401).json({ success: false, message: "Credenciais inválidas" });
    }

    try {
        const sheetData = await callSheetAPI('getusuarios');
        const users = sheetData.data || [];
        
        let userExists = users.find(u => u.username === process.env.MASTER_LOGIN);

        if (!userExists) {
            await callSheetAPI('addusuarios', {
                id: Date.now(),
                username: process.env.MASTER_LOGIN,
                cargo: process.env.MASTER_CARGO,
                password: process.env.MASTER_PASS_HASH
            });
            userExists = { username: process.env.MASTER_LOGIN, cargo: process.env.MASTER_CARGO };
        }

        return res.json({ 
            success: true, 
            user: { name: userExists.username, role: userExists.cargo } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro interno" });
    }
});

// Aplicando o middleware aqui para proteger o proxy
app.post('/api/proxy', authMiddleware, async (req, res) => {
    try {
        const response = await axios.post(process.env.API_URL, { 
            ...req.body, 
            apiKey: process.env.SECRET_KEY 
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(3000, () => console.log('💤 Server ON port 3000'));
