import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

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

async function fetchGAS(payload) {
    const url = process.env.API_URL;
    if (!url) throw new Error('API_URL não configurada');

    const body = JSON.stringify(payload);

    let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body,
        redirect: 'manual'
    });

    if (response.status === 301 || response.status === 302) {
        const redirectUrl = response.headers.get('location');
        if (redirectUrl) {
            response = await fetch(redirectUrl, {
                method: 'GET',
                redirect: 'follow'
            });
        }
    }

    const text = await response.text();

    try {
        return JSON.parse(text);
    } catch {
        throw new Error('Resposta inválida do GAS: ' + text.substring(0, 300));
    }
}

async function buscarUsuarioGAS(username) {
    try {
        const result = await fetchGAS({
            action: 'getUsuarios',
            apiKey: process.env.SECRET_KEY
        });

        console.log('[DEBUG] getUsuarios retornou:', Array.isArray(result) ? result.length + ' usuários' : typeof result);

        if (!Array.isArray(result)) return null;

        for (const u of result) {
            const uName = String(u.username || u.user || u.login || '').trim();
            if (uName === username) {
                console.log('[DEBUG] Usuário encontrado. Campos:', JSON.stringify(Object.keys(u)));
                console.log('[DEBUG] imagem:', JSON.stringify(u.imagem));
                console.log('[DEBUG] Objeto completo:', JSON.stringify(u).substring(0, 500));
                return u;
            }
        }
        console.log('[DEBUG] Usuário "' + username + '" NÃO encontrado na lista');
    } catch (err) {
        console.error('[LOGIN] Erro ao buscar avatar no GAS:', err.message);
    }
    return null;
}

app.post('/api/proxy', async (req, res) => {
    try {
        const { action, username, password } = req.body;

        if (action === 'login') {
            console.log(`[LOGIN] Tentativa: "${username}"`);

            const masterLogin = process.env.MASTER_LOGIN;
            const masterHash = process.env.MASTER_PASS_HASH;
            const masterPlain = process.env.MASTER_PASS;

            if (masterLogin && username === masterLogin) {
                let senhaOk = false;

                if (masterHash) {
                    const cleanHash = masterHash.replace(/\$\$/g, '$');
                    try {
                        senhaOk = await bcrypt.compare(password, cleanHash);
                    } catch {
                        senhaOk = false;
                    }
                }

                if (!senhaOk && masterPlain) {
                    senhaOk = password === masterPlain;
                }

                if (senhaOk) {
                    console.log('[LOGIN] ✅ Master autenticado');

                    const gasUser = await buscarUsuarioGAS(masterLogin);

                    const imagem = gasUser?.imagem || gasUser?.foto || gasUser?.avatar || gasUser?.image || '';
                    const tipo = gasUser?.tipo || gasUser?.role || gasUser?.cargo || process.env.MASTER_CARGO || 'Admin';

                    console.log(`[LOGIN] Avatar: ${imagem ? 'Encontrado' : 'Não encontrado'}`);

                    return res.json({
                        status: 'success',
                        user: {
                            username: masterLogin,
                            tipo,
                            imagem
                        }
                    });
                }

                console.log('[LOGIN] ❌ Senha Master incorreta');
                return res.status(401).json({
                    status: 'error',
                    message: 'Usuário ou senha incorretos.'
                });
            }

            console.log('[LOGIN] Encaminhando para GAS...');

            try {
                const gasResult = await fetchGAS({
                    action: 'login',
                    username,
                    password,
                    apiKey: process.env.SECRET_KEY
                });

                console.log('[LOGIN] Resposta GAS:', JSON.stringify(gasResult));

                if (gasResult.status === 'success' && gasResult.user) {
                    return res.json(gasResult);
                }

                return res.status(401).json({
                    status: 'error',
                    message: gasResult.message || 'Usuário ou senha incorretos.'
                });
            } catch (gasErr) {
                console.error('[LOGIN] Erro GAS:', gasErr.message);
                return res.status(502).json({
                    status: 'error',
                    message: 'Falha ao comunicar com o servidor de dados.'
                });
            }
        }

        if (!process.env.API_URL) {
            return res.status(500).json({
                status: 'error',
                message: 'API_URL não configurada no servidor'
            });
        }

        const payload = { ...req.body, apiKey: process.env.SECRET_KEY };
        console.log(`[PROXY] Action: ${action || 'N/A'}`);

        const data = await fetchGAS(payload);
        return res.json(data);

    } catch (error) {
        console.error('[PROXY] ERRO:', error.message);
        return res.status(502).json({
            status: 'error',
            message: 'Falha na comunicação com o servidor de dados',
            debug: error.message
        });
    }
});

app.use(express.static(PUBLIC_PATH));

app.get('*', (req, res) => {
    if (/\.(js|css|png|jpg|jpeg|gif|ico|json|svg|woff2?|ttf)$/.test(req.path)) {
        return res.status(404).send('Not Found');
    }
    res.sendFile(path.join(PUBLIC_PATH, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('=========================================');
    console.log(`  Servidor rodando em http://localhost:${PORT}`);
    console.log(`  API_URL: ${process.env.API_URL ? 'OK' : 'NÃO CONFIGURADA!'}`);
    console.log(`  SECRET_KEY: ${process.env.SECRET_KEY ? 'OK' : 'NÃO CONFIGURADA!'}`);
    console.log(`  MASTER_LOGIN: ${process.env.MASTER_LOGIN || 'N/A'}`);
    console.log('=========================================');
});
