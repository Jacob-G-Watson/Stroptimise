import React, { useState } from "react";
import { PrimaryButton } from "../utils/ThemeUtils";

function UserLogin({ onLogin }) {
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState("");
	const [error, setError] = useState("");
	const [isSignup, setIsSignup] = useState(false);

	const doLogin = async (userName, pass) => {
		const res = await fetch("/api/users/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: userName, password: pass }),
		});
		if (res.ok) {
			const data = await res.json();
			const { access_token, user } = data;
			// Store access token in memory (window) for simplicity; in production consider context/state
			window.__access_token = access_token;
			onLogin(user);
			return true;
		}
		return false;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		if (isSignup) {
			// Client-side validation
			if (!name || !password) {
				setError("Username and password are required");
				return;
			}
			if (password !== passwordConfirm) {
				setError("Passwords do not match");
				return;
			}
			// Attempt to create user
			try {
				const res = await fetch("/api/users", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ name, password }),
				});
				if (res.ok) {
					const data = await res.json();
					window.__access_token = data.access_token;
					onLogin(data.user);
				} else if (res.status === 404) {
					setError("Signup is not available on this server");
				} else {
					const data = await res.json().catch(() => ({}));
					setError(data.detail || "Signup failed");
				}
			} catch (err) {
				setError("Network error during signup");
			}
		} else {
			// Login flow
			const success = await doLogin(name, password);
			if (!success) setError("Invalid username or password");
		}
	};

	return (
		<div className="flex flex-col items-center justify-center bg-stropt-beige">
			<span className="font-sans font-extrabold p-20 text-9xl text-stropt-green">
				Strop<span className="text-stropt-brown">timise</span>
			</span>
			<div className="p-4 bg-white rounded shadow mx-auto max-w-max stropt-border">
				<h2 className="text-xl font-bold mb-4">{isSignup ? "Sign up" : "Login"}</h2>
				<form onSubmit={handleSubmit}>
					<input
						type="text"
						placeholder="Username"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="border px-2 py-1 mb-2 w-full"
						required
					/>
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
