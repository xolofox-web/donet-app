const token = localStorage.getItem('admin_token');
if (!token) window.location.href = '/login.html';

document.getElementById('btn-logout').onclick = () => {
    localStorage.removeItem('admin_token');
    window.location.href = '/login.html';
};

async function loadDash() {
    const res = await fetch('/api/get-donations', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
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
    const res = await fetch('/api/add-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email: document.getElementById('new-email').value })
    });
    
    if (res.ok) { alert('Email berhasil ditambahkan!'); e.target.reset(); }
    else { alert('Gagal nambah email.'); }
};

loadDash();

// ============================================================
// [ENHANCEMENTS] FITUR BARU — TANPA MENGUBAH KODE DI ATAS
// ============================================================

// --- [1] INJECT TOAST CONTAINER ---
if (!document.getElementById('toast-container')) {
    const tc = document.createElement('div');
    tc.id = 'toast-container';
    tc.style.cssText = 'position:fixed;top:1.5rem;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:.75rem;pointer-events:none;width:90%;max-width:24rem;';
    document.body.appendChild(tc);
}

// --- [2] TOAST FUNCTION ---
function showToast(message, type) {
    type = type || 'success';
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    const iconSvg = isSuccess
        ? '<svg style="width:1rem;height:1rem" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>'
        : '<svg style="width:1rem;height:1rem" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    const color = isSuccess ? '#10b981' : '#ef4444';
    const bgLight = isSuccess ? '#d1fae5' : '#fee2e2';

    toast.style.cssText = 'background:#fff;border:1px solid ' + bgLight + ';padding:1rem;border-radius:1rem;box-shadow:0 10px 25px rgba(0,0,0,.1);display:flex;align-items:flex-start;gap:.75rem;pointer-events:auto;opacity:0;transform:translateY(-1rem);transition:all .3s;';
    toast.innerHTML =
        '<div style="width:2rem;height:2rem;flex-shrink:0;background:' + bgLight + ';color:' + color + ';border-radius:50%;display:flex;align-items:center;justify-content:center;">' + iconSvg + '</div>' +
        '<div style="flex:1;font-size:.875rem;color:#1e293b;line-height:1.4;padding-top:.1rem;">' + message + '</div>' +
        '<button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1.25rem;line-height:1;padding:0;">&times;</button>';
    container.appendChild(toast);
    setTimeout(function() { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 10);
    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-1rem)';
        setTimeout(function() { toast.remove(); }, 300);
    }, 4000);
}

// --- [3] NOTIFICATION SOUND ---
function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        function playTone(freq, start, dur) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + dur);
        }
        playTone(880, 0, 0.15);
        playTone(1175, 0.15, 0.25);
    } catch (e) { /* audio not allowed yet */ }
}

// --- [4] STATE ---
let lastDonationsData = [];
const knownDonationIds = new Set();
let notificationsInitialized = false;
let currentPage = 1;
const PER_PAGE = 10;
let searchQuery = '';
let statusFilter = 'ALL';
let currentDetailOrderId = null;

// --- [5] NOTIFIKASI & DETEKSI DONASI BARU ---
function notifyNewDonation(d) {
    showToast('🎉 Donasi baru: ' + d.donor_name + ' - Rp ' + d.amount.toLocaleString('id-ID'), 'success');
    playNotificationSound();
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification('🎉 Donasi Baru Masuk!', {
                body: d.donor_name + ' mengirim Rp ' + d.amount.toLocaleString('id-ID'),
                tag: 'donation-' + d.order_id
            });
        } catch (e) {}
    }
}

function processDonationData(data) {
    const settled = data.filter(function(d) { return d.status === 'SETTLED'; });
    const isFirstBatch = !notificationsInitialized;
    settled.forEach(function(d) {
        const id = d.order_id || (d.donor_email + '_' + d.amount);
        if (!knownDonationIds.has(id)) {
            knownDonationIds.add(id);
            if (!isFirstBatch) notifyNewDonation(d);
        }
    });
    notificationsInitialized = true;
}

