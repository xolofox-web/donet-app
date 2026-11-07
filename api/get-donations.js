export default async function handler(req, res) {
    try {
        const authHeader = req.headers.authorization;
        
        // Cek apakah header ada
        if (!authHeader) {
            return res.status(401).json({ error: 'Header Authorization hilang. Silakan login ulang.' });
        }

        const token = authHeader.split(' ')[1];
        
        // Cek apakah token beneran ada isinya (bukan string "undefined" atau "null")
        if (!token || token === 'undefined' || token === 'null' || token.length < 20) {
            return res.status(401).json({ error: 'Token tidak valid. Silakan login ulang.' });
        }
        
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?select=*&order=created_at.desc`, {
            headers: { 
                'apikey': process.env.SUPABASE_ANON_KEY, 
                'Authorization': `Bearer ${token}` 
            }
        });
        
        const textData = await response.text();

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Supabase Error: ' + textData });
        }

        const jsonData = JSON.parse(textData);
        res.status(200).json(jsonData);

    } catch (error) {
        res.status(500).json({ error: 'Server Error: ' + error.message });
    }
}
