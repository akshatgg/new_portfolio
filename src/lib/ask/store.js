import { writable } from 'svelte/store';

// The ASK panel is position:fixed so it can animate from the hero slot out to
// full screen. It needs the slot's box to do that, and the slot lives in the
// hero component — this store is the handoff.
export const dockEl = writable(null);

// Panel visibility, shared because the controls are scattered: the hero has a
// "reopen" affordance, the header has "Ask my AI", and the panel has its own
// traffic lights. All three drive the same two flags.
export const askExpanded = writable(false);
export const askClosed = writable(false);
