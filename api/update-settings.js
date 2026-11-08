export default async function handler(req, res) {
    // [TAMBAHAN] Tangani preflight request (CORS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    // Ambil token login admin
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized: Token tidak ditemukan' });

    const { title, target_amount } = req.body;

    // [TAMBAHAN] Cek apakah Environment Variables di Vercel udah diisi
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ error: 'Server Config Error: SUPABASE_URL atau SUPABASE_SERVICE_KEY belum diisi di Vercel.' });
    }

    try {
        // Gunakan SERVICE_KEY biar bisa nembus RLS (karena ini admin)
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
            method: 'PATCH',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_KEY, 
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation' // [TAMBAHAN] Biar dapet balasan data yang diupdate
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

        // [TAMBAHAN] Cek apakah datanya beneran ada dan keupdate
        const data = await response.json();
        if (data.length === 0) {
            return res.status(404).json({ error: 'Data pengaturan (id=1) tidak ditemukan di database. Pastikan tabel settings sudah dibuat.' });
        }
        
        res.status(200).json({ success: true, message: 'Pengaturan berhasil diperbarui', data: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}