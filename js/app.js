/* ================================================
   TradeFlow — Dashboard Interactions & Charts
   Connected to Spring Boot backend via TradeFlowAPI.
   Falls back to static HTML when backend is offline.
   ================================================ */

(function () {
    'use strict';

    const isMobile = window.innerWidth < 768;

    /* ================================================
       PRELOADER — tied to actual load readiness
       ================================================ */
    window.addEventListener('load', () => {
        function dismissPreloader() {
            const preloader = document.getElementById('preloader');
            if (preloader) preloader.classList.add('hidden');
        }

        let checks = 0;
        const interval = setInterval(() => {
            checks++;
            if (window.__globeReady || checks >= 30) {
                clearInterval(interval);
                dismissPreloader();
            }
        }, 100);
    });

    /* ================================================
       BACKEND CONNECTION CHECK
       ================================================ */
    async function initBackendConnection() {
        const statusEl = document.getElementById('backendStatus');
        if (!statusEl) return false;

        const available = await TradeFlowAPI.checkBackend();

        if (available) {
            statusEl.classList.add('online');
            statusEl.innerHTML = '<i class="fas fa-circle"></i> <span>API Connected</span>';
            setTimeout(() => statusEl.classList.add('fade-out'), 4000);
        } else {
            statusEl.classList.add('offline');
            statusEl.innerHTML = '<i class="fas fa-circle"></i> <span>Static Mode</span>';
            statusEl.title = 'Backend not reachable — showing static content';
        }

        return available;
    }

    /* ================================================
       NAVBAR — scroll effect + active link
       ================================================ */
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            if (window.scrollY >= section.offsetTop - 200) {
                current = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + current);
        });
    });

    /* ---- Mobile Nav Toggle ---- */
    const navToggle = document.getElementById('navToggle');

    function closeMobileMenu() {
        navbar.classList.remove('nav-open');
        document.body.classList.remove('no-scroll');
    }

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            const isOpen = navbar.classList.toggle('nav-open');
            document.body.classList.toggle('no-scroll', isOpen);
        });
    }

    document.querySelectorAll('.nav-links a, .nav-actions .btn-nav').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeMobileMenu();
            closeTrackModal();
            closeAuthModal();
        }
    });

    /* ================================================
       SCROLL REVEAL ANIMATION
       ================================================ */
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('visible'), index * 80);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach(el => revealObserver.observe(el));

    /* ================================================
       ANIMATED COUNTERS
       ================================================ */
    function animateCounter(el, target, duration) {
        const startTime = performance.now();
        const suffix = el.dataset.suffix || '';
        const prefix = el.dataset.prefix || '';

        function update(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * target);
            el.textContent = prefix + current.toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    /* ================================================
       COMMODITY BARS SCROLL ANIMATION
       ================================================ */
    const commodityBars = document.querySelectorAll('.commodity-bar');
    if (commodityBars.length) {
        const barObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const bars = entry.target.querySelectorAll('.commodity-bar');
                    bars.forEach((bar, i) => {
                        const w = bar.dataset.width;
                        bar.style.setProperty('--target-width', w);
                        setTimeout(() => bar.classList.add('animated'), i * 120);
                    });
                    barObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        const barsContainer = document.querySelector('.commodity-bars');
        if (barsContainer) barObserver.observe(barsContainer);
    }

    const counterObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.target, 10);
                if (target) animateCounter(entry.target, target, 2000);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));

    /* ================================================
       GOODS FILTER
       ================================================ */
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const f = btn.dataset.filter;
            document.querySelectorAll('.goods-card').forEach(card => {
                const show = f === 'all' || card.dataset.category === f;
                card.classList.toggle('hidden', !show);
                if (show) card.style.animation = 'fadeInUp 0.5s ease forwards';
            });
        });
    });

    /* ================================================
       CARRIER FILTER
       ================================================ */
    document.querySelectorAll('.carrier-type').forEach(type => {
        type.addEventListener('click', () => {
            document.querySelectorAll('.carrier-type').forEach(t => t.classList.remove('active'));
            type.classList.add('active');
            const f = type.dataset.type;
            document.querySelectorAll('.carrier-card').forEach(card => {
                const show = f === 'all' || card.dataset.type === f;
                card.classList.toggle('hidden', !show);
                if (show) card.style.animation = 'fadeInUp 0.5s ease forwards';
            });
        });
    });

    /* ================================================
       TRACKING MODAL — now connected to backend API
       ================================================ */
    const trackBtn = document.getElementById('trackBtn');
    const trackModal = document.getElementById('trackModal');
    const modalClose = document.getElementById('modalClose');
    const modalSearchBtn = document.getElementById('modalSearchBtn');
    const modalTrackInput = document.getElementById('modalTrackInput');
    const modalResult = document.getElementById('modalResult');

    // Fallback static data (used when backend is offline)
    const shipmentDBFallback = {
        'TF-2026-48291': { status: 'In Transit', from: 'Shanghai', to: 'Rotterdam', type: 'transit' },
        'TF-2026-77104': { status: 'In Transit', from: 'Dubai', to: 'New York', type: 'transit' },
        'TF-2026-33059': { status: 'Delivered', from: 'Mumbai', to: 'Hamburg', type: 'delivered' },
    };

    function openTrackModal() {
        trackModal.classList.add('active');
        modalResult.innerHTML = '';
        modalTrackInput.value = '';
        document.body.classList.add('no-scroll');
        setTimeout(() => modalTrackInput.focus(), 300);
    }

    function closeTrackModal() {
        if (trackModal) trackModal.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }

    async function searchShipment(id) {
        const trimmed = id.trim().toUpperCase();
        if (!trimmed) return;

        modalResult.innerHTML = '<div class="result-loading"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';

        // Try backend first
        if (TradeFlowAPI.isBackendAvailable()) {
            try {
                const shipment = await TradeFlowAPI.trackShipment(trimmed);
                const statusType = shipment.status.name === 'Delivered' ? 'delivered' : 'transit';
                const icon = statusType === 'delivered' ? 'check-circle' : 'shipping-fast';

                let milestonesHtml = '';
                if (shipment.milestones && shipment.milestones.length) {
                    milestonesHtml = '<div class="result-milestones">' +
                        shipment.milestones.map(m => {
                            const cls = m.status === 'completed' ? 'completed' : m.status === 'current' ? 'active' : '';
                            return `<div class="timeline-step ${cls}"><div class="timeline-dot"></div><span>${m.title}</span></div>`;
                        }).join('') + '</div>';
                }

                modalResult.innerHTML = `
                    <div class="result-found">
                        <div class="result-status ${statusType}">
                            <i class="fas fa-${icon}"></i> ${shipment.status.name}
                        </div>
                        <div class="result-route">${shipment.originCity}, ${shipment.originCountry} &rarr; ${shipment.destCity}, ${shipment.destCountry}</div>
                        <div class="result-details">
                            <span><i class="fas fa-${shipment.transportMode === 'Maritime' ? 'ship' : shipment.transportMode === 'Air' ? 'plane' : 'truck'}"></i> ${shipment.transportMode}</span>
                            ${shipment.eta ? `<span><i class="fas fa-clock"></i> ETA: ${new Date(shipment.eta).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>` : ''}
                            ${shipment.weightTons ? `<span><i class="fas fa-weight-hanging"></i> ${Number(shipment.weightTons).toLocaleString()} T</span>` : ''}
                        </div>
                        ${milestonesHtml}
                    </div>`;
                return;
            } catch (err) {
                if (!err.message.includes('Backend unreachable')) {
                    modalResult.innerHTML = `<div class="result-not-found"><i class="fas fa-exclamation-circle"></i> No shipment found for "${trimmed}"</div>`;
                    return;
                }
                // Fall through to static fallback
            }
        }

        // Static fallback
        const s = shipmentDBFallback[trimmed];
        if (s) {
            modalResult.innerHTML = `
                <div class="result-found">
                    <div class="result-status ${s.type}">
                        <i class="fas fa-${s.type === 'transit' ? 'shipping-fast' : 'check-circle'}"></i> ${s.status}
                    </div>
                    <div class="result-route">${s.from} &rarr; ${s.to}</div>
                </div>`;
        } else {
            modalResult.innerHTML = `<div class="result-not-found"><i class="fas fa-exclamation-circle"></i> No shipment found for "${id.trim()}"</div>`;
        }
    }

    if (trackBtn) trackBtn.addEventListener('click', openTrackModal);
    if (modalClose) modalClose.addEventListener('click', closeTrackModal);
    if (trackModal) trackModal.addEventListener('click', e => { if (e.target === trackModal) closeTrackModal(); });
    if (modalSearchBtn) modalSearchBtn.addEventListener('click', () => searchShipment(modalTrackInput.value));
    if (modalTrackInput) modalTrackInput.addEventListener('keypress', e => { if (e.key === 'Enter') searchShipment(modalTrackInput.value); });

    /* Inline search button (tracking section) */
    const searchTrackBtn = document.getElementById('searchTrackBtn');
    const trackingInput = document.getElementById('trackingInput');
    if (searchTrackBtn && trackingInput) {
        searchTrackBtn.addEventListener('click', () => {
            openTrackModal();
            modalTrackInput.value = trackingInput.value;
            if (trackingInput.value.trim()) searchShipment(trackingInput.value);
        });
        trackingInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                openTrackModal();
                modalTrackInput.value = trackingInput.value;
                if (trackingInput.value.trim()) searchShipment(trackingInput.value);
            }
        });
    }

    /* ================================================
       AUTH MODAL — Login / Signup / Profile
       ================================================ */
    const authBtn = document.getElementById('authBtn');
    const authBtnText = document.getElementById('authBtnText');
    const authModal = document.getElementById('authModal');
    const authModalClose = document.getElementById('authModalClose');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const userProfile = document.getElementById('userProfile');
    const showSignup = document.getElementById('showSignup');
    const showLogin = document.getElementById('showLogin');

    function openAuthModal() {
        authModal.classList.add('active');
        document.body.classList.add('no-scroll');

        if (TradeFlowAPI.isLoggedIn()) {
            showAuthView('profile');
            const user = TradeFlowAPI.getUser();
            if (user) {
                document.getElementById('profileName').textContent = user.fullName || 'User';
                document.getElementById('profileEmail').textContent = user.email || '';
                document.getElementById('profileCompany').textContent = user.companyName || 'No company set';
            }
        } else {
            showAuthView('login');
        }
    }

    function closeAuthModal() {
        if (authModal) authModal.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }

    function showAuthView(view) {
        loginForm.classList.remove('active');
        signupForm.classList.remove('active');
        userProfile.classList.remove('active');

        if (view === 'login') loginForm.classList.add('active');
        else if (view === 'signup') signupForm.classList.add('active');
        else if (view === 'profile') userProfile.classList.add('active');
    }

    function updateAuthButton() {
        if (TradeFlowAPI.isLoggedIn()) {
            const user = TradeFlowAPI.getUser();
            authBtnText.textContent = user ? user.fullName.split(' ')[0] : 'Account';
            authBtn.querySelector('i').className = 'fas fa-user-check';
        } else {
            authBtnText.textContent = 'Login';
            authBtn.querySelector('i').className = 'fas fa-user';
        }
    }

    function redirectToDashboard() {
        const user = TradeFlowAPI.getUser();
        if (user && user.roles && user.roles.includes('ROLE_ADMIN')) {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    }

    // Auth button: opens modal if not logged in, redirects to dashboard if logged in
    if (authBtn) authBtn.addEventListener('click', () => {
        if (TradeFlowAPI.isLoggedIn()) {
            redirectToDashboard();
        } else {
            openAuthModal();
        }
    });
    if (authModalClose) authModalClose.addEventListener('click', closeAuthModal);
    if (authModal) authModal.addEventListener('click', e => { if (e.target === authModal) closeAuthModal(); });
    if (showSignup) showSignup.addEventListener('click', e => { e.preventDefault(); showAuthView('signup'); });
    if (showLogin) showLogin.addEventListener('click', e => { e.preventDefault(); showAuthView('login'); });

    // Login handler
    const loginSubmit = document.getElementById('loginSubmit');
    const loginError = document.getElementById('loginError');
    if (loginSubmit) {
        loginSubmit.addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            loginError.textContent = '';

            if (!email || !password) {
                loginError.textContent = 'Please fill in all fields.';
                return;
            }

            loginSubmit.disabled = true;
            loginSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

            try {
                await TradeFlowAPI.login(email, password);
                updateAuthButton();
                closeAuthModal();
                redirectToDashboard();
            } catch (err) {
                loginError.textContent = err.message === 'Backend unreachable'
                    ? 'Cannot connect to server. Is the backend running on localhost:8080?'
                    : err.message;
            } finally {
                loginSubmit.disabled = false;
                loginSubmit.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            }
        });
    }

    // Signup handler
    const signupSubmit = document.getElementById('signupSubmit');
    const signupError = document.getElementById('signupError');
    if (signupSubmit) {
        signupSubmit.addEventListener('click', async () => {
            const fullName = document.getElementById('signupName').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const companyName = document.getElementById('signupCompany').value.trim();
            const phone = document.getElementById('signupPhone').value.trim();
            signupError.textContent = '';

            if (!fullName || !email || !password) {
                signupError.textContent = 'Name, email, and password are required.';
                return;
            }
            if (password.length < 8) {
                signupError.textContent = 'Password must be at least 8 characters.';
                return;
            }

            signupSubmit.disabled = true;
            signupSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

            try {
                await TradeFlowAPI.signup({ fullName, email, password, companyName, phone });
                updateAuthButton();
                closeAuthModal();
                redirectToDashboard();
            } catch (err) {
                signupError.textContent = err.message === 'Backend unreachable'
                    ? 'Cannot connect to server. Is the backend running on localhost:8080?'
                    : err.message;
            } finally {
                signupSubmit.disabled = false;
                signupSubmit.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
            }
        });
    }

    // Logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await TradeFlowAPI.logout();
            updateAuthButton();
            closeAuthModal();
        });
    }

    // Listen for forced logout
    window.addEventListener('tradeflow:logout', () => {
        updateAuthButton();
    });

    // Init auth button state
    updateAuthButton();

    /* ================================================
       DYNAMIC DATA LOADING FROM BACKEND
       ================================================ */
    async function loadDynamicData() {
        const backendOnline = await initBackendConnection();
        if (!backendOnline) return; // Keep static HTML as-is

        // Load all sections in parallel
        await Promise.allSettled([
            loadHeroStats(),
            loadProducts(),
            loadCarriers(),
            loadAnalyticsData(),
        ]);
    }

    /* ---- Hero Stats ---- */
    async function loadHeroStats() {
        try {
            const stats = await TradeFlowAPI.getPlatformStats();
            if (!stats || !stats.length) return;

            const statEls = document.querySelectorAll('.hero-stat');
            stats.forEach((stat, i) => {
                if (statEls[i]) {
                    const numEl = statEls[i].querySelector('.stat-number');
                    const labelEl = statEls[i].querySelector('.stat-label');
                    if (labelEl) labelEl.textContent = stat.displayLabel;

                    // Parse the stat value for counter animation
                    const raw = stat.statValue.replace(/[,%]/g, '');
                    const num = parseInt(raw, 10);
                    if (numEl && num) {
                        numEl.dataset.target = num;
                        if (stat.statValue.includes('%')) numEl.dataset.suffix = '%';
                    }
                }
            });
        } catch { /* keep static */ }
    }

    /* ---- Products (Goods) ---- */
    async function loadProducts() {
        try {
            const result = await TradeFlowAPI.getProducts({ size: 20 });
            const products = result.content || result;
            if (!products || !products.length) return;

            const grid = document.querySelector('.goods-grid');
            if (!grid) return;

            grid.innerHTML = products.map(p => {
                const categorySlug = p.category ? p.category.slug : 'all';
                const categoryName = p.category ? p.category.name : '';
                const regions = (p.sourceRegions || []).map(r => r.name).join(', ');
                const tags = (p.tags || []).map(t => `<span class="tag">${t.name}</span>`).join('');

                return `
                <div class="goods-card reveal visible" data-category="${categorySlug}">
                    <div class="goods-icon"><i class="${p.iconClass || 'fas fa-box'}"></i></div>
                    <div class="goods-info">
                        <h3>${p.name}</h3>
                        <span class="goods-category">${categoryName}</span>
                        <p>${p.shortDescription || p.description || ''}</p>
                        <div class="goods-meta">
                            ${regions ? `<span><i class="fas fa-map-marker-alt"></i> ${regions}</span>` : ''}
                            ${p.avgShipmentValue ? `<span><i class="fas fa-dollar-sign"></i> ${p.avgShipmentValue} avg/shipment</span>` : ''}
                        </div>
                        <div class="goods-tags">${tags}</div>
                    </div>
                </div>`;
            }).join('');

            // Re-bind filter buttons to new cards
            bindGoodsFilter();
            // Re-bind tilt effect
            if (!isMobile) bindTiltEffect(grid.querySelectorAll('.goods-card'));
        } catch { /* keep static */ }
    }

    function bindGoodsFilter() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                newBtn.classList.add('active');
                const f = newBtn.dataset.filter;
                document.querySelectorAll('.goods-card').forEach(card => {
                    const show = f === 'all' || card.dataset.category === f;
                    card.classList.toggle('hidden', !show);
                    if (show) card.style.animation = 'fadeInUp 0.5s ease forwards';
                });
            });
        });
    }

    /* ---- Carriers ---- */
    async function loadCarriers() {
        try {
            const carriers = await TradeFlowAPI.getCarriers();
            if (!carriers || !carriers.length) return;

            const grid = document.querySelector('.carriers-grid');
            if (!grid) return;

            const typeMap = { 1: 'maritime', 2: 'air', 3: 'land', 4: 'land' };

            grid.innerHTML = carriers.map(c => {
                const type = c.carrierType ? (c.carrierType.slug || typeMap[c.carrierType.id] || 'maritime') : 'maritime';
                const typeName = c.carrierType ? c.carrierType.name : 'Maritime';
                const iconMap = { maritime: 'fa-ship', air: 'fa-plane', land: 'fa-truck', rail: 'fa-train' };
                const icon = iconMap[type] || 'fa-ship';
                const specs = (c.specializations || []).map(s => `<span>${s.name}</span>`).join('');

                return `
                <div class="carrier-card reveal visible" data-type="${type}">
                    <div class="carrier-card-top">
                        <div class="carrier-icon ${type}"><i class="fas ${icon}"></i></div>
                        <div class="carrier-rating">
                            <i class="fas fa-star"></i> ${Number(c.rating).toFixed(1)}
                        </div>
                    </div>
                    <h3>${c.name}</h3>
                    <span class="carrier-badge ${type}">${typeName}</span>
                    <div class="carrier-stats">
                        <div class="carrier-stat">
                            <span class="carrier-stat-value">${c.assetCount ? c.assetCount.toLocaleString() : '0'}${c.assetCount > 100 ? '+' : ''}</span>
                            <span class="carrier-stat-label">${c.assetLabel || 'Assets'}</span>
                        </div>
                        <div class="carrier-stat">
                            <span class="carrier-stat-value">${c.routeLabel || c.routeCount || '0'}</span>
                            <span class="carrier-stat-label">Routes</span>
                        </div>
                        <div class="carrier-stat">
                            <span class="carrier-stat-value">${Number(c.onTimeRate).toFixed(0)}%</span>
                            <span class="carrier-stat-label">On-Time</span>
                        </div>
                    </div>
                    ${specs ? `<div class="carrier-routes">${specs}</div>` : ''}
                </div>`;
            }).join('');

            // Re-bind carrier filter
            bindCarrierFilter();
            if (!isMobile) bindTiltEffect(grid.querySelectorAll('.carrier-card'));
        } catch { /* keep static */ }
    }

    function bindCarrierFilter() {
        document.querySelectorAll('.carrier-type').forEach(type => {
            const newType = type.cloneNode(true);
            type.parentNode.replaceChild(newType, type);
            newType.addEventListener('click', () => {
                document.querySelectorAll('.carrier-type').forEach(t => t.classList.remove('active'));
                newType.classList.add('active');
                const f = newType.dataset.type;
                document.querySelectorAll('.carrier-card').forEach(card => {
                    const show = f === 'all' || card.dataset.type === f;
                    card.classList.toggle('hidden', !show);
                    if (show) card.style.animation = 'fadeInUp 0.5s ease forwards';
                });
            });
        });
    }

    /* ---- Analytics Charts (dynamic data) ---- */
    async function loadAnalyticsData() {
        if (typeof Chart === 'undefined') return;

        try {
            const [analytics2026, analytics2025, revenueRegion] = await Promise.allSettled([
                TradeFlowAPI.getMonthlyAnalytics(2026),
                TradeFlowAPI.getMonthlyAnalytics(2025),
                TradeFlowAPI.getRevenueByRegion(2026),
            ]);

            // Store data globally so initCharts can use it
            if (analytics2026.status === 'fulfilled' && analytics2026.value.length) {
                window.__chartData2026 = analytics2026.value;
            }
            if (analytics2025.status === 'fulfilled' && analytics2025.value.length) {
                window.__chartData2025 = analytics2025.value;
            }
            if (revenueRegion.status === 'fulfilled' && revenueRegion.value.length) {
                window.__revenueRegion = revenueRegion.value;
            }
        } catch { /* charts will use static data */ }
    }

    /* ================================================
       HERO BACKGROUND PARTICLES
       ================================================ */
    const heroParticles = document.getElementById('heroParticles');
    if (heroParticles) {
        const count = isMobile ? 15 : 50;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            const size = Math.random() * 3 + 1;
            p.style.cssText = `
                position:absolute;
                width:${size}px; height:${size}px;
                background:rgba(0,212,255,${Math.random() * 0.3 + 0.1});
                border-radius:50%;
                left:${Math.random() * 100}%; top:${Math.random() * 100}%;
                animation:floatParticle ${Math.random() * 20 + 15}s linear infinite;
                animation-delay:${Math.random() * -20}s;
            `;
            heroParticles.appendChild(p);
        }
        const style = document.createElement('style');
        style.textContent = `
            @keyframes floatParticle {
                0%   { transform: translateY(0) translateX(0); opacity: 0; }
                10%  { opacity: 1; }
                90%  { opacity: 1; }
                100% { transform: translateY(-100vh) translateX(${Math.random() * 200 - 100}px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    /* ================================================
       CHARTS (Chart.js) — uses API data when available
       ================================================ */
    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = '#5a6a80';
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.font.size = isMobile ? 10 : 12;
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        Chart.defaults.plugins.legend.labels.padding = isMobile ? 12 : 20;
        Chart.defaults.scale.grid = { color: 'rgba(255,255,255,0.04)', drawBorder: false };
    }

    const tooltipStyle = {
        backgroundColor: 'rgba(10,22,40,0.95)',
        borderColor: 'rgba(0,212,255,0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
    };

    const chartObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { initCharts(); chartObserver.unobserve(entry.target); }
        });
    }, { threshold: 0.15 });

    const analyticsSection = document.getElementById('analytics');
    if (analyticsSection) chartObserver.observe(analyticsSection);

    function initCharts() {
        if (typeof Chart === 'undefined') return;

        // ---- Shipment Volume ----
        const shipmentCtx = document.getElementById('shipmentChart');
        if (shipmentCtx) {
            const grad = shipmentCtx.getContext('2d').createLinearGradient(0, 0, 0, 280);
            grad.addColorStop(0, 'rgba(0,212,255,0.3)');
            grad.addColorStop(1, 'rgba(0,212,255,0.0)');

            // Use API data if available, otherwise static
            const data2026 = window.__chartData2026
                ? window.__chartData2026.map(d => d.totalShipments)
                : [4200, 4800, 5100, 4900, 5500, 5800, 6200, 5900, 6500, 6800, 7100, 7400];
            const data2025 = window.__chartData2025
                ? window.__chartData2025.map(d => d.totalShipments)
                : [3800, 4100, 4500, 4300, 4800, 5100, 5500, 5200, 5800, 6100, 6400, 6700];

            new Chart(shipmentCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                        label: '2026',
                        data: data2026,
                        borderColor: '#00d4ff',
                        backgroundColor: grad,
                        fill: true, tension: 0.4,
                        pointBackgroundColor: '#00d4ff',
                        pointBorderColor: '#050a18',
                        pointBorderWidth: 2,
                        pointRadius: isMobile ? 2 : 4,
                        pointHoverRadius: 6,
                    }, {
                        label: '2025',
                        data: data2025,
                        borderColor: 'rgba(77,139,255,0.4)',
                        backgroundColor: 'transparent',
                        borderDash: [5, 5], tension: 0.4, pointRadius: 0,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: isMobile ? 'bottom' : 'top', align: 'end' },
                        tooltip: tooltipStyle,
                    },
                    scales: {
                        y: { beginAtZero: false, ticks: { callback: v => (v / 1000).toFixed(1) + 'K' } },
                        x: { ticks: { maxRotation: isMobile ? 45 : 0 } }
                    }
                }
            });
        }

        // ---- Revenue by Region ----
        const regionCtx = document.getElementById('regionChart');
        if (regionCtx) {
            const regionData = window.__revenueRegion;
            const labels = regionData
                ? regionData.map(r => r.regionName)
                : ['Asia-Pacific', 'Europe', 'N. America', 'Middle East', 'Africa', 'S. America'];
            const values = regionData
                ? regionData.map(r => Number(r.percentage))
                : [35, 25, 20, 10, 5, 5];
            const colors = regionData
                ? regionData.map(r => r.color || '#00d4ff')
                : ['#00d4ff', '#4d8bff', '#a855f7', '#ffd700', '#ff8c42', '#00f5d4'];

            new Chart(regionCtx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: colors,
                        borderColor: '#0a1628', borderWidth: 3, hoverOffset: 8,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '65%',
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 12, font: { size: isMobile ? 10 : 11 } } },
                        tooltip: { ...tooltipStyle, callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` } },
                    }
                }
            });
        }

        // ---- Trade Routes Performance ----
        const routesCtx = document.getElementById('routesChart');
        if (routesCtx) {
            const routeLabels = [
                'Shanghai-Rotterdam', 'Shanghai-LA', 'Dubai-New York', 'Mumbai-Hamburg',
                'Singapore-Dubai', 'Tokyo-LA', 'HK-Rotterdam', 'Santos-Hamburg'
            ];
            new Chart(routesCtx, {
                type: 'bar',
                data: {
                    labels: routeLabels,
                    datasets: [{
                        label: 'Shipments',
                        data: [1850, 1620, 1380, 1200, 1100, 980, 920, 780],
                        backgroundColor: 'rgba(0,212,255,0.6)',
                        borderRadius: 6, borderSkipped: false,
                    }, {
                        label: 'On-Time %',
                        data: [98, 97, 99, 96, 98, 97, 95, 94],
                        backgroundColor: 'rgba(0,245,212,0.6)',
                        borderRadius: 6, borderSkipped: false, yAxisID: 'y1',
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: isMobile ? 'bottom' : 'top', align: 'end' },
                        tooltip: tooltipStyle,
                    },
                    scales: {
                        y: { position: 'left', ticks: { callback: v => v.toLocaleString() } },
                        y1: { position: 'right', min: 85, max: 100, ticks: { callback: v => v + '%' }, grid: { drawOnChartArea: false } },
                        x: {
                            ticks: {
                                maxRotation: isMobile ? 60 : 30,
                                font: { size: isMobile ? 8 : 11 },
                                callback: function (val) {
                                    const label = this.getLabelForValue(val);
                                    return isMobile ? label.substring(0, 10) : label;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    /* ================================================
       3D TILT EFFECT ON CARDS (desktop only)
       ================================================ */
    function bindTiltEffect(cards) {
        if (isMobile) return;
        cards.forEach(card => {
            card.addEventListener('mousemove', e => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -2;
                const rotateY = ((x - centerX) / centerX) * 2;
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    if (!isMobile) {
        bindTiltEffect(document.querySelectorAll('.goods-card, .carrier-card, .tracking-card'));
    }

    /* ================================================
       SMOOTH SCROLL FOR NAV LINKS
       ================================================ */
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            closeMobileMenu();
        });
    });

    /* ================================================
       BOOTSTRAP — Load dynamic data from backend
       ================================================ */
    loadDynamicData();

})();
