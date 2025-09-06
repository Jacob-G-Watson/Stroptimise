import { NavLink, useNavigate } from "react-router-dom";
import React from "react";
import Breadcrumbs from "../utils/Breadcrumbs";
import { DangerButton } from "../utils/ThemeUtils";

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
		<nav className=" bg-white p-4 flex text-sm rounded mb-4 stropt-border" role="navigation" aria-label="Main">
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 bg-stropt-green rounded flex items-center justify-center text-stropt-beige font-bold text-lg select-none stropt-logo-border">
					O
				</div>
				<span className="font-bold text-stropt-brown">Stroptimise</span>
			</div>

			<div className="flex items-center gap-4 ml-6">
				{!user ? (
					<NavLink
						to="/"
						className={({ isActive }) =>
							`font-semibold ${isActive ? "text-stropt-green" : "text-stropt-brown"}`
						}
					>
						Login
					</NavLink>
				) : (
					<NavLink
						to="/jobs"
						className={({ isActive }) =>
							`font-semibold ${isActive ? "text-stropt-green" : "text-stropt-brown"}`
						}
					>
						Jobs
					</NavLink>
				)}
				{user && <Breadcrumbs />}
			</div>
			<div className="ml-auto">
				{user ? (
					<DangerButton onClick={handleLogout} className="px-3 py-1 stropt-logout-border">
						Logout
					</DangerButton>
				) : null}
			</div>
		</nav>
	);
}

export default Navbar;
