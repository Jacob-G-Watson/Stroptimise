// Wrapper around fetch to automatically add Authorization header if access token present
export async function authFetch(input, init = {}) {
	const token = window.__access_token;
	const headers = new Headers(init.headers || {});
	if (token) {
		if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
	}
	return fetch(input, { ...init, headers });
}
