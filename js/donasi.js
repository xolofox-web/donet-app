document.getElementById('form-donasi').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerText = 'Memproses...'; btn.disabled = true;

    const res = await fetch('/api/donasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            order_id: 'DON-' + Date.now(),
            amount: parseInt(document.getElementById('amount').value),
            donor_name: document.getElementById('name').value,
            donor_email: document.getElementById('email').value,
            message: document.getElementById('message').value
        })
    });

    const data = await res.json();

    if (res.ok && data.qr_code_url) { 
        // Tampilkan Gambar QRIS ke layar (bisa pakai alert, atau buat modal HTML)
        // Contoh simpel pakai prompt gambar (di-production sebaiknya pakai Modal UI)
        document.body.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div class="bg-white p-8 rounded-3xl shadow-xl text-center">
                    <h2 class="text-xl font-bold mb-4">Scan QRIS untuk Membayar</h2>
                    <img src="${data.qr_code_url}" alt="QRIS" class="w-64 h-64 mx-auto mb-4 border p-2 rounded-xl">
                    <p class="text-gray-500 text-sm">Selesaikan pembayaran Anda.</p>
                </div>
            </div>
        `;
    } else { 
        alert('Gagal mengirim donasi.'); 
        btn.innerText = 'Dukung via QRIS'; btn.disabled = false;
    }
};