import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import manifest, { startQuickSession, waitOnBoard } from './manifest.js';

const fakeHost = ({ sessions = [], agents = [{ id: 'claude', available: true, models: [{ value: 'opus', default: true }] }] } = {}) => {
  const spawned = [];
  return {
    spawned,
    agents: { list: async () => agents },
    sessions: { list: () => sessions, get: (id) => (spawned.length && id === 'new-1' ? { status: 'idle' } : null), spawn: async (opts) => { spawned.push(opts); return { sessionId: 'new-1' }; } },
  };
};

test('the manifest and package.json agree on identity, capabilities and engines', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).wranglerExtension;
  for (const k of ['id', 'label', 'description', 'author']) assert.equal(manifest[k], pkg[k], k);
  assert.deepEqual(manifest.requires, pkg.requires);
  assert.deepEqual(manifest.engines, pkg.engines);
  assert.equal(manifest.boardApi, '^2.2.0');
});

test('start spawns in the task\'s usual folder with the default agent and model, and no prompt', async () => {
  const host = fakeHost({ sessions: [{ taskId: 't1', cwd: '/r/a' }, { taskId: 't1', cwd: '/r/a' }, { taskId: 't2', cwd: '/r/b' }] });
  assert.deepEqual(await startQuickSession({ taskId: 't1' }, host), { sessionId: 'new-1', cwd: '/r/a', onBoard: true });
  assert.deepEqual(host.spawned, [{ agent: 'claude', model: 'opus', cwd: '/r/a', taskId: 't1' }]);
});

test('start for Unassigned or a task with no sessions leaves the folder blank for a fresh scratch folder', async () => {
  const host = fakeHost();
  await startQuickSession({ taskId: null }, host);
  await startQuickSession({ taskId: 'empty' }, host);
  assert.deepEqual(host.spawned, [{ agent: 'claude', model: 'opus' }, { agent: 'claude', model: 'opus', taskId: 'empty' }]);
});

test('start refuses when no agent is installed', async () => {
  await assert.rejects(() => startQuickSession({ taskId: 't1' }, fakeHost({ agents: [] })), /No agent CLI/);
});

test('the handler replies with the new session', async () => {
  const replies = [];
  await manifest.handlers[0].handler({ taskId: 't1' }, fakeHost(), (p) => replies.push(p));
  assert.equal(replies[0].sessionId, 'new-1');
});

test('waitOnBoard waits until the graph has the card, and gives up after the timeout', async () => {
  let polls = 0;
  const host = { sessions: { get: () => (++polls >= 3 ? { status: 'working' } : { status: null }) } };
  assert.equal(await waitOnBoard(host, 's', { sleep: async () => {} }), true);
  assert.equal(polls, 3);
  const never = { sessions: { get: () => null } };
  let slept = 0;
  assert.equal(await waitOnBoard(never, 's', { timeoutMs: 300, pollMs: 100, sleep: async () => { slept++; } }), false);
  assert.equal(slept, 3);
});
