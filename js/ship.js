/* ================================================
   TradeFlow — 3D Cargo Ship on Ocean (Three.js)
   Procedural ship + containers + animated water.
   ================================================ */

(function () {
    'use strict';

    const container = document.getElementById('shipSceneContainer');
    if (!container) return;

    /* ---- Device Detection ---- */
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    const isLowEnd = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : isMobile;

    /* ---- WebGL Check ---- */
    function webGLOk() {
        try {
            const c = document.createElement('canvas');
            return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
        } catch (e) { return false; }
    }

    if (typeof THREE === 'undefined' || !webGLOk()) {
        return; // fallback HTML already in DOM
    }

    /* ---- Performance Constants ---- */
    const OCEAN_SEG = isMobile ? 64 : isTablet ? 96 : 128;
    const C_ROWS = isMobile ? 3 : isTablet ? 4 : 5;
    const C_COLS = isMobile ? 6 : isTablet ? 8 : 10;
    const C_MAX_STACK = isMobile ? 2 : 3;
    const MAX_DPR = isMobile ? 1.5 : 2;
    const SKIP_EXTRAS = isMobile || isLowEnd;

    /* ---- Scene ---- */
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050a18, 0.025);

    /* ---- Camera ---- */
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 500);
    camera.position.set(0, 9, 24);
    camera.lookAt(0, 2, 0);

    /* ---- Renderer ---- */
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile });
    } catch (e) { return; }
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const fallback = document.getElementById('shipSceneFallback');
    if (fallback) fallback.remove();
    container.appendChild(renderer.domElement);

    /* ---- Lighting ---- */
    scene.add(new THREE.AmbientLight(0x334466, 0.9));

    const sun = new THREE.DirectionalLight(0xffeedd, 1.3);
    sun.position.set(10, 15, 5);
    scene.add(sun);

    const hemi = new THREE.HemisphereLight(0x4488cc, 0x0a1628, 0.5);
    scene.add(hemi);

    if (!SKIP_EXTRAS) {
        const deckGlow = new THREE.PointLight(0x00d4ff, 0.4, 20);
        deckGlow.position.set(-5, 5, 0);
        scene.add(deckGlow);
    }

    /* ================================================
       OCEAN
       ================================================ */
    const oceanGeo = new THREE.PlaneGeometry(200, 200, OCEAN_SEG, OCEAN_SEG);
    oceanGeo.rotateX(-Math.PI / 2);

    const oceanVertShader = `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
            vec3 pos = position;
            float w1 = sin(pos.x * 0.3 + uTime * 1.2) * 0.35;
            float w2 = sin(pos.z * 0.25 + uTime * 0.8) * 0.25;
            float w3 = sin((pos.x + pos.z) * 0.15 + uTime * 0.5) * 0.18;
            pos.y += w1 + w2 + w3;
            vWorldPos = pos;
            vNormal = normal;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `;

    const oceanFragShader = `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
            vec3 deep = vec3(0.01, 0.04, 0.10);
            vec3 surface = vec3(0.0, 0.18, 0.35);
            float fresnel = pow(1.0 - max(dot(normalize(vNormal), vec3(0.0, 1.0, 0.0)), 0.0), 2.0);
            vec3 col = mix(deep, surface, fresnel * 0.6);

            float foam = smoothstep(0.4, 0.6, sin(vWorldPos.x * 2.0 + uTime) * sin(vWorldPos.z * 1.5 + uTime * 0.7));
            col += vec3(0.0, 0.15, 0.25) * foam * 0.15;

            float dist = length(vWorldPos.xz) * 0.01;
            col = mix(col, vec3(0.02, 0.04, 0.09), clamp(dist, 0.0, 1.0));

            gl_FragColor = vec4(col, 0.92);
        }
    `;

    const oceanMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: oceanVertShader,
        fragmentShader: oceanFragShader,
        transparent: true,
        side: THREE.DoubleSide,
    });

    scene.add(new THREE.Mesh(oceanGeo, oceanMat));

    /* ================================================
       SHIP
       ================================================ */
    const ship = new THREE.Group();

    /* Hull */
    const hullMat = new THREE.MeshPhongMaterial({ color: 0x2a2a3a, shininess: 30 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(18, 3.2, 4.5), hullMat);
    hull.position.y = 1.2;
    ship.add(hull);

    /* Bow taper */
    const bowShape = new THREE.Shape();
    bowShape.moveTo(0, -1.6);
    bowShape.lineTo(0, 1.6);
    bowShape.lineTo(4, 0);
    bowShape.closePath();
    const bowGeo = new THREE.ExtrudeGeometry(bowShape, { depth: 3.2, bevelEnabled: false });
    const bow = new THREE.Mesh(bowGeo, hullMat);
    bow.rotation.x = -Math.PI / 2;
    bow.position.set(9, 1.2, -1.6);
    ship.add(bow);

    /* Waterline stripe */
    const wlMat = new THREE.MeshPhongMaterial({ color: 0x8b1a1a, shininess: 20 });
    const waterline = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.4, 4.7), wlMat);
    waterline.position.y = 0.1;
    ship.add(waterline);

    /* Deck surface */
    const deckMat = new THREE.MeshPhongMaterial({ color: 0x3d3d4d, shininess: 20 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(18, 0.15, 4.5), deckMat);
    deck.position.y = 2.82;
    ship.add(deck);

    /* Bridge / Superstructure (at stern) */
    const bridgeMat = new THREE.MeshPhongMaterial({ color: 0x4a4a5e, shininess: 40 });
    const bridgeBase = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3, 3.8), bridgeMat);
    bridgeBase.position.set(-6.5, 4.3, 0);
    ship.add(bridgeBase);

    const bridgeCabin = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 3), bridgeMat);
    bridgeCabin.position.set(-6.5, 6.5, 0);
    ship.add(bridgeCabin);

    /* Bridge windows */
    const winMat = new THREE.MeshPhongMaterial({ color: 0x88ccff, emissive: 0x224466, shininess: 100 });
    const winGeo = new THREE.BoxGeometry(0.05, 0.6, 2.2);
    const winFront = new THREE.Mesh(winGeo, winMat);
    winFront.position.set(-5.2, 6.5, 0);
    ship.add(winFront);

    /* Smokestack */
    const stackMat = new THREE.MeshPhongMaterial({ color: 0x333340 });
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.5, 8), stackMat);
    stack.position.set(-7, 7, 0);
    ship.add(stack);

    /* Mast (thin pole near bridge) */
    const mastMat = new THREE.MeshPhongMaterial({ color: 0x555566 });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), mastMat);
    mast.position.set(-5.5, 8.5, 0);
    ship.add(mast);

    /* ================================================
       CONTAINERS
       ================================================ */
    const containerColors = [
        0x00d4ff, 0x00f5d4, 0x4d8bff, 0xa855f7,
        0xffd700, 0xff8c42, 0xff5252, 0x00e676,
        0x2196f3, 0xe91e63, 0x9c27b0, 0xff9800,
    ];

    const cGeo = new THREE.BoxGeometry(1.6, 1.1, 0.95);
    const cEdgeGeo = new THREE.EdgesGeometry(cGeo);
    const cEdgeMat = new THREE.LineBasicMaterial({ color: 0x111122, transparent: true, opacity: 0.4 });

    const startX = -C_COLS * 0.85 + 1;
    const startZ = -C_ROWS * 0.52;

    for (let col = 0; col < C_COLS; col++) {
        for (let row = 0; row < C_ROWS; row++) {
            const stackH = 1 + Math.floor(Math.random() * C_MAX_STACK);
            for (let h = 0; h < stackH; h++) {
                const color = containerColors[Math.floor(Math.random() * containerColors.length)];
                const mat = new THREE.MeshPhongMaterial({ color, shininess: 50 });
                const c = new THREE.Mesh(cGeo, mat);
                c.position.set(
                    startX + col * 1.7,
                    3.4 + h * 1.15,
                    startZ + row * 1.05
                );
                ship.add(c);

                /* Wireframe edges for definition */
                const edges = new THREE.LineSegments(cEdgeGeo, cEdgeMat);
                edges.position.copy(c.position);
                ship.add(edges);
            }
        }
    }

    ship.position.set(0, 0, 0);
    scene.add(ship);

    /* ================================================
       STARS (desktop only)
       ================================================ */
    if (!SKIP_EXTRAS) {
        const starCount = 300;
        const starPos = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            starPos[i * 3] = (Math.random() - 0.5) * 150;
            starPos[i * 3 + 1] = Math.random() * 50 + 10;
            starPos[i * 3 + 2] = (Math.random() - 0.5) * 150;
        }
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.5 })));
    }

    /* ================================================
       ANIMATION
       ================================================ */
    let isVisible = false;
    const visObs = new IntersectionObserver(([entry]) => { isVisible = entry.isIntersecting; }, { threshold: 0.05 });
    visObs.observe(container);

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock = new THREE.Clock();

    /* Mouse parallax (desktop) */
    let mouseX = 0, mouseY = 0;
    if (!SKIP_EXTRAS) {
        window.addEventListener('mousemove', e => {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 1;
        });
    }

    function animate() {
        requestAnimationFrame(animate);
        if (!isVisible) return;

        const t = clock.getElapsedTime();

        if (!prefersReduced) {
            /* Ocean waves */
            oceanMat.uniforms.uTime.value = t;

            /* Ship bobbing */
            ship.position.y = Math.sin(t * 0.8) * 0.2;
            ship.rotation.z = Math.sin(t * 0.6) * 0.015;
            ship.rotation.x = Math.sin(t * 0.4) * 0.008;

            /* Subtle camera parallax */
            if (!SKIP_EXTRAS) {
                camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.02;
                camera.position.y += (9 + mouseY * 0.5 - camera.position.y) * 0.02;
                camera.lookAt(0, 2, 0);
            }
        }

        renderer.render(scene, camera);
    }

    animate();

    /* ---- Debounced Resize ---- */
    let rt;
    window.addEventListener('resize', () => {
        clearTimeout(rt);
        rt = setTimeout(() => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (!w || !h) return;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }, 150);
    });

    setTimeout(() => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w && h) {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }
    }, 100);

})();
