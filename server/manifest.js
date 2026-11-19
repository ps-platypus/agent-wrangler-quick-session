import { fileURLToPath } from 'node:url';
import { usualFolder, defaultLaunch } from './pick.js';

// The extension manifest (agent-wrangler docs/extensions.md). `dir` is the repo
// root so `board.client` resolves inside `<dir>/public/`; for an installed copy
// discovery overwrites it with the real location.
export const dir = fileURLToPath(new URL('..', import.meta.url));

// How long the reply waits for the new card to reach the board graph. Opening a
// card the board has not drawn yet makes it try to RESUME it, which a session
// with no transcript refuses, so the reply waits until the graph has the card
// (its state frame goes out first) and gives up quietly after this long.
export const ON_BOARD_TIMEOUT_MS = 5_000;
const ON_BOARD_POLL_MS = 100;

export async function waitOnBoard(host, sessionId, { timeoutMs = ON_BOARD_TIMEOUT_MS, pollMs = ON_BOARD_POLL_MS, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  for (let waited = 0; ; waited += pollMs) {
    if (host.sessions.get(sessionId)?.status) return true;
    if (waited >= timeoutMs) return false;
    await sleep(pollMs);
  }
}

// Start a session in `taskId` (or Unassigned when it is null) with the dialog's
// defaults and no prompt. Replies `{ sessionId, cwd, onBoard }`; a failure throws, which the
// board receives as the action's error.
export async function startQuickSession(msg, host, opts) {
  const taskId = typeof msg?.taskId === 'string' && msg.taskId ? msg.taskId : null;
  const launch = defaultLaunch(await host.agents.list());
  if (!launch) throw new Error('No agent CLI is installed on this machine.');
  const cwd = usualFolder(host.sessions.list(), taskId);
  const result = await host.sessions.spawn({ ...launch, ...(cwd ? { cwd } : {}), ...(taskId ? { taskId } : {}) });
  const onBoard = await waitOnBoard(host, result.sessionId, opts);
  return { sessionId: result.sessionId, cwd: cwd || null, onBoard };
}

export default {
  id: 'quick-session',
  label: 'Quick session',
  description: 'Adds a button to each task\'s title bar that starts a session in that task straight away, in the task\'s usual folder with the default model, skipping the dispatch dialog.',
  author: 'Victoria Xiao',
  requires: ['sessions:read', 'sessions:spawn', 'agents:read'],
  engines: { wranglerApi: '^2.2.0' },
  boardApi: '^2.2.0',
  defaultEnabled: true,
  dir,
  handlers: [{
    type: 'quick-session-start',
    handler: async (msg, host, reply) => reply(await startQuickSession(msg, host)),
  }],
  board: { client: 'public/index.js', styles: 'public/styles.css' },
};
