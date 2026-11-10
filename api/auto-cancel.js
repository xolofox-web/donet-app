export default async function handler(req, res) {
    try {
        // Waktu 15 menit yang lalu
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60000).toISOString();
        
        // Cari transaksi PENDING yang dibuat sebelum 15 menit lalu
        const url = `${process.env.SUPABASE_URL}/rest/v1/donations?status=eq.PENDING&created_at=lt.${fifteenMinsAgo}`;

        const updateRes = await fetch(url, {
            method: 'PATCH',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'FAILED' })
        });

        if (!updateRes.ok) throw new Error('Gagal update database');

        return res.status(200).json({ success: true, message: 'Auto-cancel berjalan' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}