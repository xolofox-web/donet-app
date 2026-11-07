export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email, password } = req.body;

    // 1. Cek apakah frontend ngirim email & password
    if (!email || !password) {
        return res.status(400).json({ error: 'Email atau password kosong dari frontend' });
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        // 2. Cek apakah URL & Key Vercel ada
        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'SUPABASE_URL atau SUPABASE_ANON_KEY belum diisi di Vercel' });
        }

        // 3. Tembak API Login Supabase
        const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const authData = await authRes.json();

        // 4. Kalau Supabase nolak, kirim alasan aslinya ke layar
        if (!authRes.ok) {
            return res.status(401).json({ 
                error: 'Supabase Menolak: ' + (authData.error_description || authData.msg || JSON.stringify(authData)) 
            });
        }

        // 5. Kalau sukses, kirim token
        res.status(200).json({ access_token: authData.access_token });

    } catch (error) {
        res.status(500).json({ error: 'Server Error: ' + error.message });
    }
}
