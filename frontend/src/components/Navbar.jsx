import { NavLink, useNavigate, useLocation } from "react-router-dom";
import React from "react";
import Breadcrumbs from "../utils/Breadcrumbs";
import { DangerButton, BackButton } from "../utils/ThemeUtils";

function Navbar({ user, onLogout }) {
	const navigate = useNavigate();
	const location = useLocation();

	// Decide if we should show a back button: show when user is on a nested jobs route or any route that's not /jobs or /login or root
	const showBack = React.useMemo(() => {
		if (!user) return false;
		const p = location.pathname;
		if (p === "/" || p === "/jobs" || p === "/login") return false;
		return true;
	}, [location.pathname, user]);

	const handleBack = () => {
		// If we can, go back; otherwise go to jobs list as a safe default
		if (window.history.length > 1) navigate(-1);
		else navigate("/jobs");
	};

	const handleLogout = () => {
		window.__access_token = undefined;
		onLogout && onLogout();
		navigate("/login");
	};

	return (
		<nav
			className=" bg-white p-4 flex items-center text-sm rounded mb-4 stropt-border"
			role="navigation"
			aria-label="Main"
		>
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 bg-stropt-green rounded flex items-center justify-center text-stropt-beige font-bold text-lg select-none stropt-logo-border">
					O
				</div>
				<span className="font-bold text-stropt-brown">Stroptimise</span>
			</div>

			{showBack && (
				<div className="ml-4">
					<BackButton onClick={handleBack} />
				</div>
			)}

			<div className="flex items-center gap-4 ml-6">
				<Breadcrumbs />
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
