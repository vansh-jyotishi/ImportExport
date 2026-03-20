/* ================================================
   TradeFlow — User Dashboard Logic
   ================================================ */
(function () {
    'use strict';

    // Redirect if not logged in
    if (!TradeFlowAPI.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    const user = TradeFlowAPI.getUser();

    // Set user name
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = user ? user.fullName : 'User';

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await TradeFlowAPI.logout();
        window.location.href = 'index.html';
    });

    // ─── Tab Navigation ───────────────────────────────────
    const tabLinks = document.querySelectorAll('[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const tab = link.dataset.tab;
            tabLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            tabContents.forEach(tc => tc.classList.toggle('active', tc.id === 'tab-' + tab));
        });
    });

    // Mobile nav
    const navToggle = document.getElementById('navToggle');
    const navbar = document.getElementById('navbar');
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navbar.classList.toggle('nav-open');
            document.body.classList.toggle('no-scroll');
        });
    }

    // ─── Load Dashboard Data ──────────────────────────────
    async function loadDashboard() {
        try {
            const [wallet, bookingsRes] = await Promise.allSettled([
                TradeFlowAPI.getWallet(),
                TradeFlowAPI.getMyBookings(0, 50),
            ]);

            // Wallet
            if (wallet.status === 'fulfilled') {
                const bal = Number(wallet.value.balance).toFixed(2);
                setText('walletBalanceTop', bal);
                setText('walletBalance', bal);
                setText('overviewBalance', '$' + bal);
            }

            // Bookings
            if (bookingsRes.status === 'fulfilled') {
                const bk = bookingsRes.value;
                const bookings = bk.content || bk || [];
                setText('overviewBookings', bookings.length);
                setText('overviewConfirmed', bookings.filter(b => b.status === 'CONFIRMED').length);
                setText('overviewInTransit', bookings.filter(b => b.status === 'IN_TRANSIT').length);
                renderBookingsTable('recentBookings', bookings.slice(0, 5));
                renderBookingsTable('allBookings', bookings);
            }

            // Transactions
            loadTransactions();
        } catch (err) {
            console.error('Dashboard load error:', err);
        }
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // ─── Bookings Table ───────────────────────────────────
    function renderBookingsTable(containerId, bookings) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!bookings.length) {
            container.innerHTML = '<p class="empty-state"><i class="fas fa-inbox"></i> No bookings yet. Book your first shipment!</p>';
            return;
        }

        const statusClass = {
            PENDING: 'status-pending', CONFIRMED: 'status-transit',
            IN_TRANSIT: 'status-transit', DELIVERED: 'status-delivered', CANCELLED: 'status-cancelled'
        };

        container.innerHTML = `
        <table class="dash-table">
            <thead><tr>
                <th>Booking #</th><th>Route</th><th>Mode</th><th>Weight</th>
                <th>Price</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
            ${bookings.map(b => `
                <tr>
                    <td><strong>${b.bookingNumber}</strong></td>
                    <td>${b.originCity} &rarr; ${b.destCity}</td>
                    <td><i class="fas fa-${modeIcon(b.transportMode)}"></i> ${b.transportMode}</td>
                    <td>${Number(b.weightKg).toLocaleString()} kg</td>
                    <td><strong>$${Number(b.price).toFixed(2)}</strong></td>
                    <td><span class="status-badge ${statusClass[b.status] || ''}"><span class="status-dot"></span> ${b.status}</span></td>
                    <td class="actions-cell">
                        ${b.status === 'PENDING' && !b.paid ? `<button class="btn-sm btn-glow" onclick="dashActions.pay(${b.id})"><i class="fas fa-credit-card"></i> Pay</button>` : ''}
                        ${b.status !== 'DELIVERED' && b.status !== 'CANCELLED' ? `<button class="btn-sm btn-outline" onclick="dashActions.cancel(${b.id})"><i class="fas fa-times"></i></button>` : ''}
                    </td>
                </tr>
            `).join('')}
            </tbody>
        </table>`;
    }

    function modeIcon(mode) {
        return { Maritime: 'ship', Air: 'plane', Land: 'truck', Rail: 'train' }[mode] || 'box';
    }

    // ─── Transactions Table ───────────────────────────────
    async function loadTransactions() {
        try {
            const txnRes = await TradeFlowAPI.getWalletTransactions(0, 30);
            const txns = txnRes.content || txnRes || [];
            const container = document.getElementById('walletTransactions');
            if (!container) return;

            if (!txns.length) {
                container.innerHTML = '<p class="empty-state"><i class="fas fa-receipt"></i> No transactions yet.</p>';
                return;
            }

            container.innerHTML = `
            <table class="dash-table">
                <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Balance</th></tr></thead>
                <tbody>
                ${txns.map(t => `
                    <tr>
                        <td>${new Date(t.createdAt).toLocaleDateString()}</td>
                        <td>${t.description}</td>
                        <td class="${t.type === 'CREDIT' ? 'text-green' : 'text-red'}">
                            ${t.type === 'CREDIT' ? '+' : '-'}$${Number(t.amount).toFixed(2)}
                        </td>
                        <td>$${Number(t.balanceAfter).toFixed(2)}</td>
                    </tr>
                `).join('')}
                </tbody>
            </table>`;
        } catch { /* ignore */ }
    }

    // ─── Wallet Top-Up ────────────────────────────────────
    document.getElementById('topUpBtn').addEventListener('click', async () => {
        const amtInput = document.getElementById('topUpAmount');
        const amount = parseFloat(amtInput.value);
        if (!amount || amount <= 0) { alert('Enter a valid amount'); return; }

        try {
            const wallet = await TradeFlowAPI.topUpWallet(amount, 'Wallet top-up');
            const bal = Number(wallet.balance).toFixed(2);
            setText('walletBalanceTop', bal);
            setText('walletBalance', bal);
            setText('overviewBalance', '$' + bal);
            amtInput.value = '';
            loadTransactions();
        } catch (err) {
            alert(err.message);
        }
    });

    // ─── Booking Form ─────────────────────────────────────
    // Estimate
    document.getElementById('calcEstimate').addEventListener('click', async () => {
        const weight = parseFloat(document.getElementById('bkWeight').value);
        const mode = document.getElementById('bkMode').value;
        if (!weight || weight <= 0) { alert('Enter weight first'); return; }

        try {
            const est = await TradeFlowAPI.getBookingEstimate(weight, mode);
            setText('estPrice', Number(est.price).toFixed(2));
            setText('estDays', est.estimatedDays + ' days');
            document.getElementById('priceEstimate').style.display = 'block';
        } catch (err) {
            alert(err.message);
        }
    });

    // Submit booking
    document.getElementById('bookingForm').addEventListener('submit', async e => {
        e.preventDefault();
        const errEl = document.getElementById('bookingError');
        const succEl = document.getElementById('bookingSuccess');
        errEl.textContent = '';
        succEl.textContent = '';

        const data = {
            cargoDescription: document.getElementById('bkCargo').value,
            cargoType: document.getElementById('bkCargoType').value || null,
            weightKg: parseFloat(document.getElementById('bkWeight').value),
            quantity: parseInt(document.getElementById('bkQty').value),
            originCity: document.getElementById('bkOriginCity').value,
            originCountry: document.getElementById('bkOriginCountry').value,
            destCity: document.getElementById('bkDestCity').value,
            destCountry: document.getElementById('bkDestCountry').value,
            transportMode: document.getElementById('bkMode').value,
            pickupDate: document.getElementById('bkPickup').value || null,
            notes: document.getElementById('bkNotes').value || null,
        };

        try {
            const res = await TradeFlowAPI.createBooking(data);
            succEl.textContent = `Booking ${res.data.bookingNumber} created! Price: $${Number(res.data.price).toFixed(2)}. Go to Bookings to pay.`;
            document.getElementById('bookingForm').reset();
            document.getElementById('priceEstimate').style.display = 'none';
            loadDashboard();
        } catch (err) {
            errEl.textContent = err.message;
        }
    });

    // ─── Booking Actions (global) ─────────────────────────
    window.dashActions = {
        pay: async function (bookingId) {
            if (!confirm('Pay for this booking from your wallet?')) return;
            try {
                await TradeFlowAPI.payBooking(bookingId);
                loadDashboard();
            } catch (err) {
                alert(err.message);
            }
        },
        cancel: async function (bookingId) {
            if (!confirm('Cancel this booking? Refund will be issued if paid.')) return;
            try {
                await TradeFlowAPI.cancelBooking(bookingId);
                loadDashboard();
            } catch (err) {
                alert(err.message);
            }
        }
    };

    // ─── Init ─────────────────────────────────────────────
    loadDashboard();

})();
