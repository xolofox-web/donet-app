export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { order_id } = req.body;

    if (!order_id) {
        return res.status(400).json({ error: 'Order ID tidak ditemukan' });
    }

    try {
        // 1. Tembak API Cashi.id untuk membatalkan transaksi
        // ⚠️ CATATAN: URL endpoint '/api/cancel-order' di bawah ini adalah ASUMSI.
        // Harap cek dokumentasi Cashi.id, apakah endpoint pembatalannya benar ini.
        // Jika Cashi tidak punya fitur cancel manual, biarkan saja, QRIS akan expired otomatis dalam 10 menit.
        await fetch(`https://cashi.id/api/cancel-order`, {
            method: 'POST',
            headers: {
                'x-api-key': process.env.CASHI_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ order_id: order_id })
        });

        // 2. Update status di Supabase jadi FAILED (atau CANCELLED)
        const dbRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?order_id=eq.${order_id}`, {
            method: 'PATCH',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_KEY, // Pake Service Key biar tembus RLS
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