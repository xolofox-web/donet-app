export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { email, username } = req.body;
    
    try {
        // Pake Service Key biar tembus RLS
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/authorized_users`, {
            method: 'POST',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ email, username })
        });
        
        if (!response.ok) {
            const err = await response.text();
            return res.status(response.status).json({ error: err });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}