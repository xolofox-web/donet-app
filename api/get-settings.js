export default async function handler(req, res) {
    try {
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
            headers: {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
            }
        });
        const data = await response.json();
        res.status(200).json(data[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}