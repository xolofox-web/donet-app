document.getElementById('form-donasi').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerText = 'Memproses...';
    btn.disabled = true;

    const data = {
        order_id: 'DON-' + Date.now(),
        amount: parseInt(document.getElementById('amount').value),
        donor_name: document.getElementById('name').value,
        donor_email: document.getElementById('email').value,
        message: document.getElementById('message').value
    };

    const success = await supabaseAPI.insertDonation(data);

    if (success) {
        alert('Berhasil! Silakan lanjut ke QRIS.');
        e.target.reset();
    } else {
        alert('Gagal mengirim donasi.');
    }
    
    btn.innerText = 'Dukung via QRIS';
    btn.disabled = false;
};