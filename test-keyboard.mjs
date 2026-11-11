import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
const handlers = {};
const element = () => ({ style: { setProperty() {} }, classList: { contains() { return false; }, toggle() {}, add() {}, remove() {} }, addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, append() {}, children: [] });
const stage = element(), rail = element(), notes = element();
const els = { '.stage': stage, '.rail': rail, '.page-now b': element(), '.page-now .name': element(), '.page-now .count': element(), '.progress i': element(), '.notes-panel': notes, '.nav .prev': element(), '.nav .next': element(), '.fs': element(), '.reading-toggle': element() };
const document = { querySelector: s => els[s], querySelectorAll: () => [], getElementById: () => ({ textContent: '[]' }), readyState: 'loading' };
runInNewContext(readFileSync('deck/deck.js', 'utf8'), { document, innerWidth: 1600, innerHeight: 900, addEventListener: (name, fn) => { handlers[name] = fn; }, Promise, location: { hash: '' }, history: {}, requestAnimationFrame() {} });
for (const key of ['Enter', ' ']) {
  let prevented = false;
  try { handlers.keydown({ key, target: { closest: () => ({}) }, preventDefault() { prevented = true; throw new Error("prevented"); } }); } catch (error) { if (error.message !== "prevented") throw error; }
  assert.equal(prevented, false, `${key} must retain its native button action`);
}
console.log('Keyboard controls preserve focused button activation.');

