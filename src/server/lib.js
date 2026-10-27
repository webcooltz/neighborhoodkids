/* Pure, side-effect-free server logic — imported by server.js and exercised
   directly by the test suite (test/). Keeping these here means the tests don't
   have to boot a socket server to check the important rules. */
'use strict';

// ─── PROFANITY FILTER ───────────────────────────────────────────────────────
// Kid-safe: mask a word list (and light leetspeak) with asterisks.
const BAD_WORDS = [
  'fuck','shit','bitch','bastard','asshole','ass','dick','piss','cock','pussy',
  'cunt','damn','crap','slut','whore','fag','faggot','nigger','nigga','retard',
  'douche','wanker','bollocks','prick','twat','jackass','dumbass','hell',
  'sex','porn','boob','penis','vagina','tit','turd','suck',
];
const LEET = { a:'[a@4]', e:'[e3]', i:'[i1!]', o:'[o0]', s:'[s$5]', t:'[t7]' };
// Boundaries use "not alphanumeric" instead of \b so symbol-edged evasions
// (a$$) are still caught, while embedded innocents (class, assignment) are not.
const BAD_RE = new RegExp('(?<![a-z0-9])(' + BAD_WORDS.map(w =>
  w.split('').map(c => LEET[c] || c).join('+?')).join('|') + ')(?![a-z0-9])', 'gi');

function cleanText(s) {
  return String(s == null ? '' : s).replace(BAD_RE, m => '*'.repeat(m.length));
}

// ─── OBJECT PLACEMENT SANITISER ─────────────────────────────────────────────
// Trim/validate an incoming placed object so a client can't push junk or huge
// payloads. Returns a clean entry or null if the object is unusable.
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

// ─── MESSAGE BOARD ──────────────────────────────────────────────────────────
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const BOARD_MAX = 200;      // hard cap on stored notes
const IMG_MAX = 90000;      // max drawing data-URL length (~64KB png)

// Drop notes older than a week and trim to the cap. Pure: returns a new array.
function pruneNotes(notes, now = Date.now(), weekMs = WEEK_MS, max = BOARD_MAX) {
  let out = (Array.isArray(notes) ? notes : []).filter(n => n && n.ts > now - weekMs);
  if (out.length > max) out = out.slice(out.length - max);
  return out;
}

// Validate + clean a board POST body. Returns a note (without id/ts) or null.
function makeNote(body, imgMax = IMG_MAX) {
  if (!body || typeof body !== 'object') return null;
  const name = cleanText(String(body.name || 'Anon')).slice(0, 16) || 'Anon';
  const text = cleanText(String(body.text || '')).slice(0, 280);
  let img = null;
  if (typeof body.img === 'string' && /^data:image\/png;base64,/.test(body.img) && body.img.length <= imgMax) img = body.img;
  if (!text && !img) return null;
  return { name, text, img };
}

module.exports = { cleanText, sanitizeObj, pruneNotes, makeNote, WEEK_MS, BOARD_MAX, IMG_MAX, BAD_WORDS };
