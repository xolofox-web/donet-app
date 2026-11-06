const config = {
    url: "https://xxxxxx.supabase.co", // GANTI URL LU
    key: "eyJhbG..." // GANTI ANON KEY LU
};

const supabaseAPI = {
    auth: async (email, password) => {
        const res = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: { 'apikey': config.key, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return res.json();
    },
    
    checkWhitelist: async (email, token) => {
        const res = await fetch(`${config.url}/rest/v1/authorized_users?email=eq.${email}`, {
            headers: { 'apikey': config.key, 'Authorization': `Bearer ${token}` }
        });
        return res.json();
    },

    insertDonation: async (data) => {
        const res = await fetch(`${config.url}/rest/v1/donations`, {
            method: 'POST',
            headers: { 'apikey': config.key, 'Authorization': `Bearer ${config.key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.ok;
    },

    getDonations: async (token) => {
        const res = await fetch(`${config.url}/rest/v1/donations?select=*&order=created_at.desc`, {
            headers: { 'apikey': config.key, 'Authorization': `Bearer ${token}` }
        });
        return res.json();
    },

    addUser: async (email, token) => {
        const res = await fetch(`${config.url}/rest/v1/authorized_users`, {
            method: 'POST',
            headers: { 'apikey': config.key, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return res.ok;
    }
};
