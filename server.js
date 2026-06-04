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
app.use(express.json());

app.post('/api/proxy', async (req, res) => {
    try {
        const payload = { ...req.body };

        if (payload.action === 'login') {
            // 1. Busca os dados do usuário (o Apps Script retorna o objeto com o hash)
            const response = await fetch(process.env.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', username: payload.username })
            });
            const data = await response.json();

            // 2. Valida o hash aqui no Node.js
            if (data.status === 'success' && data.user) {
                const isMatch = await bcrypt.compare(payload.password, data.user.password);
                if (isMatch) {
                    return res.status(200).json({ status: 'success', user: data.user });
                }
            }
            return res.status(401).json({ status: 'error', message: 'Senha incorreta' });
        }

        // ... resto do seu código de proxy ...
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Erro no servidor' });
    }
});

// Rota de Login (Serve o HTML)
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'app', 'pages', 'login', 'login.html'));
});

// Arquivos Estáticos
app.use(express.static(path.join(__dirname, 'app')));

// Fallback SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`💤 Servidor seguro rodando em http://localhost:${PORT}`));
