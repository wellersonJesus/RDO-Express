require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('app'));

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
    
    try {
        // Busca todos os usuários da planilha para validar
        const sheetResponse = await callSheetAPI('getusuarios');
        const users = sheetResponse.data || [];
        
        // Procura o usuário exato pelo username vindo da planilha
        const userFound = users.find(u => u.username === username);

        if (!userFound) {
            return res.status(401).json({ success: false, message: "Usuário não encontrado" });
        }

        // Valida a senha (comparando com o hash da planilha ou senha mestra)
        const isMatch = await bcrypt.compare(password, userFound.password || process.env.MASTER_PASS_HASH);
        
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Senha incorreta" });
        }

        // Retorna exatamente os campos 'username' e 'cargo' da planilha
        return res.json({ 
            success: true, 
            user: { 
                name: userFound.username, 
                role: userFound.cargo 
            } 
        });
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ success: false, message: "Erro interno no servidor" });
    }
});

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

app.listen(3000, () => console.log('🚀 RDO-Express rodando na porta 3000'));
