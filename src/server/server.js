/* Minimal WebSocket relay for the Neighborhood Lobby.
   Tracks connected players and broadcasts position updates to everyone.

   Run:
     npm install
     npm start          (listens on ws://localhost:8787)

   Then open lobby.html. The client auto-connects to ws://<host>:8787.
   To play across machines, host this on a server and set WS_URL in lobby.html. */

const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8787;

// HTTP server: handles the editor's "Save layout" POST + CORS preflight.
// (WebSocket server is attached to it below.)
// Paths are relative to this file (src/server/); the client lives in src/client/.
const ALLOWED_LAYOUTS = {                                   // whitelist of saveable levels
  lobby: '../client/js/lobby_layout.js',
  brooklynn: '../client/js/brooklynn_layout.js',
};
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Health check: GET / reports that the server is up + current player count.
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(liveCount() + ' players connected');
    return;
  }

  if (req.method === 'POST' && req.url === '/save-layout') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 2e6) req.destroy(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        // Any level can save its own layout: sanitize the name → js/<level>_layout.js
        const safe = String(payload.level || 'lobby').toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!safe) { res.writeHead(400); res.end('bad level'); return; }
        const file = ALLOWED_LAYOUTS[safe] || ('../client/js/' + safe + '_layout.js');
        // sanity: layout must be a plain object
        const layout = payload.layout || {};
        const out = 'window.' + (payload.global || 'LOBBY_LAYOUT') + ' = ' +
          JSON.stringify(layout, null, 2) + ';\n';
        fs.writeFileSync(path.join(__dirname, file), out);
        console.log('Saved layout → ' + file);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, file }));
      } catch (e) {
        res.writeHead(500); res.end('save failed: ' + e.message);
      }
    });
    return;
  }
  res.writeHead(404); res.end('not found');
});

const wss = new WebSocketServer({ server });

let nextId = 1;
const players = new Map(); // ws -> {id,name,char,x,z,ry,joined}
const placed = [];         // { owner, entry } for every object placed this session
const MAX_OBJECTS = 10;    // live objects per player
const PLACE_COOLDOWN = 1000;     // ms between placements
const GLOBAL_OBJECT_CAP = 500;   // safety ceiling for the whole world

// Validate/trim an incoming object so a client can't push junk or huge payloads.
function sanitizeObj(o) {
  if (!o || typeof o !== 'object') return null;
  const id = String(o.id || '').slice(0, 40);
  const type = String(o.type || '').slice(0, 40);
  if (!id || !type) return null;
  const num = (v) => { v = +v; return Number.isFinite(v) ? Math.max(-1000, Math.min(1000, v)) : 0; };
  const e = { id, type, x: num(o.x), y: num(o.y), z: num(o.z), ry: num(o.ry) };
  if (o.text != null) e.text = String(o.text).slice(0, 200);
  return e;
}

function broadcast(obj, exceptWs) {
  const data = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === 1 && client !== exceptWs) client.send(data);
  }
}

// Count only players who have actually joined the town (not menu observers).
function liveCount() {
  let n = 0;
  for (const p of players.values()) if (p.joined) n++;
  return n;
}
function broadcastCount() {
  broadcast({ t: 'count', n: liveCount() });
}

wss.on('connection', (ws) => {
  const id = nextId++;
  const self = { id, name: 'Player', char: 'dawson', x: 0, z: 9, ry: Math.PI, ride: 'none', hold: 'none', joined: false, lastPlace: 0, placeCount: 0 };
  players.set(ws, self);

  // Tell the newcomer the current count right away (menu badge / lobby HUD).
  ws.send(JSON.stringify({ t: 'count', n: liveCount() }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    if (msg.t === 'join') {
      self.joined = true;
      self.name = String(msg.name || 'Player').slice(0, 16);
      self.char = String(msg.char || 'dawson');
      self.ride = String(msg.ride || 'none');
      self.hold = String(msg.hold || 'none');
      self.x = +msg.x || 0; self.z = +msg.z || 0; self.ry = +msg.ry || 0;
      // Send current roster (joined players) to the newcomer
      const roster = [];
      for (const p of players.values()) if (p.joined && p !== self) roster.push(p);
      ws.send(JSON.stringify({ t: 'init', id, players: roster, objs: placed.map((p) => p.entry) }));
      // Tell everyone else about the newcomer + new count
      broadcast({ t: 'join', player: self }, ws);
      broadcastCount();
    } else if (msg.t === 'pos' && self.joined) {
      self.x = +msg.x; self.z = +msg.z; self.ry = +msg.ry;
      broadcast({ t: 'pos', id, x: self.x, z: self.z, ry: self.ry }, ws);
    } else if (msg.t === 'ride' && self.joined) {
      self.ride = String(msg.ride || 'none');
      broadcast({ t: 'ride', id, ride: self.ride }, ws);
    } else if (msg.t === 'hold' && self.joined) {
      self.hold = String(msg.hold || 'none');
      broadcast({ t: 'hold', id, hold: self.hold }, ws);
    } else if (msg.t === 'use' && self.joined) {
      // Transient "I used my gadget" event — friends play the matching effect.
      broadcast({ t: 'use', id, hold: String(msg.hold || 'none').slice(0, 20) }, ws);
    } else if (msg.t === 'place' && self.joined) {
      const now = Date.now();
      if (now - self.lastPlace < PLACE_COOLDOWN) {
        ws.send(JSON.stringify({ t: 'reject', reason: '1 second between placements.' })); return;
      }
      if (self.placeCount >= MAX_OBJECTS) {
        ws.send(JSON.stringify({ t: 'reject', reason: MAX_OBJECTS + ' object limit reached.' })); return;
      }
      if (placed.length >= GLOBAL_OBJECT_CAP) {
        ws.send(JSON.stringify({ t: 'reject', reason: 'World is full.' })); return;
      }
      const entry = sanitizeObj(msg.obj);
      if (!entry) return;
      self.lastPlace = now; self.placeCount++;
      placed.push({ owner: id, entry });
      broadcast({ t: 'place', obj: entry, owner: id }, ws);
    } else if (msg.t === 'chat' && self.joined) {
      const text = String(msg.text || '').slice(0, 200);
      if (text) broadcast({ t: 'chat', id, name: self.name, text }, ws);
    }
  });

  ws.on('close', () => {
    const wasJoined = self.joined;
    players.delete(ws);
    if (wasJoined) broadcast({ t: 'leave', id });
    broadcastCount();
  });
});

server.listen(PORT, () => {
  console.log('Lobby server listening on ws://localhost:' + PORT + ' (HTTP save endpoint on same port)');
});
