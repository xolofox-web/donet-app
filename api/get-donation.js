export default async function handler(req, res) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token tidak ditemukan. Silakan login ulang.' });
        }
        
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?select=*&order=created_at.desc`, {
            headers: { 
                'apikey': process.env.SUPABASE_ANON_KEY, 
                'Authorization': `Bearer ${token}` 
            }
        });
        
        // Baca respon sebagai teks dulu
        const textData = await response.text();

        // Kalau Supabase ngasih error
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Supabase menolak akses: ' + textData });
        }

        // Kalau sukses, parsing teks ke JSON
        const jsonData = JSON.parse(textData);
        res.status(200).json(jsonData);

    } catch (error) {
        // Kalau ada crash di server, balikin format JSON error
        res.status(500).json({ error: 'Server Error: ' + error.message });
    }
}
