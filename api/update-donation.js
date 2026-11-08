export default async function handler(req, res) {
    // Pastikan yang nembak API ini adalah Admin yang udah login
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { order_id, action } = req.query;

    if (!order_id || !action) {
        return res.status(400).json({ error: 'Order ID dan Action wajib dikirim' });
    }

    try {
        const headers = {
            'apikey': process.env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
        };

        if (action === 'settle') {
            // Ubah status jadi SETTLED
            const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?order_id=eq.${order_id}`, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify({ status: 'SETTLED' })
            });
            if (!response.ok) throw new Error('Gagal update ke Supabase');
            return res.status(200).json({ success: true, message: 'Status diubah menjadi Lunas' });
        } 
        
        if (action === 'delete') {
            // Hapus data dari database
            const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?order_id=eq.${order_id}`, {
                method: 'DELETE',
                headers: headers
            });
            if (!response.ok) throw new Error('Gagal hapus dari Supabase');
            return res.status(200).json({ success: true, message: 'Data berhasil dihapus' });
        }

        return res.status(400).json({ error: 'Action tidak valid' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}