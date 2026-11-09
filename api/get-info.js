export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();
    const type = req.query.type;

    // =======================================================
    // [TAMBAHAN BARU] MATIKAN CACHE VERCEL
    // Agar saat frontend polling tiap 2 detik, data saldo 
    // benar-benar fresh dari database, bukan dari cache.
    // =======================================================
    res.setHeader('Cache-Control', 'no-store, max-age=0, s-maxage=0');
    // =======================================================

    try {
        if (type === 'settings') {
            const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
                // [PERBAIKAN] Menggunakan SERVICE_KEY agar bisa tembus RLS Supabase
                headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
            });
            const data = await response.json();
            return res.status(200).json(data[0] || {});
        } 
        
        if (type === 'stats') {
            const settingsRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
                // [PERBAIKAN] Menggunakan SERVICE_KEY
                headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
            });
            const settingsData = await settingsRes.json();

            // Ambil semua donasi yang statusnya SETTLED
            const donationsRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?status=eq.SETTLED&select=amount`, {
                // [PERBAIKAN] Menggunakan SERVICE_KEY
                headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
            });
            const donationsData = await donationsRes.json();

            // [PENGAMAN] Cek apakah data yang dikembalikan berbentuk Array, jika tidak maka 0
            let total_raised = 0;
            if (Array.isArray(donationsData)) {
                total_raised = donationsData.reduce((sum, d) => sum + Number(d.amount || 0), 0);
            }

            // [PENGAMAN] Jika target di database 0 atau kosong, set default 10 juta
            let target_amount = settingsData[0]?.target_amount || 10000000;
            if (target_amount == 0) target_amount = 10000000;

            return res.status(200).json({
                title: settingsData[0]?.title || 'Dukung Kreator',
                subtitle: settingsData[0]?.subtitle || 'Berikan dukungan terbaikmu',
                target_amount: target_amount,
                total_raised: total_raised
            });
        }
        return res.status(400).json({ error: 'Type tidak valid' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}