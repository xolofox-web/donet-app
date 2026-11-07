export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    // Ambil token login admin
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { title, target_amount } = req.body;

    try {
        // Gunakan SERVICE_KEY biar bisa nembus RLS (karena ini admin)
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
            method: 'PATCH',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_KEY, 
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                title: title, 
                target_amount: parseInt(target_amount) 
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error('Supabase Error: ' + errText);
        }
        
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}