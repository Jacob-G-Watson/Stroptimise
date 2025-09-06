import React, { useState } from "react";
import { PrimaryButton } from "../utils/ThemeUtils";

function UserLogin({ onLogin }) {
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = async (e) => {
		e.preventDefault();
		const res = await fetch("/api/users/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, password }),
		});
		if (res.ok) {
			const data = await res.json();
			const { access_token, user } = data;
			// Store access token in memory (window) for simplicity; in production consider context/state
			window.__access_token = access_token;
			onLogin(user);
		} else {
			setError("Invalid username or password");
		}
	};

	return (
		<div className="flex flex-col items-center justify-center bg-stropt-beige">
			<span className="font-sans font-extrabold p-20 text-9xl text-stropt-green">
				Strop<span className="text-stropt-brown">timise</span>
			</span>
			<div className="p-4 bg-white rounded shadow mx-auto max-w-max stropt-border">
				<h2 className="text-xl font-bold mb-4">Login</h2>
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
					<PrimaryButton className="w-full" type="submit">
						Login
					</PrimaryButton>
					{error && <div className="text-red-500 mt-2">{error}</div>}
				</form>
			</div>
		</div>
	);
}

export default UserLogin;
