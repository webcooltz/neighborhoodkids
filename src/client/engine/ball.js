// ball.js – soccer ball with physics body
import * as THREE from 'three';

const RADIUS = 0.23;

export class Ball {
    constructor(scene, physics) {
        this.scene   = scene;
        this.physics = physics;
        this.radius  = RADIUS;

        this._buildMesh();
        this._buildBody();
    }

    // ---- Mesh ------------------------------------------------------------
    _buildMesh() {
        const whiteMat = new THREE.MeshLambertMaterial({ color: 0xfafafa });
        const blackMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

        const geo = new THREE.SphereGeometry(RADIUS, 10, 8);
        this.mesh = new THREE.Mesh(geo, whiteMat);
        this.mesh.castShadow = true;

        // Hexagonal patch decoration (just dark spots placed on sphere surface)
        const patchDirs = [
            [0, 1, 0], [0, -1, 0],
            [1, 0, 0], [-1, 0, 0],
            [0, 0, 1], [0, 0, -1],
            [0.7, 0.7, 0], [-0.7, 0.7, 0],
            [0.7, -0.7, 0], [-0.7, -0.7, 0],
        ];
        patchDirs.forEach(([nx, ny, nz]) => {
            const patchGeo = new THREE.CircleGeometry(RADIUS * 0.38, 5);
            const patch = new THREE.Mesh(patchGeo, blackMat);
            const dir = new THREE.Vector3(nx, ny, nz).normalize();
            patch.position.copy(dir.clone().multiplyScalar(RADIUS * 1.01));
            patch.lookAt(dir.clone().multiplyScalar(2));
            this.mesh.add(patch);
        });

        this.scene.add(this.mesh);
    }

    // ---- Physics body ----------------------------------------------------
    _buildBody() {
        this.body = this.physics.addSphere(
            RADIUS, 0, 0.5, 5,
            this.physics.ballMat,
            0.43    // mass (kg)
        );
        this.body.linearDamping  = 0.28;   // rolling resistance
        this.body.angularDamping = 0.38;
        this.body.allowSleep = true;
        this.body.sleepSpeedLimit = 0.15;
        this.body.sleepTimeLimit  = 0.8;
    }

    // ---- API -------------------------------------------------------------
    applyKick(dir, power) {
        this.body.wakeUp();
        // dir is a normalised THREE.Vector3 (horizontal)
        const h = 10 + power * 40;      // horizontal speed
        const v =  2 + power * 8;       // loft

        this.body.velocity.set(
            dir.x * h,
            v,
            dir.z * h
        );
        // Spin the ball for visual drama
        this.body.angularVelocity.set(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8
        );
    }

    // Light tap when player dribbles close
    nudge(dir) {
        this.body.wakeUp();
        this.body.velocity.x += dir.x * 4;
        this.body.velocity.z += dir.z * 4;
    }

    getPosition() { return this.body.position; }   // CANNON.Vec3

    getSpeed() {
        const v = this.body.velocity;
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    reset() {
        this.body.position.set(0, 0.5, 5);
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.body.wakeUp();
    }

    // ---- Per-frame -------------------------------------------------------
    update() {
        // Sync Three mesh to cannon body
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);

        // Hard floor safety
        if (this.body.position.y < this.radius) {
            this.body.position.y = this.radius;
            if (this.body.velocity.y < 0) this.body.velocity.y *= -0.4;
        }

        // Soft yard boundary – push back if escaped
        const BOUND = 9.6;
        const p = this.body.position;
        if (Math.abs(p.x) > BOUND) {
            this.body.position.x = Math.sign(p.x) * BOUND;
            this.body.velocity.x *= -0.5;
        }
        if (Math.abs(p.z) > BOUND) {
            this.body.position.z = Math.sign(p.z) * BOUND;
            this.body.velocity.z *= -0.5;
        }
    }
}
