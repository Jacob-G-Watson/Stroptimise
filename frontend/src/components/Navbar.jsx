import { NavLink, useNavigate } from "react-router-dom";
import React from "react";
import Breadcrumbs from "./Breadcrumbs";

function Navbar({ user, onLogout }) {
	const navigate = useNavigate();

	const handleLogout = async () => {
		try {
			await fetch("/api/auth/logout", { method: "POST" });
		} catch (e) {
			/* ignore */
		}
		window.__access_token = undefined;
		onLogout && onLogout();
		navigate("/");
	};

	return (
		<nav
			className="bg-gray-200 px-4 py-2 flex items-center text-sm rounded mb-4"
			role="navigation"
			aria-label="Main"
		>
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-lg select-none">
					O
				</div>
				<span className="font-bold text-gray-700">Stroptimise</span>
			</div>

			<div className="flex items-center gap-4 ml-6">
				{!user ? (
					<NavLink
						to="/"
						className={({ isActive }) => `font-semibold ${isActive ? "text-blue-600" : "text-gray-700"}`}
					>
						Login
					</NavLink>
				) : (
					<NavLink
						to="/jobs"
						className={({ isActive }) => `font-semibold ${isActive ? "text-blue-600" : "text-gray-700"}`}
					>
						Jobs
					</NavLink>
				)}
				{user && <Breadcrumbs />}
			</div>
			<div className="ml-auto">
				{user ? (
					<button onClick={handleLogout} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">
						Logout
					</button>
				) : null}
			</div>
		</nav>
	);
}

export default Navbar;
