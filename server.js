require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('app'));

const TARGET_URL = process.env.API_URL;
const MASTER_KEY = process.env.SECRET_KEY;
const EVOLUTION_API_KEY = process.env.AUTHENTICATION_API_KEY;
const EVOLUTION_URL = "http://evolution_gateway:8080";

// Rota para Ativar o Bot (Configura o Webhook na Evolution API via Botão)
app.post('/api/bot/configurar-webhook', async (req, res) => {
    try {
        const { instanceName } = req.body; // Nome da instância conectada no WhatsApp
        const webhookUrl = `http://rdo_app:3000/webhook/whatsapp`;

        const response = await axios.post(`${EVOLUTION_URL}/webhook/set/${instanceName}`, {
            enabled: true,
            url: webhookUrl,
            webhook_by_events: true,
            events: ["MESSAGES_UPSERT"]
        }, {
            headers: { 'apikey': EVOLUTION_API_KEY }
        });

        res.json({ status: 'success', message: 'Webhook configurado com sucesso!', data: response.data });
    } catch (error) {
        console.error('❌ Erro ao configurar Evolution:', error.message);
        res.status(500).json({ status: 'error', message: 'Falha ao conectar com Evolution API' });
    }
});

// Webhook que recebe as mensagens do WhatsApp
app.post('/webhook/whatsapp', async (req, res) => {
    try {
        const data = req.body;
        if (data.event === "messages.upsert") {
            const msg = data.data;
            const remoteJid = msg.key.remoteJid;
            const textMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

            if (!textMsg) return res.sendStatus(200);

            // Busca grupos cadastrados na planilha
            const botConfig = await axios.post(TARGET_URL, { action: 'getbotconfig', apiKey: MASTER_KEY });
            const monitorados = botConfig.data || [];
            
            const estaMonitorado = monitorados.find(b => b.valor === remoteJid);

            if (estaMonitorado) {
                await axios.post(TARGET_URL, {
                    action: 'addchatlive',
                    apiKey: MASTER_KEY,
                    id: "MSG-" + Date.now(),
                    data: new Date().toLocaleDateString('pt-BR'),
                    hora: new Date().toLocaleTimeString('pt-BR'),
                    cliente: remoteJid,
                    ultima_msg: textMsg,
                    status: 'Aberto',
                    id_whatsapp: msg.key.id
                });
            }
        }
        res.status(200).send("OK");
    } catch (error) {
        res.status(200).send("Ignore Error");
    }
});

app.post('/api/proxy', async (req, res) => {
    try {
        const payload = { ...req.body, apiKey: MASTER_KEY };
        const response = await axios.post(TARGET_URL, payload);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Erro na planilha' });
    }
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.MASTER_LOGIN && password === process.env.MASTER_PASS) {
        return res.json({ success: true, user: { name: username, role: process.env.MASTER_CARGO } });
    }
    res.status(401).json({ success: false, message: 'Inválido' });
});

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'app', 'index.html')); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { console.log('🚀 RDO System Online na porta ' + PORT); });
