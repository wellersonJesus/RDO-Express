require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('app'));

const callSheetAPI = async (action, data = {}) => {
    return await axios.post(process.env.API_URL, {
        ...data,
        action: action,
        apiKey: process.env.SECRET_KEY
    });
};

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log("\n--- TENTATIVA DE LOGIN ---");
    console.log(`👤 Usuário digitado: [${username}]`);
    
    try {
        const sheetResponse = await callSheetAPI('getusuarios');
        const users = Array.isArray(sheetResponse.data) ? sheetResponse.data : [];
        
        console.log(`📊 Usuários encontrados na planilha: ${users.length}`);
        // Log para debug visual no terminal
        console.log("LISTA DE USUÁRIOS NO BANCO:", JSON.stringify(users, null, 2));

        const userFound = users.find(u => 
            u.username && u.username.toString().trim().toLowerCase() === username.trim().toLowerCase()
        );

        if (!userFound) {
            console.log("❌ ERRO: Usuário não existe na lista acima.");
            return res.status(401).json({ success: false, message: "Acesso negado!" });
        }

        console.log(`✅ Usuário localizado: ${userFound.username}`);
        console.log(`🔑 Hash no banco: ${userFound.password ? "Sim (presente)" : "Não (vazio!)"}`);

        // Validação de senha
        const isMatch = await bcrypt.compare(password, userFound.password).catch(e => {
            console.log("⚠️ Erro no Bcrypt (Hash inválido?):", e.message);
            return false;
        });

        if (!isMatch) {
            console.log("❌ ERRO: Senha não confere com o hash.");
            return res.status(401).json({ success: false, message: "Acesso negado!" });
        }

        console.log("🚀 LOGIN SUCESSO!");
        return res.json({ 
            success: true, 
            user: { name: userFound.username, role: userFound.cargo || 'Membro' } 
        });

    } catch (error) {
        console.error("💥 Erro Crítico:", error.message);
        res.status(500).json({ success: false, message: "Erro de conexão" });
    }
});

app.listen(3000, () => console.log('🚀 Server Debug Mode ON - Porta 3000'));
