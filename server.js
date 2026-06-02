import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// --- 1. MIDDLEWARES ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// LOG DE DEBUG: Tudo que o servidor recebe aparecerá no terminal
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

// --- 2. ROTAS DA API (Sempre ANTES do static) ---

// Proxy de comunicação com o Google Apps Script
app.post('/api/proxy', async (req, res) => {
    try {
        const response = await fetch(process.env.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...req.body, apiKey: process.env.SECRET_KEY })
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("ERRO NO PROXY:", error);
        res.status(502).json({ status: 'error', message: 'Falha no servidor de dados' });
    }
});

// Rota de Cálculo de Rota
app.post('/api/calcular-rota', upload.single('arquivo'), async (req, res) => {
    try {
        const { coordenadas, prioridade, retorno } = req.body;
        if (!coordenadas) return res.status(400).json({ status: 'error', message: 'Dados incompletos' });

        const pontos = typeof coordenadas === 'string' ? JSON.parse(coordenadas) : coordenadas;
        const stringCoordenadas = pontos.map(p => `${p.lng},${p.lat}`).join(';');
        
        const osrmResponse = await fetch(`https://router.project-osrm.org/route/v1/driving/${stringCoordenadas}?overview=false`);
        const osrmData = await osrmResponse.json();

        if (!osrmData.routes) throw new Error("OSRM não retornou rotas");

        res.json({ 
            status: 'success', 
            distancia_km: (osrmData.routes[0].distance / 1000).toFixed(2),
            valor_taxa: 25.00 // Exemplo fixo
        });
    } catch (error) {
        console.error("ERRO EM /api/calcular-rota:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// --- 3. ARQUIVOS ESTÁTICOS ---
// Só serve arquivos físicos (JS, CSS, HTML) se não forem rotas de API
app.use(express.static(path.join(__dirname, 'app')));

// --- 4. FALLBACK PARA SPA ---
// Garante que o roteamento interno do seu App funcione
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`💤 Servidor rodando em http://localhost:${PORT}`));