const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const axios = require('axios');

const popularBanco = async () => {
    console.log("🚀 Iniciando população do banco de usuários...");

    if (!process.env.API_URL) {
        console.error("❌ Erro: API_URL não definida no .env");
        process.exit(1);
    }

    const userData = {
        action: 'addusuarios', // Aba 'usuarios'
        apiKey: process.env.SECRET_KEY,
        id: Date.now().toString(),
        username: process.env.MASTER_LOGIN || "Master",
        cargo: process.env.MASTER_CARGO || "SRE Architect",
        password: process.env.MASTER_PASS_HASH
    };

    try {
        console.log(`📡 Enviando dados para: ${process.env.API_URL}`);
        const response = await axios.post(process.env.API_URL, userData);
        
        if (response.data.status === 'success') {
            console.log("✅ Usuário Master criado com sucesso na Planilha!");
            console.log(`👤 Login: ${userData.username}`);
        } else {
            console.error("⚠️ Resposta da API:", response.data);
        }
    } catch (error) {
        console.error("❌ Erro ao conectar:", error.message);
    }
};

popularBanco();
