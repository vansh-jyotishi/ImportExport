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

    /* ---- Lighting — soft, directional, Azure-style ---- */
    scene.add(new THREE.AmbientLight(0x223344, 1.5));
    const keyLight = new THREE.DirectionalLight(0x8899bb, 1.0);
    keyLight.position.set(5, 3, 4);
    scene.add(keyLight);

    /* ================================================
       COASTLINE POLYGONS — real continent outlines
       drawn as smooth bezier curves on canvas.
       Each array = [lng, lat] pairs tracing coastline.
       Overlapping regions merge when filled.
       ================================================ */
    const P = [
        /* Africa */
        [[-17,15],[-17,21],[-13,28],[-6,36],[-2,35],[3,37],[10,37],[11,33],[15,32],[20,32],[25,32],[30,31],[33,30],[35,27],[37,22],[40,16],[43,12],[46,8],[50,12],[49,5],[44,-1],[40,-6],[36,-11],[35,-17],[36,-24],[33,-28],[28,-33],[18,-35],[15,-29],[12,-17],[12,-6],[9,1],[9,5],[4,6],[-1,6],[-5,5],[-10,6],[-16,12],[-17,15]],
        /* South America */
        [[-82,9],[-77,12],[-72,12],[-67,11],[-60,8],[-52,4],[-44,-2],[-35,-5],[-35,-10],[-37,-14],[-40,-22],[-48,-27],[-53,-33],[-58,-38],[-65,-46],[-68,-50],[-72,-53],[-76,-47],[-74,-40],[-72,-35],[-71,-28],[-75,-15],[-78,-5],[-80,0],[-78,5],[-77,8],[-82,9]],
        /* North America */
        [[-168,66],[-162,64],[-152,60],[-140,60],[-135,54],[-128,50],[-124,48],[-124,42],[-120,37],[-117,33],[-112,28],[-107,24],[-105,20],[-97,16],[-92,15],[-88,16],[-84,10],[-80,8],[-77,9],[-75,11],[-77,19],[-82,23],[-81,26],[-81,30],[-84,30],[-88,30],[-90,29],[-95,29],[-97,27],[-97,26],[-83,25],[-80,27],[-75,35],[-70,42],[-67,45],[-60,47],[-55,48],[-58,51],[-66,48],[-75,45],[-82,43],[-88,42],[-92,46],[-84,47],[-78,50],[-80,52],[-86,58],[-92,62],[-100,60],[-110,63],[-120,67],[-140,70],[-160,71],[-168,66]],
        /* Greenland */
        [[-55,60],[-45,60],[-22,65],[-18,70],[-20,76],[-22,82],[-35,83],[-46,82],[-55,80],[-58,76],[-52,68],[-55,60]],
        /* W Europe: Iberia+France+Italy+Balkans */
        [[-10,36],[-9,38],[-9,43],[-4,44],[-2,47],[-5,48],[-1,49],[2,51],[4,52],[7,54],[9,54],[13,46],[14,42],[16,39],[16,38],[13,38],[8,39],[5,44],[3,43],[-4,44],[-10,44],[-10,36]],
        /* Scandinavia+Finland */
        [[5,58],[10,58],[12,60],[15,63],[18,68],[25,71],[30,70],[30,65],[25,62],[20,60],[18,60],[12,56],[8,56],[5,58]],
        /* Russia + N Asia */
        [[28,45],[30,50],[35,55],[30,60],[33,68],[40,68],[50,70],[60,72],[70,73],[80,74],[90,74],[100,73],[110,74],[120,73],[130,71],[140,66],[143,59],[150,60],[162,62],[164,59],[155,50],[142,47],[135,45],[131,43],[128,42],[130,44],[135,49],[140,52],[140,56],[130,52],[120,53],[110,55],[100,55],[90,55],[80,55],[70,55],[60,55],[50,52],[40,48],[35,46],[28,45]],
        /* Turkey+Iran+Central Asia */
        [[26,37],[28,41],[30,42],[36,42],[40,41],[44,40],[48,38],[52,37],[56,36],[60,37],[64,37],[70,38],[75,40],[80,42],[80,37],[70,33],[64,30],[60,26],[57,26],[52,27],[48,30],[44,33],[36,37],[30,37],[26,37]],
        /* Arabia */
        [[36,28],[40,22],[43,16],[45,13],[50,16],[55,22],[56,26],[52,24],[48,27],[44,30],[36,28]],
        /* India+Pakistan */
        [[62,25],[68,24],[72,21],[73,17],[74,13],[77,9],[78,8],[80,12],[83,15],[87,20],[89,22],[85,27],[80,30],[72,33],[68,27],[62,25]],
        /* SE Asia mainland */
        [[92,22],[98,16],[100,14],[101,10],[103,2],[104,6],[106,10],[107,16],[109,20],[106,22],[100,20],[96,21],[92,22]],
        /* China+Mongolia */
        [[75,40],[80,45],[90,48],[100,50],[110,45],[115,40],[122,37],[122,30],[120,25],[117,23],[112,22],[110,25],[105,30],[100,35],[90,42],[80,42],[75,40]],
        /* Australia */
        [[114,-22],[117,-15],[123,-14],[129,-14],[132,-12],[137,-16],[141,-13],[144,-15],[149,-18],[153,-25],[154,-28],[153,-33],[147,-38],[144,-38],[138,-35],[131,-32],[123,-34],[115,-34],[114,-30],[114,-22]],
        /* UK */
        [[-6,50],[-5,52],[0,51],[2,53],[0,56],[-2,57],[-5,58],[-5,55],[-3,54],[-5,51],[-6,50]],
        /* Ireland */
        [[-10,52],[-10,54],[-8,55],[-6,54],[-6,52],[-8,51],[-10,52]],
        /* Iceland */
        [[-24,64],[-22,66],[-18,66],[-14,65],[-14,64],[-22,64],[-24,64]],
        /* Japan */
        [[130,31],[132,34],[135,35],[137,37],[140,38],[141,41],[140,43],[145,44],[145,45],[142,44],[139,42],[137,36],[134,34],[130,31]],
        /* Madagascar */
        [[44,-13],[50,-16],[50,-23],[47,-25],[44,-25],[43,-17],[44,-13]],
        /* NZ North */
        [[173,-37],[178,-38],[177,-41],[175,-41],[173,-39],[173,-37]],
        /* NZ South */
        [[167,-44],[172,-42],[174,-43],[172,-46],[168,-46],[167,-44]],
        /* Borneo */
        [[109,1],[112,5],[117,5],[118,1],[115,-3],[110,-1],[109,1]],
        /* Sumatra */
        [[96,5],[104,1],[106,-5],[100,-3],[96,5]],
        /* Java */
        [[105,-6],[108,-7],[114,-8],[112,-8],[106,-7],[105,-6]],
        /* Philippines */
        [[118,7],[121,10],[122,18],[120,16],[118,8],[118,7]],
        /* Papua */
        [[131,-2],[141,-3],[150,-6],[148,-4],[141,-2],[131,-2]],
        /* Cuba */
        [[-85,22],[-78,23],[-75,20],[-82,20],[-85,22]],
        /* Sri Lanka */
        [[80,10],[82,7],[80,6],[80,10]],
        /* Taiwan */
        [[120,22],[122,25],[121,25],[120,22]],
        /* Korea */
        [[126,34],[126,38],[128,38],[130,36],[129,33],[126,34]],
        /* Sulawesi */
        [[119,-1],[121,1],[123,1],[124,-2],[122,-4],[120,-3],[119,-1]],
    ];

    /* Draw a smooth polygon using quadratic curves through midpoints */
    function drawSmooth(ctx, pts, W, H) {
        if (pts.length < 3) return;
        const c = pts.map(([lng, lat]) => [((lng + 180) / 360) * W, ((90 - lat) / 180) * H]);
        ctx.beginPath();
        let mx = (c[0][0] + c[1][0]) / 2, my = (c[0][1] + c[1][1]) / 2;
        ctx.moveTo(mx, my);
        for (let i = 1; i < c.length; i++) {
            const nx = (c[i][0] + c[(i + 1) % c.length][0]) / 2;
            const ny = (c[i][1] + c[(i + 1) % c.length][1]) / 2;
            ctx.quadraticCurveTo(c[i][0], c[i][1], nx, ny);
        }
        ctx.closePath();
        ctx.fill();
    }

    /* ================================================
       GLOBE TEXTURE — Azure-style: dark ocean, subtle
       land, crisp smooth bezier coastlines, no blur.
       ================================================ */
    function createGlobeTexture() {
        const W = TEX_SIZE, H = TEX_SIZE / 2;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');

        /* Ocean — near black */
        ctx.fillStyle = '#070b14';
        ctx.fillRect(0, 0, W, H);

        /* Coastline glow — draw slightly expanded polygons first */
        ctx.fillStyle = 'rgba(0, 140, 200, 0.12)';
        ctx.save();
        /* Scale from center to slightly expand polygons for glow */
        P.forEach(poly => {
            /* Draw glow pass: offset each point slightly outward */
            const expanded = poly.map(([lng, lat]) => {
                /* Push each vertex ~0.8 degrees outward from polygon centroid */
                let cLng = 0, cLat = 0;
                poly.forEach(([lo, la]) => { cLng += lo; cLat += la; });
                cLng /= poly.length; cLat /= poly.length;
                const dx = lng - cLng, dy = lat - cLat;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                return [lng + (dx / len) * 0.8, lat + (dy / len) * 0.8];
            });
            drawSmooth(ctx, expanded, W, H);
        });
        ctx.restore();

        /* Land fill — dark blue-gray, subtle */
        ctx.fillStyle = '#141e2c';
        P.forEach(poly => drawSmooth(ctx, poly, W, H));

        /* Coastline edge — thin bright rim */
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(0, 180, 240, 0.22)';
        P.forEach(poly => {
            const c = poly.map(([lng, lat]) => [((lng + 180) / 360) * W, ((90 - lat) / 180) * H]);
            ctx.beginPath();
            let mx = (c[0][0] + c[1][0]) / 2, my = (c[0][1] + c[1][1]) / 2;
            ctx.moveTo(mx, my);
            for (let i = 1; i < c.length; i++) {
                const nx = (c[i][0] + c[(i + 1) % c.length][0]) / 2;
                const ny = (c[i][1] + c[(i + 1) % c.length][1]) / 2;
                ctx.quadraticCurveTo(c[i][0], c[i][1], nx, ny);
            }
            ctx.closePath();
            ctx.stroke();
        });

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

    /* ---- Globe — dark matte with subtle specular ---- */
    const globe = new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_RADIUS, SEGMENTS, SEGMENTS),
        new THREE.MeshPhongMaterial({
            map: createGlobeTexture(),
            shininess: 8,
            specular: new THREE.Color(0x0a1520),
        })
    );
    scene.add(globe);

    /* ---- Atmosphere — very subtle rim glow ---- */
    scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_RADIUS * 1.04, SEGMENTS, SEGMENTS),
        new THREE.ShaderMaterial({
            vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
            fragmentShader: `varying vec3 vN; void main(){ float i = pow(0.55 - dot(vN, vec3(0,0,1)), 2.5); gl_FragColor = vec4(0.15, 0.45, 0.8, 1.0) * i * 0.35; }`,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true,
        })
    ));

    /* ---- Stars ---- */
    const sp = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) { sp[i*3]=(Math.random()-0.5)*200; sp[i*3+1]=(Math.random()-0.5)*200; sp[i*3+2]=(Math.random()-0.5)*200; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xaabbcc, size: 0.12, transparent: true, opacity: 0.35 }));
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
    const cdGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const cdMat = new THREE.MeshBasicMaterial({ color: 0x00aadd });
    const cgGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const cgMat = new THREE.MeshBasicMaterial({ color: 0x0088bb, transparent: true, opacity: 0.18 });
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
            new THREE.LineBasicMaterial({ color: r.color, transparent: true, opacity: 0.3 })
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
