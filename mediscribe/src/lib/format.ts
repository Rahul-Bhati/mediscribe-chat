/** Formats a millisecond duration as `m:ss`, the way a voice note reads in chat. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

let counter = 0;

/** Session-local message id. No persistence, so a counter is enough. */
export function nextMessageId(): string {
  counter += 1;
  return `m${counter}`;
}
