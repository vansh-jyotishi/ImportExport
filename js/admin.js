/* ================================================
   TradeFlow — Admin Panel Logic
   ================================================ */
(function () {
    'use strict';

    // Auth guard — must be logged in with ADMIN role
    if (!TradeFlowAPI.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }
    const user = TradeFlowAPI.getUser();
    if (!user || !user.roles || !user.roles.includes('ROLE_ADMIN')) {
        alert('Access denied. Admin role required.');
        window.location.href = 'index.html';
        return;
    }

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

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // ─── Dashboard Stats ──────────────────────────────────
    async function loadDashboardStats() {
        try {
            const stats = await TradeFlowAPI.adminGetDashboard();
            setText('statUsers', stats.totalUsers);
            setText('statProducts', stats.totalProducts);
            setText('statShipments', stats.totalShipments);
            setText('statInquiries', stats.totalInquiries);
        } catch (err) {
            console.error('Failed to load dashboard stats:', err);
        }
    }

    // ─── Users Table ──────────────────────────────────────
    async function loadUsers() {
        try {
            const res = await TradeFlowAPI.adminGetUsers(0, 50);
            const users = res.content || res || [];
            const container = document.getElementById('usersTable');

            if (!users.length) {
                container.innerHTML = '<p class="empty-state">No users found.</p>';
                return;
            }

            container.innerHTML = `
            <table class="dash-table">
                <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Company</th><th>Roles</th><th>Joined</th></tr></thead>
                <tbody>
                ${users.map(u => `
                    <tr>
                        <td>${u.id}</td>
                        <td><strong>${u.fullName}</strong></td>
                        <td>${u.email}</td>
                        <td>${u.companyName || '-'}</td>
                        <td>${(u.roles || []).map(r => `<span class="role-badge">${r.name.replace('ROLE_', '')}</span>`).join(' ')}</td>
                        <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                    </tr>
                `).join('')}
                </tbody>
            </table>`;
        } catch (err) {
            document.getElementById('usersTable').innerHTML = `<p class="empty-state">Error: ${err.message}</p>`;
        }
    }

    // ─── Bookings Table ───────────────────────────────────
    async function loadBookings() {
        try {
            const res = await TradeFlowAPI.adminGetBookings(0, 50);
            const bookings = res.content || res || [];
            const container = document.getElementById('adminBookings');

            if (!bookings.length) {
                container.innerHTML = '<p class="empty-state">No bookings found.</p>';
                return;
            }

            const statusOpts = ['PENDING', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
            const statusClass = {
                PENDING: 'status-pending', CONFIRMED: 'status-transit',
                IN_TRANSIT: 'status-transit', DELIVERED: 'status-delivered', CANCELLED: 'status-cancelled'
            };

            container.innerHTML = `
            <table class="dash-table">
                <thead><tr><th>Booking #</th><th>Route</th><th>Mode</th><th>Weight</th>
                    <th>Price</th><th>Paid</th><th>Status</th><th>Update</th></tr></thead>
                <tbody>
                ${bookings.map(b => `
                    <tr>
                        <td><strong>${b.bookingNumber}</strong></td>
                        <td>${b.originCity} &rarr; ${b.destCity}</td>
                        <td>${b.transportMode}</td>
                        <td>${Number(b.weightKg).toLocaleString()} kg</td>
                        <td>$${Number(b.price).toFixed(2)}</td>
                        <td>${b.paid ? '<i class="fas fa-check text-green"></i>' : '<i class="fas fa-times text-red"></i>'}</td>
                        <td><span class="status-badge ${statusClass[b.status] || ''}"><span class="status-dot"></span> ${b.status}</span></td>
                        <td>
                            <select onchange="adminActions.updateBooking(${b.id}, this.value)" class="status-select">
                                ${statusOpts.map(s => `<option value="${s}" ${s === b.status ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </td>
                    </tr>
                `).join('')}
                </tbody>
            </table>`;
        } catch (err) {
            document.getElementById('adminBookings').innerHTML = `<p class="empty-state">Error: ${err.message}</p>`;
        }
    }

    // ─── Inquiries Table ──────────────────────────────────
    async function loadInquiries() {
        try {
            const res = await TradeFlowAPI.adminGetInquiries(0, 50);
            const inquiries = res.content || res || [];
            const container = document.getElementById('adminInquiries');

            if (!inquiries.length) {
                container.innerHTML = '<p class="empty-state">No inquiries found.</p>';
                return;
            }

            const statusOpts = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

            container.innerHTML = `
            <table class="dash-table">
                <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Subject</th>
                    <th>Status</th><th>Date</th><th>Update</th></tr></thead>
                <tbody>
                ${inquiries.map(i => `
                    <tr>
                        <td>${i.id}</td>
                        <td><strong>${i.name}</strong></td>
                        <td>${i.email}</td>
                        <td>${i.subject}</td>
                        <td>${i.status}</td>
                        <td>${i.createdAt ? new Date(i.createdAt).toLocaleDateString() : '-'}</td>
                        <td>
                            <select onchange="adminActions.updateInquiry(${i.id}, this.value)" class="status-select">
                                ${statusOpts.map(s => `<option value="${s}" ${s === i.status ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </td>
                    </tr>
                `).join('')}
                </tbody>
            </table>`;
        } catch (err) {
            document.getElementById('adminInquiries').innerHTML = `<p class="empty-state">Error: ${err.message}</p>`;
        }
    }

    // ─── Admin Actions (global) ───────────────────────────
    window.adminActions = {
        updateBooking: async function (id, status) {
            try {
                await TradeFlowAPI.adminUpdateBookingStatus(id, status);
                loadBookings();
            } catch (err) { alert(err.message); }
        },
        updateInquiry: async function (id, status) {
            try {
                await TradeFlowAPI.adminUpdateInquiryStatus(id, status, '');
                loadInquiries();
            } catch (err) { alert(err.message); }
        }
    };

    // ─── Init ─────────────────────────────────────────────
    loadDashboardStats();
    loadUsers();
    loadBookings();
    loadInquiries();

})();
