document.getElementById('form-login').onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById('login-err');
    err.classList.add('hidden');
    
    const email = document.getElementById('login-email').value;
    
    // 1. Login lewat API Vercel
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: document.getElementById('login-pass').value })
    });
    const data = await res.json();
    
    if (data.error) { 
        err.textContent = 'Email/Password salah'; err.classList.remove('hidden'); return; 
    }
    
    // 2. Cek Whitelist
    const wl = await fetch(`${process.env.SUPABASE_URL}/rest/v1/authorized_users?email=eq.${email}`, { // ERROR: process.env gak ada di browser!
        headers: { 'apikey': '...', 'Authorization': `Bearer ${data.access_token}` }
    });
    // Kita harus bikin endpoint API buat cek whitelist juga kalau mau aman.