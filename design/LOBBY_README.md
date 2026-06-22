# Neighborhood Lobby (multiplayer town)

`lobby.html` — pick a character, then run around a small town with a park.
Works **solo offline** by just opening the file. For **online multiplayer**, run the
WebSocket server below so multiple players see each other in real time.

## Solo (no setup)
Open `lobby.html` in a browser. Top-left shows `Offline (solo)`. Full town is playable.

## Multiplayer
1. Install Node.js (18+).
2. In this folder:
   ```
   npm install
   npm start
   ```
   Server prints `Lobby server listening on ws://localhost:8787`.
3. Open `lobby.html`. Top-left should switch to `Online`. Open it in another
   tab/device on the same network to see a second player.

### Playing across devices / the internet
- Set `SERVER_URL` near the top of the `<script>` in `lobby.html` to your server address.
  Leave it `''` for local dev (uses `ws://localhost:8787`).

### Hosting the page on GitHub Pages
GitHub Pages only serves **static files** — it cannot run `server.js`. So for players on
other networks you need the server hosted **separately**:

1. Deploy `server.js` to a Node host that allows WebSockets:
   Render / Railway / Fly.io / Heroku, a VPS, or a tunnel (ngrok / cloudflared).
   It must respect `process.env.PORT` (it does) and give you a public URL.
2. Because Pages is served over **https**, the server URL must be **`wss://`** (TLS) —
   a browser on an https page refuses plain `ws://`. The managed hosts above give you
   `wss://` automatically; on a raw VPS put a TLS reverse proxy (Caddy/nginx) in front.
3. Set in `lobby.html`:  `const SERVER_URL = 'wss://your-app.onrender.com';`
4. Commit + push. Everyone who opens the Pages URL now shares the same lobby.

Quick test without deploying a server: run `server.js` locally, expose it with
`cloudflared tunnel --url http://localhost:8787`, and paste the resulting `wss://...`
URL into `SERVER_URL`.

## Controls
- Desktop: WASD / arrows move, right-drag orbits camera, Shift to run.
- Mobile: on-screen joystick + RUN button (auto-shown on touch devices via `mobile.js`).

## How it works
- `server.js` is a tiny relay: assigns each socket an id, keeps a roster of
  `{id,name,char,x,z,ry}`, and broadcasts `join` / `pos` / `leave` messages.
- The client renders remote players as kid models with name labels and interpolates
  their movement between updates (sent ~12×/sec, only when moving).
- No database, no auth — ephemeral lobby. Good base to extend (chat, emotes,
  launching a level together, etc.).
