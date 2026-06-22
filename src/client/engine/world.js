// world.js – builds the suburban front yard scene
import * as THREE from 'three';

export class World {
    constructor(scene, physics) {
        this.scene = scene;
        this.physics = physics;
        this.clouds = [];

        this._buildLights();
        this._buildSky();
        this._buildGround();
        this._buildSidewalk();
        this._buildHouse();
        this._buildTree();
        this._buildFence();
        this._buildClouds();
        this._buildDecorations();
    }

    // ---- Lighting -------------------------------------------------------
    _buildLights() {
        this.scene.add(new THREE.AmbientLight(0xfff0dd, 0.55));

        const sun = new THREE.DirectionalLight(0xfff8e1, 1.3);
        sun.position.set(12, 25, 15);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 80;
        const sc = sun.shadow.camera;
        sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22;
        sun.shadow.bias = -0.001;
        this.scene.add(sun);

        // Soft fill from the opposite side
        const fill = new THREE.DirectionalLight(0xaaccff, 0.3);
        fill.position.set(-8, 5, -8);
        this.scene.add(fill);
    }

    // ---- Sky & fog -------------------------------------------------------
    _buildSky() {
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.FogExp2(0xaedaff, 0.018);
    }

    // ---- Ground ----------------------------------------------------------
    _buildGround() {
        const geo = new THREE.PlaneGeometry(40, 40, 16, 16);
        // Slight vertex noise so it feels hand-crafted
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.04);
        }
        geo.computeVertexNormals();

        const mat = new THREE.MeshLambertMaterial({ color: 0x5cb85c });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        // Thin physics ground plane
        this.physics.addBox(20, 0.1, 20, 0, -0.1, 0, this.physics.groundMat);
    }

    // ---- Sidewalk --------------------------------------------------------
    _buildSidewalk() {
        // Runs from front fence to the house door along x=0
        const mat = new THREE.MeshLambertMaterial({ color: 0xc0bfbc });

        // Main path
        const pathGeo = new THREE.BoxGeometry(1.8, 0.08, 13);
        const path = new THREE.Mesh(pathGeo, mat);
        path.position.set(0, 0.04, 1.5);   // z=1.5 centers it between z=10 (fence) and z=-5 (door)
        path.receiveShadow = true;
        this.scene.add(path);

        // Stepping-stone front step at door
        const stepGeo = new THREE.BoxGeometry(2.5, 0.12, 1.2);
        const step = new THREE.Mesh(stepGeo, mat);
        step.position.set(0, 0.06, -4.9);
        step.receiveShadow = true;
        this.scene.add(step);
    }

    // ---- House -----------------------------------------------------------
    _buildHouse() {
        const g = new THREE.Group();

        const redMat   = new THREE.MeshLambertMaterial({ color: 0xe53935 });
        const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
        const darkMat  = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
        const doorMat  = new THREE.MeshLambertMaterial({ color: 0x4e342e });
        const glassMat = new THREE.MeshLambertMaterial({ color: 0x81d4fa, transparent: true, opacity: 0.75 });
        const roofMat  = new THREE.MeshLambertMaterial({ color: 0x5d1a1a });

        // Main body
        const body = new THREE.Mesh(new THREE.BoxGeometry(7, 4.2, 5), redMat);
        body.position.y = 2.1;
        body.castShadow = true; body.receiveShadow = true;
        g.add(body);

        // White trim strips (horizontal)
        for (const y of [0.05, 4.15]) {
            const trim = new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.18, 5.1), whiteMat);
            trim.position.y = y;
            g.add(trim);
        }

        // Roof (pyramid = 4-sided cone)
        const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 2.8, 4), roofMat);
        roof.position.y = 5.6;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        g.add(roof);

        // Chimney
        const chim = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.8, 0.85), darkMat);
        chim.position.set(2.2, 6.1, -0.6);
        chim.castShadow = true;
        g.add(chim);

        // Door (centered on front face z=+2.5)
        const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.55, 2.55, 0.12), whiteMat);
        doorFrame.position.set(0, 1.27, 2.57);
        g.add(doorFrame);
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.12), doorMat);
        door.position.set(0, 1.1, 2.62);
        g.add(door);
        // Door knob
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), whiteMat);
        knob.position.set(0.44, 1.1, 2.7);
        g.add(knob);

        // Windows (2 on front face)
        for (const wx of [-2.3, 2.3]) {
            const wFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 0.12), whiteMat);
            wFrame.position.set(wx, 2.6, 2.57);
            g.add(wFrame);
            const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.12), glassMat);
            win.position.set(wx, 2.6, 2.62);
            g.add(win);
            // Cross dividers
            for (const axis of ['h', 'v']) {
                const dg = axis === 'h'
                    ? new THREE.BoxGeometry(1.15, 0.06, 0.06)
                    : new THREE.BoxGeometry(0.06, 1.15, 0.06);
                const div = new THREE.Mesh(dg, whiteMat);
                div.position.set(wx, 2.6, 2.66);
                g.add(div);
            }
        }

        // Side windows
        for (const sx of [-3.52, 3.52]) {
            const wFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 1.3), whiteMat);
            wFrame.position.set(sx, 2.6, 0);
            g.add(wFrame);
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 1.0), glassMat);
            win.position.set(sx + (sx > 0 ? -0.02 : 0.02), 2.6, 0);
            g.add(win);
        }

        g.position.set(0, 0, -8);
        this.scene.add(g);

        // Physics: main box for ball collision
        this.physics.addBox(3.5, 2.1, 2.5, 0, 2.1, -8, this.physics.wallMat);
        // Roof collision (wide box approximation)
        this.physics.addBox(3.5, 0.5, 2.5, 0, 4.5, -8, this.physics.wallMat);
    }

    // ---- Tree ------------------------------------------------------------
    _buildTree() {
        const g = new THREE.Group();

        // Trunk
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.40, 3.2, 7),
            new THREE.MeshLambertMaterial({ color: 0x6d4c41 })
        );
        trunk.position.y = 1.6;
        trunk.castShadow = true;
        g.add(trunk);

        // Leaf clusters – low-poly look
        const leafMat = new THREE.MeshLambertMaterial({ color: 0x43a047 });
        const leafDark = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });

        const clusters = [
            [0,   5.0,  0,   2.4, leafMat],
            [1.4, 4.4,  0.9, 1.7, leafDark],
            [-1.2,4.2, -0.7, 1.6, leafMat],
            [0.6, 5.7, -1.0, 1.5, leafDark],
            [-0.9,5.5,  0.8, 1.4, leafMat],
            [0,   6.3,  0.2, 1.2, leafDark],
        ];
        clusters.forEach(([x, y, z, r, mat]) => {
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 5, 4), mat);
            leaf.position.set(x, y, z);
            leaf.castShadow = true;
            g.add(leaf);
        });

        g.position.set(6, 0, -3);
        this.scene.add(g);

        // Trunk physics
        this.physics.addCylinder(0.3, 0.42, 3.2, 6, 1.6, -3, this.physics.wallMat);
    }

    // ---- Chain-link fence ------------------------------------------------
    _buildFence() {
        const postMat = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });
        const railMat = new THREE.MeshLambertMaterial({ color: 0x757575 });
        const wireMat = new THREE.MeshLambertMaterial({
            color: 0x9e9e9e, transparent: true, opacity: 0.55, side: THREE.DoubleSide
        });

        const YARD = 10;   // fence at ±10
        const POST_H = 1.6;
        const POST_SPACING = 2.0;

        // Four sides
        const sides = [
            { start: [-YARD, 0], end: [YARD, 0], fixed: -YARD, axis: 'z' },
            { start: [-YARD, 0], end: [YARD, 0], fixed:  YARD, axis: 'z' },
            { start: [-YARD, 0], end: [YARD, 0], fixed: -YARD, axis: 'x' },
            { start: [-YARD, 0], end: [YARD, 0], fixed:  YARD, axis: 'x' },
        ];

        sides.forEach(({ fixed, axis }) => {
            for (let t = -YARD; t <= YARD; t += POST_SPACING) {
                const post = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.055, 0.055, POST_H, 6),
                    postMat
                );
                post.position.set(
                    axis === 'x' ? fixed : t,
                    POST_H / 2,
                    axis === 'z' ? fixed : t
                );
                post.castShadow = true;
                this.scene.add(post);
            }

            // Horizontal rails at two heights
            for (const ry of [0.35, 1.25]) {
                const len = YARD * 2;
                const railGeo = axis === 'z'
                    ? new THREE.BoxGeometry(len, 0.04, 0.04)
                    : new THREE.BoxGeometry(0.04, 0.04, len);
                const rail = new THREE.Mesh(railGeo, railMat);
                rail.position.set(
                    axis === 'x' ? fixed : 0,
                    ry,
                    axis === 'z' ? fixed : 0
                );
                this.scene.add(rail);
            }

            // Wire mesh panel (single flat plane to fake chain-link)
            const wLen = YARD * 2;
            const wireGeo = axis === 'z'
                ? new THREE.PlaneGeometry(wLen, POST_H)
                : new THREE.PlaneGeometry(POST_H, wLen);
            const wireMesh = new THREE.Mesh(wireGeo, wireMat);
            wireMesh.position.set(
                axis === 'x' ? fixed : 0,
                POST_H / 2,
                axis === 'z' ? fixed : 0
            );
            if (axis === 'x') wireMesh.rotation.y = Math.PI / 2;
            this.scene.add(wireMesh);
        });

        // Physics walls (invisible, match visual fence)
        const H = POST_H / 2, T = 0.12;
        this.physics.addBox(YARD, H, T, 0,     H, -YARD, this.physics.wallMat); // north
        this.physics.addBox(YARD, H, T, 0,     H,  YARD, this.physics.wallMat); // south
        this.physics.addBox(T, H, YARD, -YARD, H,  0,    this.physics.wallMat); // west
        this.physics.addBox(T, H, YARD,  YARD, H,  0,    this.physics.wallMat); // east
    }

    // ---- Clouds ----------------------------------------------------------
    _buildClouds() {
        const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });

        for (let i = 0; i < 7; i++) {
            const g = new THREE.Group();
            const count = 3 + Math.floor(Math.random() * 3);
            for (let j = 0; j < count; j++) {
                const r = 0.7 + Math.random() * 0.9;
                const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 5, 4), mat);
                puff.position.set(
                    (j - count / 2) * 1.3 + (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 0.35,
                    (Math.random() - 0.5) * 0.5
                );
                g.add(puff);
            }
            g.position.set(
                (Math.random() - 0.5) * 50,
                18 + Math.random() * 6,
                (Math.random() - 0.5) * 50
            );
            g.userData.speed = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.6);
            this.scene.add(g);
            this.clouds.push(g);
        }
    }

    // ---- Decorations -----------------------------------------------------
    _buildDecorations() {
        // Mailbox at front yard near fence
        const boxMat  = new THREE.MeshLambertMaterial({ color: 0x1565c0 });
        const poleMat = new THREE.MeshLambertMaterial({ color: 0x616161 });

        const mailGroup = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), poleMat);
        pole.position.y = 0.5;
        mailGroup.add(pole);

        // Box body
        const mbox = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 0.6), boxMat);
        mbox.position.y = 1.16;
        mbox.castShadow = true;
        mailGroup.add(mbox);

        // Curved lid (half-cylinder)
        const lid = new THREE.Mesh(
            new THREE.CylinderGeometry(0.165, 0.165, 0.6, 8, 1, false, 0, Math.PI),
            boxMat
        );
        lid.rotation.z = Math.PI / 2;
        lid.rotation.y = Math.PI / 2;
        lid.position.y = 1.32;
        mailGroup.add(lid);

        mailGroup.position.set(-3, 0, 9.2);
        this.scene.add(mailGroup);

        // A few flowers scattered around
        const stemMat   = new THREE.MeshLambertMaterial({ color: 0x558b2f });
        const petalMats = [
            new THREE.MeshLambertMaterial({ color: 0xf44336 }),
            new THREE.MeshLambertMaterial({ color: 0xffeb3b }),
            new THREE.MeshLambertMaterial({ color: 0xe91e63 }),
            new THREE.MeshLambertMaterial({ color: 0xff9800 }),
        ];
        const flowerSpots = [[-7,3],[-8,-1],[-6,-5],[7,2],[8,-4],[4,7],[-3,-6]];

        flowerSpots.forEach(([fx, fz], i) => {
            const fg = new THREE.Group();
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5), stemMat);
            stem.position.y = 0.2;
            fg.add(stem);
            const petal = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 5, 4),
                petalMats[i % petalMats.length]
            );
            petal.position.y = 0.45;
            fg.add(petal);
            fg.position.set(fx, 0, fz);
            this.scene.add(fg);
        });
    }

    // ---- Per-frame update ------------------------------------------------
    update(dt) {
        this.clouds.forEach(cloud => {
            cloud.position.x += cloud.userData.speed * dt;
            if (cloud.position.x >  28) cloud.position.x = -28;
            if (cloud.position.x < -28) cloud.position.x =  28;
        });
    }
}
