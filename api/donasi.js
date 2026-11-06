export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { order_id, amount, donor_name, donor_email, message } = req.body;

    try {
        // ====================================================================
        // 1. MINTA QRIS KE CASHI.ID (Sesuai Dokumentasi)
        // ====================================================================
        const cashiRes = await fetch('https://cashi.id/api/create-order', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.CASHI_API_KEY, // Pakai API Key dari Vercel
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                order_id: order_id
            })
        });

        const cashiData = await cashiRes.json();
        
        if (!cashiData.success) {
            throw new Error('Gagal membuat QRIS dari Cashi.id');
        }
        
        // Ambil link gambar QRIS dari response Cashi (qrLink)
        const qrCodeUrl = cashiData.qrLink; 

        // ====================================================================
        // 2. SIMPAN KE DATABASE SUPABASE
        // ====================================================================
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
                status: 'PENDING' 
            })
        });

        if (!dbRes.ok) throw new Error('Gagal menyimpan ke database');

        // ====================================================================
        // 3. KIRIM LINK QRIS KE FRONTEND
        // ====================================================================
        res.status(200).json({ success: true, qr_code_url: qrCodeUrl });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}