// --- [6] FETCH INTERCEPTOR (deteksi donasi baru tanpa ubah loadDash) ---
const _origFetch = window.fetch.bind(window);
window.fetch = async function() {
    const args = arguments;
    const response = await _origFetch.apply(window, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
    if (url.indexOf('/api/get-donations') !== -1) {
        try {
            const clone = response.clone();
            const data = await clone.json();
            if (Array.isArray(data)) {
                lastDonationsData = data;
                processDonationData(data);
                setTimeout(function() {
                    updateSummaryStats();
                    applyFiltersAndPagination();
                }, 150);
            }
        } catch (e) {}
    }
    return response;
};

// --- [7] REQUEST IZIN NOTIFIKASI BROWSER ---
if ('Notification' in window && Notification.permission === 'default') {
    setTimeout(function() { Notification.requestPermission().catch(function() {}); }, 4000);
}

// --- [8] INJECT SUMMARY CARDS + SEARCH BAR + LOAD MORE ---
function injectWidgets() {
    const tbody = document.getElementById('t-body');
    if (!tbody) return;
    const table = tbody.closest('table');
    if (!table || document.getElementById('donation-summary-cards')) return;

    const summaryHTML =
        '<div id="donation-summary-cards" class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">' +
            '<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border-l-4 border-blue-500">' +
                '<p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Hari Ini</p>' +
                '<p class="text-lg font-bold text-blue-600" id="ss-today">Rp 0</p>' +
                '<p class="text-[11px] text-gray-400"><span id="ss-today-count">0</span> donatur</p>' +
            '</div>' +
            '<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border-l-4 border-purple-500">' +
                '<p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Minggu Ini</p>' +
                '<p class="text-lg font-bold text-purple-600" id="ss-week">Rp 0</p>' +
                '<p class="text-[11px] text-gray-400"><span id="ss-week-count">0</span> donatur</p>' +
            '</div>' +
            '<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border-l-4 border-amber-500">' +
                '<p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Bulan Ini</p>' +
                '<p class="text-lg font-bold text-amber-600" id="ss-month">Rp 0</p>' +
                '<p class="text-[11px] text-gray-400"><span id="ss-month-count">0</span> donatur</p>' +
            '</div>' +
            '<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border-l-4 border-emerald-500">' +
                '<p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total</p>' +
                '<p class="text-lg font-bold text-emerald-600" id="ss-total">Rp 0</p>' +
                '<p class="text-[11px] text-gray-400"><span id="ss-total-count">0</span> donatur</p>' +
            '</div>' +
        '</div>';

    const searchHTML =
        '<div id="donation-search-bar" class="flex flex-wrap gap-2 mb-3">' +
            '<input type="text" id="ds-search" placeholder="Cari nama / email / order ID..." class="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-800 dark:text-white">' +
            '<select id="ds-status" class="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-800 dark:text-white">' +
                '<option value="ALL">Semua Status</option>' +
                '<option value="SETTLED">Berhasil</option>' +
                '<option value="PENDING">Pending</option>' +
                '<option value="FAILED">Gagal</option>' +
            '</select>' +
        '</div>';

    table.parentElement.insertAdjacentHTML('beforebegin', summaryHTML + searchHTML);

    document.getElementById('ds-search').addEventListener('input', function(e) {
        searchQuery = e.target.value.toLowerCase();
        currentPage = 1;
        applyFiltersAndPagination();
    });
    document.getElementById('ds-status').addEventListener('change', function(e) {
        statusFilter = e.target.value;
        currentPage = 1;
        applyFiltersAndPagination();
    });

    const pagerHTML =
        '<div id="donation-pager" class="flex justify-center mt-4">' +
            '<button id="btn-load-more" style="display:none;" class="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-bold text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Muat Lebih Banyak</button>' +
        '</div>';
    table.parentElement.insertAdjacentHTML('afterend', pagerHTML);
    document.getElementById('btn-load-more').addEventListener('click', function() {
        currentPage++;
        applyFiltersAndPagination();
    });
}

// --- [9] UPDATE SUMMARY STATS ---
function updateSummaryStats() {
    const settled = lastDonationsData.filter(function(d) { return d.status === 'SETTLED'; });
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startWeek = new Date(now);
    startWeek.setDate(now.getDate() - now.getDay());
    startWeek.setHours(0, 0, 0, 0);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    function sum(arr) { return arr.reduce(function(s, d) { return s + d.amount; }, 0); }
    function fmt(n) { return 'Rp ' + n.toLocaleString('id-ID'); }

    const today = settled.filter(function(d) { return new Date(d.created_at) >= startToday; });
    const week = settled.filter(function(d) { return new Date(d.created_at) >= startWeek; });
    const month = settled.filter(function(d) { return new Date(d.created_at) >= startMonth; });

    function $(id) { return document.getElementById(id); }
    if ($('ss-today')) {
        $('ss-today').innerText = fmt(sum(today));
        $('ss-today-count').innerText = today.length;
        $('ss-week').innerText = fmt(sum(week));
        $('ss-week-count').innerText = week.length;
        $('ss-month').innerText = fmt(sum(month));
        $('ss-month-count').innerText = month.length;
        $('ss-total').innerText = fmt(sum(settled));
        $('ss-total-count').innerText = settled.length;
    }
}

// --- [10] FILTER + PAGINASI + ENHANCE BARIS TABEL ---
function applyFiltersAndPagination() {
    const rows = Array.from(document.querySelectorAll('#t-body tr'));
    if (rows.length === 0 || lastDonationsData.length === 0) return;

    let visibleCount = 0;
    const limit = currentPage * PER_PAGE;

    rows.forEach(function(row, i) {
        const d = lastDonationsData[i];
        if (!d) { row.style.display = 'none'; return; }

        if (!row.dataset.orderId) {
            row.dataset.orderId = d.order_id || '';
            row.style.cursor = 'pointer';
            row.addEventListener('click', function() { openDetailModal(d.order_id); });
            row.addEventListener('mouseenter', function() { row.style.background = '#eff6ff'; });
            row.addEventListener('mouseleave', function() { row.style.background = ''; });
        }

        const matchSearch = !searchQuery ||
            (d.donor_name || '').toLowerCase().indexOf(searchQuery) !== -1 ||
            (d.donor_email || '').toLowerCase().indexOf(searchQuery) !== -1 ||
            (d.order_id || '').toLowerCase().indexOf(searchQuery) !== -1;

        const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;

        if (matchSearch && matchStatus) {
            visibleCount++;
            row.style.display = visibleCount <= limit ? '' : 'none';
        } else {
            row.style.display = 'none';
        }
    });

    const btn = document.getElementById('btn-load-more');
    if (btn) {
        btn.style.display = visibleCount > limit ? 'inline-block' : 'none';
        const remaining = visibleCount - limit;
        btn.textContent = remaining > 0 ? 'Muat Lebih Banyak (' + remaining + ' tersisa)' : 'Muat Lebih Banyak';
    }
}

// --- [11] DETAIL MODAL (dibuat dinamis, tidak butuh HTML baru) ---
function injectDetailModal() {
    if (document.getElementById('donation-detail-modal')) return;
    const modalHTML =
        '<div id="donation-detail-modal" style="display:none;position:fixed;inset:0;z-index:9998;align-items:center;justify-content:center;padding:1rem;">' +
            '<div onclick="closeDetailModal()" style="position:absolute;inset:0;background:rgba(15,23,42,.6);backdrop-filter:blur(4px);"></div>' +
            '<div style="position:relative;background:#fff;border-radius:1.5rem;max-width:28rem;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,.25);">' +
                '<div style="padding:1.5rem;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:flex-start;">' +
                    '<div style="display:flex;align-items:center;gap:.75rem;">' +
                        '<div id="dm-avatar" style="width:3rem;height:3rem;border-radius:50%;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.125rem;">?</div>' +
                        '<div>' +
                            '<h3 id="dm-name" style="font-weight:700;color:#1e293b;margin:0;">-</h3>' +
                            '<p id="dm-email" style="font-size:.75rem;color:#64748b;margin:0;">-</p>' +
                        '</div>' +
                    '</div>' +
                    '<button onclick="closeDetailModal()" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1.5rem;line-height:1;">&times;</button>' +
                '</div>' +
                '<div style="padding:1.5rem;">' +
                    '<div style="text-align:center;background:linear-gradient(135deg,#eff6ff,#f3e8ff);padding:1.25rem;border-radius:1rem;margin-bottom:1rem;">' +
                        '<p style="font-size:.75rem;color:#64748b;margin:0 0 .25rem;">Total Donasi</p>' +
                        '<p id="dm-amount" style="font-size:1.875rem;font-weight:700;color:#2563eb;margin:0 0 .5rem;">Rp 0</p>' +
                        '<span id="dm-status" style="display:inline-block;padding:.25rem .75rem;border-radius:9999px;font-size:.75rem;font-weight:700;">-</span>' +
                    '</div>' +
                    '<div style="margin-bottom:.75rem;">' +
                        '<p style="font-size:.625rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin:0 0 .25rem;">Order ID</p>' +
                        '<div style="display:flex;gap:.5rem;align-items:center;">' +
                            '<code id="dm-order-id" style="flex:1;padding:.5rem .75rem;background:#f1f5f9;border-radius:.5rem;font-size:.75rem;font-family:monospace;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">-</code>' +
                            '<button onclick="copyDetailOrderId()" style="padding:.5rem .75rem;background:#f1f5f9;border:none;border-radius:.5rem;cursor:pointer;color:#475569;">&#128203;</button>' +
                        '</div>' +
                    '</div>' +
                    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem;">' +
                        '<div>' +
                            '<p style="font-size:.625rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin:0 0 .25rem;">Metode</p>' +
                            '<p id="dm-method" style="font-size:.875rem;font-weight:600;color:#1e293b;margin:0;">-</p>' +
                        '</div>' +
                        '<div>' +
                            '<p style="font-size:.625rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin:0 0 .25rem;">Waktu</p>' +
                            '<p id="dm-date" style="font-size:.875rem;font-weight:600;color:#1e293b;margin:0;">-</p>' +
                        '</div>' +
                    '</div>' +
                    '<div>' +
                        '<p style="font-size:.625rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin:0 0 .25rem;">Pesan Donatur</p>' +
                        '<p id="dm-message" style="font-size:.875rem;color:#475569;background:#f8fafc;padding:.75rem;border-radius:.5rem;font-style:italic;margin:0;line-height:1.5;">-</p>' +
                    '</div>' +
                '</div>' +
                '<div style="padding:1.5rem;border-top:1px solid #f1f5f9;display:flex;gap:.75rem;">' +
                    '<button onclick="closeDetailModal()" style="flex:1;padding:.75rem;background:#f1f5f9;color:#475569;border:none;border-radius:.75rem;font-weight:700;cursor:pointer;">Tutup</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function openDetailModal(orderId) {
    if (!orderId) return;
    const d = lastDonationsData.find(function(x) { return x.order_id === orderId; });
    if (!d) return;

    injectDetailModal();
    currentDetailOrderId = orderId;

    function $(id) { return document.getElementById(id); }
    $('dm-avatar').innerText = (d.donor_name || '?').charAt(0).toUpperCase();
    $('dm-name').innerText = d.donor_name || '-';
    $('dm-email').innerText = d.donor_email || '-';
    $('dm-amount').innerText = 'Rp ' + (d.amount || 0).toLocaleString('id-ID');
    $('dm-order-id').innerText = d.order_id || '-';
    $('dm-method').innerText = d.payment_method || 'QRIS';
    $('dm-date').innerText = d.created_at ? new Date(d.created_at).toLocaleString('id-ID') : '-';
    $('dm-message').innerText = d.message || '(Donatur tidak meninggalkan pesan)';

    const statusEl = $('dm-status');
    const isSettled = d.status === 'SETTLED';
    const isFailed = d.status === 'FAILED';
    statusEl.innerText = d.status || '-';
    statusEl.style.background = isSettled ? '#d1fae5' : isFailed ? '#fee2e2' : '#fef3c7';
    statusEl.style.color = isSettled ? '#065f46' : isFailed ? '#991b1b' : '#92400e';

    $('donation-detail-modal').style.display = 'flex';
}

function closeDetailModal() {
    const modal = document.getElementById('donation-detail-modal');
    if (modal) modal.style.display = 'none';
    currentDetailOrderId = null;
}

function copyDetailOrderId() {
    if (!currentDetailOrderId) return;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(currentDetailOrderId).then(function() {
            showToast('Order ID berhasil di-copy!', 'success');
        }).catch(function() {
            showToast('Gagal copy, silakan copy manual.', 'error');
        });
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeDetailModal();
});

// --- [12] OBSERVER UNTUK RE-RENDER TABEL ---
function setupTableObserver() {
    const tbody = document.getElementById('t-body');
    if (!tbody) return;
    const observer = new MutationObserver(function() {
        setTimeout(applyFiltersAndPagination, 50);
    });
    observer.observe(tbody, { childList: true });
}

// --- [13] AUTO REFRESH TIAP 20 DETIK ---
setInterval(function() {
    if (typeof loadDash === 'function') loadDash();
}, 20000);

// --- [14] INIT ---
setTimeout(function() {
    injectWidgets();
    injectDetailModal();
    setupTableObserver();
    // Paksa fetch tambahan agar baseline notifikasi ter-inisialisasi
    setTimeout(function() {
        if (typeof loadDash === 'function') loadDash();
    }, 1000);
}, 500);