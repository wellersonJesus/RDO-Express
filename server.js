import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import multer from 'multer'; // Importado para gerenciar o recebimento de arquivos do aviãozinho

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Configuração do Multer para receber arquivos na memória de forma super leve
const storage = multer.memoryStorage();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // Limite de 5MB por arquivo

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'app')));

// --- ROTA DE LOGIN ---
app.post('/api/login-auth', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ status: 'error', message: 'Dados incompletos.' });

    const uLower = username.trim().toLowerCase();
    let usuariosPlanilha = [];

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

// --- ROTA EXCLUSIVA: CÁLCULO DE ROTA LOGÍSTICA VIA OSRM PÚBLICO ---
// Esta rota processa as coordenadas extraídas do arquivo enviado pelo aviãozinho
app.post('/api/calcular-rota', upload.single('arquivo'), async (req, res) => {
    try {
        // Coordenadas devem vir estruturadas do seu frontend como uma Array de objetos: [{lat, lng}, {lat, lng}]
        // ou parseadas do arquivo se você enviar o arquivo bruto.
        const { coordenadas, prioridade, retorno } = req.body; 

        // Fallback/Exemplo de segurança caso venha vazio do front
        const pontos = typeof coordenadas === 'string' ? JSON.parse(coordenadas) : coordenadas;
        
        if (!pontos || pontos.length < 2) {
            return res.status(400).json({ status: 'error', message: 'É necessário enviar ao menos 2 pontos (Origem e Destino).' });
        }

        // Monta a string de coordenadas no formato exigido pelo OSRM: Lng,Lat;Lng,Lat (Longitude primeiro!)
        const stringCoordenadas = pontos.map(p => `${p.lng},${p.lat}`).join(';');

        // URL do Servidor Cloud Público e Gratuito do OSRM (Livre de Docker local)
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${stringCoordenadas}?overview=false`;

        const osrmResponse = await fetch(osrmUrl);
        const osrmData = await osrmResponse.json();

        if (!osrmData.routes || osrmData.routes.length === 0) {
            return res.status(422).json({ status: 'error', message: 'Não foi possível calcular a rota com os pontos fornecidos.' });
        }

        // Distância retornada vem em metros. Convertendo para KM.
        const distanciaMetros = osrmData.routes[0].distance;
        const distanciaKM = distanciaMetros / 1000;

        // --- REGRAS DE NEGÓCIO FINANCEIRAS ---
        let valorTotal = 11.00; // Taxa Base (Até os primeiros 5 KM)

        // 1. KM Excedente (R$ 1,10 por KM após os 5km iniciais)
        if (distanciaKM > 5) {
            const kmExcedente = distanciaKM - 5;
            valorTotal += kmExcedente * 1.10;
        }

        // 2. Adicional por Pontos / Paradas (R$ 5,00 por endereço intermediário visitado)
        // O primeiro ponto é coleta (origem), o segundo é a entrega padrão. Paradas adicionais = total - 2
        const paradasAdicionais = pontos.length - 2;
        if (paradasAdicionais > 0) {
            valorTotal += paradasAdicionais * 5.00;
        }

        // 3. Taxa de Retorno (R$ 12,00 fixos caso solicitado)
        if (retorno === true || retorno === 'SIM' || retorno === 'true') {
            valorTotal += 12.00;
        }

        // 4. Taxa de Urgência (R$ 8,00 fixos caso seja urgente)
        if (prioridade === 'Urgente' || prioridade === 'URGENTE') {
            valorTotal += 8.00;
        }

        // Retorna o cálculo exato e limpo para o seu Fluxo de Chat no Frontend
        return res.json({
            status: 'success',
            distancia_km: parseFloat(distanciaKM.toFixed(2)),
            tempo_estimado_minutos: parseFloat((osrmData.routes[0].duration / 60).toFixed(0)),
            valor_taxa: parseFloat(valorTotal.toFixed(2))
        });

    } catch (error) {
        console.error("Erro interno no cálculo da rota:", error);
        res.status(500).json({ status: 'error', message: 'Erro ao processar e calcular a taxa de entrega.' });
    }
});

// --- PROXY DE API ---
app.post('/api/proxy', async (req, res) => {
    try {
        const bodyData = { ...req.body, apiKey: process.env.SECRET_KEY };
        
        if (bodyData.action === 'getfinanceiro') {
            const [financeiro, pedidos] = await Promise.all([
                fetch(process.env.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getfinanceiro', apiKey: process.env.SECRET_KEY }) }).then(r => r.json()),
                fetch(process.env.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getpedidos', apiKey: process.env.SECRET_KEY }) }).then(r => r.json())
            ]);
            return res.json(financeiro);
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
app.listen(PORT, () => console.log(`💤 Servidor RDO rodando na porta ${PORT}`));