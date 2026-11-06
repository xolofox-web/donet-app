import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const signature = req.headers['x-gateway-signature'];
    if (!signature) return res.status(401).send('Missing signature');

    // Vercel secara otomatis parsing req.body, jadi kita perlu stringify ulang buat cek HMAC
    const bodyString = JSON.stringify(req.body);
    const expected = crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET)
        .update(bodyString)
        .digest('hex');

    if (signature !== expected) return res.status(401).send('Invalid signature');

    const { event, data } = req.body;

    if (event === 'PAYMENT_SETTLED') {
        if (data.order_id?.startsWith('TEST-')) return res.status(200).send('Test OK');

        if (data.status === 'SETTLED') {
            await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?order_id=eq.${data.order_id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': process.env.SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'SETTLED' })
            });
        }
        return res.status(200).send('OK');
    }
    
    return res.status(200).send('Event ignored');
}