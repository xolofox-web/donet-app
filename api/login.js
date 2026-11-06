export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { email, password } = req.body;
    
    // 1. Cek Login ke Supabase Auth
    const authRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 
            'apikey': process.env.SUPABASE_ANON_KEY, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ email, password })
    });
    
    const authData = await authRes.json();
    
    if (authData.error || authData.error_description) {
        return res.status(401).json({ error: 'Email atau password salah' });
    }

    // 2. Cek Whitelist (Cuma email tertentu yang bisa masuk)
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

    // 3. Sukses, kirim token ke frontend
    res.status(200).json({ access_token: authData.access_token });
}
