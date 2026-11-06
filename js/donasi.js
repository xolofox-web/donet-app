document.getElementById('form-donasi').onsubmit = async (e) => {
    e.preventDefault(); // Nahan refresh
    
    const btn = e.target.querySelector('button');
    btn.innerText = 'Memproses...'; btn.disabled = true;

    try {
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
            // Tampilkan QRIS
            document.body.innerHTML = `
                <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div class="bg-white p-8 rounded-3xl shadow-xl text-center">
                        <h2 class="text-xl font-bold mb-4">Scan QRIS</h2>
                        <img src="${data.qr_code_url}" alt="QRIS" class="w-64 h-64 mx-auto mb-4 border p-2 rounded-xl">
                        <button onclick="window.location.reload()" class="bg-gray-100 text-gray-700 px-6 py-2 rounded-xl">Kembali</button>
                    </div>
                </div>
            `;
        } else { 
            // KALAU API VERCEL ERROR, MUNCULIN PESANNYA
            alert('API Error: ' + (data.message || 'Gagal dari server'));
            btn.innerText = 'Dukung via QRIS'; 
            btn.disabled = false;
        }
    } catch (error) {
        // KALAU JAVASCRIPT NYA ERROR, MUNCULIN DI SINI
        alert('JS Error: ' + error.message);
        btn.innerText = 'Dukung via QRIS'; 
        btn.disabled = false;
    }
};
