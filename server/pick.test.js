import test from 'node:test';
import assert from 'node:assert/strict';
import { usualFolder, defaultLaunch, scratchRoot } from './pick.js';

const SCRATCH = '/home/u/.agent-wrangler/sessions';
const s = (taskId, cwd, extra = {}) => ({ taskId, cwd, archived: false, lastActivity: 0, worktree: null, ...extra });

test('usualFolder picks the folder most of the task\'s sessions ran in', () => {
  const sessions = [s('t1', '/r/a'), s('t1', '/r/b'), s('t1', '/r/b'), s('t2', '/r/c'), s('t2', '/r/c'), s('t2', '/r/c')];
  assert.equal(usualFolder(sessions, 't1', SCRATCH), '/r/b');
});

test('usualFolder breaks a tie on latest activity', () => {
  assert.equal(usualFolder([s('t1', '/r/a', { lastActivity: 5 }), s('t1', '/r/b', { lastActivity: 9 })], 't1', SCRATCH), '/r/b');
});

test('usualFolder counts a worktree session as its repo', () => {
  const wt = { path: '/r/a-wt/feature', repoRoot: '/r/a', branch: 'feature' };
  assert.equal(usualFolder([s('t1', '/r/a-wt/feature', { worktree: wt }), s('t1', '/r/a-wt/feature', { worktree: wt }), s('t1', '/r/z')], 't1', SCRATCH), '/r/a');
});

test('usualFolder never picks a scratch folder, and gives way to a fresh one when scratch sessions outnumber the best folder', () => {
  assert.equal(usualFolder([s('t1', `${SCRATCH}/1`), s('t1', `${SCRATCH}/2`), s('t1', '/r/a')], 't1', SCRATCH), '');
  assert.equal(usualFolder([s('t1', `${SCRATCH}/1`), s('t1', '/r/a'), s('t1', '/r/a')], 't1', SCRATCH), '/r/a');
});

test('usualFolder falls back to archived sessions, then to a fresh scratch folder', () => {
  assert.equal(usualFolder([s('t1', '/r/old', { archived: true }), s('t1', '/r/live')], 't1', SCRATCH), '/r/live');
  assert.equal(usualFolder([s('t1', '/r/old', { archived: true })], 't1', SCRATCH), '/r/old');
  assert.equal(usualFolder([], 't1', SCRATCH), '');
  assert.equal(usualFolder([s(null, '/r/a')], null, SCRATCH), '', 'Unassigned always gets a fresh scratch folder');
});

test('defaultLaunch takes the first installed agent and its default model', () => {
  const agents = [
    { id: 'gemini', available: false, models: [{ value: 'g', default: true }] },
    { id: 'claude', available: true, models: [{ value: 'sonnet' }, { value: 'opus', default: true }] },
    { id: 'codex', available: true, models: [{ value: 'gpt', default: true }] },
  ];
  assert.deepEqual(defaultLaunch(agents), { agent: 'claude', model: 'opus' });
  assert.deepEqual(defaultLaunch([{ id: 'x', available: true, models: [] }]), { agent: 'x' });
  assert.equal(defaultLaunch([]), null);
});

test('scratchRoot follows AW_DATA_DIR', () => {
  assert.equal(scratchRoot({ AW_DATA_DIR: '/tmp/aw' }, '/home/u'), '/tmp/aw/sessions');
  assert.equal(scratchRoot({}, '/home/u'), '/home/u/.agent-wrangler/sessions');
});
