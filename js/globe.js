/* ================================================
   TradeFlow — Interactive 3D Globe (Three.js)
   Real Natural Earth coastline data from CDN.
   NASA-smooth interaction with inertia.
   ================================================ */

(function () {
    'use strict';

    const container = document.getElementById('globeContainer');
    if (!container) return;

    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    const isLowEnd = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : isMobile;

    function isWebGLAvailable() {
        try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); }
        catch (e) { return false; }
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

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    function isBackgroundMode() { return window.innerWidth <= 1024; }
    function getCameraZ() { if (isBackgroundMode()) return 12; const w = container.clientWidth; return w < 600 ? 18 : w < 900 ? 16 : 14; }
    camera.position.z = getCameraZ();

    let renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch (e) { container.innerHTML = '<div class="globe-fallback"><i class="fas fa-globe-americas"></i><p>Interactive Globe</p></div>'; return; }
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));

    const fb = document.getElementById('globeFallback');
    if (fb) fb.remove();
    container.appendChild(renderer.domElement);

    /* ---- Lighting ---- */
    scene.add(new THREE.AmbientLight(0x223344, 1.5));
    const keyLight = new THREE.DirectionalLight(0x8899bb, 1.0);
    keyLight.position.set(5, 3, 4);
    scene.add(keyLight);

    /* ================================================
       TOPOJSON DECODER (inline, no library needed)
       Decodes Natural Earth land-110m.json into
       arrays of [lng, lat] coordinate rings.
       ================================================ */
    function decodeTopo(topo, name) {
        const tf = topo.transform;
        const arcs = topo.arcs.map(arc => {
            let x = 0, y = 0;
            return arc.map(([dx, dy]) => {
                x += dx; y += dy;
                return [x * tf.scale[0] + tf.translate[0], y * tf.scale[1] + tf.translate[1]];
            });
        });
        function ring(refs) {
            const pts = [];
            refs.forEach(r => {
                const a = r >= 0 ? arcs[r] : arcs[~r].slice().reverse();
                a.forEach((p, i) => { if (i > 0 || pts.length === 0) pts.push(p); });
            });
            return pts;
        }
        const polys = [];
        topo.objects[name].geometries.forEach(g => {
            if (g.type === 'Polygon') g.arcs.forEach(r => polys.push(ring(r)));
            else if (g.type === 'MultiPolygon') g.arcs.forEach(p => p.forEach(r => polys.push(ring(r))));
        });
        return polys;
    }

    /* ================================================
       TEXTURE RENDERING from polygon data
       ================================================ */
    function renderTexture(polygons) {
        const W = TEX_SIZE, H = TEX_SIZE / 2;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');

        /* Ocean */
        ctx.fillStyle = '#070b14';
        ctx.fillRect(0, 0, W, H);

        function toXY(lng, lat) {
            return [((lng + 180) / 360) * W, ((90 - lat) / 180) * H];
        }

        function drawPoly(pts) {
            if (pts.length < 3) return;
            ctx.beginPath();
            const [sx, sy] = toXY(pts[0][0], pts[0][1]);
            ctx.moveTo(sx, sy);
            for (let i = 1; i < pts.length; i++) {
                const [x, y] = toXY(pts[i][0], pts[i][1]);
                ctx.lineTo(x, y);
            }
            ctx.closePath();
        }

        /* Outer glow */
        ctx.fillStyle = 'rgba(0, 120, 190, 0.07)';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0, 120, 190, 0.07)';
        polygons.forEach(p => { drawPoly(p); ctx.fill(); ctx.stroke(); });

        /* Land fill */
        ctx.fillStyle = '#141e2c';
        polygons.forEach(p => { drawPoly(p); ctx.fill(); });

        /* Coastline stroke */
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = 'rgba(0, 170, 230, 0.18)';
        polygons.forEach(p => { drawPoly(p); ctx.stroke(); });

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /* ================================================
       FALLBACK POLYGONS (if CDN unreachable)
       ================================================ */
    const FALLBACK = [
        [[-17,15],[-17,21],[-13,28],[-6,36],[3,37],[10,37],[11,33],[25,32],[33,30],[37,22],[43,12],[50,12],[49,5],[44,-1],[40,-7],[35,-17],[36,-24],[28,-33],[18,-35],[12,-17],[12,-6],[9,5],[-1,6],[-10,6],[-17,15]],
        [[-81,8],[-77,12],[-67,11],[-52,4],[-35,-5],[-37,-14],[-48,-27],[-58,-38],[-72,-53],[-75,-47],[-72,-35],[-75,-15],[-80,0],[-78,7],[-81,8]],
        [[-168,66],[-152,60],[-140,60],[-124,48],[-120,37],[-117,33],[-105,20],[-92,15],[-84,10],[-80,8],[-77,9],[-77,19],[-81,25],[-80,30],[-90,29],[-97,26],[-80,27],[-70,42],[-60,47],[-55,48],[-66,48],[-82,43],[-92,46],[-78,50],[-86,58],[-100,60],[-120,67],[-160,71],[-168,66]],
        [[-52,60],[-22,65],[-18,72],[-24,82],[-46,82],[-55,80],[-52,68],[-52,60]],
        [[-10,36],[-9,43],[-5,48],[-1,49],[4,52],[9,54],[14,42],[16,38],[8,40],[3,43],[-10,44],[-10,36]],
        [[5,58],[12,60],[18,68],[30,70],[25,62],[12,56],[5,58]],
        [[28,46],[30,55],[33,68],[50,70],[70,73],[100,73],[130,71],[164,59],[142,47],[128,42],[130,52],[110,55],[50,52],[28,46]],
        [[26,37],[30,42],[44,40],[60,37],[80,42],[80,37],[60,26],[48,30],[36,37],[26,37]],
        [[36,28],[43,16],[55,22],[56,26],[44,30],[36,28]],
        [[62,25],[72,21],[77,9],[80,12],[89,22],[80,30],[68,27],[62,25]],
        [[92,22],[100,14],[103,2],[106,10],[109,20],[100,20],[92,22]],
        [[75,40],[100,50],[122,37],[120,25],[112,22],[100,35],[75,40]],
        [[114,-22],[117,-15],[132,-12],[141,-13],[153,-25],[153,-33],[147,-38],[131,-32],[115,-34],[114,-22]],
        [[-6,50],[0,51],[2,53],[-2,57],[-5,58],[-5,55],[-6,50]],
        [[-10,52],[-8,55],[-6,54],[-8,51],[-10,52]],
        [[-22,66],[-14,65],[-22,64],[-22,66]],
        [[130,31],[138,37],[141,41],[145,45],[139,42],[134,34],[130,31]],
        [[44,-13],[50,-16],[47,-25],[43,-17],[44,-13]],
        [[109,1],[117,5],[118,1],[113,-3],[109,1]],
        [[96,5],[106,-5],[100,-3],[96,5]],
        [[118,7],[122,18],[120,16],[118,7]],
    ];

    /* ================================================
       GLOBE CREATION + ASYNC DATA LOAD
       ================================================ */
    function latLngToVec3(lat, lng, r) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
    }

    /* Create globe with initial dark texture */
    const globeMat = new THREE.MeshPhongMaterial({
        map: renderTexture(FALLBACK),
        shininess: 8,
        specular: new THREE.Color(0x0a1520),
    });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, SEGMENTS, SEGMENTS), globeMat);
    scene.add(globe);

    /* Load real Natural Earth data and update texture */
    fetch('https://unpkg.com/world-atlas@2.0.2/land-110m.json')
        .then(r => r.json())
        .then(topo => {
            const realPolygons = decodeTopo(topo, 'land');
            globeMat.map = renderTexture(realPolygons);
            globeMat.needsUpdate = true;
        })
        .catch(() => { /* fallback already applied */ });

    /* ---- Atmosphere ---- */
    scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_RADIUS * 1.04, SEGMENTS, SEGMENTS),
        new THREE.ShaderMaterial({
            vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
            fragmentShader: 'varying vec3 vN; void main(){ float i = pow(0.55 - dot(vN, vec3(0,0,1)), 2.5); gl_FragColor = vec4(0.15, 0.45, 0.8, 1.0) * i * 0.35; }',
            blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true,
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

    /* ---- Trade Routes ---- */
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
    let isDragging = false, prevX = 0, prevY = 0;
    let rotX = 0.3, rotY = 0, velX = 0, velY = 0;
    let autoSpeed = 0.002;
    const DAMPING = 0.95, SENSITIVITY = 0.004, LERP = 0.08;

    container.addEventListener('mousedown', e => {
        isDragging = true; prevX = e.clientX; prevY = e.clientY;
        velX = 0; velY = 0; autoSpeed = 0;
        container.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        velY = (e.clientX - prevX) * SENSITIVITY; velX = (e.clientY - prevY) * SENSITIVITY;
        rotY += velY; rotX = Math.max(-1.5, Math.min(1.5, rotX + velX));
        prevX = e.clientX; prevY = e.clientY;
    });
    window.addEventListener('mouseup', () => {
        isDragging = false; container.style.cursor = 'grab';
        setTimeout(() => { if (!isDragging) autoSpeed = 0.002; }, 3000);
    });
    container.addEventListener('touchstart', e => {
        if (e.touches.length === 1) { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; velX = 0; velY = 0; autoSpeed = 0; }
    }, { passive: true });
    container.addEventListener('touchmove', e => {
        if (!isDragging || e.touches.length !== 1) return;
        velY = (e.touches[0].clientX - prevX) * SENSITIVITY; velX = (e.touches[0].clientY - prevY) * SENSITIVITY;
        rotY += velY; rotX = Math.max(-1.5, Math.min(1.5, rotX + velX));
        prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
    }, { passive: true });
    container.addEventListener('touchend', () => { isDragging = false; setTimeout(() => { if (!isDragging) autoSpeed = 0.002; }, 3000); });
    container.style.cursor = 'grab';

    let isVisible = true;
    const visObs = new IntersectionObserver(([e]) => { isVisible = e.isIntersecting; }, { threshold: 0.05 });
    visObs.observe(container);

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) autoSpeed = 0;

    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        if (!isVisible) return;
        const t = clock.getElapsedTime();
        if (!isDragging) { velX *= DAMPING; velY *= DAMPING; rotY += velY; rotX = Math.max(-1.5, Math.min(1.5, rotX + velX)); }
        rotY += autoSpeed;
        globe.rotation.x += (rotX - globe.rotation.x) * LERP;
        globe.rotation.y += (rotY - globe.rotation.y) * LERP;
        if (!prefersReduced) {
            particles.forEach(tp => {
                const pt = (t * tp.spd + tp.off) % 1;
                const pos = tp.curve.getPoint(pt);
                tp.p.position.copy(pos); tp.p.material.opacity = Math.sin(pt * Math.PI) * 0.9;
                if (tp.g) { tp.g.position.copy(pos); tp.g.material.opacity = Math.sin(pt * Math.PI) * 0.2; }
            });
            stars.rotation.y += 0.0001;
        }
        renderer.render(scene, camera);
    }
    animate();

    let rt;
    function onResize() { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; camera.aspect = w / h; camera.position.z = getCameraZ(); camera.updateProjectionMatrix(); renderer.setSize(w, h); }
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(onResize, 150); });
    setTimeout(onResize, 100);

    window.__globeReady = true;
})();
