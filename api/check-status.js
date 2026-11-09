export default async function handler(req, res) {
    const { order_id } = req.query;
    if (!order_id) return res.status(400).json({ error: 'Order ID required' });

    try {
        // =======================================================
        // [TAMBAHAN BARU] CEK DATABASE SUPABASE TERLEBIH DAHULU
        // Ini agar saat Admin klik "Tandai Lunas" di dashboard, 
        // frontend langsung mendeteksinya dalam 1 detik.
        // =======================================================
        const dbRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?order_id=eq.${order_id}&select=status`, {
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
            }
        });
        const dbData = await dbRes.json();

        // Jika di database statusnya sudah SETTLED (dari webhook asli atau manual admin)
        if (dbData && dbData.length > 0 && (dbData[0].status === 'SETTLED' || dbData[0].status === 'success')) {
            return res.status(200).json({ success: true, status: 'success' });
        }
        // =======================================================

        // ⚠️ CATATAN PENTING: 
        // Endpoint '/api/check-status' di bawah ini adalah ASUMSI umum.
        // Lu HARUS lihat dokumentasi API Cashi.id, cari endpoint untuk "Cek Status Transaksi".
        // Mungkin namanya '/api/check-order', '/api/transaction-status', dll.
        
        const cashiRes = await fetch(`https://cashi.id/api/check-status?order_id=${order_id}`, {
            method: 'GET',
            headers: {
                'x-api-key': process.env.CASHI_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const cashiData = await cashiRes.json();

        // Sesuaikan pengecekan di bawah ini dengan respon asli dari Cashi
        // (Misal: Cashi ngasih balasan { status: "SUCCESS" } atau { status: "PAID" })
        let status = 'pending'; 
        
        if (cashiData.status === 'SUCCESS' || cashiData.status === 'PAID' || cashiData.status === 'settled') {
            status = 'success';
        } else if (cashiData.status === 'FAILED' || cashiData.status === 'EXPIRED') {
            status = 'fail';
        }

        // 3. Kalau sukses, update status di Supabase (Opsional, kalau webhook gak jalan)
        if (status === 'success') {
            await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?order_id=eq.${order_id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': process.env.SUPABASE_SERVICE_KEY, // Pake Service Key biar bisa nembus RLS
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'SETTLED' })
            });
        }

        res.status(200).json({ success: true, status: status });

    } catch (error) {
        res.status(500).json({ message: 'Error cek status: ' + error.message });
    }
}