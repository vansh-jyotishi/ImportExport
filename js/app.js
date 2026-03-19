/* ================================================
   TradeFlow — Dashboard Interactions & Charts
   Fully responsive with mobile-aware features.
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

        /* Wait for globe or timeout after 3s */
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

    /* ---- Mobile Nav Toggle (CSS class-based) ---- */
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

    /* Close mobile menu on link click */
    document.querySelectorAll('.nav-links a, .nav-actions .btn-nav').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });

    /* Close on escape key */
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeMobileMenu();
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
       TRACKING MODAL
       ================================================ */
    const trackBtn = document.getElementById('trackBtn');
    const trackModal = document.getElementById('trackModal');
    const modalClose = document.getElementById('modalClose');
    const modalSearchBtn = document.getElementById('modalSearchBtn');
    const modalTrackInput = document.getElementById('modalTrackInput');
    const modalResult = document.getElementById('modalResult');

    const shipmentDB = {
        'TF-2026-48291': { status: 'In Transit', from: 'Shanghai', to: 'Rotterdam', type: 'transit' },
        'TF-2026-77104': { status: 'In Transit', from: 'Dubai', to: 'New York', type: 'transit' },
        'TF-2026-33059': { status: 'Delivered', from: 'Mumbai', to: 'Hamburg', type: 'delivered' },
    };

    function openModal() {
        trackModal.classList.add('active');
        modalResult.innerHTML = '';
        modalTrackInput.value = '';
        document.body.classList.add('no-scroll');
        setTimeout(() => modalTrackInput.focus(), 300);
    }

    function closeModal() {
        trackModal.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }

    function searchShipment(id) {
        const trimmed = id.trim().toUpperCase();
        const s = shipmentDB[trimmed];
        if (s) {
            modalResult.innerHTML = `
                <div class="result-found">
                    <div class="result-status ${s.type}">
                        <i class="fas fa-${s.type === 'transit' ? 'shipping-fast' : 'check-circle'}"></i> ${s.status}
                    </div>
                    <div class="result-route">${s.from} &rarr; ${s.to}</div>
                </div>`;
        } else if (trimmed.length > 0) {
            modalResult.innerHTML = `<div class="result-not-found"><i class="fas fa-exclamation-circle"></i> No shipment found for "${id.trim()}"</div>`;
        }
    }

    if (trackBtn) trackBtn.addEventListener('click', openModal);
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (trackModal) trackModal.addEventListener('click', e => { if (e.target === trackModal) closeModal(); });
    if (modalSearchBtn) modalSearchBtn.addEventListener('click', () => searchShipment(modalTrackInput.value));
    if (modalTrackInput) modalTrackInput.addEventListener('keypress', e => { if (e.key === 'Enter') searchShipment(modalTrackInput.value); });

    /* Inline search button (tracking section) */
    const searchTrackBtn = document.getElementById('searchTrackBtn');
    const trackingInput = document.getElementById('trackingInput');
    if (searchTrackBtn && trackingInput) {
        searchTrackBtn.addEventListener('click', () => {
            const id = trackingInput.value.trim().toUpperCase();
            if (shipmentDB[id]) {
                document.getElementById('tracking').scrollIntoView({ behavior: 'smooth' });
            } else {
                openModal();
                modalTrackInput.value = trackingInput.value;
                searchShipment(trackingInput.value);
            }
        });
    }

    /* ================================================
       HERO BACKGROUND PARTICLES (skip/reduce on mobile)
       ================================================ */
    const heroParticles = document.getElementById('heroParticles');
    if (heroParticles) {
        const count = isMobile ? 8 : 25;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            const size = Math.random() * 2.5 + 1;
            p.style.cssText = `
                position:absolute;
                width:${size}px; height:${size}px;
                background:rgba(43,143,190,${Math.random() * 0.15 + 0.05});
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
       CHARTS (Chart.js) — responsive with mobile tweaks
       ================================================ */
    if (typeof Chart === 'undefined') return;

    Chart.defaults.color = '#6b7a8d';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = isMobile ? 10 : 12;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.padding = isMobile ? 12 : 20;
    Chart.defaults.scale.grid = { color: 'rgba(255,255,255,0.04)', drawBorder: false };

    const tooltipStyle = {
        backgroundColor: 'rgba(16,27,46,0.95)',
        borderColor: 'rgba(43,143,190,0.2)',
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
        /* ---- Shipment Volume ---- */
        const shipmentCtx = document.getElementById('shipmentChart');
        if (shipmentCtx) {
            const grad = shipmentCtx.getContext('2d').createLinearGradient(0, 0, 0, 280);
            grad.addColorStop(0, 'rgba(43,143,190,0.25)');
            grad.addColorStop(1, 'rgba(43,143,190,0.0)');

            new Chart(shipmentCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                        label: '2026',
                        data: [4200, 4800, 5100, 4900, 5500, 5800, 6200, 5900, 6500, 6800, 7100, 7400],
                        borderColor: '#2b8fbe',
                        backgroundColor: grad,
                        fill: true, tension: 0.4,
                        pointBackgroundColor: '#2b8fbe',
                        pointBorderColor: '#0b1222',
                        pointBorderWidth: 2,
                        pointRadius: isMobile ? 2 : 4,
                        pointHoverRadius: 6,
                    }, {
                        label: '2025',
                        data: [3800, 4100, 4500, 4300, 4800, 5100, 5500, 5200, 5800, 6100, 6400, 6700],
                        borderColor: 'rgba(61,111,181,0.3)',
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

        /* ---- Revenue by Region ---- */
        const regionCtx = document.getElementById('regionChart');
        if (regionCtx) {
            new Chart(regionCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Asia-Pacific', 'Europe', 'N. America', 'Middle East', 'Africa', 'S. America'],
                    datasets: [{
                        data: [35, 25, 20, 10, 5, 5],
                        backgroundColor: ['#2b8fbe', '#3d6fb5', '#6b7c99', '#c9a84c', '#c17a3e', '#3aa89a'],
                        borderColor: '#101b2e', borderWidth: 3, hoverOffset: 8,
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

        /* ---- Top Commodities: handled by custom HTML bars, not Chart.js ---- */

        /* ---- Trade Routes Performance ---- */
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
                        backgroundColor: 'rgba(43,143,190,0.55)',
                        borderRadius: 6, borderSkipped: false,
                    }, {
                        label: 'On-Time %',
                        data: [98, 97, 99, 96, 98, 97, 95, 94],
                        backgroundColor: 'rgba(58,168,154,0.55)',
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
    if (!isMobile) {
        const tiltCards = document.querySelectorAll('.goods-card, .carrier-card, .tracking-card');
        tiltCards.forEach(card => {
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

})();
