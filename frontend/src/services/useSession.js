import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "./authFetch";

// Handles silent refresh + user fetch once. Returns { user, setUser, restoring }
export function useSession() {
	const [user, setUser] = useState(null);
	const [restoring, setRestoring] = useState(true);
	const refreshStartedRef = useRef(false);
	const navigate = useNavigate();
	const refreshTimerRef = useRef(null);

	useEffect(() => {
		if (refreshStartedRef.current) return;
		refreshStartedRef.current = true;
		let cancelled = false;
		(async () => {
			try {
				const resp = await fetch("/api/auth/refresh", {
					method: "POST",
					headers: { "X-CSRF-Token": getCsrfToken() },
				});
				if (resp.ok) {
					const data = await resp.json();
					window.__access_token = data.access_token;
					scheduleProactiveRefresh(data);
					const meRes = await authFetch("/api/users/me");
					if (meRes.ok) {
						const me = await meRes.json();
						if (!cancelled) {
							setUser(me);
							navigate("/jobs", { replace: true });
						}
					}
				}
			} catch (_) {
				// ignore
			} finally {
				if (!cancelled) setRestoring(false);
			}
		})();
		return () => {
			cancelled = true;
			if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
		};
	}, [navigate]);

	function scheduleProactiveRefresh(tokenResp) {
		try {
			const { access_token, expires_in } = tokenResp || {};
			if (!access_token || !expires_in) return;
			// refresh 60s before expiry
			const delayMs = Math.max(5_000, (expires_in - 60) * 1000);
			if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
			refreshTimerRef.current = setTimeout(async () => {
				try {
					const r = await fetch("/api/auth/refresh", {
						method: "POST",
						headers: { "X-CSRF-Token": getCsrfToken() },
					});
					if (r.ok) {
						const data = await r.json();
						window.__access_token = data.access_token;
						scheduleProactiveRefresh(data);
					}
				} catch (_) {
					// ignore, next request will attempt lazy refresh
				}
			}, delayMs);
		} catch (_) {
			// ignore
		}
	}

	function getCsrfToken() {
		const m = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
		return m ? decodeURIComponent(m[1]) : "";
	}

	return { user, setUser, restoring };
}
