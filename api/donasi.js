export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { order_id, amount, donor_name, donor_email, message } = req.body;

    try {
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

        const cashiData = await cashiRes.json();
        
        if (!cashiData.success) {
            return res.status(400).json({ message: 'Cashi Error: ' + JSON.stringify(cashiData) });
        }
        
        // ⚠️ CATATAN PENTING: Berdasarkan screenshot sebelumnya, Cashi mengirim 'qrUrl' bukan 'qrLink'.
        // Jika QRIS tidak muncul lagi, ganti 'qrLink' di bawah ini menjadi 'qrUrl'.
        const qrCodeUrl = cashiData.qrLink; 

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

        // 👇 DI SINI SAYA TAMBAHKAN order_id AGAR BISA DIBACA FRONTEND 👇
        res.status(200).json({ 
            success: true, 
            qr_code_url: qrCodeUrl,
            order_id: order_id 
        });

    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
}