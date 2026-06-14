const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const http = require('http');
const https = require('https');

const N8N_WEBHOOK = 'https://talhajoiya.app.n8n.cloud/webhook/whatsapp-shipping';

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

// Simple HTTP server to show QR code in browser
const server = http.createServer((req, res) => {
    if (req.url === '/qr' && global.qrImage) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<html><body style="background:#111;display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column">
            <h2 style="color:white;font-family:sans-serif">Scan with WhatsApp → Linked Devices → Link a Device</h2>
            <img src="${global.qrImage}" style="width:300px;height:300px"/>
            <p style="color:#aaa;font-family:sans-serif">Page auto-refreshes every 5 seconds</p>
            <script>setTimeout(()=>location.reload(),5000)</script>
        </body></html>`);
    } else if (req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: client.info ? 'connected' : 'waiting' }));
    } else {
        res.writeHead(302, { Location: '/qr' });
        res.end();
    }
});

server.listen(3000, () => {
    console.log('\n================================');
    console.log('WhatsApp Bridge Started!');
    console.log('================================');
    console.log('Open this in your browser to scan QR:');
    console.log('→ http://localhost:3000/qr');
    console.log('================================\n');
});

client.on('qr', async (qr) => {
    console.log('QR Code ready! Open browser: http://localhost:3000/qr');
    global.qrImage = await qrcode.toDataURL(qr);
});

client.on('ready', () => {
    console.log('\n✅ WhatsApp Connected Successfully!');
    console.log('Bot is now listening for messages...\n');
    global.qrImage = null;
});

client.on('message', async (msg) => {
    if (msg.fromMe) return;

    console.log(`📩 Message from ${msg.from}: ${msg.body}`);

    const payload = JSON.stringify({
        event: 'messages.upsert',
        instance: 'shipping-bot',
        data: {
            key: { remoteJid: msg.from, fromMe: false, id: msg.id._serialized },
            pushName: msg._data.notifyName || '',
            message: { conversation: msg.body },
            messageType: 'conversation'
        }
    });

    const url = new URL(N8N_WEBHOOK);
    const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                if (response.replyMessage) {
                    msg.reply(response.replyMessage);
                    console.log(`✉️  Reply sent to ${msg.from}`);
                }
            } catch (e) {}
        });
    });

    req.on('error', (e) => console.error('n8n error:', e.message));
    req.write(payload);
    req.end();
});

client.initialize();
