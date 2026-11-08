export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const action = req.query.action;

    if (action === 'login') {
        return handleLogin(req, res);
    } else if (action === 'send-otp') {
        return handleSendOtp(req, res);
    } else if (action === 'verify-otp') {
        return handleVerifyOtp(req, res);
    }
    return res.status(400).json({ error: 'Action tidak valid' });
}

async function handleLogin(req, res) {
    const { email, password } = req.body;
    try {
        const authRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const authData = await authRes.json();
        if (!authRes.ok || authData.error) return res.status(401).json({ error: 'Email atau password salah' });

        const wlRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/authorized_users?email=eq.${email}`, {
            headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${authData.access_token}` }
        });
        const wlData = await wlRes.json();
        if (wlData.length === 0) return res.status(403).json({ error: 'Email Anda tidak memiliki akses admin.' });
        if (!authData.access_token) return res.status(500).json({ error: 'Gagal mendapatkan token.' });

        res.status(200).json({ access_token: authData.access_token });
    } catch (error) {
        res.status(500).json({ error: 'Server Error: ' + error.message });
    }
}

async function handleSendOtp(req, res) {
    const { email } = req.body;
    try {
        const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/otp`, {
            method: 'POST',
            headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
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

async function handleVerifyOtp(req, res) {
    const { email, token } = req.body;
    try {
        const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/verify`, {
            method: 'POST',
            headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, token, type: 'email' })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.msg || 'Kode OTP salah atau kedaluwarsa.');
        res.status(200).json({ access_token: data.access_token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}