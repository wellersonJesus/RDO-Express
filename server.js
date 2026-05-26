import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// --- Middlewares ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Servir arquivos estáticos da pasta 'app' explicitamente
app.use(express.static(path.join(__dirname, 'app')));

/**
 * Helper para chamadas ao Google Apps Script
 */
async function fetchGasApi(action, data = {}) {
    const response = await fetch(process.env.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, action, apiKey: process.env.SECRET_KEY })
    });
    
    if (!response.ok) throw new Error(`Erro na API externa: ${response.statusText}`);
    return await response.json();
}

// --- ROTA DE AUTENTICAÇÃO ---
app.post('/api/login-auth', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ status: 'error', message: 'Usuário e senha são obrigatórios.' });
    }

    try {
        const uLower = username.trim().toLowerCase();
        
        // 1. Check Master (Environment)
        const masterUser = (process.env.MASTER_LOGIN || 'admin').toLowerCase();
        const masterHash = (process.env.MASTER_PASS_HASH || '').replace(/\$\$\$/g, '$');

        if (uLower === masterUser && bcrypt.compareSync(password, masterHash)) {
            return res.json({ 
                status: 'success', 
                user: { username: masterUser, tipo: 'Administrador', imagem: '' } 
            });
        }

        // 2. Check Database via GAS
        const usuarios = await fetchGasApi('getusuarios');
        const dbUser = Array.isArray(usuarios) ? usuarios.find(u => 
            String(u.username || '').toLowerCase().trim() === uLower
        ) : null;

        if (dbUser && bcrypt.compareSync(password, String(dbUser.password || dbUser.senha || '').trim())) {
            return res.json({
                status: 'success',
                user: { 
                    username: dbUser.username, 
                    tipo: dbUser.tipo || 'Operador', 
                    imagem: dbUser.imagem || '' 
                }
            });
        }
        
        res.status(401).json({ status: 'error', message: 'Credenciais inválidas.' });
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ status: 'error', message: 'Erro interno ao processar login.' });
    }
});

// --- PROXY DE API ---
app.post('/api/proxy', async (req, res) => {
    const { action, ...payload } = req.body;
    if (!action) return res.status(400).json({ status: 'error', message: 'Ação não definida.' });

    try {
        const data = await fetchGasApi(action, payload);
        res.json(data);
    } catch (error) {
        res.status(502).json({ status: 'error', message: 'Falha na comunicação com o servidor de dados.' });
    }
});

// --- ROTA DE SPA (SPA Fallback) ---
// Garante que qualquer rota que não seja /api ou arquivo físico retorne o index.html
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`💤 Servidor RDO Express iniciado na porta ${PORT}`);
});
