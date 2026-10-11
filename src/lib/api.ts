let csrfToken: string | null = null;
let generation = 0;
export function setCsrfToken(token: string | null) {
  if (csrfToken !== token) generation++;
  csrfToken = token;
}
export async function apiFetch(input: string, init: RequestInit = {}) {
  const current = generation;
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) headers.set('X-CSRF-Token', csrfToken);
  const response = await fetch(input, { ...init, headers, credentials: 'same-origin', cache: 'no-store' });
  // Discard requests that belonged to a session already ended/replaced.
  if (current !== generation) throw new Error('Sessão alterada. Tente novamente.');
  if (response.status === 401) {
    setCsrfToken(null);
    window.dispatchEvent(new Event('ivone:unauthorized'));
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Não foi possível concluir a operação.');
  }
  const readJson = response.json.bind(response);
  response.json = async () => {
    const body = await readJson();
    if (current !== generation) throw new Error('Sessão alterada. Tente novamente.');
    return body;
  };
  return response;
}
