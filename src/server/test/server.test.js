'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { WebSocket } = require('ws');

// Isolate board storage to a throwaway temp file (set before requiring server).
const TMP_BOARD = path.join(os.tmpdir(), `nk-board-${process.pid}.json`);
process.env.BOARD_FILE = TMP_BOARD;
const { server } = require('../server');

let base, wsBase;

before(async () => {
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
  wsBase = `ws://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise(res => server.close(res));
  try { fs.unlinkSync(TMP_BOARD); } catch (e) {}
});

// tiny promise helpers ------------------------------------------------------
function get(pathname) {
  return new Promise((resolve, reject) => {
    http.get(base + pathname, r => { let b = ''; r.on('data', c => b += c);
      r.on('end', () => resolve({ status: r.statusCode, body: b })); }).on('error', reject);
  });
}
function post(pathname, obj) {
  const data = JSON.stringify(obj);
  return new Promise((resolve, reject) => {
    const req = http.request(base + pathname, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      r => { let b = ''; r.on('data', c => b += c);
        r.on('end', () => resolve({ status: r.statusCode, body: b })); });
    req.on('error', reject); req.write(data); req.end();
  });
}

// ---------------------------------------------------------------------------
test('GET /health reports player count', async () => {
  const r = await get('/health');
  assert.strictEqual(r.status, 200);
  assert.match(r.body, /players connected/);
});

test('POST /board stores a profanity-filtered note, GET returns it', async () => {
  const stamp = 'tok' + Date.now();
  const r = await post('/board', { name: 'Kid', text: `hello ${stamp} you shit` });
  assert.strictEqual(r.status, 200);
  const note = JSON.parse(r.body).note;
  assert.match(note.text, /\*\*\*\*/);            // profanity masked
  assert.ok(!/shit/.test(note.text));

  const all = JSON.parse((await get('/board')).body);
  assert.ok(all.some(n => n.text.includes(stamp)));
});

test('POST /board rejects an empty note', async () => {
  const r = await post('/board', { text: '', img: null });
  assert.strictEqual(r.status, 400);
});

test('POST /board rejects a non-png image with no text', async () => {
  const r = await post('/board', { img: 'data:image/gif;base64,AAAA' });
  assert.strictEqual(r.status, 400);
});

test('WS join is reflected in the live player count', async () => {
  const ws = new WebSocket(wsBase);
  const count = await new Promise((resolve, reject) => {
    ws.on('error', reject);
    ws.on('open', () => ws.send(JSON.stringify({ t: 'join', name: 'Tester', x: 0, z: 0, ry: 0 })));
    ws.on('message', raw => { const m = JSON.parse(raw);
      if (m.t === 'count' && m.n >= 1) resolve(m.n); });
  });
  assert.ok(count >= 1);

  // leaving drops the count back toward zero
  await new Promise(res => { ws.on('close', res); ws.close(); });
  const health = await get('/health');
  assert.match(health.body, /^\d+ players connected/);
});
