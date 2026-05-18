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

// CENTRALIZADOR DE AUTENTICAÇÃO COM COMPARAÇÃO CRIPTOGRÁFICA (BCRYPT) + RETORNO DE IMAGEM
app.post('/api/login-auth', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.json({ status: 'error', message: 'Dados incompletos.' });
    }

    const uLower = username.trim().toLowerCase();
    
    // Buscar preventivamente a lista de usuários para obter os metadados (como a imagem de perfil)
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

    // Etapa A: Validação do Master vindo do arquivo .env
    const masterUser = (process.env.MASTER_LOGIN || 'Master').trim().toLowerCase();
    let masterHash = process.env.MASTER_PASS_HASH || '';

    if (uLower === masterUser && masterHash) {
        if (masterHash.includes('$$')) masterHash = masterHash.replace(/\$\$/g, '$');
        if (bcrypt.compareSync(password, masterHash)) {
            // Tenta localizar se existe uma linha correspondente ao 'Master' na planilha para pegar a foto
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

    // Etapa B: Validação para demais usuários cadastrados na planilha do Google Sheets
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

// Proxy Genérico para chamadas de tabelas (add, update, delete)
app.post('/api/proxy', async (req, res) => {
    try {
        const targetUrl = process.env.API_URL;
        const bodyData = { ...req.body, apiKey: process.env.SECRET_KEY };

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Erro na comunicação externa do servidor.' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`💤 Server rodando na porta ${PORT}`));
