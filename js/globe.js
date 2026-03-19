/* ================================================
   TradeFlow — Interactive 3D Globe (Three.js)
   Fully responsive with mobile optimization,
   WebGL fallback, and off-screen pause.
   ================================================ */

(function () {
    'use strict';

    const container = document.getElementById('globeContainer');
    if (!container) return;

    /* ---- Device Detection ---- */
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    const isLowEnd = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : isMobile;

    /* ---- WebGL Detection ---- */
    function isWebGLAvailable() {
        try {
            const c = document.createElement('canvas');
            return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }

    if (typeof THREE === 'undefined' || !isWebGLAvailable()) {
        container.innerHTML = `
            <div class="globe-fallback">
                <i class="fas fa-globe-americas"></i>
                <p>Interactive Globe</p>
            </div>`;
        return;
    }

    /* ---- Performance-Scaled Constants ---- */
    const GLOBE_RADIUS = 5;
    const ATMOSPHERE_RADIUS = 5.35;
    const SEGMENTS = isMobile ? 32 : isTablet ? 48 : 64;
    const STAR_COUNT = isMobile ? 400 : isTablet ? 800 : 1500;
    const TEX_W = isMobile ? 1024 : 2048;
    const TEX_H = TEX_W / 2;
    const DOT_STEP = isMobile ? 3 : 2;
    const ARC_SEGMENTS = isMobile ? 32 : 64;
    const SKIP_GLOW = isMobile || isLowEnd;
    const MAX_DPR = isMobile ? 1.5 : 2;

    /* ---- Scene, Camera, Renderer ---- */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);

    function getCameraZ() {
        const w = container.clientWidth;
        if (w < 400) return 20;
        if (w < 600) return 18;
        if (w < 900) return 16;
        return 14;
    }
    camera.position.z = getCameraZ();

    let rendererInstance;
    try {
        rendererInstance = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile });
    } catch (e) {
        container.innerHTML = `
            <div class="globe-fallback">
                <i class="fas fa-globe-americas"></i>
                <p>Interactive Globe</p>
            </div>`;
        return;
    }
    const renderer = rendererInstance;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));

    /* Remove fallback and insert canvas */
    const fallback = document.getElementById('globeFallback');
    if (fallback) fallback.remove();
    container.appendChild(renderer.domElement);

    /* ---- Lighting ---- */
    scene.add(new THREE.AmbientLight(0x334466, 1.5));
    const dirLight = new THREE.DirectionalLight(0x88bbff, 0.8);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    /* ---- Approximate land check ---- */
    function isLand(lat, lng) {
        if (lat > 60 && lat < 84 && lng > -55 && lng < -15) return true;
        if (lat > 63 && lat < 67 && lng > -25 && lng < -13) return true;
        if (lat > 48 && lat < 72 && lng > -140 && lng < -55) return true;
        if (lat > 55 && lat < 72 && lng > -170 && lng < -140) return true;
        if (lat > 25 && lat < 48 && lng > -125 && lng < -67) return true;
        if (lat > 24 && lat < 31 && lng > -88 && lng < -79) return true;
        if (lat > 14 && lat < 33 && lng > -118 && lng < -86) return true;
        if (lat > 7 && lat < 18 && lng > -92 && lng < -77) return true;
        if (lat > 18 && lat < 24 && lng > -85 && lng < -68) return true;
        if (lat > -5 && lat < 13 && lng > -80 && lng < -50) return true;
        if (lat > -20 && lat < -5 && lng > -75 && lng < -35) return true;
        if (lat > -35 && lat < -20 && lng > -70 && lng < -40) return true;
        if (lat > -55 && lat < -35 && lng > -75 && lng < -63) return true;
        if (lat > 36 && lat < 44 && lng > -10 && lng < 3) return true;
        if (lat > 42 && lat < 51 && lng > -5 && lng < 8) return true;
        if (lat > 50 && lat < 59 && lng > -8 && lng < 2) return true;
        if (lat > 44 && lat < 55 && lng > 5 && lng < 25) return true;
        if (lat > 37 && lat < 46 && lng > 7 && lng < 19) return true;
        if (lat > 35 && lat < 46 && lng > 19 && lng < 30) return true;
        if (lat > 55 && lat < 71 && lng > 4 && lng < 31) return true;
        if (lat > 44 && lat < 55 && lng > 22 && lng < 40) return true;
        if (lat > 50 && lat < 72 && lng > 30 && lng < 180) return true;
        if (lat > 45 && lat < 55 && lng > 30 && lng < 90) return true;
        if (lat > 18 && lat < 37 && lng > -17 && lng < 40) return true;
        if (lat > 4 && lat < 18 && lng > -17 && lng < 16) return true;
        if (lat > -12 && lat < 18 && lng > 16 && lng < 52) return true;
        if (lat > -35 && lat < -12 && lng > 12 && lng < 42) return true;
        if (lat > -26 && lat < -12 && lng > 43 && lng < 50) return true;
        if (lat > 12 && lat < 38 && lng > 35 && lng < 60) return true;
        if (lat > 8 && lat < 35 && lng > 68 && lng < 90) return true;
        if (lat > 6 && lat < 10 && lng > 79 && lng < 82) return true;
        if (lat > 35 && lat < 50 && lng > 50 && lng < 90) return true;
        if (lat > 20 && lat < 50 && lng > 75 && lng < 135) return true;
        if (lat > -5 && lat < 25 && lng > 95 && lng < 120) return true;
        if (lat > 5 && lat < 20 && lng > 117 && lng < 127) return true;
        if (lat > -8 && lat < 5 && lng > 95 && lng < 140) return true;
        if (lat > 30 && lat < 46 && lng > 129 && lng < 146) return true;
        if (lat > 33 && lat < 43 && lng > 124 && lng < 132) return true;
        if (lat > -38 && lat < -12 && lng > 114 && lng < 154) return true;
        if (lat > -47 && lat < -34 && lng > 166 && lng < 178) return true;
        return false;
    }

    /* ---- Lat/Lng to 3D ---- */
    function latLngToVec3(lat, lng, r) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        return new THREE.Vector3(
            -r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(theta)
        );
    }

    /* ---- Globe Texture (Canvas) ---- */
    function createGlobeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = TEX_W;
        canvas.height = TEX_H;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, 0, TEX_H);
        grad.addColorStop(0, '#0a1628');
        grad.addColorStop(0.5, '#081422');
        grad.addColorStop(1, '#0a1628');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, TEX_W, TEX_H);

        ctx.strokeStyle = 'rgba(0, 180, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let lat = -80; lat <= 80; lat += 10) {
            const y = ((90 - lat) / 180) * TEX_H;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TEX_W, y); ctx.stroke();
        }
        for (let lng = -180; lng < 180; lng += 10) {
            const x = ((lng + 180) / 360) * TEX_W;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, TEX_H); ctx.stroke();
        }

        const dotR = isMobile ? 1.8 : 2.2;
        for (let lat = -85; lat <= 85; lat += DOT_STEP) {
            for (let lng = -180; lng < 180; lng += DOT_STEP) {
                if (isLand(lat, lng)) {
                    const x = ((lng + 180) / 360) * TEX_W;
                    const y = ((90 - lat) / 180) * TEX_H;
                    ctx.beginPath();
                    ctx.arc(x, y, dotR, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0, 200, 255, 0.45)';
                    ctx.fill();
                }
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /* ---- Globe Sphere ---- */
    const globeTexture = createGlobeTexture();
    const globe = new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_RADIUS, SEGMENTS, SEGMENTS),
        new THREE.MeshPhongMaterial({ map: globeTexture, transparent: true, opacity: 0.95, shininess: 10 })
    );
    scene.add(globe);

    /* ---- Atmosphere Glow ---- */
    const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(ATMOSPHERE_RADIUS, SEGMENTS, SEGMENTS),
        new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }`,
            fragmentShader: `
                varying vec3 vNormal;
                void main() {
                    float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                    gl_FragColor = vec4(0.0, 0.6, 1.0, 1.0) * intensity * 0.7;
                }`,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true,
        })
    );
    scene.add(atmosphere);

    /* ---- Stars ---- */
    const starPos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 200;
        starPos[i * 3 + 1] = (Math.random() - 0.5) * 200;
        starPos[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.6 }));
    scene.add(stars);

    /* ---- City Markers ---- */
    const cities = [
        { name: 'Shanghai', lat: 31.2, lng: 121.5 },
        { name: 'Singapore', lat: 1.3, lng: 103.8 },
        { name: 'Rotterdam', lat: 51.9, lng: 4.5 },
        { name: 'Dubai', lat: 25.3, lng: 55.3 },
        { name: 'Mumbai', lat: 19.0, lng: 72.9 },
        { name: 'Los Angeles', lat: 34.0, lng: -118.2 },
        { name: 'New York', lat: 40.7, lng: -74.0 },
        { name: 'Santos', lat: -23.9, lng: -46.3 },
        { name: 'Tokyo', lat: 35.7, lng: 139.7 },
        { name: 'Hamburg', lat: 53.5, lng: 10.0 },
        { name: 'Hong Kong', lat: 22.3, lng: 114.2 },
        { name: 'Busan', lat: 35.1, lng: 129.0 },
        { name: 'Cape Town', lat: -33.9, lng: 18.4 },
        { name: 'Sydney', lat: -33.9, lng: 151.2 },
        { name: 'London', lat: 51.5, lng: -0.1 },
        { name: 'Jeddah', lat: 21.5, lng: 39.2 },
        { name: 'Lagos', lat: 6.5, lng: 3.4 },
        { name: 'Vancouver', lat: 49.3, lng: -123.1 },
    ];

    const cityDotGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const cityDotMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
    const cityGlowGeo = new THREE.SphereGeometry(0.24, 8, 8);
    const cityGlowMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.3 });

    cities.forEach(city => {
        const pos = latLngToVec3(city.lat, city.lng, GLOBE_RADIUS + 0.02);
        const dot = new THREE.Mesh(cityDotGeo, cityDotMat);
        dot.position.copy(pos);
        globe.add(dot);

        if (!SKIP_GLOW) {
            const glow = new THREE.Mesh(cityGlowGeo, cityGlowMat);
            glow.position.copy(pos);
            globe.add(glow);
        }
    });

    /* ---- Trade Route Arcs ---- */
    const routes = [
        { from: 'Shanghai', to: 'Rotterdam', color: 0x00d4ff },
        { from: 'Shanghai', to: 'Los Angeles', color: 0x00f5d4 },
        { from: 'Singapore', to: 'Dubai', color: 0x4d8bff },
        { from: 'Mumbai', to: 'Rotterdam', color: 0xa855f7 },
        { from: 'Dubai', to: 'New York', color: 0xffd700 },
        { from: 'Santos', to: 'Hamburg', color: 0xff8c42 },
        { from: 'Tokyo', to: 'Los Angeles', color: 0x00f5d4 },
        { from: 'Hong Kong', to: 'Rotterdam', color: 0x00d4ff },
        { from: 'Singapore', to: 'Cape Town', color: 0x4d8bff },
        { from: 'Sydney', to: 'Singapore', color: 0xa855f7 },
        { from: 'London', to: 'New York', color: 0xffd700 },
        { from: 'Lagos', to: 'Santos', color: 0xff8c42 },
    ];

    function getCityByName(n) { return cities.find(c => c.name === n); }

    function createArc(fc, tc, color) {
        const start = latLngToVec3(fc.lat, fc.lng, GLOBE_RADIUS);
        const end = latLngToVec3(tc.lat, tc.lng, GLOBE_RADIUS);
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        mid.normalize().multiplyScalar(GLOBE_RADIUS + start.distanceTo(end) * 0.4);

        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(curve.getPoints(ARC_SEGMENTS)),
            new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })
        );
        globe.add(line);
        return { curve, color };
    }

    const arcs = routes.map(r => {
        const f = getCityByName(r.from), t = getCityByName(r.to);
        return f && t ? createArc(f, t, r.color) : null;
    }).filter(Boolean);

    /* ---- Traveling Particles on Arcs ---- */
    const travelParticles = [];
    const travelGeo = new THREE.SphereGeometry(0.04, 6, 6);

    arcs.forEach(arc => {
        const mat = new THREE.MeshBasicMaterial({ color: arc.color, transparent: true, opacity: 0.9 });
        const particle = new THREE.Mesh(travelGeo, mat);
        globe.add(particle);

        let glow = null;
        if (!SKIP_GLOW) {
            glow = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 6, 6),
                new THREE.MeshBasicMaterial({ color: arc.color, transparent: true, opacity: 0.25 })
            );
            globe.add(glow);
        }

        travelParticles.push({
            particle, glow,
            curve: arc.curve,
            offset: Math.random(),
            speed: 0.08 + Math.random() * 0.06,
        });
    });

    /* ---- Mouse / Touch Interaction ---- */
    let isDragging = false;
    let prevX = 0, prevY = 0;
    let targetRotX = 0.3, targetRotY = 0;
    let autoRotateSpeed = 0.002;
    let mouseInfluence = { x: 0, y: 0 };

    container.addEventListener('mousedown', e => {
        isDragging = true; prevX = e.clientX; prevY = e.clientY; autoRotateSpeed = 0;
    });
    window.addEventListener('mousemove', e => {
        if (isDragging) {
            targetRotY += (e.clientX - prevX) * 0.005;
            targetRotX = Math.max(-1.2, Math.min(1.2, targetRotX + (e.clientY - prevY) * 0.005));
            prevX = e.clientX; prevY = e.clientY;
        } else {
            mouseInfluence.x = (e.clientX / window.innerWidth - 0.5) * 0.3;
            mouseInfluence.y = (e.clientY / window.innerHeight - 0.5) * 0.3;
        }
    });
    window.addEventListener('mouseup', () => { isDragging = false; autoRotateSpeed = 0.002; });

    /* Touch — two-finger rotate only on mobile so single-finger scrolls page */
    container.addEventListener('touchstart', e => {
        if (e.touches.length >= 2) {
            isDragging = true;
            prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
            autoRotateSpeed = 0;
        }
    }, { passive: true });
    container.addEventListener('touchmove', e => {
        if (isDragging && e.touches.length >= 2) {
            targetRotY += (e.touches[0].clientX - prevX) * 0.005;
            targetRotX = Math.max(-1.2, Math.min(1.2, targetRotX + (e.touches[0].clientY - prevY) * 0.005));
            prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
        }
    }, { passive: true });
    container.addEventListener('touchend', () => { isDragging = false; autoRotateSpeed = 0.002; });

    /* ---- Visibility Observer — pause when off-screen ---- */
    let isVisible = true;
    const visObs = new IntersectionObserver(([entry]) => { isVisible = entry.isIntersecting; }, { threshold: 0.05 });
    visObs.observe(container);

    /* ---- Reduced Motion ---- */
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) autoRotateSpeed = 0;

    /* ---- Animation Loop ---- */
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        if (!isVisible) return;

        const elapsed = clock.getElapsedTime();

        targetRotY += autoRotateSpeed;
        globe.rotation.x += (targetRotX + mouseInfluence.y - globe.rotation.x) * 0.05;
        globe.rotation.y += (targetRotY + mouseInfluence.x - globe.rotation.y) * 0.05;

        if (!prefersReduced) {
            travelParticles.forEach(tp => {
                const t = (elapsed * tp.speed + tp.offset) % 1;
                const pos = tp.curve.getPoint(t);
                tp.particle.position.copy(pos);
                tp.particle.material.opacity = Math.sin(t * Math.PI) * 0.9;
                if (tp.glow) {
                    tp.glow.position.copy(pos);
                    tp.glow.material.opacity = Math.sin(t * Math.PI) * 0.25;
                }
            });
            stars.rotation.y += 0.0001;
            stars.rotation.x += 0.00005;
        }

        renderer.render(scene, camera);
    }

    animate();

    /* ---- Debounced Resize ---- */
    let resizeTimer;
    function onResize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;
        camera.aspect = w / h;
        camera.position.z = getCameraZ();
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(onResize, 150);
    });

    setTimeout(onResize, 100);

    /* ---- Signal readiness to preloader ---- */
    window.__globeReady = true;

})();
