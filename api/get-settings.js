export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    // Pastiin request ini dari Admin yang udah login
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { title, target_amount } = req.body;

    try {
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
            method: 'PATCH',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation' // Biar kita tau sukses/nggak
            },
            body: JSON.stringify({ 
                title: title, 
                target_amount: parseInt(target_amount) 
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            // Kirim pesan error asli dari Supabase ke frontend
            return res.status(400).json({ error: 'Supabase Error: ' + errText });
        }
        
        res.status(200).json({ success: true, message: 'Pengaturan disimpan' });
    } catch (error) {
        res.status(500).json({ error: 'Server Error: ' + error.message });
    }
}