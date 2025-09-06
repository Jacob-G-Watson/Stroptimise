import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "./authFetch";

// Handles silent refresh + user fetch once. Returns { user, setUser, restoring }
export function useSession() {
	const [user, setUser] = useState(null);
	const [restoring, setRestoring] = useState(true);
	const refreshStartedRef = useRef(false);
	const navigate = useNavigate();

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
		};
	}, [navigate]);

	function getCsrfToken() {
		const m = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
		return m ? decodeURIComponent(m[1]) : "";
	}

	return { user, setUser, restoring };
}
