import { createClient } from '@supabase/supabase-js';

// Gunakan Service Key agar bisa bypass RLS saat insert dari server
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userName } = req.body;
    if (!userName) {
        return res.status(400).json({ error: 'Nama tidak boleh kosong' });
    }

    try {
        // 1. Simpan Sesi ke Database Supabase
        const { data, error } = await supabase
            .from('chat_sessions')
            .insert([{ user_name: userName }])
            .select();

        if (error) throw error;

        // 2. Kirim Email via Resend (Gratis)
        const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}` // Masukkan API Key Resend ke Vercel
            },
            body: JSON.stringify({
                from: 'Sistem Donasi <onboarding@resend.dev>', // Bisa diganti jika sudah punya domain
                to: 'xolofoxoficial@gmail.com',
                subject: 'Sesi Live Chat Baru Dibuka!',
                html: `
                    <div style="font-family: sans-serif; padding: 20px;">
                        <h2>Live Chat Baru</h2>
                        <p>Pengguna dengan nama <strong>${userName}</strong> baru saja memulai Live Chat di website Anda.</p>
                        <p>Segera cek Dashboard Admin Anda untuk membalas pesan.</p>
                    </div>
                `
            })
        });

        if (!emailRes.ok) {
            console.error('Gagal kirim email', await emailRes.text());
        }

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}
