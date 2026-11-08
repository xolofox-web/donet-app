export default async function handler(req, res) {
    const action = req.query.action;

    // Kalau URL-nya ada ?action=cancel, jalanin fungsi batal
    if (action === 'cancel') {
        return handleCancel(req, res);
    }

    // Kalau nggak ada, jalanin fungsi bikin donasi (default)
    return handleCreate(req, res);
}

// ==========================================
// FUNGSI 1: BIKIN DONASI BARU (Dari donasi.js)
// ==========================================
async function handleCreate(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { order_id, amount, donor_name, donor_email, message, payment_method } = req.body;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const cashiRes = await fetch('https://cashi.id/api/create-order', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.CASHI_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                amount, 
                order_id,
                channel: payment_method || 'QRIS'
            }),
            signal: controller.signal
        });
        clearTimeout(timeout);

        const cashiData = await cashiRes.json();
        if (!cashiData.success) throw new Error('Ditolak Cashi: ' + JSON.stringify(cashiData));
        
        const qrCodeUrl = cashiData.qrUrl; 

        const dbController = new AbortController();
        const dbTimeout = setTimeout(() => dbController.abort(), 5000);

        const dbRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations`, {
            method: 'POST',
            headers: {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                order_id, 
                amount, 
                donor_name, 
                donor_email, 
                message, 
                payment_method: payment_method || 'QRIS',
                status: 'PENDING' 
            }),
            signal: dbController.signal
        });
        clearTimeout(dbTimeout);

        if (!dbRes.ok) {
            const errDb = await dbRes.text();
            throw new Error('Gagal Supabase: ' + errDb);
        }

        res.status(200).json({ success: true, qr_code_url: qrCodeUrl, order_id: order_id });

    } catch (error) {
        if (error.name === 'AbortError') {
            return res.status(504).json({ message: 'Koneksi Timeout. Server Cashi atau Supabase terlalu lama merespon.' });
        }
        res.status(500).json({ message: error.message });
    }
}

// ==========================================
// FUNGSI 2: BATALKAN DONASI (Dari cancel-donation.js)
// ==========================================
async function handleCancel(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { order_id } = req.body;

    if (!order_id) {
        return res.status(400).json({ error: 'Order ID tidak ditemukan' });
    }

    try {
        await fetch(`https://cashi.id/api/cancel-order`, {
            method: 'POST',
            headers: {
                'x-api-key': process.env.CASHI_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ order_id: order_id })
        });

        const dbRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?order_id=eq.${order_id}`, {
            method: 'PATCH',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'FAILED' })
        });

        if (!dbRes.ok) {
            throw new Error('Gagal update database Supabase');
        }

        res.status(200).json({ success: true, message: 'Transaksi berhasil dibatalkan' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}