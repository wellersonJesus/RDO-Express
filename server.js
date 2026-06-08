import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PUBLIC_PATH = path.join(__dirname, 'app');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Middleware de Logs
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Proxy para Google Apps Script
app.post('/api/proxy', async (req, res) => {
    try {
        const response = await fetch(process.env.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...req.body, apiKey: process.env.SECRET_KEY })
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("ERRO NO PROXY:", error);
        res.status(502).json({ status: 'error', message: 'Falha na comunicação com o servidor de dados' });
    }
});

// Servir arquivos estáticos da pasta 'app'
app.use(express.static(PUBLIC_PATH));

// Rota SPA (Single Page Application)
app.get('*', (req, res) => {
    // Se a rota não for um arquivo, serve o index.html
    const isFile = /\.(js|css|png|jpg|jpeg|gif|ico|json|svg|woff2?|ttf)$/.test(req.path);
    if (!isFile) {
        res.sendFile(path.join(PUBLIC_PATH, 'index.html'));
    } else {
        res.status(404).send('Not Found');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`💤 Servidor rodando em http://localhost:${PORT}`));
