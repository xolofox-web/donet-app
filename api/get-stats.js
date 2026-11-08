export default async function handler(req, res) {
    try {
        // 1. Ambil Pengaturan (Target, Judul)
        const settingsRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
            headers: { 
                'apikey': process.env.SUPABASE_ANON_KEY, 
                'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}` 
            }
        });
        const settingsData = await settingsRes.json();

        // 2. Ambil Total Donasi yang SUDAH BAYAR (SETTLED)
        const donationsRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?status=eq.SETTLED&select=amount`, {
            headers: { 
                'apikey': process.env.SUPABASE_ANON_KEY, 
                'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}` 
            }
        });
        const donationsData = await donationsRes.json();

        // 3. Hitung totalnya
        const total_raised = donationsData.reduce((sum, d) => sum + Number(d.amount), 0);

        // 4. Kirim balik ke frontend
        res.status(200).json({
            title: settingsData[0]?.title || 'Dukung Kreator',
            subtitle: settingsData[0]?.subtitle || 'Berikan dukungan terbaikmu',
            target_amount: settingsData[0]?.target_amount || 10000000,
            total_raised: total_raised
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}