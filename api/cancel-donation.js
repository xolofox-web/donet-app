export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { order_id } = req.query;

    if (!order_id) {
        return res.status(400).json({ error: 'Order ID tidak ditemukan' });
    }

    try {
        // 1. Tembak API Cashi untuk membatalkan (Sesuaikan URL dengan dokumentasi Cashi.id)
        // Catatan: Jika Cashi.id tidak punya endpoint cancel, biarkan ini, QRIS akan expired sendiri
        await fetch(`https://cashi.id/api/cancel-order?order_id=${order_id}`, {
            method: 'POST',
            headers: {
                'x-api-key': process.env.CASHI_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        // 2. Update status di Supabase jadi FAILED
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

        res.status(200).json({ success: true, message: 'Transaksi dibatalkan' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}