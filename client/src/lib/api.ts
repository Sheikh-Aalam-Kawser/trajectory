import { auth } from './firebase';

async function logToServer(msg: string) {
  try {
    await fetch('/api/diagnostics/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: [msg] }),
    });
  } catch (e) {}
}

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

  // Instrument the request: Log BEFORE fetch
  const headersObj: Record<string, string> = {};
  headers.forEach((val, key) => { headersObj[key] = val; });

  const reqLog = [
    '--- CLIENT REQUEST INSTRUMENTATION ---',
    `URL: ${url}`,
    `Method: ${options.method || 'GET'}`,
    'Headers:',
    ...Object.entries(headersObj).map(([k, v]) => `  ${k}: ${v}`),
    `Request Body: ${options.body}`,
    '--------------------------------------'
  ].join('\n');

  console.log(reqLog);
  await logToServer(reqLog);

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const resHeadersObj: Record<string, string> = {};
  res.headers.forEach((val, key) => { resHeadersObj[key] = val; });

  // Log AFTER fetch returns
  const resLog = [
    '--- CLIENT RESPONSE INSTRUMENTATION ---',
    `Response Status: ${res.status}`,
    `Response OK: ${res.ok}`,
    `Response URL: ${res.url}`,
    `Response Redirected: ${res.redirected}`,
    `Response Content-Type: ${res.headers.get('Content-Type')}`,
    'All Response Headers:',
    ...Object.entries(resHeadersObj).map(([k, v]) => `  ${k}: ${v}`),
    '---------------------------------------'
  ].join('\n');

  console.log(resLog);
  await logToServer(resLog);

  // Clone response to log the exact raw body
  const clone = res.clone();
  let rawBody = '';
  try {
    rawBody = await clone.text();
    const rawBodyLog = [
      '========== RAW HTTP RESPONSE ==========',
      rawBody,
      '======================================='
    ].join('\n');
    console.log(rawBodyLog);
    await logToServer(rawBodyLog);
  } catch (err: any) {
    console.error('Failed to read raw body from cloned response:', err);
    await logToServer(`Failed to read raw body from cloned response: ${err.message}`);
  }

  let json;
  try {
    json = await res.json();
  } catch (e: any) {
    const parseErrLog = [
      'JSON.parse failed on response body.',
      `* exception: ${e.message}`,
      e.stack ? `* stack trace: ${e.stack}` : ''
    ].filter(Boolean).join('\n');
    console.log(parseErrLog);
    await logToServer(parseErrLog);
    throw new Error(`Invalid JSON response: HTTP ${res.status}`);
  }
  
  if (!res.ok || !json.success) {
    throw new Error(json.message || `Request failed with status ${res.status}`);
  }

  return json.data;
}

