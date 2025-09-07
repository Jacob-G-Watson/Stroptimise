// Wrapper around fetch to automatically add Authorization header if access token present
export async function authFetch(input, init = {}) {
	async function doFetch() {
		const token = window.__access_token;
		const headers = new Headers(init.headers || {});
		if (token) {
			if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
		}
		return fetch(input, { ...init, headers });
	}

	let resp = await doFetch();
	if (resp.status === 401) {
		// try to silently refresh once
		try {
			const csrf = (document.cookie.match(/(?:^|; )csrf_token=([^;]+)/) || [])[1];
			const r = await fetch("/api/auth/refresh", {
				method: "POST",
				headers: { "X-CSRF-Token": decodeURIComponent(csrf || "") },
			});
			if (r.ok) {
				const data = await r.json();
				window.__access_token = data.access_token;
				// retry original request once
				resp = await doFetch();
			}
		} catch (e) {
			// ignore and return original 401
		}
	}
	return resp;
}
