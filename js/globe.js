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
       HIGH-DETAIL COASTLINE POLYGONS [lng, lat]
       ~1500 vertices, 35 land polygons + 8 water cutouts
       ================================================ */

    /* ---- LAND POLYGONS ---- */
    const P = [
        /* Africa (55 pts) */
        [[-17.4,14.7],[-17.1,16],[-17,21],[-16,24],[-13,27.5],[-10,32],[-6,35.8],[-5.6,36],[-2.2,35.2],[0,36],[3,37],[5,37.5],[8,37.3],[10,37],[11.5,33.5],[12,32.5],[15,31.5],[19.5,30.5],[22,32],[25,31.5],[28,31],[30,31.2],[32.5,31.4],[33.5,29],[35,27],[36.5,22],[38,18],[40,15.5],[42,13],[43,11.5],[45,11.5],[47,9],[49.5,10.5],[49,5],[47,1.5],[44,-1],[42,-3.5],[40,-7],[39,-10],[37,-12],[35.5,-16.5],[35.5,-21],[36,-24],[34,-27.5],[31,-30],[28,-33.5],[25,-34],[20,-34.8],[17.5,-32],[15,-28],[13,-22],[12,-17],[12,-10],[12,-6],[10,0],[9.5,3],[9,5],[5,5.5],[2,6],[-1,5.5],[-4.5,5],[-7.5,4.5],[-10,6],[-12.5,8],[-15,11],[-16.5,13],[-17.4,14.7]],
        /* South America (45 pts) */
        [[-81,8],[-79.5,9.5],[-77,12],[-74.5,11],[-72,12],[-69.5,11.5],[-67,10.5],[-63,10],[-60,8],[-55,5.5],[-51,3],[-48,0],[-44,-2.5],[-39,-4],[-35.5,-6],[-35,-9],[-35.5,-12.5],[-37,-15],[-39,-17.5],[-41,-22],[-44,-23],[-47,-25],[-49,-28],[-52,-32],[-55,-34],[-58,-37],[-62,-39],[-65,-42],[-66,-45],[-68,-48],[-70,-51],[-72,-53],[-75,-52],[-75.5,-48],[-75,-45],[-73,-40],[-72,-36],[-71.5,-30],[-71.5,-25],[-73.5,-18],[-75,-14],[-77,-8],[-79.5,-3],[-80,0],[-79,4],[-78,7],[-81,8]],
        /* N America (65 pts) */
        [[-168,66],[-164,65],[-161,63],[-155,60],[-147,61],[-140,60],[-138,57],[-135,54],[-132,52],[-128,50],[-125,48.5],[-124,46],[-124,42],[-122,39],[-120,37],[-118,34],[-117,33],[-115,30],[-112,28],[-109,25],[-106,22],[-103,19],[-100,17],[-97,16],[-94,16],[-92,15],[-90,15.5],[-88,16],[-86,13],[-84,10],[-82,9],[-80,8],[-78,9],[-76,10],[-75,11],[-76,15],[-77.5,18],[-79,21],[-81,23],[-81.5,25.5],[-80,28],[-80.5,31],[-76,34],[-75,36],[-73,39],[-71,41],[-69,42],[-67,44.5],[-64,45.5],[-61,46.5],[-56,47],[-53,47.5],[-57,50],[-60,49],[-65,49],[-67,48],[-72,46],[-77,44],[-80,43],[-84,42],[-88,43],[-90,46.5],[-86,48],[-83,47],[-80,49],[-79,51],[-81,53],[-84,56],[-88,59],[-92,61.5],[-97,61],[-102,60],[-108,61],[-115,64],[-122,67],[-135,69],[-145,70],[-155,71],[-163,70],[-168,66]],
        /* Greenland (18 pts) */
        [[-52,60],[-47,60],[-42,61],[-35,62],[-25,63],[-20,65],[-18,68],[-18,72],[-20,77],[-24,81],[-30,83],[-40,83],[-48,82],[-54,79],[-56,76],[-55,72],[-50,67],[-52,60]],
        /* W Europe (40 pts) */
        [[-10,36],[-9.5,37],[-9,38.5],[-9,40],[-8.5,42],[-9,43],[-7.5,43.5],[-4,43.5],[-2,43.5],[-1.5,46],[-3,47],[-5,48.5],[-2,49],[0,50],[2,51],[3.5,51.5],[5,53],[7,53.5],[8,54],[9.5,54.5],[10,54],[10.5,50],[12,47],[13.5,45],[14,42],[16,39.5],[18.5,40],[16,38],[15,37.5],[12.5,38],[9.5,39.5],[8,40],[7,43.5],[5,44],[3.5,43.5],[2,43],[-2,43],[-5,43.5],[-8,43],[-10,40],[-10,36]],
        /* Scandinavia (25 pts) */
        [[5,58],[7,58],[8,57.5],[10,58],[11,59],[12,60],[14,62],[15,64],[16,66],[17,68],[20,69.5],[25,71],[28,71],[30,70.5],[30,68],[28,65],[25,63],[22,61],[20,60],[18,59.5],[15,59],[13,57],[11,56],[8,56],[5,58]],
        /* Russia+N Asia (50 pts) */
        [[28,46],[30,48],[28,50],[30,55],[28,58],[30,61],[32,65],[34,68],[38,68],[42,67],[48,69],[55,70],[62,71.5],[70,72.5],[78,73],[86,74],[95,74],[105,73.5],[112,73],[118,72],[125,71],[132,70],[140,67],[143,62],[148,59],[152,60],[158,61],[162,62],[165,60],[162,57],[157,52],[150,48],[143,47],[137,46],[133,44],[130,43],[128,43],[130,46],[133,48],[138,52],[142,55],[138,56],[132,53],[125,52],[118,54],[110,55],[100,55],[90,55],[80,55],[70,55],[60,55],[50,52],[42,48],[36,46],[30,45],[28,46]],
        /* Turkey+Iran (30 pts) */
        [[26,37],[27,39],[28,41],[30,41.5],[33,42],[36,42],[38,41.5],[40,41],[42,40],[44,39.5],[45,38],[48,37],[51,36.5],[54,36],[57,36],[60,37],[63,37],[66,35],[68,33],[66,30],[63,27],[60,25.5],[57,26],[53,27],[50,28],[48,30],[45,32],[42,34],[38,36.5],[33,37],[30,37],[26,37]],
        /* Central Asia fill */
        [[50,52],[55,46],[60,42],[65,40],[70,40],[75,42],[80,44],[85,48],[90,48],[90,55],[80,55],[70,55],[60,55],[50,52]],
        /* Arabia (20 pts) */
        [[35,30],[36.5,27],[38,22],[39.5,18],[41.5,15],[43,13],[44,12.5],[47,14],[50,17],[52,19],[55,22.5],[56,25],[56,26.5],[55,27],[53,26],[51,25],[49,28],[47,29.5],[44,31],[40,31],[35,30]],
        /* India+Pakistan+BD (30 pts) */
        [[62,25],[65,26],[67,25],[68,24],[70,22],[72,20],[73,17],[73.5,15],[74,13],[75,11],[76.5,9.5],[77.5,8.5],[78,8.5],[79,10],[80,13],[81,14.5],[83,16],[85,19],[87,21.5],[89,22],[90,23],[89,25],[86,26],[84,27],[82,28.5],[79,30],[76,32],[72,34],[68,28],[65,26],[62,25]],
        /* SE Asia mainland (25 pts) */
        [[92,22],[94,20],[97,17],[99,15],[100,13.5],[101,11],[101,9],[102,7],[103,3],[103,1.5],[104,3],[104.5,6],[105,8],[106,10.5],[107,14],[108,17],[109,21],[108,22],[106,22],[103,21],[100,20],[98,19],[96,20],[94,21],[92,22]],
        /* China+Mongolia+Tibet (35 pts) */
        [[74,40],[77,38],[80,36],[84,33],[88,35],[92,38],[95,40],[100,45],[105,48],[110,46],[115,42],[118,39],[120,37],[122,35],[121,31],[121,28],[120,25],[118,23],[115,22.5],[113,22],[111,21.5],[109,22],[107,23],[105,26],[103,29],[100,32],[97,34],[93,36],[88,38],[84,38],[80,40],[76,41],[74,40]],
        /* Manchuria+RFE */
        [[118,39],[120,42],[122,44],[125,46],[128,48],[130,50],[133,48],[135,45],[132,43],[129,42],[127,39.5],[125,38],[122,37],[120,37],[118,39]],
        /* Australia (35 pts) */
        [[114,-22],[114.5,-20],[116,-18],[117,-15],[119,-14],[122,-14],[125,-14],[128,-14.5],[130,-13],[132,-12],[134,-12.5],[136,-14],[137,-16],[138.5,-14],[140,-13],[142,-12.5],[144,-14.5],[146,-17],[148,-19],[150,-22],[152,-25],[153,-27],[153.5,-30],[153,-33],[151,-34],[149,-37],[147,-38],[145,-39],[143,-38.5],[140,-37],[137,-35],[133,-33],[130,-32],[126,-33],[122,-34],[118,-34.5],[115.5,-34],[114.5,-31],[114,-27],[114,-22]],
        /* UK (15 pts) */
        [[-6,50],[-5.5,51],[-4,52],[0,51],[1.5,52.5],[0,54],[-1,55],[-2,57],[-4,57.5],[-5,58],[-5.5,57],[-4.5,55],[-3,54],[-5,51.5],[-6,50]],
        /* Ireland (10 pts) */
        [[-10.5,51.5],[-10,53],[-10,54],[-9,54.5],[-7.5,55],[-6,54.5],[-6,53],[-7,52],[-8.5,51.5],[-10.5,51.5]],
        /* Iceland (10 pts) */
        [[-24,64],[-23,65.5],[-22,66],[-19,66.5],[-16,66],[-14,65],[-14,64],[-16,63.5],[-20,64],[-24,64]],
        /* Japan Honshu (14 pts) */
        [[130,31],[131,33],[132.5,34],[134,34.5],[136,35.5],[138,37],[139.5,38.5],[140,40],[141,41.5],[140.5,43],[139,41.5],[137,37],[134,35],[131,33.5],[130,31]],
        /* Japan Hokkaido (8 pts) */
        [[140,42],[141,43],[143,43.5],[145,43.5],[145.5,45],[143,44.5],[141,43.5],[140,42]],
        /* Madagascar (12 pts) */
        [[44,-12.5],[45.5,-14],[48,-16],[50,-18],[50,-22],[48,-24.5],[46,-25.5],[44,-24],[43.5,-20],[43,-17],[43.5,-14],[44,-12.5]],
        /* NZ North (8 pts) */
        [[173,-37],[175,-37.5],[177.5,-38.5],[178,-39.5],[177,-41],[175.5,-41.5],[174,-40],[173,-37]],
        /* NZ South (8 pts) */
        [[167,-44.5],[169,-43],[171,-42],[173.5,-43],[173,-44.5],[171,-46],[169,-46.5],[167,-44.5]],
        /* Borneo (12 pts) */
        [[109,1],[110,3],[111.5,5],[114,5],[116,4.5],[118,4],[118.5,1],[117.5,-1],[116,-3],[113,-3],[110.5,-1],[109,1]],
        /* Sumatra (10 pts) */
        [[95.5,5.5],[98,4],[101,2],[104,0],[106,-2.5],[105.5,-5.5],[103,-5],[100,-3],[97,0],[95.5,5.5]],
        /* Java (8 pts) */
        [[105,-6],[107,-6.5],[109,-7],[112,-7.5],[114,-8],[112.5,-8.5],[108,-7.5],[105,-6]],
        /* Philippines (12 pts) */
        [[117,7],[118.5,8.5],[120,10],[121,12],[121.5,14.5],[122,17],[122,19],[121,18],[120,15],[119,12],[118,9.5],[117,7]],
        /* Papua (12 pts) */
        [[131,-2.5],[133,-3],[136,-4],[139,-5],[142,-6],[145,-6],[148,-6.5],[150,-6],[149,-5],[145,-3.5],[141,-2.5],[136,-1.5],[131,-2.5]],
        /* Cuba (8 pts) */
        [[-85,21.5],[-83,23],[-80,23],[-77,22],[-75,20],[-78,19.5],[-82,20],[-85,21.5]],
        /* Sri Lanka (6 pts) */
        [[80,10],[81,8.5],[82,7],[81,6],[79.5,7],[80,10]],
        /* Taiwan (6 pts) */
        [[120,22],[121,23.5],[122,25],[121.5,25.5],[120.5,24],[120,22]],
        /* Korea (10 pts) */
        [[126,34],[126.5,35.5],[126,37],[127,38],[128.5,38.5],[129.5,37],[130,35.5],[129,34],[127.5,33.5],[126,34]],
        /* Sulawesi (10 pts) */
        [[119.5,-1],[120.5,0.5],[121,1.5],[122.5,1],[124,0],[124.5,-2],[123,-4],[121,-3.5],[120,-2.5],[119.5,-1]],
        /* Tasmania (6 pts) */
        [[145,-40.5],[146,-41],[148,-41.5],[148,-43],[146,-43.5],[145,-42],[145,-40.5]],
        /* Hispaniola (6 pts) */
        [[-74.5,18],[-72,18.5],[-69,19],[-68.5,18],[-71,18],[-74.5,18]],
        /* Svalbard (6 pts) */
        [[11,77],[15,78],[20,79],[22,78],[18,76.5],[11,77]],
    ];

    /* ---- WATER CUTOUT POLYGONS (drawn OVER land in ocean color) ---- */
    const W_CUT = [
        /* Mediterranean */
        [[-5.5,36],[0,37.5],[5,38],[10,38],[15,38],[18,36],[22,35],[25,35],[30,33],[33,32],[35,34],[33,36],[30,37],[26,38],[22,37.5],[20,38.5],[18,40],[15,39],[12,39],[8,40.5],[5,43],[3,43.5],[2,43],[-1,43],[-3,43.5],[-5,42.5],[-5.5,36]],
        /* Gulf of Mexico */
        [[-98,26],[-97,27],[-95,29],[-91,30],[-88,30],[-85,30],[-83,27],[-82,25],[-84,23],[-87,19],[-90,20],[-93,21],[-96,23],[-98,26]],
        /* Hudson Bay */
        [[-95,63],[-92,61],[-88,58],[-82,56],[-78,56],[-77,58],[-79,60],[-80,62],[-82,64],[-86,65],[-90,64],[-95,63]],
        /* Baltic Sea */
        [[10,54.5],[12,55],[14,54.5],[16,55],[18,56],[20,58],[22,60],[24,62],[25,64],[22,65],[20,63],[18,60],[16,57],[14,56],[12,56],[10,54.5]],
        /* Black Sea */
        [[28,41],[30,42],[33,43],[36,43],[38,42],[40,41.5],[41,42],[40,43.5],[38,44],[35,44],[32,43.5],[29,43],[28,41]],
        /* Caspian Sea */
        [[48,37],[49,39],[50,41],[51,43],[52,45],[53,46],[54,44],[54,42],[53,40],[52,38],[50,37],[48,37]],
        /* Red Sea */
        [[32,28],[33,25],[34,22],[36,19],[38,16],[40,14],[42,13],[43,14.5],[42,17],[40,20],[38,23],[36,26],[34,28],[32,28]],
        /* Persian Gulf */
        [[48,30],[49,28.5],[50,27],[52,26.5],[54,26],[55,27],[54,28.5],[52,29.5],[50,30],[48,30]],
    ];

    /* Draw smooth bezier polygon from [lng,lat] pairs */
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
    }

    /* ================================================
       GLOBE TEXTURE — precise polygon coastlines
       with water cutouts for seas/bays/gulfs
       ================================================ */
    function createGlobeTexture() {
        const W = TEX_SIZE, H = TEX_SIZE / 2;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');

        /* 1. Ocean base */
        ctx.fillStyle = '#070b14';
        ctx.fillRect(0, 0, W, H);

        /* 2. Coastline outer glow */
        ctx.fillStyle = 'rgba(0, 130, 200, 0.10)';
        P.forEach(poly => {
            const expanded = poly.map(([lng, lat]) => {
                let cx = 0, cy = 0;
                poly.forEach(([a, b]) => { cx += a; cy += b; });
                cx /= poly.length; cy /= poly.length;
                const dx = lng - cx, dy = lat - cy;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                return [lng + (dx / len) * 1.2, lat + (dy / len) * 1.2];
            });
            drawSmooth(ctx, expanded, W, H);
            ctx.fill();
        });

        /* 3. Land fill */
        ctx.fillStyle = '#151f2d';
        P.forEach(poly => { drawSmooth(ctx, poly, W, H); ctx.fill(); });

        /* 4. Water cutouts — punch seas/bays back to ocean */
        ctx.fillStyle = '#070b14';
        W_CUT.forEach(poly => { drawSmooth(ctx, poly, W, H); ctx.fill(); });

        /* 5. Coastline stroke on land edges */
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0, 170, 230, 0.18)';
        P.forEach(poly => { drawSmooth(ctx, poly, W, H); ctx.stroke(); });

        /* 6. Coastline stroke on water cutout edges */
        ctx.strokeStyle = 'rgba(0, 170, 230, 0.12)';
        W_CUT.forEach(poly => { drawSmooth(ctx, poly, W, H); ctx.stroke(); });

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
