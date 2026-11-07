export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { email, password } = req.body;
    
    try {
        // Tembak ke Supabase Auth
        const authRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: { 
                'apikey': process.env.SUPABASE_ANON_KEY, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ email, password })
        });
        
        const authData = await authRes.json();
        
        // KALAU GAGAL, TAMPILIN ERROR ASLI DARI SUPABASE
        if (!authRes.ok) {
            return res.status(401).json({ error: authData.error_description || authData.msg || JSON.stringify(authData) });
        }

        // Cek whitelist
        const wlRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/authorized_users?email=eq.${email}`, {
            headers: { 
                'apikey': process.env.SUPABASE_ANON_KEY, 
                'Authorization': `Bearer ${authData.access_token}` 
            }
        });
        
        const wlData = await wlRes.json();
        
        if (wlData.length === 0) {
            return res.status(403).json({ error: 'Email Anda tidak memiliki akses admin.' });
        }

        res.status(200).json({ access_token: authData.access_token });

    } catch (error) {
        res.status(500).json({ error: 'Server Error: ' + error.message });
    }
}
