import React, { useState } from "react";
import { PrimaryButton } from "../utils/ThemeUtils";

function UserLogin({ onLogin }) {
	const [email, setEmail] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState("");
	const [error, setError] = useState("");
	const [isSignup, setIsSignup] = useState(false);

	async function doLogin(e, p) {
		// fastapi-users bearer transport expects form fields username & password
		const body = new URLSearchParams({ username: e, password: p });
		const res = await fetch("/api/auth/jwt/login", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: body.toString(),
		});
		if (res.ok) {
			const data = await res.json();
			window.__access_token = data.access_token; // {access_token, token_type}
			// ask backend to issue refresh cookie
			await fetch("/api/auth/refresh/bootstrap", {
				method: "POST",
				headers: { Authorization: `Bearer ${data.access_token}` },
			});
			const me = await fetch("/api/users/me", { headers: { Authorization: `Bearer ${data.access_token}` } });
			if (me.ok) {
				const u = await me.json();
				onLogin(u);
			}
			return true;
		}
		return false;
	}

	async function handleSubmit(e) {
		e.preventDefault();
		setError("");
		if (isSignup) {
			if (!email || !password) {
				setError("Email and password required");
				return;
			}
			if (password !== passwordConfirm) {
				setError("Passwords do not match");
				return;
			}
			try {
				const res = await fetch("/api/auth/register", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email, password, name: displayName || email }),
				});
				if (res.ok) {
					// auto-login after register
					const loginOk = await doLogin(email, password);
					if (!loginOk) setError("Registered but login failed");
				} else {
					const data = await res.json().catch(() => ({}));
					setError(data.detail || "Signup failed");
				}
			} catch (_) {
				setError("Network error during signup");
			}
		} else {
			const success = await doLogin(email, password);
			if (!success) setError("Invalid email or password");
		}
	}

	return (
		<div className="flex flex-col items-center justify-center bg-stropt-beige">
			<span className="font-sans font-extrabold p-20 text-9xl text-stropt-green">
				Strop<span className="text-stropt-brown">timise</span>
			</span>
			<div className="p-4 bg-white rounded shadow mx-auto max-w-max stropt-border">
				<h2 className="text-xl font-bold mb-4">{isSignup ? "Sign up" : "Login"}</h2>
				<form onSubmit={handleSubmit}>
					<input
						type="email"
						placeholder="Email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="border px-2 py-1 mb-2 w-full"
						required
					/>
					{isSignup && (
						<input
							type="text"
							placeholder="Display name (optional)"
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
							className="border px-2 py-1 mb-2 w-full"
						/>
					)}
					<input
						type="password"
						placeholder="Password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="border px-2 py-1 mb-2 w-full"
						required
					/>
					{isSignup && (
						<input
							type="password"
							placeholder="Confirm password"
							value={passwordConfirm}
							onChange={(e) => setPasswordConfirm(e.target.value)}
							className="border px-2 py-1 mb-2 w-full"
							required
						/>
					)}
					<PrimaryButton className="w-full" type="submit">
						{isSignup ? "Sign up" : "Login"}
					</PrimaryButton>
					<div className="flex items-center justify-between mt-2">
						<button
							type="button"
							className="text-sm text-stropt-brown underline"
							onClick={() => {
								setIsSignup((s) => !s);
								setError("");
							}}
						>
							{isSignup ? "Have an account? Login" : "Create an account"}
						</button>
					</div>
					{error && <div className="text-red-500 mt-2">{error}</div>}
				</form>
			</div>
		</div>
	);
}

export default UserLogin;
