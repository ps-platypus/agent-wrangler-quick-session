# Quick session

An [Agent Wrangler](https://github.com/portswigger/agent-wrangler) extension that puts a ⚡ button on
every task tile's title bar, next to the New session robot. One click starts a session in that task
and opens it, without going through the dispatch dialog.

The session starts with the dialog's own defaults:

- **Folder**: the folder most of the task's sessions run in (a worktree counts as its repo). Unassigned,
  or a task with no sessions yet, gets a fresh scratch folder.
- **Agent and model**: the first installed agent and its default model.
- **No prompt and no worktree.** Type into the session once it opens.

A task on another deck starts its session on that deck. Use the robot button when you want the full
dialog.

## Install

Agent Wrangler host API `^2.2.0` is required, since that is the release that adds the `task.button` slot.

Open **Settings → Extensions → + Add extension → Git URL** and paste this repository's URL. To try a
local checkout instead, copy it to `<AW_DATA_DIR>/extensions/quick-session/` and restart.

## Capabilities

| Capability | Why |
| --- | --- |
| `sessions:read` | Finds the folder the task's sessions use. |
| `sessions:spawn` | Starts the session. |
| `agents:read` | Finds the default agent and model. |

## Develop

```sh
npm test
```
