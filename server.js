const http = require('http');
const fs = require('fs');
const path = require('path');
const handleWebhook = require('./backend/webhook');

const PORT = 3000;

const server = http.createServer((req, res) => {
    // 1. Kalau ada request ke /webhook, lempar ke backend/webhook.js
    if (req.method === 'POST' && req.url === '/webhook') {
        return handleWebhook(req, res);
    }

    // 2. Kalau request GET, serve file dari folder 'public'
    if (req.method === 'GET') {
        let filePath = './public' + (req.url === '/' ? '/index.html' : req.url);
        let extname = path.extname(filePath);
        
        let contentType = 'text/html';
        if (extname === '.css') contentType = 'text/css';
        if (extname === '.js') contentType = 'text/javascript';
        if (extname === '.json') contentType = 'application/json';

        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end('File tidak ditemukan');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    }
});

server.listen(PORT, () => {
    console.log(`Server jalan di http://localhost:${PORT}`);
});