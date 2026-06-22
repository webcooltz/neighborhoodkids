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
const ALLOWED_LAYOUTS = { lobby: '../client/js/lobby_layout.js' };  // whitelist of saveable levels
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/save-layout') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 2e6) req.destroy(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const file = ALLOWED_LAYOUTS[payload.level || 'lobby'];
        if (!file) { res.writeHead(400); res.end('unknown level'); return; }
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
  const self = { id, name: 'Player', char: 'dawson', x: 0, z: 9, ry: Math.PI, ride: 'none', joined: false };
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
      self.x = +msg.x || 0; self.z = +msg.z || 0; self.ry = +msg.ry || 0;
      // Send current roster (joined players) to the newcomer
      const roster = [];
      for (const p of players.values()) if (p.joined && p !== self) roster.push(p);
      ws.send(JSON.stringify({ t: 'init', id, players: roster }));
      // Tell everyone else about the newcomer + new count
      broadcast({ t: 'join', player: self }, ws);
      broadcastCount();
    } else if (msg.t === 'pos' && self.joined) {
      self.x = +msg.x; self.z = +msg.z; self.ry = +msg.ry;
      broadcast({ t: 'pos', id, x: self.x, z: self.z, ry: self.ry }, ws);
    } else if (msg.t === 'ride' && self.joined) {
      self.ride = String(msg.ride || 'none');
      broadcast({ t: 'ride', id, ride: self.ride }, ws);
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
