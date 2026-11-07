export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email dan Password wajib diisi' });
    }

    try {
        // 1. Daftarkan ke Supabase Auth (Sistem Login)
        const authRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
            method: 'POST',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password,
                email_confirm: true // Otomatis terkonfirmasi
            })
        });

        const authData = await authRes.json();

        // Kalau gagal bikinin akun (misal password kurang dari 6 karakter)
        // Tapi kalau errornya karena email udah terdaftar, kita biarin aja (lanjut ke whitelist)
        if (!authRes.ok && authData.error_code !== 'email_exists' && !authData.msg?.includes('already registered')) {
            return res.status(authRes.status).json({ error: authData.msg || 'Gagal mendaftarkan akun (pastikan password min. 6 karakter)' });
        }

        // 2. Masukkan ke tabel whitelist (authorized_users)
        const dbRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/authorized_users`, {
            method: 'POST',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates' // Kalau email udah ada, gak error
            },
            body: JSON.stringify({ email: email }) 
        });

        if (!dbRes.ok) {
            const dbErr = await dbRes.text();
            // Kalau errornya karena email udah ada di whitelist, biarin aja
            if (!dbErr.includes('duplicate key')) {
                throw new Error('Gagal menyimpan ke whitelist database');
            }
        }

        res.status(200).json({ success: true });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
