const crypto = require('crypto');
const config = require('../config.json');

module.exports = async (req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    
    req.on('end', async () => {
        const signature = req.headers['x-gateway-signature'];
        if (!signature) return res.writeHead(401).end('Missing signature');

        const expected = crypto.createHmac('sha256', config.WEBHOOK_SECRET).update(body).digest('hex');
        if (signature !== expected) return res.writeHead(401).end('Invalid signature');

        try {
            const { event, data } = JSON.parse(body);
            if (event === 'PAYMENT_SETTLED') {
                if (data.order_id?.startsWith('TEST-')) return res.writeHead(200).end('Test OK');

                if (data.status === 'SETTLED') {
                    // Tembak Supabase
                    const updateRes = await fetch(`${config.SUPABASE_URL}/rest/v1/donations?order_id=eq.${data.order_id}`, {
                        method: 'PATCH',
                        headers: {
                            'apikey': config.SUPABASE_SERVICE_KEY,
                            'Authorization': `Bearer ${config.SUPABASE_SERVICE_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status: 'SETTLED' })
                    });
                    if (!updateRes.ok) console.error('Gagal update DB');
                }
                return res.writeHead(200).end('OK');
            }
            return res.writeHead(200).end('Event ignored');
        } catch (err) {
            return res.writeHead(500).end('Internal Server Error');
        }
    });
};
