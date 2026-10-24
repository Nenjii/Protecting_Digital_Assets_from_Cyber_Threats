// Browser side of the wire: join, the SSE stream, and POSTing commands.
// Identity is a session id the server issued; it rides in the URL and body.
import type { ClientCommand, ServerMessage } from '../wire.ts';

// Per-tab storage, so one browser can hold the dashboard and several test teams
// in different tabs without clobbering each other. A closed tab simply rejoins
// with its code (which stays on the facilitator's screen).
let STORE = 'range.team';
export function useStore(key: string): void { STORE = key; }

export function savedSession(): string | null {
  try { return sessionStorage.getItem(STORE); } catch { return null; }
}
export function saveSession(id: string): void {
  try { sessionStorage.setItem(STORE, id); } catch { /* private mode */ }
}
export function clearSession(): void {
  try { sessionStorage.removeItem(STORE); } catch { /* ignore */ }
}

export async function joinWithCode(code: string): Promise<{ s: string; role: string; matchId?: string } | { error: string }> {
  return post('/join', { code });
}
export async function joinAsWc(wcKey: string): Promise<{ s: string; role: string } | { error: string }> {
  return post('/join', { wcKey });
}

async function post(path: string, body: unknown): Promise<any> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch {
    return { error: 'Cannot reach the game server. Check the Wi-Fi.' };
  }
}

/** Send a command on the current session. Returns an error string or null. */
export async function sendCommand(cmd: ClientCommand): Promise<string | null> {
  const s = savedSession();
  if (!s) return 'Not joined.';
  try {
    const res = await fetch(`/cmd?s=${encodeURIComponent(s)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
    });
    if (res.status === 401) { clearSession(); location.reload(); return 'Session expired.'; }
    const j = await res.json();
    return j.error ?? null;
  } catch {
    return 'Could not send. Check the Wi-Fi.';
  }
}

/** Open the live stream. Reconnects automatically (EventSource). */
export function listen(onMessage: (m: ServerMessage) => void): EventSource | null {
  const s = savedSession();
  if (!s) return null;
  const es = new EventSource(`/events?s=${encodeURIComponent(s)}`);
  es.onmessage = (ev) => {
    try { onMessage(JSON.parse(ev.data) as ServerMessage); } catch { /* ignore */ }
  };
  // A refused stream (dead session, server restarted) closes for good: the spec
  // only reconnects after a dropped connection, never after an HTTP error, and
  // the body of a 401 is never parsed. Without this the console would sit
  // frozen on its last view, looking live. A blip leaves readyState CONNECTING
  // and is left alone to retry.
  es.onerror = () => {
    if (es.readyState === EventSource.CLOSED) onMessage({ type: 'bye', reason: 'connection lost' } as ServerMessage);
  };
  return es;
}
