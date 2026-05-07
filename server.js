require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('app'));

const TARGET_URL = process.env.API_URL;

// Proxy para Google Sheets / Backend
app.post('/api/proxy', async (req, res) => {
    const { action, ...data } = req.body;
    console.log(`[RDO-LOG] Ação: ${action}`);
    try {
        const response = await axios.post(TARGET_URL, { action, ...data });
        res.json(response.data);
    } catch (error) {
        console.error('❌ Erro no Proxy:', error.message);
        res.status(500).json({ status: 'error', message: 'Erro na comunicação' });
    }
});

// WEBHOOK: Recebe as mensagens do WhatsApp (Evolution API)
app.post('/webhook/whatsapp', async (req, res) => {
    const payload = req.body;
    if (payload.event === "messages.upsert") {
        const msg = {
            action: "save_whatsapp_msg",
            sender: payload.data.pushName || payload.data.key.remoteJid,
            remoteJid: payload.data.key.remoteJid,
            message: payload.data.message?.conversation || 
                     payload.data.message?.extendedTextMessage?.text || "Mídia"
        };
        try {
            await axios.post(TARGET_URL, msg);
            console.log(`✅ MSG Capturada: ${msg.sender}`);
        } catch (err) {
            console.error("❌ Erro ao salvar mensagem");
        }
    }
    res.status(200).send("OK");
});

// Keep-alive interno para o Render
setInterval(() => {
    axios.get(`http://localhost:${process.env.PORT || 3000}`).catch(() => {});
}, 600000); // 10 minutos

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 RDO-Express Online na porta ${PORT}`);
});
