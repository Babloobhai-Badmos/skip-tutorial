/** Dev-only switches read from the URL. Always off in production builds. */
const params = import.meta.env.DEV ? new URLSearchParams(globalThis.location?.search ?? '') : null;

/** ?fast=1 runs tutorial timers (confident walking, safe room) at 20x. */
export const DEV_SPEED = params?.has('fast') ? 20 : 1;

/** ?death=d06 forces which death scene plays (prefix match on its id). */
export const DEV_FORCE_DEATH = params?.get('death') ?? null;
