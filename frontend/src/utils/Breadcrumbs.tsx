import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import SelectionContext from "./SelectionContext";

export default function Breadcrumbs() {
	const { pathname } = useLocation();
	const { job, cabinet } = React.useContext(SelectionContext);
	if (!pathname.startsWith("/jobs") || pathname === "/jobs") return null;
	const parts = pathname.split("/").filter(Boolean);
	if (parts.length < 2) return null;
	const jobId = parts[1];
	const truncate = (txt?: string | null, n = 22) => (txt && txt.length > n ? txt.slice(0, n - 1) + "…" : txt);
	const crumbs = [
		{ label: "Jobs", to: "/jobs" },
		{ label: truncate(job?.name || jobId), to: `/jobs/${jobId}` },
	];
	if (parts[2] === "layout") {
		crumbs.push({ label: "Layout", to: `/jobs/${jobId}/layout` });
	} else if (parts[2] === "cabinet" && parts[3]) {
		crumbs.push({ label: truncate(cabinet?.name || parts[3]), to: `/jobs/${jobId}/cabinet/${parts[3]}` });
	}
	const lastIndex = crumbs.length - 1;
	return (
		<nav aria-label="Breadcrumb">
			<ol className="flex items-center gap-1 text-xs md:text-sm bg-white/80 px-2 py-1 rounded border border-stropt-green/30 shadow-sm">
				{crumbs.map((c, i) => {
					const isLast = i === lastIndex;
					return (
						<li key={c.to} className="flex items-center">
							{i > 0 && (
								<span className="text-stropt-brown/40 mx-1" aria-hidden="true">
									<svg
										width="12"
										height="12"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="block"
									>
										<polyline points="9 18 15 12 9 6" />
									</svg>
								</span>
							)}
							{isLast ? (
								<span
									className="font-semibold text-stropt-green"
									aria-current="page"
									title={c.label || undefined}
								>
									{c.label || ""}
								</span>
							) : (
								<NavLink
									to={c.to}
									className={({ isActive }) =>
										`px-1 rounded hover:underline ${
											isActive ? "text-stropt-green" : "text-stropt-brown"
										}`
									}
									title={c.label || undefined}
								>
									{c.label || ""}
								</NavLink>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
