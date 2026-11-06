export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).end();
    
    const { email, username } = req.body; // Tangkap email dan username
    
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/authorized_users`, {
        method: 'POST',
        headers: {
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, username }) // Simpan keduanya
    });
    
    res.status(response.ok ? 200 : 400).json({ success: response.ok });
}