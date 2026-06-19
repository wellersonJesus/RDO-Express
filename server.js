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

app.use(function (req, res, next) {
    console.log('[' + new Date().toLocaleTimeString() + '] ' + req.method + ' ' + req.url);
    next();
});

async function fetchGAS(payload) {
    var url = process.env.API_URL;
    if (!url) throw new Error('API_URL não configurada');

    var response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow'
    });

    console.log('[GAS] Status:', response.status, '| URL final:', response.url);

    var text = await response.text();

    console.log('[GAS] Resposta bruta (200 chars):', text.substring(0, 200));

    if (!text || text.trim().length === 0) {
        throw new Error('GAS retornou resposta vazia (status ' + response.status + ')');
    }

    try {
        return JSON.parse(text);
    } catch (e) {
        if (text.indexOf('<!DOCTYPE') !== -1 || text.indexOf('<html') !== -1) {
            throw new Error('GAS retornou HTML. Verifique se o script está publicado como Web App.');
        }
        throw new Error('JSON inválido do GAS: ' + text.substring(0, 300));
    }
}

async function buscarUsuarioGAS(username) {
    try {
        var result = await fetchGAS({
            action: 'getusuarios',
            apiKey: process.env.SECRET_KEY
        });

        console.log('[DEBUG] getUsuarios retornou:', Array.isArray(result) ? result.length + ' usuários' : typeof result);

        if (!Array.isArray(result)) return null;

        for (var i = 0; i < result.length; i++) {
            var u = result[i];
            var uName = String(u.username || u.user || u.login || '').trim();
            if (uName === username) {
                console.log('[DEBUG] Usuário encontrado:', uName);
                return u;
            }
        }

        console.log('[DEBUG] Usuário "' + username + '" não encontrado na lista');
    } catch (err) {
        console.error('[LOGIN] Erro ao buscar usuário no GAS:', err.message);
    }
    return null;
}

app.post('/api/proxy', async function (req, res) {
    try {
        var body = req.body || {};
        var action = String(body.action || '').toLowerCase().trim();

        console.log('[PROXY] Action recebida:', action);
        console.log('[PROXY] Body keys:', Object.keys(body).join(', '));

        if (!action) {
            return res.status(400).json({ status: 'error', message: 'Nenhuma ação informada' });
        }

        if (action === 'login') {
            var username = String(body.username || '').trim();
            var password = String(body.password || '');

            console.log('[LOGIN] Tentativa: "' + username + '"');

            var masterLogin = process.env.MASTER_LOGIN;
            var masterHash  = process.env.MASTER_PASS_HASH;
            var masterPlain = process.env.MASTER_PASS;

            if (masterLogin && username === masterLogin) {
                var senhaOk = false;

                if (masterHash) {
                    var cleanHash = masterHash.replace(/\$\$/g, '$');
                    try { senhaOk = await bcrypt.compare(password, cleanHash); } catch (e) { senhaOk = false; }
                }

                if (!senhaOk && masterPlain) {
                    senhaOk = password === masterPlain;
                }

                if (senhaOk) {
                    console.log('[LOGIN] Master autenticado');
                    var gasUser = await buscarUsuarioGAS(masterLogin);
                    var imagem  = '';
                    var tipo    = process.env.MASTER_CARGO || 'Admin';

                    if (gasUser) {
                        imagem = gasUser.imagem || gasUser.foto || gasUser.avatar || gasUser.image || '';
                        tipo   = gasUser.tipo   || gasUser.role || gasUser.cargo  || tipo;
                    }

                    return res.json({
                        status: 'success',
                        user: { username: masterLogin, tipo: tipo, imagem: imagem }
                    });
                }

                console.log('[LOGIN] Senha Master incorreta');
                return res.status(401).json({ status: 'error', message: 'Usuário ou senha incorretos.' });
            }

            console.log('[LOGIN] Encaminhando para GAS...');

            try {
                var gasResult = await fetchGAS({ action: 'login', username: username, password: password });
                console.log('[LOGIN] Resposta GAS:', JSON.stringify(gasResult).substring(0, 200));

                if (gasResult && gasResult.status === 'success' && gasResult.user) {
                    return res.json(gasResult);
                }

                return res.status(401).json({
                    status: 'error',
                    message: (gasResult && gasResult.message) ? gasResult.message : 'Usuário ou senha incorretos.'
                });
            } catch (gasErr) {
                console.error('[LOGIN] Erro GAS:', gasErr.message);
                return res.status(502).json({ status: 'error', message: 'Falha ao comunicar com o servidor de dados.' });
            }
        }

        if (!process.env.API_URL) {
            return res.status(500).json({ status: 'error', message: 'API_URL não configurada no servidor' });
        }

        var payload = {};
        Object.keys(body).forEach(function (k) {
            if (k !== 'apiKey') payload[k] = body[k];
        });
        payload.apiKey = process.env.SECRET_KEY;

        console.log('[PROXY] Encaminhando action:', payload.action);

        var data = await fetchGAS(payload);

        console.log('[PROXY] Resposta tipo:', typeof data, '| Array?', Array.isArray(data));

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

app.get('*', function (req, res) {
    if (/\.(js|css|png|jpg|jpeg|gif|ico|json|svg|woff2?|ttf)$/.test(req.path)) {
        return res.status(404).send('Not Found');
    }
    res.sendFile(path.join(PUBLIC_PATH, 'index.html'));
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
    console.log('=========================================');
    console.log('  Servidor rodando em http://localhost:' + PORT);
    console.log('  API_URL: '      + (process.env.API_URL      ? 'OK' : 'NAO CONFIGURADA!'));
    console.log('  SECRET_KEY: '   + (process.env.SECRET_KEY   ? 'OK' : 'NAO CONFIGURADA!'));
    console.log('  MASTER_LOGIN: ' + (process.env.MASTER_LOGIN || 'N/A'));
    console.log('  Static path: '  + PUBLIC_PATH);
    console.log('=========================================');
});
