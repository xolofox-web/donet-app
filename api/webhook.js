import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const signature = req.headers['x-gateway-signature'];
    if (!signature) return res.status(401).send('Missing signature');

    // Vercel secara otomatis parsing req.body, jadi kita perlu stringify ulang buat cek HMAC
    const bodyString = JSON.stringify(req.body);
    const expected = crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET)
        .update(bodyString)
        .digest('hex');

    if (signature !== expected) return res.status(401).send('Invalid signature');

    const { event, data } = req.body;

    if (event === 'PAYMENT_SETTLED') {
        if (data.order_id?.startsWith('TEST-')) return res.status(200).send('Test OK');

        if (data.status === 'SETTLED') {
            // 1. Update database Supabase (KODE ASLI LU)
            await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?order_id=eq.${data.order_id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': process.env.SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'SETTLED' })
            });

            // =====================================================================
            // [TAMBAHAN] FITUR E-RECEIPT: Kirim Email Bukti Donasi via Resend
            // =====================================================================
            try {
                // Ambil data lengkap donatur dari Supabase
                const getDonation = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donations?order_id=eq.${data.order_id}`, {
                    headers: {
                        'apikey': process.env.SUPABASE_SERVICE_KEY,
                        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
                    }
                });
                const donationData = await getDonation.json();
                
                if (donationData && donationData.length > 0) {
                    const donasi = donationData[0];
                    
                    // Pastiin RESEND_API_KEY ada di Vercel
                    if (process.env.RESEND_API_KEY) {
                        await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                from: 'Dukung Kreator <noreply@zyxellvar.my.id>', // GANTI DENGAN DOMAIN LU
                                to: donasi.donor_email,
                                subject: 'Terima Kasih atas Donasi Anda! ❤️',
                                html: `
                                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                                        <div style="text-align: center; margin-bottom: 24px;">
                                            <h2 style="color: #2563eb; margin: 0;">Terima Kasih, ${donasi.donor_name}!</h2>
                                            <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Donasi Anda telah berhasil kami terima.</p>
                                        </div>
                                        
                                        <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
                                                <tr>
                                                    <td style="padding: 8px 0; border-bottom: 1px dashed #cbd5e1;">ID Transaksi</td>
                                                    <td style="padding: 8px 0; border-bottom: 1px dashed #cbd5e1; text-align: right; font-family: monospace; font-weight: bold;">${donasi.order_id}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; border-bottom: 1px dashed #cbd5e1;">Nominal</td>
                                                    <td style="padding: 8px 0; border-bottom: 1px dashed #cbd5e1; text-align: right; color: #2563eb; font-weight: bold;">Rp ${donasi.amount.toLocaleString('id-ID')}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; border-bottom: 1px dashed #cbd5e1;">Metode</td>
                                                    <td style="padding: 8px 0; border-bottom: 1px dashed #cbd5e1; text-align: right; font-weight: bold;">${donasi.payment_method || 'QRIS'}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0;">Waktu</td>
                                                    <td style="padding: 8px 0; text-align: right;">${new Date(donasi.created_at).toLocaleString('id-ID')}</td>
                                                </tr>
                                            </table>
                                        </div>
                                        
                                        ${donasi.message ? `<p style="margin-top: 20px; font-style: italic; color: #64748b; font-size: 14px; text-align: center;">"${donasi.message}"</p>` : ''}
                                        
                                        <p style="margin-top: 32px; font-size: 14px; color: #64748b; text-align: center; line-height: 1.6;">
                                            Dukungan Anda sangat berarti bagi kami.<br>Salam hangat,<br><strong>Dukung Kreator</strong>
                                        </p>
                                    </div>
                                `
                            })
                        });
                    }
                }
            } catch (err) {
                console.error('Gagal mengirim E-Receipt:', err);
                // Proses webhook tetap dianggap sukses meskipun email gagal dikirim
            }
            // =====================================================================
        }
        return res.status(200).send('OK');
    }
    
    return res.status(200).send('Event ignored');
}