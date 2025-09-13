// Minimal wrapper to attach bearer token.
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
	const token = window.__access_token;
	const headers = new Headers(init.headers || {});
	if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
	return fetch(input, { ...init, headers });
}
