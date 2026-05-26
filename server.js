import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Middlewares essenciais
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Servir arquivos estáticos da pasta 'app'
app.use(express.static(path.join(__dirname, 'app')));

// --- ROTA DE LOGIN (AUTENTICAÇÃO) ---
app.post('/api/login-auth', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ status: 'error', message: 'Dados incompletos.' });

    const uLower = username.trim().toLowerCase();

    try {
        const response = await fetch(process.env.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getusuarios', apiKey: process.env.SECRET_KEY })
        });

        if (!response.ok) throw new Error('Falha ao conectar com o servidor de dados.');
        const usuariosPlanilha = await response.json();

        // 1. Checagem Master (Prioridade)
        const masterUser = (process.env.MASTER_LOGIN || 'Master').trim().toLowerCase();
        const masterHash = (process.env.MASTER_PASS_HASH || '').replace(/\$\$\$/g, '$');

        if (uLower === masterUser && masterHash && bcrypt.compareSync(password, masterHash)) {
            return res.json({ status: 'success', user: { username: masterUser, cargo: 'SRE Architect', imagem: '' } });
        }

        // 2. Checagem Banco/Planilha
        const dbUser = Array.isArray(usuariosPlanilha) ? usuariosPlanilha.find(u =>
            String(u.username || '').toLowerCase().trim() === uLower
        ) : null;

        if (dbUser && bcrypt.compareSync(password, String(dbUser.password || dbUser.senha || '').trim())) {
            return res.json({
                status: 'success',
                user: {
                    username: dbUser.username,
                    cargo: dbUser.tipo || dbUser.cargo || 'Operador',
                    imagem: dbUser.imagem || ''
                }
            });
        }
    } catch (err) {
        console.error("❌ Erro no Processo de Auth:", err);
        return res.status(500).json({ status: 'error', message: 'Erro interno no servidor.' });
    }

    return res.status(401).json({ status: 'error', message: 'Usuário ou senha incorretos.' });
});

// --- ROTA PROXY CENTRALIZADA ---
app.post('/api/proxy', async (req, res) => {
    try {
        if (!process.env.API_URL) throw new Error('API_URL não configurada no ambiente.');

        const bodyData = { ...req.body, apiKey: process.env.SECRET_KEY };
        if (bodyData.endpoint) bodyData.action = bodyData.endpoint;

        // Lógica Especial Financeiro (Consolidação)
        if (bodyData.action === 'getfinanceiro') {
            const [resFinanceiro] = await Promise.all([
                fetch(process.env.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'getfinanceiro', apiKey: process.env.SECRET_KEY })
                }).then(r => r.json())
            ]);
            return res.json(resFinanceiro || []);
        }

        // Proxy genérico
        const response = await fetch(process.env.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        const data = await response.json();
        return res.json(data);
    } catch (error) {
        console.error("❌ Proxy Error:", error.message);
        return res.status(500).json({ status: 'error', message: 'Erro na comunicação com a fonte de dados.' });
    }
});

// SPA Fallback: Qualquer rota não reconhecida retorna o index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`💤 Servidor RDO integrado ativo na porta ${PORT}`));