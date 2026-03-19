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
    const ARC_SEGMENTS = isMobile ? 32 : 64;
    const SKIP_GLOW = isMobile || isLowEnd;
    const MAX_DPR = isMobile ? 1.5 : 2;

    /* ---- Scene, Camera, Renderer ---- */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);

    function isBackgroundMode() {
        return window.innerWidth <= 1024;
    }

    function getCameraZ() {
        if (isBackgroundMode()) return 12;
        const w = container.clientWidth;
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

    /* ---- Detailed land check with water exclusions ---- */
    function isWater(lat, lng) {
        /* Hudson Bay */ if (lat > 51 && lat < 63 && lng > -95 && lng < -78) return true;
        /* Great Lakes */ if (lat > 41 && lat < 49 && lng > -92 && lng < -76) return true;
        /* Gulf of St Lawrence */ if (lat > 46 && lat < 52 && lng > -68 && lng < -56) return true;
        /* Caribbean Sea core */ if (lat > 10 && lat < 22 && lng > -86 && lng < -60) return true;
        /* Gulf of Mexico */ if (lat > 18 && lat < 30 && lng > -98 && lng < -82) return true;
        /* Mediterranean W */ if (lat > 35 && lat < 42 && lng > -1 && lng < 12) return true;
        /* Mediterranean E */ if (lat > 31 && lat < 41 && lng > 12 && lng < 36) return true;
        /* Black Sea */ if (lat > 41 && lat < 47 && lng > 27 && lng < 42) return true;
        /* Caspian Sea */ if (lat > 37 && lat < 47 && lng > 47 && lng < 54) return true;
        /* Baltic Sea */ if (lat > 54 && lat < 66 && lng > 12 && lng < 30) return true;
        /* Red Sea */ if (lat > 12 && lat < 28 && lng > 32 && lng < 44) return true;
        /* Persian Gulf */ if (lat > 24 && lat < 30 && lng > 48 && lng < 56) return true;
        /* Bay of Bengal */ if (lat > 6 && lat < 22 && lng > 80 && lng < 94) return true;
        /* South China Sea */ if (lat > 3 && lat < 22 && lng > 106 && lng < 120) return true;
        /* Sea of Japan */ if (lat > 34 && lat < 52 && lng > 128 && lng < 140) return true;
        /* Aral/inland */ if (lat > 43 && lat < 47 && lng > 58 && lng < 62) return true;
        return false;
    }

    function isLand(lat, lng) {
        /* ---- NORTH AMERICA ---- */
        /* Alaska */ if (lat > 55 && lat < 72 && lng > -170 && lng < -140) return !isWater(lat, lng);
        /* Arctic Canada */ if (lat > 60 && lat < 84 && lng > -140 && lng < -60) return !isWater(lat, lng);
        /* Canada main */ if (lat > 48 && lat < 60 && lng > -140 && lng < -52) return !isWater(lat, lng);
        /* US Pacific NW */ if (lat > 42 && lat < 49 && lng > -125 && lng < -67) return !isWater(lat, lng);
        /* US main */ if (lat > 30 && lat < 42 && lng > -124 && lng < -75) return !isWater(lat, lng);
        /* US southeast taper */ if (lat > 25 && lat < 35 && lng > -106 && lng < -75) return !isWater(lat, lng);
        /* Florida */ if (lat > 24 && lat < 31 && lng > -88 && lng < -80) return true;
        /* Baja California */ if (lat > 22 && lat < 33 && lng > -118 && lng < -109) return true;
        /* Mexico */ if (lat > 14 && lat < 30 && lng > -108 && lng < -86) return !isWater(lat, lng);
        /* Central America */ if (lat > 7 && lat < 18 && lng > -92 && lng < -77) return true;
        /* Cuba */ if (lat > 19.5 && lat < 23.5 && lng > -85 && lng < -74) return true;
        /* Hispaniola */ if (lat > 18 && lat < 20.5 && lng > -75 && lng < -68) return true;
        /* Jamaica */ if (lat > 17.5 && lat < 18.6 && lng > -79 && lng < -76) return true;
        /* Greenland */ if (lat > 59 && lat < 84 && lng > -58 && lng < -12) return true;
        /* Iceland */ if (lat > 63 && lat < 67 && lng > -25 && lng < -13) return true;

        /* ---- SOUTH AMERICA ---- */
        /* Colombia/Venezuela */ if (lat > 0 && lat < 12 && lng > -80 && lng < -59) return true;
        /* Guianas */ if (lat > 1 && lat < 9 && lng > -62 && lng < -50) return true;
        /* Brazil N */ if (lat > -5 && lat < 2 && lng > -74 && lng < -35) return true;
        /* Brazil NE bulge */ if (lat > -15 && lat < -2 && lng > -55 && lng < -34) return true;
        /* Brazil W */ if (lat > -15 && lat < -2 && lng > -74 && lng < -55) return true;
        /* Peru/Bolivia */ if (lat > -18 && lat < 0 && lng > -82 && lng < -58) return true;
        /* Brazil SE */ if (lat > -25 && lat < -15 && lng > -58 && lng < -38) return true;
        /* Paraguay/Uruguay */ if (lat > -35 && lat < -20 && lng > -63 && lng < -48) return true;
        /* Chile/Arg N */ if (lat > -30 && lat < -18 && lng > -72 && lng < -58) return true;
        /* Chile/Arg mid */ if (lat > -42 && lat < -30 && lng > -73 && lng < -58) return true;
        /* Patagonia */ if (lat > -52 && lat < -42 && lng > -76 && lng < -63) return true;
        /* Tierra del Fuego */ if (lat > -56 && lat < -52 && lng > -72 && lng < -65) return true;

        /* ---- EUROPE ---- */
        /* Iberia */ if (lat > 36 && lat < 44 && lng > -10 && lng < 4) return !isWater(lat, lng);
        /* France */ if (lat > 42 && lat < 51 && lng > -5 && lng < 8) return !isWater(lat, lng);
        /* UK */ if (lat > 50 && lat < 59 && lng > -8 && lng < 2) return true;
        /* Ireland */ if (lat > 51 && lat < 55.5 && lng > -11 && lng < -6) return true;
        /* Benelux/Germany */ if (lat > 47 && lat < 55 && lng > 3 && lng < 15) return !isWater(lat, lng);
        /* Poland/Czechia */ if (lat > 49 && lat < 55 && lng > 14 && lng < 24) return !isWater(lat, lng);
        /* Italy */ if (lat > 36 && lat < 47 && lng > 6 && lng < 19) return !isWater(lat, lng);
        /* Balkans */ if (lat > 38 && lat < 46 && lng > 13 && lng < 30) return !isWater(lat, lng);
        /* Greece */ if (lat > 35 && lat < 42 && lng > 19 && lng < 30) return !isWater(lat, lng);
        /* Romania/Ukraine */ if (lat > 43 && lat < 52 && lng > 22 && lng < 40) return !isWater(lat, lng);
        /* Scandinavia */ if (lat > 55 && lat < 72 && lng > 4 && lng < 32) return !isWater(lat, lng);
        /* Finland */ if (lat > 59 && lat < 70 && lng > 20 && lng < 32) return !isWater(lat, lng);

        /* ---- RUSSIA ---- */
        /* West Russia */ if (lat > 50 && lat < 72 && lng > 30 && lng < 60) return !isWater(lat, lng);
        /* Russia mid */ if (lat > 50 && lat < 75 && lng > 60 && lng < 120) return true;
        /* Russia E */ if (lat > 45 && lat < 72 && lng > 120 && lng < 180) return true;
        /* Kamchatka */ if (lat > 50 && lat < 62 && lng > 155 && lng < 165) return true;

        /* ---- AFRICA ---- */
        /* Morocco/Algeria */ if (lat > 27 && lat < 37 && lng > -13 && lng < 12) return true;
        /* Tunisia/Libya */ if (lat > 25 && lat < 38 && lng > 7 && lng < 25) return !isWater(lat, lng);
        /* Egypt */ if (lat > 22 && lat < 32 && lng > 24 && lng < 37) return !isWater(lat, lng);
        /* Sahara W */ if (lat > 14 && lat < 27 && lng > -17 && lng < 15) return true;
        /* Sahara E/Sudan */ if (lat > 8 && lat < 24 && lng > 15 && lng < 38) return !isWater(lat, lng);
        /* W Africa coast */ if (lat > 4 && lat < 14 && lng > -17 && lng < 16) return true;
        /* Central Africa */ if (lat > -6 && lat < 8 && lng > 8 && lng < 32) return true;
        /* Horn of Africa */ if (lat > 0 && lat < 15 && lng > 32 && lng < 51) return !isWater(lat, lng);
        /* E Africa */ if (lat > -12 && lat < 5 && lng > 28 && lng < 42) return true;
        /* S Africa */ if (lat > -35 && lat < -12 && lng > 12 && lng < 41) return true;
        /* Madagascar */ if (lat > -26 && lat < -12 && lng > 43 && lng < 50) return true;

        /* ---- MIDDLE EAST ---- */
        /* Turkey */ if (lat > 36 && lat < 42 && lng > 26 && lng < 45) return !isWater(lat, lng);
        /* Syria/Iraq */ if (lat > 30 && lat < 38 && lng > 35 && lng < 48) return true;
        /* Saudi Arabia */ if (lat > 16 && lat < 32 && lng > 36 && lng < 56) return !isWater(lat, lng);
        /* Yemen/Oman */ if (lat > 12 && lat < 24 && lng > 42 && lng < 60) return !isWater(lat, lng);
        /* Iran */ if (lat > 25 && lat < 40 && lng > 44 && lng < 64) return !isWater(lat, lng);

        /* ---- SOUTH ASIA ---- */
        /* Afghanistan/Pakistan */ if (lat > 24 && lat < 38 && lng > 60 && lng < 75) return true;
        /* India N */ if (lat > 20 && lat < 35 && lng > 68 && lng < 90) return !isWater(lat, lng);
        /* India S (taper) */ if (lat > 8 && lat < 20 && lng > 72 && lng < 88) return !isWater(lat, lng);
        /* Sri Lanka */ if (lat > 5.5 && lat < 10 && lng > 79 && lng < 82) return true;
        /* Nepal/Bhutan */ if (lat > 26 && lat < 29 && lng > 80 && lng < 92) return true;
        /* Bangladesh */ if (lat > 20 && lat < 27 && lng > 88 && lng < 93) return true;
        /* Myanmar */ if (lat > 10 && lat < 28 && lng > 92 && lng < 101) return true;

        /* ---- CENTRAL/EAST ASIA ---- */
        /* Central Asia */ if (lat > 35 && lat < 50 && lng > 50 && lng < 80) return !isWater(lat, lng);
        /* Mongolia */ if (lat > 42 && lat < 52 && lng > 88 && lng < 120) return true;
        /* China E */ if (lat > 22 && lat < 42 && lng > 100 && lng < 123) return true;
        /* China W */ if (lat > 28 && lat < 45 && lng > 75 && lng < 100) return true;
        /* Tibet */ if (lat > 27 && lat < 37 && lng > 78 && lng < 100) return true;
        /* Manchuria */ if (lat > 40 && lat < 54 && lng > 119 && lng < 135) return true;

        /* ---- EAST ASIA ---- */
        /* Korean pen */ if (lat > 34 && lat < 43 && lng > 124 && lng < 130) return true;
        /* Japan Honshu */ if (lat > 33 && lat < 42 && lng > 130 && lng < 142) return true;
        /* Japan Hokkaido */ if (lat > 41 && lat < 46 && lng > 139 && lng < 146) return true;
        /* Japan Kyushu */ if (lat > 31 && lat < 34 && lng > 129 && lng < 132) return true;
        /* Taiwan */ if (lat > 22 && lat < 26 && lng > 120 && lng < 122) return true;

        /* ---- SOUTHEAST ASIA ---- */
        /* Thailand */ if (lat > 5 && lat < 21 && lng > 97 && lng < 106) return true;
        /* Vietnam */ if (lat > 8 && lat < 23 && lng > 102 && lng < 110) return true;
        /* Laos/Cambodia */ if (lat > 10 && lat < 23 && lng > 100 && lng < 108) return true;
        /* Malaysia pen */ if (lat > 1 && lat < 8 && lng > 99 && lng < 105) return true;
        /* Sumatra */ if (lat > -6 && lat < 6 && lng > 95 && lng < 106) return true;
        /* Borneo */ if (lat > -4 && lat < 7 && lng > 108 && lng < 119) return true;
        /* Java */ if (lat > -9 && lat < -5 && lng > 105 && lng < 115) return true;
        /* Sulawesi */ if (lat > -6 && lat < 2 && lng > 119 && lng < 126) return true;
        /* Philippines */ if (lat > 5 && lat < 19 && lng > 117 && lng < 127) return true;
        /* Papua */ if (lat > -9 && lat < 0 && lng > 130 && lng < 150) return true;

        /* ---- OCEANIA ---- */
        /* Australia W */ if (lat > -35 && lat < -14 && lng > 114 && lng < 130) return true;
        /* Australia E */ if (lat > -38 && lat < -12 && lng > 130 && lng < 154) return true;
        /* Tasmania */ if (lat > -44 && lat < -40 && lng > 144 && lng < 149) return true;
        /* NZ North */ if (lat > -42 && lat < -34 && lng > 172 && lng < 178) return true;
        /* NZ South */ if (lat > -47 && lat < -42 && lng > 166 && lng < 174) return true;

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

    /* ---- Globe Texture (Canvas) — filled landmasses ---- */
    function createGlobeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = TEX_W;
        canvas.height = TEX_H;
        const ctx = canvas.getContext('2d');

        /* Ocean background */
        const grad = ctx.createLinearGradient(0, 0, 0, TEX_H);
        grad.addColorStop(0, '#071220');
        grad.addColorStop(0.5, '#06101c');
        grad.addColorStop(1, '#071220');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, TEX_W, TEX_H);

        /* Subtle grid lines */
        ctx.strokeStyle = 'rgba(0, 180, 255, 0.025)';
        ctx.lineWidth = 0.5;
        for (let lat = -80; lat <= 80; lat += 20) {
            const y = ((90 - lat) / 180) * TEX_H;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TEX_W, y); ctx.stroke();
        }
        for (let lng = -180; lng < 180; lng += 20) {
            const x = ((lng + 180) / 360) * TEX_W;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, TEX_H); ctx.stroke();
        }

        /* Render filled landmasses at 1-degree resolution */
        const step = 1;
        const cellW = (TEX_W / 360) * step + 0.5;
        const cellH = (TEX_H / 180) * step + 0.5;

        /* Land fill */
        ctx.fillStyle = 'rgba(0, 190, 255, 0.30)';
        for (let lat = -90; lat <= 90; lat += step) {
            for (let lng = -180; lng < 180; lng += step) {
                if (isLand(lat, lng)) {
                    const x = ((lng + 180) / 360) * TEX_W;
                    const y = ((90 - lat) / 180) * TEX_H;
                    ctx.fillRect(x, y, cellW, cellH);
                }
            }
        }

        /* Bright coastline edge — render land borders for definition */
        ctx.fillStyle = 'rgba(0, 220, 255, 0.55)';
        for (let lat = -90; lat <= 90; lat += step) {
            for (let lng = -180; lng < 180; lng += step) {
                if (isLand(lat, lng)) {
                    const hasWaterNeighbor =
                        !isLand(lat + step, lng) || !isLand(lat - step, lng) ||
                        !isLand(lat, lng + step) || !isLand(lat, lng - step);
                    if (hasWaterNeighbor) {
                        const x = ((lng + 180) / 360) * TEX_W;
                        const y = ((90 - lat) / 180) * TEX_H;
                        ctx.fillRect(x, y, cellW, cellH);
                    }
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
