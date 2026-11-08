export default async function handler(req, res) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const action = req.query.action;
    try {
        if (req.method === 'GET' && action === 'donations') {
            const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?select=*&order=created_at.desc`, {
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
            const { title, target_amount } = req.body;
            const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
                method: 'PATCH',
                headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, target_amount: parseInt(target_amount) })
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