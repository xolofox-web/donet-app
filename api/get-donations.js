export default async function handler(req, res) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).end();
    
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?select=*&order=created_at.desc`, {
        headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    res.status(200).json(data);
}