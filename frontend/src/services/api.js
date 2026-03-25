const BASE = '/api';

async function request(method, path, body, token, signal = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    signal,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.error || data?.title || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // If the response is streaming (text/event-stream), return the response itself
  if (res.headers.get('Content-Type')?.includes('text/event-stream')) {
    return res;
  }

  return res.json();
}

export const api = {
  // Rooms
  createRoom: (language) => request('POST', '/rooms', { language }),
  getRoom: (roomId) => request('GET', `/rooms/${roomId}`),

  // Auth
  guestLogin: (displayName, roomId) => request('POST', '/auth/guest', { displayName, roomId }),

  // AI
  getSuggestion: (roomId, code, language, token, signal) =>
    request('POST', '/ai/suggest', { roomId, code, language }, token, signal),

  getExplanation: (roomId, code, language, selectedCode, token, signal) =>
    request('POST', '/ai/explain', { roomId, code, language, selectedCode }, token, signal),

  getDebugFlags: (roomId, code, language, token, signal) =>
    request('POST', '/ai/debug', { roomId, code, language }, token, signal),

  getDeepDebug: (roomId, code, language, token, signal) =>
    request('POST', '/ai/deepdebug', { roomId, code, language }, token, signal),
};
