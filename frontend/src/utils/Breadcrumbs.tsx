import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import SelectionContext from "./SelectionContext";

export default function Breadcrumbs() {
	const location = useLocation();
	const { pathname } = location;
	const { job, cabinet } = React.useContext(SelectionContext);
	// Support both /jobs/... and /user_cabinets (list) or /user_cabinets/:id routes
	const parts = pathname.split("/").filter(Boolean);
	const isUserCabinetRoute = parts[0] === "user_cabinets";
	const isJobsRoute = parts[0] === "jobs";
	if (!isJobsRoute && !isUserCabinetRoute) return null;

	let jobId: string | undefined = undefined;
	if (isJobsRoute) {
		if (pathname === "/jobs") return null; // don't show on jobs list
		if (parts.length < 2) return null;
		jobId = parts[1];
	}
	const truncate = (txt?: string | null, n = 22) => (txt && txt.length > n ? txt.slice(0, n - 1) + "…" : txt);
	let crumbs: { label: string; to: string }[] = [];
	if (isJobsRoute && jobId) {
		crumbs = [
			{ label: "Jobs", to: "/jobs" },
			{ label: truncate(job?.name || jobId) || jobId, to: `/jobs/${jobId}` },
		];
		if (parts[2] === "layout") {
			crumbs.push({ label: "Layout", to: `/jobs/${jobId}/layout` });
		} else if (parts[2] === "cabinet" && parts[3]) {
			crumbs.push({
				label: truncate(cabinet?.name || parts[3]) || parts[3],
				to: `/jobs/${jobId}/cabinet/${parts[3]}`,
			});
		}
	} else if (isUserCabinetRoute) {
		if (pathname === "/user_cabinets") {
			crumbs = [{ label: "Your Library", to: "/user_cabinets" }];
		} else {
			// /user_cabinets/:id - user cabinet standalone page. If opened from a job route (navigation state provided), show job breadcrumbs.
			const fromJobId = (location as any)?.state?.fromJobId as string | undefined;
			if (fromJobId) {
				crumbs = [
					{ label: "Jobs", to: "/jobs" },
					{ label: truncate(job?.name || fromJobId) || fromJobId, to: `/jobs/${fromJobId}` },
					{ label: truncate(cabinet?.name || parts[1]) || parts[1], to: `/user_cabinets/${parts[1]}` },
				];
			} else {
				crumbs = [
					{ label: "Your Library", to: "/user_cabinets" },
					{ label: truncate(cabinet?.name || parts[1]) || parts[1], to: `/user_cabinets/${parts[1]}` },
				];
			}
		}
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
