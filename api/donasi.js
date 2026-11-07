export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    // [TAMBAHAN] Menangkap parameter payment_method dari frontend
    const { order_id, amount, donor_name, donor_email, message, payment_method } = req.body;

    try {
        // --- 1. Tembak Cashi.id (Maksimal nunggu 8 detik) ---
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const cashiRes = await fetch('https://cashi.id/api/create-order', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.CASHI_API_KEY,
                'Content-Type': 'application/json'
            },
            // [TAMBAHAN] Mengirim 'channel' atau metode pembayaran ke Cashi.id
            body: JSON.stringify({ 
                amount, 
                order_id,
                channel: payment_method || 'QRIS' // Default ke QRIS jika kosong
            }),
            signal: controller.signal
        });
        clearTimeout(timeout);

        const cashiData = await cashiRes.json();
        if (!cashiData.success) throw new Error('Ditolak Cashi: ' + JSON.stringify(cashiData));
        
        const qrCodeUrl = cashiData.qrUrl; 

        // --- 2. Simpan ke Supabase (Maksimal nunggu 5 detik) ---
        const dbController = new AbortController();
        const dbTimeout = setTimeout(() => dbController.abort(), 5000);

        const dbRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations`, {
            method: 'POST',
            headers: {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            // [TAMBAHAN] Menyimpan payment_method ke database Supabase
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

        // Cek kalau Supabase nolak (misal API Key salah)
        if (!dbRes.ok) {
            const errDb = await dbRes.text();
            throw new Error('Gagal Supabase: ' + errDb);
        }

        // --- 3. Sukses ---
        res.status(200).json({ success: true, qr_code_url: qrCodeUrl, order_id: order_id });

    } catch (error) {
        if (error.name === 'AbortError') {
            return res.status(504).json({ message: 'Koneksi Timeout. Server Cashi atau Supabase terlalu lama merespon.' });
        }
        res.status(500).json({ message: error.message });
    }
}