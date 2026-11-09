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
                headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}` }
            });
            const data = await response.json();
            return res.status(200).json(data[0] || {});
        } 
        
        if (type === 'stats') {
            const settingsRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
                headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}` }
            });
            const settingsData = await settingsRes.json();

            // Ambil semua donasi yang statusnya SETTLED
            const donationsRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?status=eq.SETTLED&select=amount`, {
                headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}` }
            });
            const donationsData = await donationsRes.json();

            // Hitung total
            const total_raised = donationsData.reduce((sum, d) => sum + Number(d.amount), 0);

            return res.status(200).json({
                title: settingsData[0]?.title || 'Dukung Kreator',
                subtitle: settingsData[0]?.subtitle || 'Berikan dukungan terbaikmu',
                target_amount: settingsData[0]?.target_amount || 10000000,
                total_raised: total_raised
            });
        }
        return res.status(400).json({ error: 'Type tidak valid' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}