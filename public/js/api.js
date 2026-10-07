// Small helper shared by the login, signup and dashboard pages.
// It keeps the login token in the browser and talks to our /api routes.
const EC = (() => {
  const TOKEN_KEY = 'ecell_token';

  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
  const clearToken = () => localStorage.removeItem(TOKEN_KEY);

  // api('/login', { method: 'POST', body: { email, password } })
  async function api(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token; // proves who we are

    let res;
    try {
      res = await fetch('/api' + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw Object.assign(new Error("Can't reach the server. Is it running?"), { status: 0 });
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw Object.assign(new Error(data.error || 'Something went wrong.'), { status: res.status });
    }
    return data;
  }

  return { api, getToken, setToken, clearToken };
})();
