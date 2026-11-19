// What a quick session launches with: the same folder and model the dispatch
// dialog would pre-fill for the task, so the button is that dialog's defaults
// with Start pressed. Pure functions, no host access, so they test on their own.

import os from 'node:os';
import path from 'node:path';

// Where the wrangler makes a blank dispatch's scratch folders
// (session-manager.js SESSIONS_DIR). The extension runs in the server's
// process, so it sees the same AW_DATA_DIR.
export function scratchRoot(env = process.env, home = os.homedir()) {
  return path.join(env.AW_DATA_DIR || path.join(home, '.agent-wrangler'), 'sessions');
}

// A worktree session counts as its repo, as the dialog's folder pick does.
function folderOf(s) {
  const cwd = String(s.cwd).replace(/\/+$/, '') || '/';
  return s.worktree?.path && s.worktree.repoRoot && s.worktree.path.replace(/\/+$/, '') === cwd ? s.worktree.repoRoot : cwd;
}

// The folder most of `sessions` ran in, latest activity breaking a tie, or ''.
// Scratch folders are counted together and never chosen: when they outnumber
// the best real folder, the answer is '' so a fresh scratch folder is made,
// as the dialog does (public/util.js mostCommonCwd).
function mostCommon(sessions, scratch) {
  const isScratch = (cwd) => cwd === scratch || cwd.startsWith(`${scratch}/`);
  let scratchCount = 0;
  const stats = new Map();
  for (const s of sessions) {
    if (!s?.cwd) continue;
    if (isScratch(s.cwd)) { scratchCount++; continue; }
    const cwd = folderOf(s);
    const cur = stats.get(cwd) || { count: 0, at: 0 };
    cur.count += 1;
    cur.at = Math.max(cur.at, s.lastActivity || 0);
    stats.set(cwd, cur);
  }
  let best = null;
  for (const [cwd, v] of stats) {
    if (!best || v.count > best.count || (v.count === best.count && v.at > best.at)) best = { cwd, ...v };
  }
  if (!best || scratchCount > best.count) return '';
  return best.cwd;
}

// The task's usual folder: from its sessions on the board, else from its
// archived ones. '' (a fresh scratch folder) for Unassigned or a task with no
// sessions yet.
export function usualFolder(sessions, taskId, scratch = scratchRoot()) {
  if (!taskId) return '';
  const mine = (Array.isArray(sessions) ? sessions : []).filter((s) => s?.taskId === taskId);
  return mostCommon(mine.filter((s) => !s.archived), scratch) || mostCommon(mine.filter((s) => s.archived), scratch);
}

// The agent and model the dialog starts on: the first installed agent and its
// default model. null when no agent is installed.
export function defaultLaunch(agents) {
  const agent = (Array.isArray(agents) ? agents : []).find((a) => a?.available);
  if (!agent) return null;
  const model = (agent.models || []).find((m) => m?.default)?.value;
  return { agent: agent.id, ...(model ? { model } : {}) };
}
