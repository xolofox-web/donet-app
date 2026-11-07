export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { email } = req.body;

    try {
        const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/otp`, {
            method: 'POST',
            headers: {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, create_user: false })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'Gagal mengirim OTP');
        }

        res.status(200).json({ success: true, message: 'OTP terkirim' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}