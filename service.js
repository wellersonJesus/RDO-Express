import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'app')));

app.post('/api/login-auth', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.json({ status: 'error', message: 'Dados incompletos.' });
    }

    const uLower = username.trim().toLowerCase();
    
    let usuariosPlanilha = [];
    try {
        const targetUrl = process.env.API_URL;
        if (targetUrl) {
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getusuarios', apiKey: process.env.SECRET_KEY })
            });
            usuariosPlanilha = await response.json();
        }
    } catch (err) {
        console.error("Erro ao buscar dados na planilha:", err);
    }

    const masterUser = (process.env.MASTER_LOGIN || 'Master').trim().toLowerCase();
    let masterHash = process.env.MASTER_PASS_HASH || '';

    if (uLower === masterUser && masterHash) {
        if (masterHash.includes('$$')) masterHash = masterHash.replace(/\$\$/g, '$');
        if (bcrypt.compareSync(password, masterHash)) {
            const dadosPlanilhaMaster = Array.isArray(usuariosPlanilha) ? 
                usuariosPlanilha.find(userObj => String(userObj.username).toLowerCase().trim() === uLower) : null;

            return res.json({
                status: 'success',
                user: { 
                    username: process.env.MASTER_LOGIN || 'Master', 
                    cargo: process.env.MASTER_CARGO || 'SRE Architect', 
                    imagem: dadosPlanilhaMaster ? (dadosPlanilhaMaster.imagem || '') : '' 
                }
            });
        }
    }

    if (usuariosPlanilha && Array.isArray(usuariosPlanilha)) {
        const dbUser = usuariosPlanilha.find(userObj => String(userObj.username).toLowerCase().trim() === uLower);
        
        if (dbUser) {
            const storedHash = dbUser.password || dbUser.senha;
            
            if (storedHash && bcrypt.compareSync(password, String(storedHash).trim())) {
                return res.json({
                    status: 'success',
                    user: {
                        username: dbUser.username,
                        cargo: dbUser.tipo || dbUser.cargo || 'Operador',
                        imagem: dbUser.imagem || ''
                    }
                });
            }
        }
    }

    return res.json({ status: 'error', message: 'Usuário ou senha incorretos.' });
});

app.post('/api/proxy', async (req, res) => {
    try {
        const targetUrl = process.env.API_URL;
        if (!targetUrl) {
            return res.status(500).json({ status: 'error', message: 'Configuração API_URL ausente no arquivo .env' });
        }

        let bodyData = { ...req.body };

        if (!bodyData.action && bodyData.endpoint) {
            bodyData.action = bodyData.endpoint;
        }

        if (bodyData.action === 'addpedidos' || bodyData.action === 'updatepedidos') {
            if (!bodyData.dados) {
                bodyData.dados = { ...bodyData };
                delete bodyData.dados.action;
                delete bodyData.dados.apiKey;
                delete bodyData.dados.endpoint;
            }

            const idDetectado = bodyData.dados.id_pedido || bodyData.dados.id;
            if (idDetectado) {
                bodyData.dados.id_pedido = idDetectado;
                bodyData.dados.id = idDetectado;
            }
        }

        bodyData.apiKey = process.env.SECRET_KEY;

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        const data = await response.json();
        return res.json(data);

    } catch (error) {
        console.error("❌ [Erro Proxy RDO]:", error.message);
        return res.status(500).json({ status: 'error', message: 'Erro na comunicação externa do servidor.' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`💤 Servidor RDO integrado ativo na porta ${PORT}`));
