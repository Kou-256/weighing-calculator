import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNote, noteHost, schedule, validateNotebook, validDateTime } from '../src/lib/notebook.mjs';

test('schedule crosses midnight, leaves unknown durations unresolved and resumes from actual end', () => {
  const note = createNote('試料A', null, '2026-11-03T18:00');
  note.steps[0].minutes = '30';
  let plan = schedule(note);
  assert.equal(plan[0].end, '2026-11-03T18:30');
  assert.equal(plan[1].end, '2026-11-04T10:30');
  assert.equal(plan[2].end, '');
  assert.equal(plan[3].start, '');
  note.steps[2].actualEnd = '2026-11-04T12:00';
  plan = schedule(note);
  assert.equal(plan[3].end, '2026-11-04T17:00');
});

test('individual start and actual start override inherited schedule without overwriting records', () => {
  const note = createNote('試料A', null, '2026-11-03T09:00');
  note.steps[0].minutes = '30';
  note.steps[1].plannedStart = '2026-11-04T09:00';
  assert.equal(schedule(note)[1].end, '2026-11-05T01:00');
  note.steps[1].actualStart = '2026-11-04T10:00';
  note.steps[1].actualEnd = '2026-11-05T03:00';
  assert.equal(schedule(note)[1].end, '2026-11-05T02:00');
  assert.equal(schedule(note)[2].start, '2026-11-05T03:00');
  assert.equal(note.steps[1].plannedStart, '2026-11-04T09:00');
});

test('notes have independent step/photo state and retain the manual version', () => {
  const a = createNote('A'), b = createNote('B');
  a.steps[0].photos.push({ id: 'photo' }); a.steps[0].memo = '青色';
  assert.deepEqual(b.steps[0].photos, []);
  assert.equal(b.steps[0].memo, '');
  assert.notEqual(a.id, b.id);
  assert.ok(a.protocolVersion);
});

test('calendar validation rejects rolled-over dates and incorrect timestamps', () => {
  assert.equal(validDateTime('2026-02-30T12:00'), false);
  assert.equal(validDateTime('2026-11-03T25:00'), false);
  assert.equal(validDateTime('2026-11-03T12:00'), true);
});

test('host selections persist independently and legacy notes remain readable', () => {
  const y = createNote('Y'), gd = createNote('Gd', null, '2026-11-04T09:00', 'gdvo4');
  assert.equal(noteHost(y), 'yvo4');
  assert.equal(noteHost(gd), 'gdvo4');
  assert.doesNotThrow(() => validateNotebook(JSON.parse(JSON.stringify({ schema: 1, notes: [y, gd] }))));
  delete y.host;
  assert.equal(noteHost(y), 'yvo4');
  assert.equal(noteHost({ snapshot: { compound: 'GdVO₄' } }), 'gdvo4');
  assert.doesNotThrow(() => validateNotebook({ schema: 1, notes: [y] }));
  gd.host = 'unknown';
  assert.throws(() => validateNotebook({ schema: 1, notes: [gd] }));
});

test('imported weighing conditions determine the host and reject conflicting host metadata', () => {
  const snapshot = { compound: 'GdVO₄', targetMol: '0.004', setNumber: 1, capturedAt: '2026-11-04T09:00', concentrations: { Gd: 100, V: 100 }, materials: [] };
  const gd = createNote('Gd', snapshot, '2026-11-04T09:00', 'yvo4');
  assert.equal(gd.host, 'gdvo4');
  assert.doesNotThrow(() => validateNotebook({ schema: 1, notes: [gd] }));
  gd.host = 'yvo4';
  assert.throws(() => validateNotebook({ schema: 1, notes: [gd] }));
});

test('backup validation rejects malformed records, duplicate photos, invalid times and negative durations', () => {
  const valid = () => ({ schema: 1, notes: [createNote('A')] });
  assert.doesNotThrow(() => validateNotebook(valid()));
  for (const modify of [
    d => { d.notes[0].steps[0].minutes = -1; },
    d => { d.notes[0].steps[0].minutes = 'Infinity'; },
    d => { d.notes[0].steps[0].minutes = null; },
    d => { d.notes[0].snapshot = { materials: {} }; },
    d => { d.notes[0].steps[0].actualStart = '2026-11-04T12:00'; d.notes[0].steps[0].actualEnd = '2026-11-03T12:00'; },
    d => { d.notes.push(structuredClone(d.notes[0])); },
    d => { d.notes[0].steps[0].photos = [{ id: 'x', name: 'x.svg', caption: '', type: 'image/svg+xml', size: 100 }]; },
    d => { d.notes[0].steps[0].photos = Array(2).fill({ id: 'x', name: 'x.png', caption: '', type: 'image/png', size: 100 }); },
    d => { d.notes[0].steps = []; },
  ]) {
    const data = valid(); modify(data);
    assert.throws(() => validateNotebook(data));
  }
});
