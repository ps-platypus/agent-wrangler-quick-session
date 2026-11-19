import test from 'node:test';
import assert from 'node:assert/strict';
import ext, { requestFor, createStarter, BOLT_ICON } from './index.js';

test('requestFor names the task on its own deck, and null for Unassigned', () => {
  assert.deepEqual(requestFor({ id: 't1', adhoc: false }), { args: { taskId: 't1' }, opts: {} });
  assert.deepEqual(requestFor({ id: '__adhoc__', adhoc: true }), { args: { taskId: null }, opts: {} });
  assert.deepEqual(requestFor({ id: 'd2/t9', deckId: 'd2', deckTaskId: 't9' }), { args: { taskId: 't9' }, opts: { deck: 'd2' } });
});

const fakeApi = (result) => {
  const calls = { act: [], opened: [], toasts: [] };
  let release;
  const gate = new Promise((r) => { release = r; });
  return {
    calls,
    release: () => release(),
    api: {
      act: async (...a) => { calls.act.push(a); await gate; return result; },
      openSession: (id) => calls.opened.push(id),
      ui: { toast: (t) => calls.toasts.push(t) },
    },
  };
};

test('a click starts the session and opens it; a second click while starting is ignored', async () => {
  const f = fakeApi({ ok: true, data: { sessionId: 's9', onBoard: true } });
  const start = createStarter(f.api);
  const first = start({ id: 't1' });
  const second = start({ id: 't1' });
  f.release();
  await Promise.all([first, second]);
  assert.deepEqual(f.calls.act, [['quick-session-start', { taskId: 't1' }, {}]]);
  assert.deepEqual(f.calls.opened, ['s9']);
});

test('a session the board has not drawn yet is left unopened rather than resumed', async () => {
  const f = fakeApi({ ok: true, data: { sessionId: 's9', onBoard: false } });
  f.release();
  await createStarter(f.api)({ id: 't1' });
  assert.deepEqual(f.calls.opened, []);
  assert.deepEqual(f.calls.toasts, []);
});

test('a failed start toasts the deck\'s error', async () => {
  const f = fakeApi({ ok: false, error: { message: 'no such folder' } });
  f.release();
  await createStarter(f.api)({ id: 't1' });
  assert.deepEqual(f.calls.opened, []);
  assert.equal(f.calls.toasts[0].severity, 'error');
  assert.equal(f.calls.toasts[0].detail, 'no such folder');
});

test('register adds one task.button that answers for every tile, other decks included', () => {
  const registered = [];
  ext.register({ api: fakeApi({}).api, register: (slot, c) => registered.push([slot, c]) });
  assert.equal(registered.length, 1);
  const [slot, c] = registered[0];
  assert.equal(slot, 'task.button');
  assert.equal(c.decks, true);
  const b = c.button({ id: 't1', name: 'Ship it', adhoc: false });
  assert.equal(b.title, 'Quick session in Ship it (no dialog)');
  assert.equal(b.icon, BOLT_ICON);
  assert.equal(c.button({ id: '__adhoc__', adhoc: true }).title, 'Quick session (no dialog)');
});
