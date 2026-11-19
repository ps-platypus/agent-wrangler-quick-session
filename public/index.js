// The board half: a lightning button on every task tile's title bar, beside the
// New session robot. A click starts a session in that task on the task's own
// deck and opens it, with no dispatch dialog.

// A lightning bolt, inside the board's SVG allow-list for slot icons
// (one <svg> of <path>s with plain attributes).
export const BOLT_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8l1-5.5Z"/></svg>';

// What the deck's handler is asked for a tile: its task id on its own deck,
// null for Unassigned, plus the deck to send to when it is another deck's task.
export function requestFor(task) {
  if (task?.adhoc) return { args: { taskId: null }, opts: task.deckId ? { deck: task.deckId } : {} };
  if (task?.deckId) return { args: { taskId: task.deckTaskId ?? task.id }, opts: { deck: task.deckId } };
  return { args: { taskId: task?.id ?? null }, opts: {} };
}

// One click: start, then open the new card. A second click on the same tile
// while the first is still starting is ignored, so a double-click is one session.
export function createStarter(api) {
  const starting = new Set();
  return async function start(task) {
    const key = task?.id ?? '';
    if (starting.has(key)) return;
    starting.add(key);
    try {
      const { args, opts } = requestFor(task);
      const res = await api.act('quick-session-start', args, opts);
      if (res?.ok && res.data?.sessionId) {
        // Only a card the board already has: opening one it has not drawn yet
        // asks to resume it, which a brand-new session refuses.
        if (res.data.onBoard) api.openSession(res.data.sessionId);
      } else {
        api.ui.toast({ text: 'Quick session could not start', severity: 'error', detail: res?.error?.message || '' });
      }
    } finally {
      starting.delete(key);
    }
  };
}

export default {
  register(slots) {
    const start = createStarter(slots.api);
    slots.register('task.button', {
      id: 'quick',
      decks: true,
      button: (task) => ({
        title: task.adhoc ? 'Quick session (no dialog)' : `Quick session in ${task.name || 'this task'} (no dialog)`,
        icon: BOLT_ICON,
        run: () => { start(task); },
      }),
    });
  },
};
