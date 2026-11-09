export default async function handler(req, res) {
    const action = req.query.action;

    // =======================================================
    // [TAMBAHAN BARU] Endpoint untuk membuat sesi chat & kirim email
    // (Diletakkan di atas token agar pengunjung biasa bisa akses)
    // =======================================================
    if (req.method === 'POST' && action === 'create-chat-session') {
        const { userName } = req.body;
        if (!userName) return res.status(400).json({ error: 'Nama tidak boleh kosong' });
        
        try {
            // 1. Simpan ke Database Supabase
            const dbRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/chat_sessions`, {
                method: 'POST',
                headers: { 
                    'apikey': process.env.SUPABASE_SERVICE_KEY, 
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ user_name: userName, status: 'active' })
            });

            if (!dbRes.ok) {
                console.error("Gagal simpan DB:", await dbRes.text());
            }

            // 2. Kirim Email via Resend
            if (process.env.RESEND_API_KEY) {
                const emailRes = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
                    },
                    body: JSON.stringify({
                        from: 'Sistem Donasi <onboarding@resend.dev>',
                        to: 'ayubifirmansyah5@gmail.com', // Email Anda
                        subject: 'Sesi Live Chat Baru!',
                        html: `<p>Pengguna <strong>${userName}</strong> baru saja memulai Live Chat di website Anda.</p>`
                    })
                });
                if (!emailRes.ok) {
                    console.error("Gagal kirim email:", await emailRes.text());
                }
            }

            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    // =======================================================

    // --- KODE ASLI DARI SINI KE BAWAH ---
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        if (req.method === 'GET' && action === 'donations') {
            const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?select=*&order=created_at.desc`, {
                headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
            });
            const textData = await response.text();
            if (!response.ok) return res.status(response.status).json({ error: 'Supabase Error: ' + textData });
            return res.status(200).json(JSON.parse(textData));
        }

        // [FITUR BARU] Endpoint untuk mengambil sesi chat
        if (req.method === 'GET' && action === 'chat-sessions') {
            const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/chat_sessions?select=*&order=created_at.desc`, {
                headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
            });
            const textData = await response.text();
            if (!response.ok) return res.status(response.status).json({ error: 'Supabase Error: ' + textData });
            return res.status(200).json(JSON.parse(textData));
        }

        if (req.method === 'POST' && action === 'add-user') {
            const { email, password } = req.body;
            const authRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
                method: 'POST',
                headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, email_confirm: true })
            });
            const authData = await authRes.json();
            if (!authRes.ok && authData.error_code !== 'email_exists' && !authData.msg?.includes('already registered')) {
                return res.status(authRes.status).json({ error: authData.msg || 'Gagal mendaftarkan akun' });
            }
            const dbRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/authorized_users`, {
                method: 'POST',
                headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify({ email })
            });
            if (!dbRes.ok && !(await dbRes.text()).includes('duplicate key')) throw new Error('Gagal menyimpan ke whitelist');
            return res.status(200).json({ success: true });
        }

        if (req.method === 'POST' && action === 'update-settings') {
            // [PERBAIKAN] Menambahkan 'subtitle' agar bisa disimpan ke database
            const { title, subtitle, target_amount } = req.body;
            const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
                method: 'PATCH',
                headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
                // [PERBAIKAN] Memasukkan 'subtitle' ke dalam payload JSON
                body: JSON.stringify({ title, subtitle, target_amount: parseInt(target_amount) })
            });
            if (!response.ok) throw new Error('Gagal update Supabase');
            return res.status(200).json({ success: true });
        }

        if (req.method === 'POST' && action === 'update-donation') {
            const { order_id, do: actionDo } = req.query;
            const headers = { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };
            
            if (actionDo === 'settle') {
                await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?order_id=eq.${order_id}`, {
                    method: 'PATCH', headers, body: JSON.stringify({ status: 'SETTLED' })
                });
            } else if (actionDo === 'delete') {
                await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?order_id=eq.${order_id}`, { method: 'DELETE', headers });
            }
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: 'Aksi tidak valid' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}