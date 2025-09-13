import React, { useState } from "react";
import { PrimaryButton } from "../utils/ThemeUtils";
import { authLogin, authRegister, bootstrapRefresh, getCurrentUser, ApiError } from "../services/api";
import { notify } from "../services/notify";
import type { User } from "../types/api";

interface Props {
	onLogin: (user: User) => void;
}

function UserLogin({ onLogin }: Props) {
	const [email, setEmail] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState("");
	const [error, setError] = useState("");
	const [isSignup, setIsSignup] = useState(false);

	async function doLogin(e: string, p: string) {
		try {
			const data = await authLogin(e, p);
			window.__access_token = data.access_token;
			await bootstrapRefresh(data.access_token).catch(() => null);
			const u = await getCurrentUser();
			if (u) onLogin(u);
			return true;
		} catch (err: any) {
			const msg = err instanceof ApiError ? err.serverMessage : err.message;
			notify({ type: "error", message: msg || "Login failed" });
			return false;
		}
		return false;
	}
}

async function handleSubmit(e: React.FormEvent) {
	e.preventDefault();
	setError("");
	if (isSignup) {
		if (!email || !password) {
			setError("Email and password required");
			if (!email || !password) {
				setError("Email and password required");
				return;
			}
			if (password !== passwordConfirm) {
				setError("Passwords do not match");
				return;
			}
			try {
				await authRegister({ email, password, name: displayName || email });
				const loginOk = await doLogin(email, password);
				if (!loginOk) setError("Registered but login failed");
			} catch (err: any) {
				const msg = err instanceof ApiError ? err.serverMessage : err.message;
				setError(msg || "Signup failed");
			}
		} else {
			const success = await doLogin(email, password);
			if (!success) setError("Invalid email or password");
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
