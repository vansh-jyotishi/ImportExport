/* ================================================
   TradeFlow — 3D Cargo Container Ship (Three.js)
   High-detail procedural ship inspired by 300m-class
   container vessels. Cinematic ocean scene.
   ================================================ */

(function () {
    'use strict';

    const container = document.getElementById('shipSceneContainer');
    if (!container) return;

    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    const isLowEnd = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : isMobile;

    function webGLOk() {
        try {
            const c = document.createElement('canvas');
            return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
        } catch (e) { return false; }
    }

    if (typeof THREE === 'undefined' || !webGLOk()) return;

    /* ---- Performance Tiers ---- */
    const OCEAN_SEG = isMobile ? 60 : isTablet ? 90 : 120;
    const MAX_DPR = isMobile ? 1.5 : 2;
    const DETAIL = isMobile ? 0 : isTablet ? 1 : 2; // 0=low, 1=mid, 2=high

    /* ---- Scene ---- */
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b1222, 0.012);
    scene.background = new THREE.Color(0x0b1222);

    /* ---- Camera — cinematic 3/4 angle ---- */
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 600);
    camera.position.set(18, 10, 22);
    camera.lookAt(0, 1.5, 0);

    /* ---- Renderer ---- */
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: DETAIL > 0 });
    } catch (e) { return; }
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = DETAIL === 2;
    if (DETAIL === 2) renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const fb = document.getElementById('shipSceneFallback');
    if (fb) fb.remove();
    container.appendChild(renderer.domElement);

    /* ---- Lighting ---- */
    scene.add(new THREE.AmbientLight(0x1a2a44, 1.2));

    const sun = new THREE.DirectionalLight(0xffd4a0, 1.6);
    sun.position.set(20, 25, 15);
    if (DETAIL === 2) { sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); }
    scene.add(sun);

    const moonLight = new THREE.DirectionalLight(0x4488cc, 0.4);
    moonLight.position.set(-15, 10, -10);
    scene.add(moonLight);

    scene.add(new THREE.HemisphereLight(0x3366aa, 0x0a0e1a, 0.6));

    if (DETAIL >= 1) {
        const rimLight = new THREE.PointLight(0x2b7099, 0.6, 40);
        rimLight.position.set(-10, 6, -8);
        scene.add(rimLight);
    }

    /* ================================================
       OCEAN — Improved shader
       ================================================ */
    const oceanGeo = new THREE.PlaneGeometry(300, 300, OCEAN_SEG, OCEAN_SEG);
    oceanGeo.rotateX(-Math.PI / 2);

    const oceanMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            uniform float uTime;
            varying vec3 vPos;
            varying float vWave;
            void main() {
                vec3 p = position;
                float w1 = sin(p.x * 0.15 + uTime * 0.9) * 0.5;
                float w2 = sin(p.z * 0.12 + uTime * 0.7) * 0.4;
                float w3 = sin((p.x * 0.3 + p.z * 0.2) + uTime * 1.1) * 0.2;
                float w4 = cos(p.x * 0.08 - uTime * 0.4) * 0.6;
                p.y = w1 + w2 + w3 + w4;
                vWave = p.y;
                vPos = p;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec3 vPos;
            varying float vWave;
            void main() {
                vec3 deep   = vec3(0.005, 0.02, 0.06);
                vec3 mid    = vec3(0.01, 0.06, 0.14);
                vec3 bright = vec3(0.02, 0.12, 0.25);

                float h = smoothstep(-0.8, 0.8, vWave);
                vec3 col = mix(deep, mid, h);

                // Specular highlights
                float spec = pow(max(0.0, sin(vPos.x * 0.5 + uTime * 0.8) * sin(vPos.z * 0.4 + uTime * 0.6)), 8.0);
                col += bright * spec * 0.4;

                // Distance fade
                float d = length(vPos.xz) * 0.007;
                col = mix(col, vec3(0.012, 0.02, 0.05), clamp(d, 0.0, 1.0));

                // Foam near crests
                float foam = smoothstep(0.5, 0.8, vWave) * 0.08;
                col += vec3(0.4, 0.5, 0.6) * foam;

                gl_FragColor = vec4(col, 0.95);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
    });
    scene.add(new THREE.Mesh(oceanGeo, oceanMat));

    /* ================================================
       SHIP — Detailed 300m-class container vessel
       ================================================ */
    const ship = new THREE.Group();

    /* Materials */
    const M = {
        hull:    new THREE.MeshPhongMaterial({ color: 0x1a1a28, shininess: 40 }),
        hullBot: new THREE.MeshPhongMaterial({ color: 0x6b1515, shininess: 20 }),
        deck:    new THREE.MeshPhongMaterial({ color: 0x2a2a38, shininess: 30 }),
        bridge:  new THREE.MeshPhongMaterial({ color: 0x3a3a50, shininess: 50 }),
        bridgeW: new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 60 }),
        window:  new THREE.MeshPhongMaterial({ color: 0x66bbff, emissive: 0x1a4466, shininess: 100 }),
        crane:   new THREE.MeshPhongMaterial({ color: 0xcc4422, shininess: 30 }),
        metal:   new THREE.MeshPhongMaterial({ color: 0x444455, shininess: 50 }),
        stripe:  new THREE.MeshPhongMaterial({ color: 0x224488, shininess: 30 }),
    };

    /* Hull — main body */
    const hullLen = 24, hullH = 4, hullW = 5.5;
    const hullMesh = new THREE.Mesh(new THREE.BoxGeometry(hullLen, hullH, hullW), M.hull);
    hullMesh.position.y = hullH / 2;
    if (DETAIL === 2) { hullMesh.castShadow = true; hullMesh.receiveShadow = true; }
    ship.add(hullMesh);

    /* Hull bottom (red anti-fouling paint) */
    const botMesh = new THREE.Mesh(new THREE.BoxGeometry(hullLen + 0.1, 1.2, hullW + 0.1), M.hullBot);
    botMesh.position.y = 0.2;
    ship.add(botMesh);

    /* Bow — pointed front using extruded shape */
    const bowS = new THREE.Shape();
    bowS.moveTo(0, -hullW / 2);
    bowS.lineTo(0, hullW / 2);
    bowS.lineTo(5, 0.2);
    bowS.lineTo(4.5, -0.2);
    bowS.closePath();
    const bowMesh = new THREE.Mesh(
        new THREE.ExtrudeGeometry(bowS, { depth: hullH, bevelEnabled: false }),
        M.hull
    );
    bowMesh.rotation.x = -Math.PI / 2;
    bowMesh.position.set(hullLen / 2, hullH / 2, -hullW / 2);
    ship.add(bowMesh);

    /* Bow bottom */
    const bowBotS = new THREE.Shape();
    bowBotS.moveTo(0, -hullW / 2 - 0.05);
    bowBotS.lineTo(0, hullW / 2 + 0.05);
    bowBotS.lineTo(4.5, 0);
    bowBotS.closePath();
    const bowBotMesh = new THREE.Mesh(
        new THREE.ExtrudeGeometry(bowBotS, { depth: 1.2, bevelEnabled: false }),
        M.hullBot
    );
    bowBotMesh.rotation.x = -Math.PI / 2;
    bowBotMesh.position.set(hullLen / 2, 0.2, -hullW / 2 - 0.05);
    ship.add(bowBotMesh);

    /* Bulbous bow (sphere at waterline) */
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), M.hullBot);
    bulb.scale.set(2.2, 0.8, 0.8);
    bulb.position.set(hullLen / 2 + 4.5, 0.3, 0);
    ship.add(bulb);

    /* Deck */
    const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(hullLen, 0.15, hullW), M.deck);
    deckMesh.position.y = hullH + 0.07;
    ship.add(deckMesh);

    /* Blue stripe along hull */
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(hullLen + 0.2, 0.35, hullW + 0.2), M.stripe);
    stripe.position.y = hullH * 0.75;
    ship.add(stripe);

    /* ================================================
       SUPERSTRUCTURE (stern)
       ================================================ */
    const sX = -hullLen / 2 + 3;

    /* Bridge base — 3 tiers */
    for (let i = 0; i < 3; i++) {
        const w = 4.8 - i * 0.3, d = 4.5 - i * 0.3, h = 1.8;
        const tier = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.bridge);
        tier.position.set(sX, hullH + 0.15 + h / 2 + i * h, 0);
        ship.add(tier);
    }

    /* Bridge cabin (top) */
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.4, 3.8), M.bridgeW);
    cabin.position.set(sX, hullH + 5.4 + 0.7, 0);
    ship.add(cabin);

    /* Windows — front and sides of cabin */
    const winH = 0.7, winThick = 0.06;
    // Front window strip
    const winF = new THREE.Mesh(new THREE.BoxGeometry(winThick, winH, 3.2), M.window);
    winF.position.set(sX + 1.76, hullH + 6.1, 0);
    ship.add(winF);
    // Side windows
    [-1, 1].forEach(s => {
        const winS = new THREE.Mesh(new THREE.BoxGeometry(2.8, winH, winThick), M.window);
        winS.position.set(sX, hullH + 6.1, s * 1.91);
        ship.add(winS);
    });

    /* Radar mast */
    const mastGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.5, 6);
    const mastMesh = new THREE.Mesh(mastGeo, M.metal);
    mastMesh.position.set(sX, hullH + 7.8 + 1.75, 0);
    ship.add(mastMesh);

    /* Radar dish */
    const radarGeo = new THREE.BoxGeometry(2.5, 0.08, 0.3);
    const radar = new THREE.Mesh(radarGeo, M.metal);
    radar.position.set(sX, hullH + 10.8, 0);
    ship.add(radar);

    /* Funnel / Smokestack */
    const funnel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.5, 2.2), M.bridge);
    funnel.position.set(sX - 1.8, hullH + 5.2 + 1.75, 0);
    ship.add(funnel);

    /* Funnel stripe */
    const fStripe = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.6, 2.25), M.stripe);
    fStripe.position.set(sX - 1.8, hullH + 8.2, 0);
    ship.add(fStripe);

    /* ================================================
       CONTAINERS — stacked in bays
       ================================================ */
    const colors = [
        0x2b6b8f, 0x1e5573, 0x3a7a6a, 0x8b4444,
        0x4a6a85, 0xb8942e, 0x6b3333, 0x3a6b5a,
        0x2e4f7a, 0x785040, 0x5a7a5a, 0x3a5a7a,
        0x5a6a78, 0x8a9aaa, 0x6a7a3a, 0x7a5a3a,
    ];

    const cW = 1.55, cH = 1.0, cD = 0.88;
    const cGeo = new THREE.BoxGeometry(cW, cH, cD);
    const cEdge = new THREE.EdgesGeometry(cGeo);
    const cEdgeMat = new THREE.LineBasicMaterial({ color: 0x000008, transparent: true, opacity: 0.35 });

    /* Container bays: fore section (in front of bridge) */
    const bayConfigs = [
        // [startX, cols, rows, maxStack]
        { x: -4, cols: 6, rows: 5, maxH: 4 },  // forward bay
        { x: 5.5, cols: 5, rows: 5, maxH: 3 },  // mid bay
    ];

    bayConfigs.forEach(bay => {
        const oX = bay.x;
        const oZ = -(bay.rows * (cD + 0.06)) / 2 + cD / 2;
        for (let c = 0; c < bay.cols; c++) {
            for (let r = 0; r < bay.rows; r++) {
                const stackH = 2 + Math.floor(Math.random() * (bay.maxH - 1));
                for (let h = 0; h < stackH; h++) {
                    const col = colors[Math.floor(Math.random() * colors.length)];
                    const mat = new THREE.MeshPhongMaterial({ color: col, shininess: 40 });
                    const box = new THREE.Mesh(cGeo, mat);
                    box.position.set(
                        oX + c * (cW + 0.06),
                        hullH + 0.22 + cH / 2 + h * (cH + 0.04),
                        oZ + r * (cD + 0.06)
                    );
                    if (DETAIL === 2) box.castShadow = true;
                    ship.add(box);

                    if (DETAIL >= 1) {
                        const e = new THREE.LineSegments(cEdge, cEdgeMat);
                        e.position.copy(box.position);
                        ship.add(e);
                    }
                }
            }
        }
    });

    /* ================================================
       DECK CRANES (red gantry frames)
       ================================================ */
    if (DETAIL >= 1) {
        const cranePositions = [1.5, -8.5];
        cranePositions.forEach(cx => {
            const legGeo = new THREE.BoxGeometry(0.15, 5, 0.15);
            const beamGeo = new THREE.BoxGeometry(0.12, 0.12, hullW + 1);
            [-1, 1].forEach(s => {
                const leg = new THREE.Mesh(legGeo, M.crane);
                leg.position.set(cx, hullH + 2.5, s * (hullW / 2 + 0.3));
                ship.add(leg);
            });
            const beam = new THREE.Mesh(beamGeo, M.crane);
            beam.position.set(cx, hullH + 5, 0);
            ship.add(beam);
            // Top girder
            const topGeo = new THREE.BoxGeometry(0.6, 0.3, hullW + 1.5);
            const top = new THREE.Mesh(topGeo, M.crane);
            top.position.set(cx, hullH + 5.15, 0);
            ship.add(top);
        });
    }

    /* ================================================
       STERN DETAILS
       ================================================ */
    // Stern flat
    const sternPlate = new THREE.Mesh(new THREE.BoxGeometry(0.15, hullH - 0.5, hullW - 0.5), M.hull);
    sternPlate.position.set(-hullLen / 2 - 0.05, hullH / 2 + 0.25, 0);
    ship.add(sternPlate);

    /* Propeller hint */
    if (DETAIL >= 1) {
        const propHub = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), M.metal);
        propHub.position.set(-hullLen / 2 - 0.3, 0.6, 0);
        ship.add(propHub);
    }

    /* Anchor mark (bow) */
    if (DETAIL >= 1) {
        const anchor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.06), M.metal);
        anchor.position.set(hullLen / 2 + 1, hullH * 0.6, 1.5);
        ship.add(anchor);
    }

    ship.position.set(0, -0.5, 0);
    scene.add(ship);

    /* ================================================
       ENVIRONMENT
       ================================================ */
    /* Stars */
    if (DETAIL >= 1) {
        const N = DETAIL === 2 ? 500 : 250;
        const sp = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
            sp[i * 3] = (Math.random() - 0.5) * 200;
            sp[i * 3 + 1] = Math.random() * 60 + 8;
            sp[i * 3 + 2] = (Math.random() - 0.5) * 200;
        }
        const sg = new THREE.BufferGeometry();
        sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
        scene.add(new THREE.Points(sg, new THREE.PointsMaterial({
            color: 0xffffff, size: 0.1, transparent: true, opacity: 0.4
        })));
    }

    /* ================================================
       ANIMATION
       ================================================ */
    let isVisible = false;
    const visObs = new IntersectionObserver(([e]) => { isVisible = e.isIntersecting; }, { threshold: 0.05 });
    visObs.observe(container);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock = new THREE.Clock();
    let mx = 0, my = 0;

    if (DETAIL >= 1) {
        window.addEventListener('mousemove', e => {
            mx = (e.clientX / window.innerWidth - 0.5) * 2;
            my = (e.clientY / window.innerHeight - 0.5);
        });
    }

    /* Camera orbit radius */
    const camRadius = 30;
    const camHeight = 11;
    let camAngle = 0.6; // starting angle (radians)

    function animate() {
        requestAnimationFrame(animate);
        if (!isVisible) return;

        const t = clock.getElapsedTime();

        if (!reduced) {
            oceanMat.uniforms.uTime.value = t;

            /* Ship bobbing */
            ship.position.y = -0.5 + Math.sin(t * 0.7) * 0.25;
            ship.rotation.z = Math.sin(t * 0.5) * 0.012;
            ship.rotation.x = Math.sin(t * 0.35) * 0.006;

            /* Slow auto-orbit camera */
            camAngle += 0.0008;
            const baseX = Math.sin(camAngle) * camRadius;
            const baseZ = Math.cos(camAngle) * camRadius;

            /* Mouse influence */
            const targetX = baseX + mx * 3;
            const targetY = camHeight + my * 2;
            const targetZ = baseZ;

            camera.position.x += (targetX - camera.position.x) * 0.02;
            camera.position.y += (targetY - camera.position.y) * 0.02;
            camera.position.z += (targetZ - camera.position.z) * 0.02;
            camera.lookAt(0, 2, 0);

            /* Rotate radar */
            if (radar) radar.rotation.y = t * 1.5;
        }

        renderer.render(scene, camera);
    }

    animate();

    /* ---- Debounced Resize ---- */
    let rt;
    function doResize() {
        const w = container.clientWidth, h = container.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(doResize, 150); });
    setTimeout(doResize, 100);

})();
