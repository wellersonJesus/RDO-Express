import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PUBLIC_PATH = path.join(__dirname, 'app');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ═══════════════════════════════════════════════════════════════
// Middleware de Logs
// ═══════════════════════════════════════════════════════════════
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// ═══════════════════════════════════════════════════════════════
// Proxy para Google Apps Script
// ═══════════════════════════════════════════════════════════════
app.post('/api/proxy', async (req, res) => {
    try {
        // 1. Validação: verifica se a URL da API está configurada
        if (!process.env.API_URL) {
            console.error("ERRO: API_URL não está definida no .env");
            return res.status(500).json({
                status: 'error',
                message: 'URL da API não configurada no servidor'
            });
        }

        // 2. Monta o payload (injeta a apiKey do servidor)
        var payload = JSON.stringify({
            ...req.body,
            apiKey: process.env.SECRET_KEY
        });

        console.log(`[PROXY] Action: ${req.body.action || 'N/A'}`);

        // 3. Faz a requisição ao Google Apps Script
        //    CORREÇÃO CRÍTICA: redirect: 'follow' é o padrão,
        //    mas o Google redireciona 302 e o fetch converte POST → GET.
        //    Solução: seguir o redirect manualmente.
        var response = await fetch(process.env.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: payload,
            redirect: 'follow'
        });

        // 4. Se o Google retornou redirect e o fetch não seguiu corretamente,
        //    vamos tratar manualmente
        if (response.status === 302 || response.status === 301) {
            var redirectUrl = response.headers.get('location');
            console.log(`[PROXY] Redirect detectado: ${redirectUrl}`);

            if (redirectUrl) {
                response = await fetch(redirectUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: payload,
                    redirect: 'follow'
                });
            }
        }

        // 5. Lê a resposta como texto primeiro (mais seguro)
        var responseText = await response.text();
        console.log(`[PROXY] Status: ${response.status} | Tamanho: ${responseText.length} chars`);

        // 6. Tenta parsear como JSON
        var data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error("[PROXY] Resposta não é JSON válido:", responseText.substring(0, 500));
            return res.status(502).json({
                status: 'error',
                message: 'Resposta inválida do servidor de dados',
                debug: responseText.substring(0, 200)
            });
        }

        // 7. Retorna o JSON para o frontend
        return res.status(200).json(data);

    } catch (error) {
        console.error("[PROXY] ERRO:", error.message || error);
        return res.status(502).json({
            status: 'error',
            message: 'Falha na comunicação com o servidor de dados',
            debug: error.message || 'Erro desconhecido'
        });
    }
});

// ═══════════════════════════════════════════════════════════════
// Servir arquivos estáticos da pasta 'app'
// ═══════════════════════════════════════════════════════════════
app.use(express.static(PUBLIC_PATH));

// ═══════════════════════════════════════════════════════════════
// Rota SPA (Single Page Application)
// ═══════════════════════════════════════════════════════════════
app.get('*', (req, res) => {
    var isFile = /\.(js|css|png|jpg|jpeg|gif|ico|json|svg|woff2?|ttf)$/.test(req.path);
    if (!isFile) {
        res.sendFile(path.join(PUBLIC_PATH, 'index.html'));
    } else {
        res.status(404).send('Not Found');
    }
});

// ═══════════════════════════════════════════════════════════════
// Iniciar servidor
// ═══════════════════════════════════════════════════════════════
var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log('=========================================');
    console.log('  Servidor rodando em http://localhost:' + PORT);
    console.log('  API_URL: ' + (process.env.API_URL ? 'Configurada' : 'NÃO CONFIGURADA!'));
    console.log('  SECRET_KEY: ' + (process.env.SECRET_KEY ? 'Configurada' : 'NÃO CONFIGURADA!'));
    console.log('=========================================');
});
