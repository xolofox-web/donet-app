export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { order_id, amount, donor_name, donor_email, message } = req.body;

    try {
        // 1. Tembak API Cashi
        const cashiRes = await fetch('https://cashi.id/api/create-order', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.CASHI_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                order_id: order_id
            })
        });

        // Ambil balasan asli dari Cashi (berupa teks dulu)
        const cashiText = await cashiRes.text();
        let cashiData;
        
        try {
            cashiData = JSON.parse(cashiText);
        } catch (e) {
            return res.status(500).json({ message: 'Cashi balas pakai format aneh: ' + cashiText });
        }
        
        // Kalau Cashi bilang gagal (misal API Key salah)
        if (!cashiData.success) {
            return res.status(400).json({ message: 'Cashi Error: ' + cashiText });
        }

        // Kalau Cashi sukses tapi gak ngasih qrLink
        if (!cashiData.qrLink) {
            return res.status(400).json({ message: 'Cashi sukses tapi gak ada QR Link: ' + cashiText });
        }
        
        const qrCodeUrl = cashiData.qrLink; 

        // 2. Simpan ke Supabase
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

        if (!dbRes.ok) {
            const dbErr = await dbRes.text();
            return res.status(500).json({ message: 'Gagal simpan ke Supabase: ' + dbErr });
        }

        res.status(200).json({ success: true, qr_code_url: qrCodeUrl });

    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
}
