export default async function handler(req, res) {
    try {
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?status=eq.SETTLED&select=donor_name,amount,message&order=created_at.desc&limit=1`, {
            headers: {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
            }
        });
        const data = await response.json();
        res.status(200).json(data[0] || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}