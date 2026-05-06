require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'app')));

// Rota genérica para qualquer requisição de dados
app.post('/api/proxy', async (req, res) => {
    const url = process.env.API_URL;
    const key = process.env.SECRET_KEY;

    if (!url) return res.status(500).json({ status: "error", message: "API_URL não configurada no .env" });

    try {
        const response = await axios.post(url, { ...req.body, apiKey: key });
        res.json(response.data);
    } catch (error) {
        console.error("❌ Erro no Proxy:", error.message);
        res.status(500).json({ status: "error", message: "Falha na comunicação: " + error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Servidor RDO-Express rodando na porta ${PORT}`));
