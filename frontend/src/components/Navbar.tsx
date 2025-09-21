import { useNavigate, useLocation } from "react-router-dom";
import React from "react";
import Breadcrumbs from "../utils/Breadcrumbs";
import { DangerButton, BackButton } from "../utils/ThemeUtils";
import type { User } from "../types/api";

interface Props {
	user: User | null;
	onLogout: () => void;
}

function Navbar({ user, onLogout }: Props) {
	const navigate = useNavigate();
	const location = useLocation();
	const [mobileOpen, setMobileOpen] = React.useState(false);
	const showBack = React.useMemo(() => {
		if (!user) return false;
		const p = location.pathname;
		if (p === "/" || p === "/jobs" || p === "/login") return false;
		return true;
	}, [location.pathname, user]);
	const handleBack = () => {
		if (window.history.length > 1) navigate(-1);
		else navigate("/jobs");
	};
	const handleLogout = () => {
		window.__access_token = undefined;
		onLogout && onLogout();
		setMobileOpen(false);
		navigate("/login");
	};

	const LogoutButton: React.FC = () => (
		<div className="hidden sm:block ml-auto">
			{user ? (
				<DangerButton onClick={handleLogout} className="px-3 py-1 stropt-logout-border">
					Logout
				</DangerButton>
			) : null}
		</div>
	);

	const NavDropdownMenu: React.FC = () => (
		<div className="sm:hidden absolute left-0 right-0 top-full mt-2 w-full z-50 pointer-events-auto">
			<div className="max-w-[95vw] mx-auto p-2 bg-white rounded shadow stropt-border flex flex-col gap-2 overflow-hidden">
				<div className="w-full">
					<Breadcrumbs />
				</div>
				<div>
					{user ? (
						<DangerButton onClick={handleLogout} className="w-full m-0">
							Logout
						</DangerButton>
					) : null}
				</div>
			</div>
		</div>
	);

	const LogoIcon: React.FC = () => (
		<div className="w-8 h-8 bg-stropt-green rounded flex items-center justify-center text-stropt-beige font-bold text-lg select-none stropt-logo-border">
			O
		</div>
	);

	const Brand: React.FC<{ onToggle: () => void }> = ({ onToggle }) => (
		<>
			<button className="sm:hidden ml-2 p-0" aria-label="Open menu" onClick={onToggle}>
				<LogoIcon />
			</button>
			<div className="hidden sm:flex items-center gap-2">
				<LogoIcon aria-hidden />
				<span className="font-bold text-stropt-brown">Stroptimise</span>
			</div>
		</>
	);

	const closeIcon = (
		<g>
			<line x1="18" y1="6" x2="6" y2="18" />
			<line x1="6" y1="6" x2="18" y2="18" />
		</g>
	);
	const hamburgerIcon = (
		<g>
			<line x1="3" y1="12" x2="21" y2="12" />
			<line x1="3" y1="6" x2="21" y2="6" />
			<line x1="3" y1="18" x2="21" y2="18" />
		</g>
	);
	const HamburgerToggle: React.FC<{ mobileOpen: boolean; onToggle: () => void }> = ({ mobileOpen, onToggle }) => (
		<button
			className="sm:hidden p-1"
			aria-label={mobileOpen ? "Close menu" : "Open menu"}
			aria-expanded={mobileOpen}
			onClick={onToggle}
		>
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="text-stropt-brown"
			>
				{mobileOpen ? closeIcon : hamburgerIcon}
			</svg>
		</button>
	);
	return (
		<nav
			className="relative bg-white p-4 flex items-center justify-between flex-wrap text-sm rounded mb-4 stropt-border"
			role="navigation"
			aria-label="Main"
		>
			<div className="flex items-center gap-2">
				<HamburgerToggle mobileOpen={mobileOpen} onToggle={() => setMobileOpen((s) => !s)} />
				<Brand onToggle={() => setMobileOpen((s) => !s)} />
				{showBack && (
					<div className="ml-2">
						<BackButton onClick={handleBack}>Back</BackButton>
					</div>
				)}
			</div>

			<div className="hidden sm:flex items-center gap-4 ml-6">
				<Breadcrumbs />
			</div>

			<LogoutButton />
			{mobileOpen && <NavDropdownMenu />}
		</nav>
	);
}

export default Navbar;
