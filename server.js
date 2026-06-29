import express           from 'express';
import cors              from 'cors';
import dotenv            from 'dotenv';
import path              from 'path';
import { fileURLToPath } from 'url';
import bcrypt            from 'bcryptjs';
import { rateLimit }     from 'express-rate-limit';

dotenv.config();

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const app         = express();
const PUBLIC_PATH = path.join(__dirname, 'app');
const GAS_TIMEOUT = 30_000;

const ACTION_MAP = {
    createpedido:      'criarpedido',   
    addpedido:         'criarpedido',   
    finalizepedido:    'finalizarpedido',
    createusuario:     'addusuario',
    createcliente:     'addcliente',
    createcolaborador: 'addcolaborador',
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use((req, _res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

const limiterGeral = rateLimit({
    windowMs:        60 * 1000,
    limit:           60,
    standardHeaders: 'draft-8',
    legacyHeaders:   false,
    message:         { status: 'error', message: 'Muitas requisições. Aguarde um momento.' }
});

const limiterLogin = rateLimit({
    windowMs:        15 * 60 * 1000,
    limit:           10,
    standardHeaders: 'draft-8',
    legacyHeaders:   false,
    message:         { status: 'error', message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

async function fetchGAS(payload) {
    const url = process.env.API_URL;
    if (!url) throw new Error('API_URL não configurada no .env');

    console.log('[fetchGAS] Payload:', JSON.stringify(payload).substring(0, 300));

    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), GAS_TIMEOUT);

    let response;
    try {
        response = await fetch(url, {
            method:   'POST',
            headers:  { 'Content-Type': 'text/plain;charset=utf-8' },
            body:     JSON.stringify(payload),
            redirect: 'follow',
            signal:   controller.signal
        });
    } catch (err) {
        if (err.name === 'AbortError') throw new Error('Timeout: GAS não respondeu em 30s');
        throw err;
    } finally {
        clearTimeout(timer);
    }

    console.log(`[fetchGAS] Status: ${response.status} | URL final: ${response.url}`);

    const text = await response.text();
    console.log(`[fetchGAS] Resposta bruta: ${text.substring(0, 500)}`);

    if (!text || text.trim().length === 0)
        throw new Error(`GAS retornou resposta vazia (status ${response.status})`);

    try {
        return JSON.parse(text);
    } catch {
        if (text.includes('<!DOCTYPE') || text.includes('<html'))
            throw new Error('GAS retornou HTML — verifique se o script está publicado como Web App com acesso "Qualquer pessoa".');
        throw new Error(`JSON inválido recebido do GAS: ${text.substring(0, 300)}`);
    }
}

async function autenticarMasterLocal(username, password) {
    const masterLogin = process.env.MASTER_LOGIN;
    if (!masterLogin || username !== masterLogin) return null;

    const masterHash  = process.env.MASTER_PASS_HASH;
    const masterPlain = process.env.MASTER_PASS;
    let senhaOk       = false;

    if (masterHash) {
        try { senhaOk = await bcrypt.compare(password, masterHash.replace(/\$\$/g, '$')); }
        catch { senhaOk = false; }
    }
    if (!senhaOk && masterPlain) senhaOk = (password === masterPlain);
    if (!senhaOk) return null;

    try {
        const usuarios = await fetchGAS({ action: 'getusuarios', apiKey: process.env.SECRET_KEY });
        const gasUser  = Array.isArray(usuarios)
            ? usuarios.find(u => String(u.username || u.user || u.login || '').trim() === masterLogin)
            : null;
        return {
            username: masterLogin,
            tipo:     gasUser?.tipo   || gasUser?.role  || gasUser?.cargo || process.env.MASTER_CARGO || 'Admin',
            imagem:   gasUser?.imagem || gasUser?.foto  || gasUser?.avatar || gasUser?.image || ''
        };
    } catch {
        return { username: masterLogin, tipo: process.env.MASTER_CARGO || 'Admin', imagem: '' };
    }
}

async function handleLogin(req, res) {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    console.log(`[LOGIN] Tentativa: "${username}"`);

    if (!username || !password)
        return res.status(400).json({ status: 'error', message: 'Usuário e senha são obrigatórios.' });

    const masterUser = await autenticarMasterLocal(username, password);
    if (masterUser) {
        console.log('[LOGIN] Master autenticado via Node');
        return res.json({ status: 'success', user: masterUser });
    }

    if (username === process.env.MASTER_LOGIN) {
        console.log('[LOGIN] Senha master incorreta');
        return res.status(401).json({ status: 'error', message: 'Usuário ou senha incorretos.' });
    }

    console.log('[LOGIN] Encaminhando para GAS...');
    try {
        const gasResult = await fetchGAS({ action: 'login', username, password });
        if (gasResult?.status === 'success' && gasResult?.user)
            return res.json(gasResult);
        return res.status(401).json({ status: 'error', message: gasResult?.message || 'Usuário ou senha incorretos.' });
    } catch (err) {
        console.error('[LOGIN] Erro GAS:', err.message);
        return res.status(502).json({ status: 'error', message: 'Falha ao comunicar com o servidor de dados.', debug: err.message });
    }
}

async function handleValidarSenhaMaster(req, res) {
    const senha = String(req.body?.senha || '').trim();
    if (!senha)
        return res.status(400).json({ status: 'error', valido: false, message: 'Senha não informada.' });

    const masterHash  = process.env.MASTER_PASS_HASH;
    const masterPlain = process.env.MASTER_PASS;
    let valido        = false;

    if (masterHash) {
        try { valido = await bcrypt.compare(senha, masterHash.replace(/\$\$/g, '$')); }
        catch { valido = false; }
    }
    if (!valido && masterPlain) valido = (senha === masterPlain);

    return res.json({
        status:  valido ? 'success' : 'error',
        valido,
        message: valido ? 'Autenticado.' : 'Senha incorreta. Acesso negado.'
    });
}

async function handleProxy(req, res) {
    if (!process.env.API_URL)
        return res.status(500).json({ status: 'error', message: 'API_URL não configurada no servidor.' });

    const body   = req.body || {};
    const rawAction = String(body.action || '').toLowerCase().trim();
    const action    = ACTION_MAP[rawAction] || rawAction;

    if (action !== rawAction)
        console.log(`[PROXY] Action normalizada: "${rawAction}" → "${action}"`);

    const payload = Object.fromEntries(
        Object.entries(body).filter(([k]) => k !== 'apiKey')
    );
    payload.action = action;
    payload.apiKey = process.env.SECRET_KEY;

    console.log(`[PROXY] Action: "${action}" | Keys: ${Object.keys(payload).join(', ')}`);

    try {
        const data = await fetchGAS(payload);
        return res.json(data);
    } catch (err) {
        console.error('[PROXY] Erro fetchGAS:', err.message);
        return res.status(502).json({ status: 'error', message: 'Falha na comunicação com o servidor de dados.', debug: err.message });
    }
}

app.post('/api/proxy', limiterGeral, async (req, res) => {
    try {
        const action = String(req.body?.action || '').toLowerCase().trim();

        if (!action)
            return res.status(400).json({ status: 'error', message: 'Nenhuma ação informada.' });

        if (action === 'login')
            return limiterLogin(req, res, () => handleLogin(req, res));

        if (action === 'validarsenhamaster')
            return await handleValidarSenhaMaster(req, res);

        return await handleProxy(req, res);

    } catch (err) {
        console.error('[/api/proxy] ERRO não tratado:', err.message);
        return res.status(502).json({ status: 'error', message: 'Falha na comunicação com o servidor de dados.', debug: err.message });
    }
});

app.post('/api/validarsenhamaster', limiterLogin, handleValidarSenhaMaster);

app.use(express.static(PUBLIC_PATH));

app.get('*', (req, res) => {
    if (/\.(js|css|png|jpg|jpeg|gif|ico|json|svg|woff2?|ttf|html)$/.test(req.path)) {
        return res.sendFile(path.join(PUBLIC_PATH, req.path), err => {
            if (err) res.status(404).send('Not Found');
        });
    }
    res.sendFile(path.join(PUBLIC_PATH, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('=========================================');
    console.log(`  Servidor:    http://localhost:${PORT}`);
    console.log(`  API_URL:     ${process.env.API_URL         ? 'OK' : '⚠ NAO CONFIGURADA!'}`);
    console.log(`  SECRET_KEY:  ${process.env.SECRET_KEY      ? 'OK' : '⚠ NAO CONFIGURADA!'}`);
    console.log(`  MASTER_LOGIN:${process.env.MASTER_LOGIN    || 'N/A'}`);
    console.log(`  MASTER_HASH: ${process.env.MASTER_PASS_HASH ? 'OK' : 'N/A (usando MASTER_PASS)'}`);
    console.log(`  Static path: ${PUBLIC_PATH}`);
    console.log('=========================================');
});
