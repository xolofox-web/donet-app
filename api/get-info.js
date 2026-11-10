export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();
    const type = req.query.type;

    // =======================================================
    // [TAMBAHAN BARU] MATIKAN CACHE VERCEL
    // =======================================================
    res.setHeader('Cache-Control', 'no-store, max-age=0, s-maxage=0');
    // =======================================================

    try {
        if (type === 'settings') {
            const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
                headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
            });
            const data = await response.json();
            return res.status(200).json(data[0] || {});
        } 
        
        if (type === 'stats') {
            // =======================================================
            // [FITUR BARU] AUTO-CANCEL TRANSAKSI PENDING (> 15 MENIT)
            // Berjalan di background tanpa memperlambat response frontend
            // =======================================================
            const fifteenMinsAgo = new Date(Date.now() - 15 * 60000).toISOString();
            fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?status=eq.PENDING&created_at=lt.${fifteenMinsAgo}`, {
                method: 'PATCH',
                headers: { 
                    'apikey': process.env.SUPABASE_SERVICE_KEY, 
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ status: 'FAILED' })
            }).catch(err => console.log('Auto-Cancel Error:', err));
            // =======================================================

            const settingsRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
                headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
            });
            const settingsData = await settingsRes.json();

            const donationsRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?status=eq.SETTLED&select=amount`, {
                headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
            });
            const donationsData = await donationsRes.json();

            let total_raised = 0;
            if (Array.isArray(donationsData)) {
                total_raised = donationsData.reduce((sum, d) => sum + Number(d.amount || 0), 0);
            }

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