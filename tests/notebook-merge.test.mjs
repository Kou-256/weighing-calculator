import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeNotebook } from '../src/lib/notebook-merge.mjs';

const a = { id: 'a', name: '試料A', memo: '', steps: [{ id: 'one', memo: '', done: false, photos: [] }] };
const b = { ...a, id: 'b', name: '試料B' };
test('separate fields and steps from simultaneous windows survive', () => {
  const ours = [{ ...a, name: '変更A' }];
  const theirs = [{ ...a, steps: [{ ...a.steps[0], done: true }] }];
  assert.deepEqual(mergeNotebook([a], ours, theirs), [{ ...ours[0], steps: theirs[0].steps }]);
});
test('simultaneous note and photo additions survive', () => {
  const photo = { id: 'p', caption: '' };
  assert.equal(mergeNotebook([a], [a, b], [{ ...a, steps: [{ ...a.steps[0], photos: [photo] }] }]).length, 2);
  assert.deepEqual(mergeNotebook([a], [a, b], [{ ...a, steps: [{ ...a.steps[0], photos: [photo] }] }])[0].steps[0].photos, [photo]);
});
test('a reorder retains an unrelated remote edit and new note', () => {
  const c = { ...a, id: 'c' };
  assert.deepEqual(mergeNotebook([a, b], [b, a], [{ ...a, memo: 'remote' }, b, c]).map(n => n.id), ['b', 'a', 'c']);
});
test('same field conflict never silently overwrites', () => {
  assert.throws(() => mergeNotebook([a], [{ ...a, name: 'one' }], [{ ...a, name: 'two' }]), /別ウィンドウ/);
});
test('trash cannot be resurrected by stale editing and hard removal conflicts with editing', () => {
  assert.throws(() => mergeNotebook([a], [{ ...a, name: 'edited' }], [{ ...a, deletedAt: '2026-11-04T00:00:00Z' }]), /別ウィンドウ/);
  assert.throws(() => mergeNotebook([a], [{ ...a, name: 'edited' }], []), /別ウィンドウ/);
  assert.deepEqual(mergeNotebook([a], [a], []), []);
});
test('restoring from trash merges with unrelated changes', () => {
  const removed = { ...a, deletedAt: '2026-11-04T00:00:00Z' };
  assert.deepEqual(mergeNotebook([removed, b], [a, b], [removed, { ...b, memo: 'remote' }]), [a, { ...b, memo: 'remote' }]);
});
test('competing reorders are reported', () => {
  const c = { ...a, id: 'c' };
  assert.throws(() => mergeNotebook([a, b, c], [b, a, c], [a, c, b]), /別ウィンドウ/);
});
