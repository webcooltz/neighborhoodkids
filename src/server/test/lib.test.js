'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { cleanText, sanitizeObj, pruneNotes, makeNote, WEEK_MS } = require('../lib');

test('cleanText masks profanity but keeps length', () => {
  assert.strictEqual(cleanText('you are a shit'), 'you are a ****');
  assert.strictEqual(cleanText('hello there'), 'hello there');
});

test('cleanText catches light leetspeak', () => {
  assert.strictEqual(cleanText('sh1t'), '****');
  assert.strictEqual(cleanText('a$$'), '***');
});

test('cleanText does not mask innocent substrings', () => {
  // "class" contains "ass" but should survive (word boundary)
  assert.strictEqual(cleanText('class assignment'), 'class assignment');
});

test('cleanText handles null / non-string', () => {
  assert.strictEqual(cleanText(null), '');
  assert.strictEqual(cleanText(42), '42');
});

test('sanitizeObj rejects junk and clamps coords', () => {
  assert.strictEqual(sanitizeObj(null), null);
  assert.strictEqual(sanitizeObj({ type: 'tree' }), null);      // no id
  const e = sanitizeObj({ id: 'a', type: 'tree', x: 99999, y: 'nope', z: -5, ry: 1 });
  assert.strictEqual(e.x, 1000);   // clamped
  assert.strictEqual(e.y, 0);      // non-finite → 0
  assert.strictEqual(e.z, -5);
});

test('sanitizeObj trims oversized text', () => {
  const e = sanitizeObj({ id: 'a', type: 't', text: 'x'.repeat(500) });
  assert.strictEqual(e.text.length, 200);
});

test('pruneNotes drops notes older than a week', () => {
  const now = 1_000_000_000_000;
  const notes = [
    { id: 1, ts: now - WEEK_MS - 1 },   // expired
    { id: 2, ts: now - 1000 },          // fresh
  ];
  const out = pruneNotes(notes, now);
  assert.deepStrictEqual(out.map(n => n.id), [2]);
});

test('pruneNotes trims to the cap keeping newest', () => {
  const now = 2_000_000_000_000;
  const notes = Array.from({ length: 5 }, (_, i) => ({ id: i, ts: now - i }));
  const out = pruneNotes(notes, now, WEEK_MS, 3);
  assert.strictEqual(out.length, 3);
  assert.deepStrictEqual(out.map(n => n.id), [2, 3, 4]);
});

test('makeNote cleans text and defaults name', () => {
  const n = makeNote({ text: 'this is crap', name: '' });
  assert.strictEqual(n.text, 'this is ****');
  assert.strictEqual(n.name, 'Anon');
  assert.strictEqual(n.img, null);
});

test('makeNote rejects empty note', () => {
  assert.strictEqual(makeNote({ text: '', img: null }), null);
  assert.strictEqual(makeNote({}), null);
});

test('makeNote accepts a valid png data-url and rejects other images', () => {
  const png = 'data:image/png;base64,' + 'A'.repeat(40);
  assert.strictEqual(makeNote({ img: png }).img, png);
  const jpg = 'data:image/jpeg;base64,' + 'A'.repeat(40);
  assert.strictEqual(makeNote({ img: jpg }), null);   // wrong type, no text → empty
});

test('makeNote rejects oversized image', () => {
  const huge = 'data:image/png;base64,' + 'A'.repeat(200000);
  assert.strictEqual(makeNote({ text: 'hi', img: huge }).img, null);  // img dropped, text kept
});
