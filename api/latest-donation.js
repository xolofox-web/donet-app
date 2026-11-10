export default async function handler(req, res) {
    // Matikan cache agar selalu dapat data terbaru
    res.setHeader('Cache-Control', 'no-store, max-age=0, s-maxage=0');
    
    try {
        // Ambil 10 donasi sukses terbaru
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?status=eq.SETTLED&select=order_id,donor_name,amount,message,payment_method,created_at&order=created_at.desc&limit=10`, {
            headers: { 
                'apikey': process.env.SUPABASE_SERVICE_KEY, 
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` 
            }
        });
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}