export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { email, token } = req.body;

    try {
        const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/verify`, {
            method: 'POST',
            headers: {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, token, type: 'email' })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.msg || 'Kode OTP salah atau kedaluwarsa.');
        }

        // Kirim token akses (JWT) ke frontend kalau sukses
        res.status(200).json({ access_token: data.access_token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}