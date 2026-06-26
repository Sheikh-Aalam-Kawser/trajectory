import { auth } from './firebase';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const currentUser = auth.currentUser;
  const headers = new Headers(options.headers || {});
  
  if (currentUser) {
    const token = await currentUser.getIdToken();
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw new Error(`Invalid JSON response: HTTP ${res.status}`);
  }
  
  if (!res.ok || !json.success) {
    throw new Error(json.message || `Request failed with status ${res.status}`);
  }

  return json.data;
}
