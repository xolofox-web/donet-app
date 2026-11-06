let token = null;

document.getElementById('form-login').onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById('login-err');
    err.classList.add('hidden');
    
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;

    const authData = await supabaseAPI.auth(email, pass);
    
    if (authData.error) { 
        err.textContent = 'Email/Password salah'; 
        err.classList.remove('hidden'); 
        return; 
    }
    
    token = authData.access_token;
    const whitelist = await supabaseAPI.checkWhitelist(email, token);

    if (whitelist.length === 0) { 
        err.textContent = 'Email lu kagak ada di whitelist!'; 
        err.classList.remove('hidden'); 
        return; 
    }

    // Simpan token di localStorage biar ga login ulang
    localStorage.setItem('admin_token', token);
    window.location.href = '/dashboard.html';
};