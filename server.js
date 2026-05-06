require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('app'));

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    // Validação usando bcrypt e variáveis de ambiente
    const isMatch = await bcrypt.compare(password, process.env.MASTER_PASS_HASH);
    
    if (username === process.env.MASTER_LOGIN && isMatch) {
        return res.json({ success: true });
    }
    res.status(401).json({ success: false });
});

app.post('/api/proxy', async (req, res) => {
    try {
        const response = await axios.post(process.env.API_URL, { 
            ...req.body, 
            apiKey: process.env.SECRET_KEY 
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(3000, () => console.log('💤 Server UP port 3000'));
