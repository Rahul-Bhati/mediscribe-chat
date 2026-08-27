import Constants from 'expo-constants';

/**
 * Set this to pin the backend to a fixed address, e.g.
 * `'http://192.168.1.42:3000'` or a deployed URL. Leave it null in development
 * and the app follows whichever machine is serving the Expo bundle, which is
 * the same machine running the server in every normal setup.
 *
 * `localhost` is useless from a physical phone — it resolves to the phone.
 * That is assumption A7 in the PRD, and it is the single most common reason
 * "nothing works on a real device".
 */
const API_BASE_URL_OVERRIDE: string | null = null;

/** Port the Express server listens on. Must match `PORT` in `server/.env`. */
const SERVER_PORT = 3000;

/**
 * Pulls the LAN host out of the Expo dev server address, so a laptop that
 * changes networks does not need a code edit. Returns null in a production
 * build, where there is no dev server to ask.
 */
function deriveDevHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];

  if (!host) return null;
  return `http://${host}:${SERVER_PORT}`;
}

export const API_BASE_URL =
  API_BASE_URL_OVERRIDE ?? deriveDevHost() ?? `http://localhost:${SERVER_PORT}`;

/** A wrong address hangs forever otherwise, which reads as a frozen app. */
export const REQUEST_TIMEOUT_MS = 60_000;