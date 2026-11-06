const token = localStorage.getItem('admin_token');

if (!token) {
    window.location.href = '/login.html';
}

document.getElementById('btn-logout').onclick = () => {
    localStorage.removeItem('admin_token');
    window.location.href = '/login.html';
};

async function loadDash() {
    const data = await supabaseAPI.getDonations(token);
    const tbody = document.getElementById('t-body');
    tbody.innerHTML = data.length ? '' : '<tr><td colspan="3" class="text-center py-4 text-gray-500">Belum ada donasi</td></tr>';
    
    data.forEach(d => {
        tbody.innerHTML += `
            <tr>
                <td class="px-6 py-4"><p class="font-medium">${d.donor_name}</p><p class="text-xs text-gray-500">${d.donor_email}</p></td>
                <td class="px-6 py-4 font-semibold">Rp ${d.amount.toLocaleString('id-ID')}</td>
                <td class="px-6 py-4"><span class="px-3 py-1 text-xs font-semibold rounded-full ${d.status === 'SETTLED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">${d.status}</span></td>
            </tr>`;
    });
}

document.getElementById('form-add-user').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('new-email').value;
    const success = await supabaseAPI.addUser(email, token);
    
    if (success) { 
        alert('Email berhasil ditambahkan!'); 
        e.target.reset(); 
    } else { 
        alert('Gagal nambah email (mungkin sudah ada).'); 
    }
};

// Panggil fungsi load saat halaman dibuka
loadDash();