// player.js – low-poly cartoon child character
import * as THREE from 'three';

export class Player {
    constructor(scene) {
        this.scene = scene;

        this.position  = new THREE.Vector3(0, 0, 4);
        this.velocity  = new THREE.Vector3();
        this.facing    = 0;           // Y rotation in radians

        this.onGround  = true;
        this.yVel      = 0;

        this.walkPhase = 0;
        this.isKicking = false;
        this.kickPhase = 0;           // 0–1 over kickDuration
        this.kickDuration = 0.38;

        this.parts = {};
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this._build();
    }

    // ---- Build mesh ------------------------------------------------------
    _build() {
        const skin  = new THREE.MeshLambertMaterial({ color: 0xffccaa });
        const hair  = new THREE.MeshLambertMaterial({ color: 0xc8961c });
        const shirt = new THREE.MeshLambertMaterial({ color: 0x1565c0 });
        const pants = new THREE.MeshLambertMaterial({ color: 0x283593 });
        const shoes = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const white = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
        const eye   = new THREE.MeshLambertMaterial({ color: 0x111111 });

        // Head
        this.parts.head = this._mesh(new THREE.BoxGeometry(0.52, 0.56, 0.52), skin, 0, 1.72, 0);

        // Hair – sits on top of head
        const hairTop = this._mesh(new THREE.BoxGeometry(0.54, 0.22, 0.54), hair, 0, 0.19, 0);
        const hairBack = this._mesh(new THREE.BoxGeometry(0.44, 0.16, 0.08), hair, 0, 0.04, -0.26);
        this.parts.head.add(hairTop, hairBack);

        // Eyes
        for (const ex of [-0.12, 0.12]) {
            const e = this._mesh(new THREE.BoxGeometry(0.1, 0.08, 0.02), eye, ex, 0.06, 0.27);
            this.parts.head.add(e);
        }

        // Torso
        this.parts.torso = this._mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), shirt, 0, 1.1, 0);

        // White shirt stripe
        const stripe = this._mesh(new THREE.BoxGeometry(0.51, 0.08, 0.31), white, 0, 0.06, 0);
        this.parts.torso.add(stripe);

        // Arms – pivoted at shoulder
        this.parts.lArmPivot = new THREE.Group();
        this.parts.lArmPivot.position.set(-0.34, 1.37, 0);
        this.parts.lArm = this._mesh(new THREE.BoxGeometry(0.18, 0.48, 0.18), shirt, 0, -0.24, 0);
        // Hand
        const lHand = this._mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), skin, 0, -0.52, 0);
        this.parts.lArmPivot.add(this.parts.lArm, lHand);

        this.parts.rArmPivot = new THREE.Group();
        this.parts.rArmPivot.position.set(0.34, 1.37, 0);
        this.parts.rArm = this._mesh(new THREE.BoxGeometry(0.18, 0.48, 0.18), shirt, 0, -0.24, 0);
        const rHand = this._mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), skin, 0, -0.52, 0);
        this.parts.rArmPivot.add(this.parts.rArm, rHand);

        // Legs – pivoted at hip
        this.parts.lLegPivot = new THREE.Group();
        this.parts.lLegPivot.position.set(-0.14, 0.8, 0);
        this.parts.lLeg = this._mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), pants, 0, -0.25, 0);
        const lShoe = this._mesh(new THREE.BoxGeometry(0.22, 0.12, 0.32), shoes, 0, -0.57, 0.05);
        this.parts.lLegPivot.add(this.parts.lLeg, lShoe);

        this.parts.rLegPivot = new THREE.Group();
        this.parts.rLegPivot.position.set(0.14, 0.8, 0);
        this.parts.rLeg = this._mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), pants, 0, -0.25, 0);
        const rShoe = this._mesh(new THREE.BoxGeometry(0.22, 0.12, 0.32), shoes, 0, -0.57, 0.05);
        this.parts.rLegPivot.add(this.parts.rLeg, rShoe);

        this.group.add(
            this.parts.head,
            this.parts.torso,
            this.parts.lArmPivot, this.parts.rArmPivot,
            this.parts.lLegPivot, this.parts.rLegPivot,
        );

        // Shadows on every part
        this.group.traverse(obj => {
            if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; }
        });
    }

    _mesh(geo, mat, x, y, z) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        return m;
    }

    // ---- Update ----------------------------------------------------------
    update(dt, input, camTheta) {
        const moving  = input.forward || input.backward || input.left || input.right;
        const sprint  = input.sprint;

        // Movement direction in world space (camera-relative)
        let mx = 0, mz = 0;
        if (input.forward)  { mx -= Math.sin(camTheta); mz -= Math.cos(camTheta); }
        if (input.backward) { mx += Math.sin(camTheta); mz += Math.cos(camTheta); }
        if (input.left)     { mx -= Math.cos(camTheta); mz += Math.sin(camTheta); }
        if (input.right)    { mx += Math.cos(camTheta); mz -= Math.sin(camTheta); }

        const len = Math.sqrt(mx * mx + mz * mz);
        if (len > 0) { mx /= len; mz /= len; }

        const spd = sprint ? 10 : 6;
        this.velocity.x = mx * spd;
        this.velocity.z = mz * spd;

        // Jump
        if (input.jump && this.onGround) {
            this.yVel = 9;
            this.onGround = false;
        }

        // Gravity
        if (!this.onGround) {
            this.yVel -= 22 * dt;
            this.position.y += this.yVel * dt;
            if (this.position.y <= 0) {
                this.position.y = 0;
                this.onGround  = true;
                this.yVel = 0;
            }
        }

        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;

        // Yard boundary clamp
        const LIMIT = 9.4;
        this.position.x = Math.max(-LIMIT, Math.min(LIMIT, this.position.x));
        this.position.z = Math.max(-LIMIT, Math.min(LIMIT, this.position.z));

        // Smooth turn toward movement direction
        if (len > 0.01) {
            const target = Math.atan2(mx, mz);
            let diff = target - this.facing;
            while (diff >  Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.facing += diff * Math.min(1, dt * 12);
        }

        this.group.position.copy(this.position);
        this.group.rotation.y = this.facing;

        this._animate(dt, moving, sprint);
    }

    _animate(dt, moving, sprint) {
        if (moving) {
            this.walkPhase += dt * (sprint ? 9 : 6);
        } else {
            this.walkPhase *= 0.88; // coast to stop
        }

        const swing = Math.sin(this.walkPhase) * (moving ? 0.65 : 0);

        if (this.isKicking) {
            // Kick animation: wind-up then snap forward
            this.kickPhase += dt / this.kickDuration;
            const t = this.kickPhase;

            if (t < 0.4) {
                // Wind up – right leg pulls back
                this.parts.rLegPivot.rotation.x = -0.5 * (t / 0.4);
            } else if (t < 0.8) {
                // Strike – right leg swings forward
                this.parts.rLegPivot.rotation.x = -0.5 + 1.4 * ((t - 0.4) / 0.4);
            } else if (t < 1.0) {
                // Follow through
                this.parts.rLegPivot.rotation.x = THREE.MathUtils.lerp(0.9, 0, (t - 0.8) / 0.2);
            } else {
                this.isKicking = false;
                this.kickPhase = 0;
                this.parts.rLegPivot.rotation.x = 0;
            }
            // Arms swing opposite during kick
            this.parts.lArmPivot.rotation.x =  0.55;
            this.parts.rArmPivot.rotation.x = -0.3;
        } else {
            // Walk / idle animation
            this.parts.lLegPivot.rotation.x =  swing;
            this.parts.rLegPivot.rotation.x = -swing;
            this.parts.lArmPivot.rotation.x = -swing * 0.5;
            this.parts.rArmPivot.rotation.x =  swing * 0.5;
        }

        // In-air pose
        if (!this.onGround) {
            this.parts.lLegPivot.rotation.x = 0.35;
            this.parts.rLegPivot.rotation.x = 0.35;
            this.parts.lArmPivot.rotation.x = -0.6;
            this.parts.rArmPivot.rotation.x = -0.6;
        }

        // Idle head bob
        if (!moving && !this.isKicking && this.onGround) {
            this.parts.head.position.y = 1.72 + Math.sin(Date.now() * 0.0018) * 0.025;
        }
    }

    // Call from main when player is kicking
    triggerKick() {
        if (this.isKicking) return;
        this.isKicking = true;
        this.kickPhase = 0;
    }

    // World-space position of the foot contact point (front of player)
    getKickOrigin() {
        return new THREE.Vector3(
            this.position.x + Math.sin(this.facing) * 0.9,
            this.position.y + 0.25,
            this.position.z + Math.cos(this.facing) * 0.9
        );
    }
}
