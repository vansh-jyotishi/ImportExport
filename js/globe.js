/* ================================================
   TradeFlow — Interactive 3D Globe (Three.js)
   NASA-smooth interaction with inertia.
   Natural earth texture: light land, dark ocean.
   ================================================ */

(function () {
    'use strict';

    const container = document.getElementById('globeContainer');
    if (!container) return;

    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    const isLowEnd = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : isMobile;

    function isWebGLAvailable() {
        try {
            const c = document.createElement('canvas');
            return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
        } catch (e) { return false; }
    }

    if (typeof THREE === 'undefined' || !isWebGLAvailable()) {
        container.innerHTML = '<div class="globe-fallback"><i class="fas fa-globe-americas"></i><p>Interactive Globe</p></div>';
        return;
    }

    const GLOBE_RADIUS = 5;
    const SEGMENTS = isMobile ? 48 : isTablet ? 56 : 64;
    const STAR_COUNT = isMobile ? 400 : isTablet ? 800 : 1500;
    const TEX_SIZE = isMobile ? 1024 : 2048;
    const ARC_SEGMENTS = isMobile ? 32 : 64;
    const SKIP_GLOW = isMobile || isLowEnd;
    const MAX_DPR = isMobile ? 1.5 : 2;

    /* ---- Scene ---- */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);

    function isBackgroundMode() { return window.innerWidth <= 1024; }
    function getCameraZ() {
        if (isBackgroundMode()) return 12;
        const w = container.clientWidth;
        return w < 600 ? 18 : w < 900 ? 16 : 14;
    }
    camera.position.z = getCameraZ();

    let renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch (e) { container.innerHTML = '<div class="globe-fallback"><i class="fas fa-globe-americas"></i><p>Interactive Globe</p></div>'; return; }
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));

    const fb = document.getElementById('globeFallback');
    if (fb) fb.remove();
    container.appendChild(renderer.domElement);

    /* ---- Lighting (key + fill + rim for depth) ---- */
    scene.add(new THREE.AmbientLight(0x556688, 1.0));
    const keyLight = new THREE.DirectionalLight(0xddeeff, 1.2);
    keyLight.position.set(5, 3, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x445566, 0.4);
    fillLight.position.set(-4, -1, -3);
    scene.add(fillLight);

    /* ================================================
       LAND DATA
       ================================================ */
    function isWater(lat, lng) {
        if (lat > 51 && lat < 63 && lng > -95 && lng < -78) return true;
        if (lat > 41 && lat < 49 && lng > -92 && lng < -76) return true;
        if (lat > 46 && lat < 52 && lng > -68 && lng < -56) return true;
        if (lat > 10 && lat < 22 && lng > -86 && lng < -60) return true;
        if (lat > 18 && lat < 30 && lng > -98 && lng < -82) return true;
        if (lat > 35 && lat < 42 && lng > -1 && lng < 12) return true;
        if (lat > 31 && lat < 41 && lng > 12 && lng < 36) return true;
        if (lat > 41 && lat < 47 && lng > 27 && lng < 42) return true;
        if (lat > 37 && lat < 47 && lng > 47 && lng < 54) return true;
        if (lat > 54 && lat < 66 && lng > 12 && lng < 30) return true;
        if (lat > 12 && lat < 28 && lng > 32 && lng < 44) return true;
        if (lat > 24 && lat < 30 && lng > 48 && lng < 56) return true;
        if (lat > 6 && lat < 22 && lng > 80 && lng < 94) return true;
        if (lat > 3 && lat < 22 && lng > 106 && lng < 120) return true;
        if (lat > 34 && lat < 52 && lng > 128 && lng < 140) return true;
        if (lat > 43 && lat < 47 && lng > 58 && lng < 62) return true;
        return false;
    }

    function isLand(lat, lng) {
        if (lat > 55 && lat < 72 && lng > -170 && lng < -140) return !isWater(lat, lng);
        if (lat > 60 && lat < 84 && lng > -140 && lng < -60) return !isWater(lat, lng);
        if (lat > 48 && lat < 60 && lng > -140 && lng < -52) return !isWater(lat, lng);
        if (lat > 42 && lat < 49 && lng > -125 && lng < -67) return !isWater(lat, lng);
        if (lat > 30 && lat < 42 && lng > -124 && lng < -75) return !isWater(lat, lng);
        if (lat > 25 && lat < 35 && lng > -106 && lng < -75) return !isWater(lat, lng);
        if (lat > 24 && lat < 31 && lng > -88 && lng < -80) return true;
        if (lat > 22 && lat < 33 && lng > -118 && lng < -109) return true;
        if (lat > 14 && lat < 30 && lng > -108 && lng < -86) return !isWater(lat, lng);
        if (lat > 7 && lat < 18 && lng > -92 && lng < -77) return true;
        if (lat > 19.5 && lat < 23.5 && lng > -85 && lng < -74) return true;
        if (lat > 18 && lat < 20.5 && lng > -75 && lng < -68) return true;
        if (lat > 59 && lat < 84 && lng > -58 && lng < -12) return true;
        if (lat > 63 && lat < 67 && lng > -25 && lng < -13) return true;
        if (lat > 0 && lat < 12 && lng > -80 && lng < -59) return true;
        if (lat > 1 && lat < 9 && lng > -62 && lng < -50) return true;
        if (lat > -5 && lat < 2 && lng > -74 && lng < -35) return true;
        if (lat > -15 && lat < -2 && lng > -55 && lng < -34) return true;
        if (lat > -15 && lat < -2 && lng > -74 && lng < -55) return true;
        if (lat > -18 && lat < 0 && lng > -82 && lng < -58) return true;
        if (lat > -25 && lat < -15 && lng > -58 && lng < -38) return true;
        if (lat > -35 && lat < -20 && lng > -63 && lng < -48) return true;
        if (lat > -30 && lat < -18 && lng > -72 && lng < -58) return true;
        if (lat > -42 && lat < -30 && lng > -73 && lng < -58) return true;
        if (lat > -52 && lat < -42 && lng > -76 && lng < -63) return true;
        if (lat > -56 && lat < -52 && lng > -72 && lng < -65) return true;
        if (lat > 36 && lat < 44 && lng > -10 && lng < 4) return !isWater(lat, lng);
        if (lat > 42 && lat < 51 && lng > -5 && lng < 8) return !isWater(lat, lng);
        if (lat > 50 && lat < 59 && lng > -8 && lng < 2) return true;
        if (lat > 51 && lat < 55.5 && lng > -11 && lng < -6) return true;
        if (lat > 47 && lat < 55 && lng > 3 && lng < 15) return !isWater(lat, lng);
        if (lat > 49 && lat < 55 && lng > 14 && lng < 24) return !isWater(lat, lng);
        if (lat > 36 && lat < 47 && lng > 6 && lng < 19) return !isWater(lat, lng);
        if (lat > 38 && lat < 46 && lng > 13 && lng < 30) return !isWater(lat, lng);
        if (lat > 35 && lat < 42 && lng > 19 && lng < 30) return !isWater(lat, lng);
        if (lat > 43 && lat < 52 && lng > 22 && lng < 40) return !isWater(lat, lng);
        if (lat > 55 && lat < 72 && lng > 4 && lng < 32) return !isWater(lat, lng);
        if (lat > 59 && lat < 70 && lng > 20 && lng < 32) return !isWater(lat, lng);
        if (lat > 50 && lat < 72 && lng > 30 && lng < 60) return !isWater(lat, lng);
        if (lat > 50 && lat < 75 && lng > 60 && lng < 120) return true;
        if (lat > 45 && lat < 72 && lng > 120 && lng < 180) return true;
        if (lat > 50 && lat < 62 && lng > 155 && lng < 165) return true;
        if (lat > 27 && lat < 37 && lng > -13 && lng < 12) return true;
        if (lat > 25 && lat < 38 && lng > 7 && lng < 25) return !isWater(lat, lng);
        if (lat > 22 && lat < 32 && lng > 24 && lng < 37) return !isWater(lat, lng);
        if (lat > 14 && lat < 27 && lng > -17 && lng < 15) return true;
        if (lat > 8 && lat < 24 && lng > 15 && lng < 38) return !isWater(lat, lng);
        if (lat > 4 && lat < 14 && lng > -17 && lng < 16) return true;
        if (lat > -6 && lat < 8 && lng > 8 && lng < 32) return true;
        if (lat > 0 && lat < 15 && lng > 32 && lng < 51) return !isWater(lat, lng);
        if (lat > -12 && lat < 5 && lng > 28 && lng < 42) return true;
        if (lat > -35 && lat < -12 && lng > 12 && lng < 41) return true;
        if (lat > -26 && lat < -12 && lng > 43 && lng < 50) return true;
        if (lat > 36 && lat < 42 && lng > 26 && lng < 45) return !isWater(lat, lng);
        if (lat > 30 && lat < 38 && lng > 35 && lng < 48) return true;
        if (lat > 16 && lat < 32 && lng > 36 && lng < 56) return !isWater(lat, lng);
        if (lat > 12 && lat < 24 && lng > 42 && lng < 60) return !isWater(lat, lng);
        if (lat > 25 && lat < 40 && lng > 44 && lng < 64) return !isWater(lat, lng);
        if (lat > 24 && lat < 38 && lng > 60 && lng < 75) return true;
        if (lat > 20 && lat < 35 && lng > 68 && lng < 90) return !isWater(lat, lng);
        if (lat > 8 && lat < 20 && lng > 72 && lng < 88) return !isWater(lat, lng);
        if (lat > 5.5 && lat < 10 && lng > 79 && lng < 82) return true;
        if (lat > 26 && lat < 29 && lng > 80 && lng < 92) return true;
        if (lat > 20 && lat < 27 && lng > 88 && lng < 93) return true;
        if (lat > 10 && lat < 28 && lng > 92 && lng < 101) return true;
        if (lat > 35 && lat < 50 && lng > 50 && lng < 80) return !isWater(lat, lng);
        if (lat > 42 && lat < 52 && lng > 88 && lng < 120) return true;
        if (lat > 22 && lat < 42 && lng > 100 && lng < 123) return true;
        if (lat > 28 && lat < 45 && lng > 75 && lng < 100) return true;
        if (lat > 27 && lat < 37 && lng > 78 && lng < 100) return true;
        if (lat > 40 && lat < 54 && lng > 119 && lng < 135) return true;
        if (lat > 34 && lat < 43 && lng > 124 && lng < 130) return true;
        if (lat > 33 && lat < 42 && lng > 130 && lng < 142) return true;
        if (lat > 41 && lat < 46 && lng > 139 && lng < 146) return true;
        if (lat > 31 && lat < 34 && lng > 129 && lng < 132) return true;
        if (lat > 22 && lat < 26 && lng > 120 && lng < 122) return true;
        if (lat > 5 && lat < 21 && lng > 97 && lng < 106) return true;
        if (lat > 8 && lat < 23 && lng > 102 && lng < 110) return true;
        if (lat > 10 && lat < 23 && lng > 100 && lng < 108) return true;
        if (lat > 1 && lat < 8 && lng > 99 && lng < 105) return true;
        if (lat > -6 && lat < 6 && lng > 95 && lng < 106) return true;
        if (lat > -4 && lat < 7 && lng > 108 && lng < 119) return true;
        if (lat > -9 && lat < -5 && lng > 105 && lng < 115) return true;
        if (lat > -6 && lat < 2 && lng > 119 && lng < 126) return true;
        if (lat > 5 && lat < 19 && lng > 117 && lng < 127) return true;
        if (lat > -9 && lat < 0 && lng > 130 && lng < 150) return true;
        if (lat > -35 && lat < -14 && lng > 114 && lng < 130) return true;
        if (lat > -38 && lat < -12 && lng > 130 && lng < 154) return true;
        if (lat > -44 && lat < -40 && lng > 144 && lng < 149) return true;
        if (lat > -42 && lat < -34 && lng > 172 && lng < 178) return true;
        if (lat > -47 && lat < -42 && lng > 166 && lng < 174) return true;
        return false;
    }

    /* ================================================
       GLOBE TEXTURE — smooth land via low-res + blur + upscale
       Renders land at small resolution, blurs heavily, then
       upscales with bilinear interpolation for smooth coastlines.
       ================================================ */
    function createGlobeTexture() {
        const W = TEX_SIZE, H = TEX_SIZE / 2;

        /* --- Step 1: Paint land on small work canvas --- */
        const sW = 720, sH = 360;
        const work = document.createElement('canvas');
        work.width = sW; work.height = sH;
        const wCtx = work.getContext('2d');

        /* Black background (transparent ocean) */
        wCtx.clearRect(0, 0, sW, sH);

        const imgData = wCtx.createImageData(sW, sH);
        const d = imgData.data;
        for (let py = 0; py < sH; py++) {
            const lat = 90 - (py / sH) * 180;
            for (let px = 0; px < sW; px++) {
                const lng = (px / sW) * 360 - 180;
                if (isLand(lat, lng)) {
                    const idx = (py * sW + px) * 4;
                    d[idx]     = 38 + ((px * 7 + py * 13) % 15);
                    d[idx + 1] = 110 + ((px * 11 + py * 3) % 25);
                    d[idx + 2] = 85 + ((px * 5 + py * 9) % 18);
                    d[idx + 3] = 255;
                }
            }
        }
        wCtx.putImageData(imgData, 0, 0);

        /* --- Step 2: Heavy blur on small canvas (smooths all edges) --- */
        const blurred = document.createElement('canvas');
        blurred.width = sW; blurred.height = sH;
        const bCtx = blurred.getContext('2d');
        bCtx.filter = 'blur(4px)';
        bCtx.drawImage(work, 0, 0);

        /* --- Step 3: Coastline glow on small canvas --- */
        const edge = document.createElement('canvas');
        edge.width = sW; edge.height = sH;
        const eCtx = edge.getContext('2d');
        eCtx.fillStyle = 'rgba(0, 210, 255, 0.5)';
        for (let py = 1; py < sH - 1; py++) {
            const lat = 90 - (py / sH) * 180;
            for (let px = 1; px < sW - 1; px++) {
                const lng = (px / sW) * 360 - 180;
                if (isLand(lat, lng)) {
                    const latStep = 180 / sH, lngStep = 360 / sW;
                    if (!isLand(lat + latStep, lng) || !isLand(lat - latStep, lng) ||
                        !isLand(lat, lng + lngStep) || !isLand(lat, lng - lngStep)) {
                        eCtx.fillRect(px, py, 1, 1);
                    }
                }
            }
        }
        const edgeBlur = document.createElement('canvas');
        edgeBlur.width = sW; edgeBlur.height = sH;
        const ebCtx = edgeBlur.getContext('2d');
        ebCtx.filter = 'blur(3px)';
        ebCtx.drawImage(edge, 0, 0);

        /* --- Step 4: Composite onto final high-res canvas --- */
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');

        /* Ocean */
        const oceanGrad = ctx.createRadialGradient(W * 0.4, H * 0.4, 0, W / 2, H / 2, W * 0.7);
        oceanGrad.addColorStop(0, '#0c1e30');
        oceanGrad.addColorStop(1, '#060e1c');
        ctx.fillStyle = oceanGrad;
        ctx.fillRect(0, 0, W, H);

        /* Upscale blurred land — browser bilinear interpolation adds extra smoothing */
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(blurred, 0, 0, W, H);

        /* Upscale edge glow */
        ctx.drawImage(edgeBlur, 0, 0, W, H);

        /* Subtle grid lines */
        ctx.strokeStyle = 'rgba(80, 160, 220, 0.018)';
        ctx.lineWidth = 0.8;
        for (let lat = -80; lat <= 80; lat += 30) {
            const y = ((90 - lat) / 180) * H;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }
        for (let lng = -180; lng < 180; lng += 30) {
            const x = ((lng + 180) / 360) * W;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    function latLngToVec3(lat, lng, r) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        return new THREE.Vector3(
            -r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(theta)
        );
    }

    /* ---- Globe ---- */
    const globe = new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_RADIUS, SEGMENTS, SEGMENTS),
        new THREE.MeshPhongMaterial({
            map: createGlobeTexture(),
            shininess: 25,
            specular: new THREE.Color(0x112233),
        })
    );
    scene.add(globe);

    /* ---- Atmosphere ---- */
    scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_RADIUS * 1.06, SEGMENTS, SEGMENTS),
        new THREE.ShaderMaterial({
            vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
            fragmentShader: `varying vec3 vN; void main(){ float i = pow(0.6 - dot(vN, vec3(0,0,1)), 2.0); gl_FragColor = vec4(0.2, 0.6, 1.0, 1.0) * i * 0.5; }`,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true,
        })
    ));

    /* ---- Stars ---- */
    const sp = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) { sp[i*3]=(Math.random()-0.5)*200; sp[i*3+1]=(Math.random()-0.5)*200; sp[i*3+2]=(Math.random()-0.5)*200; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.6 }));
    scene.add(stars);

    /* ---- City Markers ---- */
    const cities = [
        { name:'Shanghai', lat:31.2, lng:121.5 }, { name:'Singapore', lat:1.3, lng:103.8 },
        { name:'Rotterdam', lat:51.9, lng:4.5 }, { name:'Dubai', lat:25.3, lng:55.3 },
        { name:'Mumbai', lat:19.0, lng:72.9 }, { name:'Los Angeles', lat:34.0, lng:-118.2 },
        { name:'New York', lat:40.7, lng:-74.0 }, { name:'Santos', lat:-23.9, lng:-46.3 },
        { name:'Tokyo', lat:35.7, lng:139.7 }, { name:'Hamburg', lat:53.5, lng:10.0 },
        { name:'Hong Kong', lat:22.3, lng:114.2 }, { name:'Busan', lat:35.1, lng:129.0 },
        { name:'Cape Town', lat:-33.9, lng:18.4 }, { name:'Sydney', lat:-33.9, lng:151.2 },
        { name:'London', lat:51.5, lng:-0.1 }, { name:'Jeddah', lat:21.5, lng:39.2 },
        { name:'Lagos', lat:6.5, lng:3.4 }, { name:'Vancouver', lat:49.3, lng:-123.1 },
    ];
    const cdGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const cdMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
    const cgGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const cgMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.25 });
    cities.forEach(c => {
        const p = latLngToVec3(c.lat, c.lng, GLOBE_RADIUS + 0.02);
        const d = new THREE.Mesh(cdGeo, cdMat); d.position.copy(p); globe.add(d);
        if (!SKIP_GLOW) { const g = new THREE.Mesh(cgGeo, cgMat); g.position.copy(p); globe.add(g); }
    });

    /* ---- Trade Route Arcs ---- */
    const routes = [
        { from:'Shanghai', to:'Rotterdam', color:0x00d4ff }, { from:'Shanghai', to:'Los Angeles', color:0x00f5d4 },
        { from:'Singapore', to:'Dubai', color:0x4d8bff }, { from:'Mumbai', to:'Rotterdam', color:0xa855f7 },
        { from:'Dubai', to:'New York', color:0xffd700 }, { from:'Santos', to:'Hamburg', color:0xff8c42 },
        { from:'Tokyo', to:'Los Angeles', color:0x00f5d4 }, { from:'Hong Kong', to:'Rotterdam', color:0x00d4ff },
        { from:'Singapore', to:'Cape Town', color:0x4d8bff }, { from:'Sydney', to:'Singapore', color:0xa855f7 },
        { from:'London', to:'New York', color:0xffd700 }, { from:'Lagos', to:'Santos', color:0xff8c42 },
    ];
    function city(n) { return cities.find(c => c.name === n); }
    const arcs = routes.map(r => {
        const f = city(r.from), t = city(r.to); if (!f || !t) return null;
        const s = latLngToVec3(f.lat, f.lng, GLOBE_RADIUS), e = latLngToVec3(t.lat, t.lng, GLOBE_RADIUS);
        const m = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
        m.normalize().multiplyScalar(GLOBE_RADIUS + s.distanceTo(e) * 0.4);
        const curve = new THREE.QuadraticBezierCurve3(s, m, e);
        globe.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(curve.getPoints(ARC_SEGMENTS)),
            new THREE.LineBasicMaterial({ color: r.color, transparent: true, opacity: 0.45 })
        ));
        return { curve, color: r.color };
    }).filter(Boolean);

    /* ---- Traveling Particles ---- */
    const particles = [];
    const pGeo = new THREE.SphereGeometry(0.04, 6, 6);
    arcs.forEach(a => {
        const mat = new THREE.MeshBasicMaterial({ color: a.color, transparent: true, opacity: 0.9 });
        const p = new THREE.Mesh(pGeo, mat); globe.add(p);
        let g = null;
        if (!SKIP_GLOW) {
            g = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6),
                new THREE.MeshBasicMaterial({ color: a.color, transparent: true, opacity: 0.2 }));
            globe.add(g);
        }
        particles.push({ p, g, curve: a.curve, off: Math.random(), spd: 0.08 + Math.random() * 0.06 });
    });

    /* ================================================
       SMOOTH INTERACTION — inertia / momentum
       ================================================ */
    let isDragging = false;
    let prevX = 0, prevY = 0;
    let rotX = 0.3, rotY = 0;
    let velX = 0, velY = 0;
    let autoSpeed = 0.002;
    const DAMPING = 0.95;
    const SENSITIVITY = 0.004;
    const LERP = 0.08;

    container.addEventListener('mousedown', e => {
        isDragging = true; prevX = e.clientX; prevY = e.clientY;
        velX = 0; velY = 0; autoSpeed = 0;
        container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const dx = e.clientX - prevX, dy = e.clientY - prevY;
        velY = dx * SENSITIVITY;
        velX = dy * SENSITIVITY;
        rotY += velY;
        rotX = Math.max(-1.5, Math.min(1.5, rotX + velX));
        prevX = e.clientX; prevY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        container.style.cursor = 'grab';
        /* momentum continues via velX/velY in animate loop */
        setTimeout(() => { if (!isDragging) autoSpeed = 0.002; }, 3000);
    });

    /* Touch — single finger on all devices */
    container.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
            isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
            velX = 0; velY = 0; autoSpeed = 0;
        }
    }, { passive: true });
    container.addEventListener('touchmove', e => {
        if (!isDragging || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - prevX, dy = e.touches[0].clientY - prevY;
        velY = dx * SENSITIVITY;
        velX = dy * SENSITIVITY;
        rotY += velY;
        rotX = Math.max(-1.5, Math.min(1.5, rotX + velX));
        prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
    }, { passive: true });
    container.addEventListener('touchend', () => {
        isDragging = false;
        setTimeout(() => { if (!isDragging) autoSpeed = 0.002; }, 3000);
    });

    container.style.cursor = 'grab';

    /* ---- Visibility ---- */
    let isVisible = true;
    const visObs = new IntersectionObserver(([e]) => { isVisible = e.isIntersecting; }, { threshold: 0.05 });
    visObs.observe(container);

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) autoSpeed = 0;

    /* ---- Animation Loop ---- */
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        if (!isVisible) return;

        const t = clock.getElapsedTime();

        /* Apply momentum decay when not dragging */
        if (!isDragging) {
            velX *= DAMPING;
            velY *= DAMPING;
            rotY += velY;
            rotX = Math.max(-1.5, Math.min(1.5, rotX + velX));
        }

        /* Auto rotation (adds to current velocity direction) */
        rotY += autoSpeed;

        /* Smooth interpolation to target rotation */
        globe.rotation.x += (rotX - globe.rotation.x) * LERP;
        globe.rotation.y += (rotY - globe.rotation.y) * LERP;

        if (!prefersReduced) {
            particles.forEach(tp => {
                const pt = (t * tp.spd + tp.off) % 1;
                const pos = tp.curve.getPoint(pt);
                tp.p.position.copy(pos);
                tp.p.material.opacity = Math.sin(pt * Math.PI) * 0.9;
                if (tp.g) { tp.g.position.copy(pos); tp.g.material.opacity = Math.sin(pt * Math.PI) * 0.2; }
            });
            stars.rotation.y += 0.0001;
        }

        renderer.render(scene, camera);
    }
    animate();

    /* ---- Resize ---- */
    let rt;
    function onResize() {
        const w = container.clientWidth, h = container.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.position.z = getCameraZ();
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(onResize, 150); });
    setTimeout(onResize, 100);

    window.__globeReady = true;
})();
