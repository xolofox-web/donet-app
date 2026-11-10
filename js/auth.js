document.addEventListener("DOMContentLoaded", function() {
    const loginForm = document.getElementById('form-login');
    
    if (loginForm) {
        loginForm.onsubmit = async function(e) {
            e.preventDefault(); // Nahan biar ga refresh
            
            const btn = loginForm.querySelector('button');
            const err = document.getElementById('login-err');
            
            btn.innerText = 'Memproses...';
            btn.disabled = true;
            err.classList.add('hidden');

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: document.getElementById('login-email').value,
                        password: document.getElementById('login-pass').value
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    err.innerText = data.error || 'Email atau password salah.';
                    err.classList.remove('hidden');
                    btn.innerText = 'Masuk ke Dashboard';
                    btn.disabled = false;
                    return;
                }

                // Simpan token dan pindah halaman
                localStorage.setItem('admin_token', data.access_token);
                window.location.href = '/dashboard.html';

            } catch (error) {
                err.innerText = 'Koneksi error: ' + error.message;
                err.classList.remove('hidden');
                btn.innerText = 'Masuk ke Dashboard';
                btn.disabled = false;
            }
        };
    }
});
