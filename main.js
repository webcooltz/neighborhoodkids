// main.js – game loop, input, camera, audio
import * as THREE from 'three';
import { Physics } from './physics.js';
import { World   } from './world.js';
import { Player  } from './player.js';
import { Ball    } from './ball.js';

// ── Renderer ──────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ── Scene & camera ────────────────────────────────────────────────────────────
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 5, 12);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Game objects ──────────────────────────────────────────────────────────────
const physics = new Physics();
const world   = new World(scene, physics);
const player  = new Player(scene);
const ball    = new Ball(scene, physics);

// ── Camera orbit state ───────────────────────────────────────────────────────
let camTheta = 0;       // horizontal angle around player
let camPhi   = 0.38;    // vertical angle (up from horizontal)
const CAM_DIST   = 7.5;
const camLookAt  = new THREE.Vector3();
const camDesired = new THREE.Vector3();

function updateCamera(dt) {
    const px = player.position.x;
    const py = player.position.y + 1.1;
    const pz = player.position.z;

    camDesired.set(
        px + Math.sin(camTheta) * Math.cos(camPhi) * CAM_DIST,
        py + Math.sin(camPhi)   * CAM_DIST,
        pz + Math.cos(camTheta) * Math.cos(camPhi) * CAM_DIST
    );

    // Smooth follow
    camera.position.lerp(camDesired, 1 - Math.pow(0.01, dt));
    camLookAt.lerp(new THREE.Vector3(px, py, pz), 1 - Math.pow(0.01, dt));
    camera.lookAt(camLookAt);
}

// ── Input state ───────────────────────────────────────────────────────────────
const keys = { forward: false, backward: false, left: false, right: false, sprint: false, jump: false };
let jumpQueued = false;

document.addEventListener('keydown', e => {
    switch (e.code) {
        case 'KeyW': case 'ArrowUp':    keys.forward   = true;  break;
        case 'KeyS': case 'ArrowDown':  keys.backward  = true;  break;
        case 'KeyA': case 'ArrowLeft':  keys.left      = true;  break;
        case 'KeyD': case 'ArrowRight': keys.right     = true;  break;
        case 'ShiftLeft': case 'ShiftRight': keys.sprint = true; break;
        case 'Space':
            e.preventDefault();
            if (player.onGround) jumpQueued = true;
            break;
        case 'KeyR': ball.reset(); break;
    }
});
document.addEventListener('keyup', e => {
    switch (e.code) {
        case 'KeyW': case 'ArrowUp':    keys.forward   = false; break;
        case 'KeyS': case 'ArrowDown':  keys.backward  = false; break;
        case 'KeyA': case 'ArrowLeft':  keys.left      = false; break;
        case 'KeyD': case 'ArrowRight': keys.right     = false; break;
        case 'ShiftLeft': case 'ShiftRight': keys.sprint = false; break;
    }
});

// ── Pointer lock ─────────────────────────────────────────────────────────────
let locked = false;
const clickPrompt = document.getElementById('click-prompt');
const crosshair   = document.getElementById('crosshair');

canvas.addEventListener('click', () => { if (!locked) canvas.requestPointerLock(); });
document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    clickPrompt.style.display = locked ? 'none' : 'flex';
    crosshair.style.display   = locked ? 'block' : 'none';
    if (locked) { audioCtx.resume(); initBirds(); }
});

document.addEventListener('mousemove', e => {
    if (!locked) return;
    camTheta -= e.movementX * 0.003;
    camPhi   -= e.movementY * 0.003;
    camPhi = Math.max(0.05, Math.min(1.25, camPhi));
});

// ── Kick / power meter ───────────────────────────────────────────────────────
const powerWrap  = document.getElementById('power-meter-wrap');
const powerFill  = document.getElementById('power-fill');
const nearBallEl = document.getElementById('near-ball');
const kickCountEl= document.getElementById('kick-count');
const speedEl    = document.getElementById('speed-badge');

let charging    = false;
let chargeTime  = 0;
const MAX_CHARGE = 1.6;   // seconds to reach full power
let kickCount   = 0;
let kickCooldown = 0;

function distToBall() {
    const bp = ball.getPosition();
    return player.position.distanceTo(new THREE.Vector3(bp.x, bp.y, bp.z));
}

document.addEventListener('mousedown', e => {
    if (!locked || e.button !== 0) return;
    if (kickCooldown > 0) return;
    if (distToBall() <= 2.6) {
        charging   = true;
        chargeTime = 0;
    }
});

