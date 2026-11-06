export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { order_id, amount, donor_name, donor_email, message } = req.body;
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations`, {
        method: 'POST',
        headers: {
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order_id, amount, donor_name, donor_email, message, status: 'PENDING' })
    });
    
    res.status(response.ok ? 200 : 400).json({ success: response.ok });
}