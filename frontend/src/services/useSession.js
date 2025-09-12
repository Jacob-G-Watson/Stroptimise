import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, refreshToken } from "./api";

// Session hook with silent refresh using refresh cookie.
export function useSession() {
	const [user, setUser] = useState(null);
	const [restoring, setRestoring] = useState(true);
	const navigate = useNavigate();
	const timerRef = useRef(null);
	const startedRef = useRef(false);

	useEffect(() => {
		if (startedRef.current) return;
		startedRef.current = true;
		let cancelled = false;
		(async () => {
			try {
				// Attempt refresh to obtain access token from cookie
				const data = await refreshToken().catch(() => null);
				if (data) {
					window.__access_token = data.access_token;
					schedule(data.expires_in);
					try {
						const me = await getCurrentUser();
						if (!cancelled) {
							setUser(me);
							navigate("/jobs", { replace: true });
						}
					} catch (e) {
						// ignore
					}
				}
			} finally {
				if (!cancelled) setRestoring(false);
			}
		})();
		return () => {
			cancelled = true;
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [navigate]);

	function schedule(expiresIn) {
		if (!expiresIn) return; // seconds
		const delay = Math.max(5000, (expiresIn - 60) * 1000);
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(async () => {
			const data = await refreshToken().catch(() => null);
			if (data) {
				window.__access_token = data.access_token;
				schedule(data.expires_in);
			}
		}, delay);
	}

	return { user, setUser, restoring };
}