document.addEventListener('mouseup', e => {
    if (e.button !== 0) return;
    if (charging) {
        releaseKick(Math.min(1, chargeTime / MAX_CHARGE));
        charging = false;
        chargeTime = 0;
        powerWrap.style.display = 'none';
        powerFill.style.width   = '0%';
    }
});

function releaseKick(power) {
    if (distToBall() > 2.8) return;

    const bp  = ball.getPosition();
    const bv3 = new THREE.Vector3(bp.x, bp.y, bp.z);

    // Kick direction: player → ball (horizontal), fall back to facing
    let dir = new THREE.Vector3().subVectors(bv3, player.position).normalize();
    dir.y = 0;
    if (dir.lengthSq() < 0.01) {
        dir.set(Math.sin(player.facing), 0, Math.cos(player.facing));
    }
    dir.normalize();

    player.triggerKick();
    ball.applyKick(dir, power);
    playKick(power);

    kickCount++;
    kickCountEl.textContent = `Kicks: ${kickCount}`;
    kickCooldown = 0.3;
}

// ── Audio ─────────────────────────────────────────────────────────────────────
const audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
let birdsStarted = false;

function playKick(power) {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(70 + power * 60, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, audioCtx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
    osc.start(); osc.stop(audioCtx.currentTime + 0.22);
}

let rollTimer = 0;
function maybePlayRoll(speed) {
    rollTimer -= 1 / 60;
    if (rollTimer > 0 || speed < 1.5) return;
    rollTimer = 0.12;

    const bufSize = 512;
    const buf     = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const src  = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    const vol  = Math.min(1, speed / 8) * 0.055;
    src.buffer = buf;
    src.connect(gain); gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    src.start(); src.stop(audioCtx.currentTime + 0.12);
}

function initBirds() {
    if (birdsStarted) return;
    birdsStarted = true;

    const chirp = () => {
        const now = audioCtx.currentTime;
        const freq = 700 + Math.random() * 600;
        for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
            const t = now + i * 0.14;
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g); g.connect(audioCtx.destination);
            o.type = 'sine';
            o.frequency.setValueAtTime(freq + i * 80, t);
            o.frequency.linearRampToValueAtTime(freq + i * 80 + 180, t + 0.06);
            o.frequency.linearRampToValueAtTime(freq + i * 80, t + 0.12);
            g.gain.setValueAtTime(0.065, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
            o.start(t); o.stop(t + 0.15);
        }
        setTimeout(chirp, 2200 + Math.random() * 4000);
    };
    setTimeout(chirp, 600);
}

// ── Game loop ────────────────────────────────────────────────────────────────
let prevTime = performance.now();

function tick() {
    requestAnimationFrame(tick);

    const now = performance.now();
    const dt  = Math.min((now - prevTime) / 1000, 0.05);   // cap delta at 50ms
    prevTime  = now;

    // Physics
    physics.step(dt);

    // Player – consume queued jump once per frame
    const jumpInput = jumpQueued;
    jumpQueued = false;
    player.update(dt, { ...keys, jump: jumpInput }, camTheta);

    // Ball
    ball.update();

    // World (cloud drift, etc.)
    world.update(dt);

    // Kick cooldown
    if (kickCooldown > 0) kickCooldown -= dt;

    // Power meter while charging
    if (charging) {
        chargeTime += dt;
        const pct = Math.min(1, chargeTime / MAX_CHARGE) * 100;
        powerWrap.style.display = 'flex';
        powerFill.style.width   = `${pct}%`;
        if (chargeTime >= MAX_CHARGE) {
            releaseKick(1);
            charging   = false;
            chargeTime = 0;
            powerWrap.style.display = 'none';
            powerFill.style.width   = '0%';
        }
    }

    // Near-ball hint
    const nearBall = distToBall() <= 2.4;
    nearBallEl.style.display = (locked && nearBall && kickCooldown <= 0) ? 'block' : 'none';

    // Roll sound
    maybePlayRoll(ball.getSpeed());

    // Gentle nudge when player walks into ball (no kick needed)
    if (nearBall && distToBall() < 0.75 && !player.isKicking) {
        const bp  = ball.getPosition();
        const dir = new THREE.Vector3(bp.x - player.position.x, 0, bp.z - player.position.z).normalize();
        ball.nudge(dir);
    }

    // Speed HUD
    speedEl.textContent = `Speed: ${ball.getSpeed().toFixed(1)}`;

    updateCamera(dt);
    renderer.render(scene, camera);
}

tick();
