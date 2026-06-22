// physics.js – cannon-es world wrapper
import * as CANNON from 'cannon-es';

export class Physics {
    constructor() {
        this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
        this.world.allowSleep = true;

        // Named materials so contact responses can be tuned
        this.groundMat = new CANNON.Material('ground');
        this.ballMat   = new CANNON.Material('ball');
        this.wallMat   = new CANNON.Material('wall');

        // Ball ↔ ground: moderate friction, nice bounce
        this.world.addContactMaterial(new CANNON.ContactMaterial(
            this.groundMat, this.ballMat,
            { friction: 0.55, restitution: 0.55 }
        ));
        // Ball ↔ wall: less friction, snappier bounce
        this.world.addContactMaterial(new CANNON.ContactMaterial(
            this.wallMat, this.ballMat,
            { friction: 0.25, restitution: 0.65 }
        ));
    }

    // Flat box (static by default when mass=0)
    addBox(halfX, halfY, halfZ, px, py, pz, material, mass = 0) {
        const body = new CANNON.Body({
            mass,
            shape: new CANNON.Box(new CANNON.Vec3(halfX, halfY, halfZ)),
            material: material || this.wallMat,
            position: new CANNON.Vec3(px, py, pz),
        });
        this.world.addBody(body);
        return body;
    }

    // Sphere (dynamic when mass > 0)
    addSphere(radius, px, py, pz, material, mass = 0) {
        const body = new CANNON.Body({
            mass,
            shape: new CANNON.Sphere(radius),
            material: material || this.ballMat,
            position: new CANNON.Vec3(px, py, pz),
        });
        this.world.addBody(body);
        return body;
    }

    // Cylinder – height along Y, static by default
    addCylinder(radiusTop, radiusBottom, height, px, py, pz, material, mass = 0) {
        const body = new CANNON.Body({
            mass,
            shape: new CANNON.Cylinder(radiusTop, radiusBottom, height, 8),
            material: material || this.wallMat,
            position: new CANNON.Vec3(px, py, pz),
        });
        this.world.addBody(body);
        return body;
    }

    step(dt) {
        this.world.step(1 / 60, dt, 3);
    }
}
