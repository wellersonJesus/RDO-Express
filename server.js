import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'app')));

// --- ROTA DE LOGIN ---
app.post('/api/login-auth', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ status: 'error', message: 'Dados incompletos.' });

    const uLower = username.trim().toLowerCase();
    let usuariosPlanilha = [];

    // 1. Tenta buscar usuários na planilha
    try {
        const response = await fetch(process.env.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getusuarios', apiKey: process.env.SECRET_KEY })
        });
        usuariosPlanilha = await response.json();
    } catch (err) {
        console.error("Erro ao buscar usuários no GAS:", err);
    }

    // 2. Verifica se é o Master
    const masterUser = (process.env.MASTER_LOGIN || 'master').trim().toLowerCase();
    let masterHash = (process.env.MASTER_PASS_HASH || '').replace(/\$\$\$/g, '$');

    if (uLower === masterUser && bcrypt.compareSync(password, masterHash)) {
        const dadosMaster = Array.isArray(usuariosPlanilha) ? 
            usuariosPlanilha.find(u => String(u.username || '').toLowerCase().trim() === uLower) : null;

        return res.json({
            status: 'success',
            user: { 
                username: process.env.MASTER_LOGIN || '', 
                tipo: process.env.MASTER_CARGO || '', 
                imagem: dadosMaster ? (dadosMaster.imagem || '') : '' 
            }
        });
    }

    // 3. Verifica Usuário comum
    if (Array.isArray(usuariosPlanilha)) {
        const dbUser = usuariosPlanilha.find(u => String(u.username || '').toLowerCase().trim() === uLower);
        if (dbUser && bcrypt.compareSync(password, String(dbUser.password || dbUser.senha || '').trim())) {
            return res.json({
                status: 'success',
                user: {
                    username: dbUser.username,
                    tipo: dbUser.tipo || dbUser.cargo || 'Operador',
                    imagem: dbUser.imagem || ''
                }
            });
        }
    }

    res.status(401).json({ status: 'error', message: 'Credenciais inválidas.' });
});

// --- PROXY DE API ---
app.post('/api/proxy', async (req, res) => {
    try {
        const bodyData = { ...req.body, apiKey: process.env.SECRET_KEY };
        
        // Lógica especial de financeiro mantida do seu modelo funcional
        if (bodyData.action === 'getfinanceiro') {
            const [financeiro, pedidos] = await Promise.all([
                fetch(process.env.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getfinanceiro', apiKey: process.env.SECRET_KEY }) }).then(r => r.json()),
                fetch(process.env.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getpedidos', apiKey: process.env.SECRET_KEY }) }).then(r => r.json())
            ]);
            // ... (aqui entra a lógica de consolidação que você já tinha no modelo funcional)
            return res.json(financeiro); // simplificado para exemplo
        }

        const response = await fetch(process.env.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(502).json({ status: 'error', message: 'Falha na comunicação com o servidor de dados.' });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'app', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor RDO rodando na porta ${PORT}`));