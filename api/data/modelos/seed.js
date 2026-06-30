import { fileURLToPath } from 'url';
import path from 'path';
import { config } from 'dotenv';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

config({ path: path.resolve(__dirname, '../../../.env') });

const popularBanco = async () => {
    console.log("🚀 Iniciando população do banco de usuários...");

    const hashReal = process.env.MASTER_PASS_HASH.replace(/\$\$/g, '$');

    const userData = {
        action:   'addusuarios',
        apiKey:   process.env.SECRET_KEY,
        id:       Date.now().toString(),
        username: process.env.MASTER_LOGIN   || "Wellerson",
        cargo:    process.env.MASTER_CARGO   || "SRE Architect",
        contato:  process.env.MASTER_CONTATO || "",
        imagem:   process.env.MASTER_AVATAR  || "",
        password: hashReal,
        status:   "TRUE"
    };

    console.log("📦 Payload:", { ...userData, password: '[HASH OCULTO]' });

    try {
        const response = await axios.post(
            process.env.API_URL,
            JSON.stringify(userData),
            {
                headers: { 'Content-Type': 'application/json' },
                maxRedirects: 5,
                validateStatus: s => s >= 200 && s < 500
            }
        );

        console.log("📨 Resposta:", JSON.stringify(response.data));

        if (response.data?.status === 'success') {
            console.log(`✅ Usuário '${userData.username}' criado com sucesso!`);
        } else {
            console.error("⚠️ API retornou:", response.data);
        }

    } catch (error) {
        console.error("❌ Erro:", error.response?.data || error.message);
    }
};

popularBanco();
