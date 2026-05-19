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

        // Se a ação for ler o financeiro, faremos a unificação em tempo real com os pedidos concluídos antigos
        if (bodyData.action === 'getfinanceiro') {
            try {
                // Busca simultânea no Google Sheets (Financeiro e Pedidos)
                const [resFinanceiro, resPedidos] = await Promise.all([
                    fetch(targetUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'getfinanceiro', apiKey: process.env.SECRET_KEY })
                    }).then(r => r.json()),
                    fetch(targetUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'getpedidos', apiKey: process.env.SECRET_KEY })
                    }).then(r => r.json())
                ]);

                let listaConsolidada = Array.isArray(resFinanceiro) ? [...resFinanceiro] : [];

                if (Array.isArray(resPedidos)) {
                    // Filtra apenas os pedidos cujo status é concluído/finalizado
                    const pedidosConcluidos = resPedidos.filter(p => {
                        const st = String(p.status || '').toLowerCase().trim();
                        return st === 'concluido' || st === 'concluído' || st === 'finalizado';
                    });

                    pedidosConcluidos.forEach(p => {
                        const idPedido = parseInt(p.id_pedido || p.id);
                        
                        // Evita duplicar se o pedido já tiver sido migrado para a tabela financeiro antes
                        const jaExiste = listaConsolidada.some(f => parseInt(f.id_pedido) === idPedido);
                        
                        if (!jaExiste) {
                            const valorCorrida = parseFloat(p.valor_corrida || p.valor || 0);
                            const taxaAdm = parseFloat(p.taxa_localidade || p.taxa_adm || 0);
                            const valorLiquido = valorCorrida - taxaAdm;

                            // Simula a estrutura exata do banco financeiro para o front-end renderizar retroativamente
                            listaConsolidada.push({
                                id: `retro-${idPedido}`,
                                id_pedido: idPedido,
                                id_produto: null,
                                tipo_movimentacao: 'ENTRADA',
                                categoria: 'PEDIDO',
                                valor: valorCorrida,
                                taxa_adm: taxaAdm,
                                valor_liquido: valorLiquido,
                                caixa_origem: 'Caixa Principal',
                                forma_pagamento: p.forma_pagamento || 'PIX',
                                status_pgt: 'PAGO',
                                data_pagamento: p.data || p.data_entrega || new Date().toISOString(),
                                observacao: 'Histórico Retroativo - Sincronizado por correspondência de Status.'
                            });
                        }
                    });
                }

                return res.json(listaConsolidada);
            } catch (err) {
                console.error("❌ [Erro na Consolidação Retroativa]:", err.message);
                // Fallback: se der erro na unificação, tenta trazer ao menos o financeiro puro
            }
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

        // Mantém o interceptador em tempo real ativo para novos pedidos que forem alterados a partir de agora
        if (bodyData.action === 'updatepedidos') {
            const fonteDados = bodyData.dados || bodyData;
            const statusExtraido = String(fonteDados.status || bodyData.status || '').toLowerCase().trim();
            const idExtraido = fonteDados.id_pedido || fonteDados.id || bodyData.id_pedido || bodyData.id;

            if (idExtraido && (statusExtraido === 'concluido' || statusExtraido === 'concluído' || statusExtraido === 'finalizado')) {
                const valorCorrida = parseFloat(fonteDados.valor_corrida || fonteDados.valor || 0);
                const taxaAdm = parseFloat(fonteDados.taxa_localidade || fonteDados.taxa_adm || 0);
                const valorLiquido = valorCorrida - taxaAdm;

                const payloadFinanceiro = {
                    action: 'addfinanceiro',
                    apiKey: process.env.SECRET_KEY,
                    id_pedido: parseInt(idExtraido),
                    id_produto: null,
                    tipo_movimentacao: 'ENTRADA',
                    categoria: 'PEDIDO',
                    valor: valorCorrida,
                    taxa_adm: taxaAdm,
                    valor_liquido: valorLiquido,
                    caixa_origem: 'Caixa Principal',
                    forma_pagamento: fonteDados.forma_pagamento || 'PIX',
                    status_pgt: 'PAGO',
                    observacao: `Replicação automática - Pedido #${idExtraido} Concluído.`
                };

                fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadFinanceiro)
                }).catch(err => console.error("❌ [Erro Replicação Financeiro]:", err.message));
            }
        }

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
