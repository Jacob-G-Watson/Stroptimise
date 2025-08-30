import React, { useState } from "react";

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
			const user = await res.json();
			onLogin(user);
		} else {
			setError("Invalid username or password");
		}
	};

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
			<div className="bg-white p-6 rounded shadow w-full max-w-sm">
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
					<button className="w-full px-4 py-2 bg-blue-500 text-white rounded" type="submit">
						Login
					</button>
					{error && <div className="text-red-500 mt-2">{error}</div>}
				</form>
			</div>
		</div>
	);
}

export default UserLogin;
