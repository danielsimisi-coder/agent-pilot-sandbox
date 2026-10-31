import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { normalizeSlug } = await import(pathToFileURL(resolve(process.env.PILOT_SOURCE || 'src/normalize-slug.mjs')));
test('A1: rejects non-strings without coercion', () => {
  for (const value of [null, undefined, 0, 1, false, {}, [], new String('abc'), Symbol('x')]) {
    assert.throws(() => normalizeSlug(value), TypeError);
  }
  assert.throws(() => normalizeSlug({ toString() { throw new Error('must not coerce'); } }), TypeError);
});
test('A2/A3: trims, folds ASCII, preserves accepted syntax', () => {
  for (const [input, expected] of [[' Hello-42 ', 'hello-42'], ['\tA\r\n', 'a'], ['0', '0'], ['a-b-c', 'a-b-c'], ['\u00a0ABC\u00a0', 'abc'], ['A'.repeat(32), 'a'.repeat(32)]]) {
    assert.equal(normalizeSlug(input), expected);
  }
});
test('A3/A4: rejects invalid strings with RangeError', () => {
  for (const value of ['', ' ', '\n', 'a'.repeat(33), '-a', 'a-', 'a--b', 'a b', 'a\tb', 'a\nb', 'a_b', 'a/b', 'a.b', 'é', 'אב', 'K', 'İ', '😀', 'abc\u0000']) {
    assert.throws(() => normalizeSlug(value), RangeError, JSON.stringify(value));
  }
});
test('A3: exhaustive small alphabet agrees with frozen grammar', () => {
  const alphabet = ['a', 'Z', '0', '-', '_', ' ', 'K'];
  for (const a of alphabet) for (const b of alphabet) for (const c of alphabet) {
    const input = a + b + c;
    const expected = input.trim().replace(/[A-Z]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 32));
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(expected)) assert.equal(normalizeSlug(input), expected);
    else assert.throws(() => normalizeSlug(input), RangeError);
  }
});
