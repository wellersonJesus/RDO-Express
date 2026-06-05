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

app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

app.post('/api/proxy', async (req, res) => {
    try {
        if (!process.env.API_URL || !process.env.SECRET_KEY) {
            throw new Error("Variáveis de ambiente não configuradas.");
        }

        const response = await fetch(process.env.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...req.body, apiKey: process.env.SECRET_KEY })
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("ERRO NO PROXY:", error);
        res.status(502).json({ status: 'error', message: 'Falha no servidor de dados' });
    }
});

app.use(express.static(path.resolve(__dirname, 'app')));

app.get('*', (req, res) => {
    const isFile = /\.(js|css|png|jpg|jpeg|gif|ico|json|svg)$/.test(req.path);
    if (isFile) {
        return res.status(404).send('Arquivo não encontrado');
    }
    res.sendFile(path.join(PUBLIC_PATH, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`💤 Servidor operante em http://localhost:${PORT}`));
