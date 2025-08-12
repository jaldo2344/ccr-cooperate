// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Guarda a conexão do painel de administração
let adminPanel = null;

wss.on('connection', (ws) => {
    console.log('Novo cliente conectado.');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // Se for um pedido de pagamento, envia para o painel
            if (data.type === 'payment_request') {
                console.log('Recebido pedido de pagamento:', data.requestId);
                if (adminPanel && adminPanel.readyState === WebSocket.OPEN) {
                    adminPanel.send(JSON.stringify({ type: 'new_payment_request', data: data }));
                } else {
                    console.log('Painel de administração não conectado para receber o pedido.');
                }
            }

            // Se for uma resposta do painel, envia para todos os clientes
            if (data.type === 'pix_response') {
                console.log('Recebida resposta PIX para:', data.requestId);
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });
            }

            // Identifica se a conexão é do painel de administração
            if (data.type === 'admin_panel_connected') {
                console.log('Painel de administração conectado.');
                adminPanel = ws;
            }

        } catch (error) {
            console.error('Erro ao processar mensagem:', error);
        }
    });

    ws.on('close', () => {
        console.log('Cliente desconectado.');
        if (ws === adminPanel) {
            console.log('Painel de administração desconectado.');
            adminPanel = null;
        }
    });
});

// Serve os arquivos estáticos (necessário para CSS e JS futuros)
app.use(express.static(path.join(__dirname)));

// Rota principal para servir o index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para o painel de compras
app.get('/compras.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'compras.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
