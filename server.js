require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('app'));

const TARGET_URL = process.env.API_URL;
const MASTER_KEY = process.env.SECRET_KEY;

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (username === process.env.MASTER_LOGIN && password === process.env.MASTER_PASS) {
        return res.json({
            success: true,
            user: {
                name: process.env.MASTER_LOGIN,
                role: process.env.MASTER_CARGO,
                imagem: process.env.MASTER_IMG,
                tipo: 'admin'
            }
        });
    }

    try {
        const response = await axios.post(TARGET_URL, { action: 'getusuarios', apiKey: MASTER_KEY });
        const usuarios = response.data;
        const userFound = usuarios.find(u => u.username === username && u.password === password);

        if (userFound) {
            await axios.post(TARGET_URL, { 
                action: 'updatebotstatus', 
                username: userFound.username, 
                status: true, 
                apiKey: MASTER_KEY 
            });

            return res.json({
                success: true,
                user: {
                    name: userFound.username,
                    role: userFound.tipo,
                    imagem: userFound.imagem,
                    tipo: userFound.tipo
                }
            });
        }
        res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro de conexão' });
    }
});

app.post('/api/proxy', async (req, res) => {
    try {
        const payload = { ...req.body, apiKey: MASTER_KEY };
        const response = await axios.post(TARGET_URL, payload);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ status: 'error' });
    }
});

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'app', 'index.html')); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { console.log('💤 RDO Express: Rodando na porta ' + PORT); });
