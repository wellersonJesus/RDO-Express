require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'app')));

// Rota de comunicação com o Google
app.post('/api/usuarios', async (req, res) => {
    // Definimos a URL aqui para garantir que ela exista
    const url = process.env.API_URL;
    const key = process.env.SECRET_KEY;

    if (!url) {
        return res.status(500).json({ status: "error", message: "Configuração API_URL ausente no .env" });
    }

    try {
        // Envia os dados para o Google
        const response = await axios.post(url, { ...req.body, apiKey: key });
        res.json(response.data);
    } catch (error) {
        // Log do erro real no terminal
        if (error.response) {
            console.error("❌ Erro do Google:", error.response.status, error.response.data);
        } else {
            console.error("❌ Erro de Conexão:", error.message);
        }
        res.status(500).json({ status: "error", message: "Falha na comunicação com o servidor Google." });
    }
});

app.listen(PORT, () => {
    console.log(`💤 RUN API & App in port ${PORT}`);
});