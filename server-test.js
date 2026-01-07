// Servidor Express simples para testes locais
// Desabilitar verificação SSL em desenvolvimento
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Servir arquivos estáticos
app.use(express.static('public'));

// Importar e usar as functions como rotas
const crypto = require('./netlify/functions/crypto');
const fiis = require('./netlify/functions/fiis');
const cdb = require('./netlify/functions/cdb');
const news = require('./netlify/functions/news');

// Wrapper para adaptar Netlify Functions ao Express
const wrapHandler = (handler) => async (req, res) => {
    try {
        const event = {
            httpMethod: req.method,
            headers: req.headers,
            body: req.body ? JSON.stringify(req.body) : null,
            queryStringParameters: req.query
        };
        
        const response = await handler.handler(event);
        
        res.status(response.statusCode);
        Object.entries(response.headers || {}).forEach(([key, value]) => {
            res.setHeader(key, value);
        });
        res.send(response.body);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Rotas das functions
app.all('/.netlify/functions/crypto', wrapHandler(crypto));
app.all('/.netlify/functions/fiis', wrapHandler(fiis));
app.all('/.netlify/functions/cdb', wrapHandler(cdb));
app.all('/.netlify/functions/news', wrapHandler(news));

// Rota raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🚀 rafaInvest rodando em http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`\n✅ APIs disponíveis:`);
    console.log(`   - Crypto: http://localhost:${PORT}/.netlify/functions/crypto`);
    console.log(`   - FIIs:   http://localhost:${PORT}/.netlify/functions/fiis`);
    console.log(`   - CDBs:   http://localhost:${PORT}/.netlify/functions/cdb`);
    console.log(`   - News:   http://localhost:${PORT}/.netlify/functions/news`);
    console.log(`\n⏸️  Pressione Ctrl+C para parar\n`);
});
