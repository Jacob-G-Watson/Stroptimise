import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import SelectionContext from "./SelectionContext";

export default function Breadcrumbs() {
	const { pathname } = useLocation();
	if (!pathname.startsWith("/jobs") || pathname === "/jobs") return null;

	const { job, cabinet } = React.useContext(SelectionContext);
	const parts = pathname.split("/").filter(Boolean); // jobs, jobId, optional...
	if (parts.length < 2) return null;

	const jobId = parts[1];
	const crumbs = [{ label: job?.name || jobId, to: `/jobs/${jobId}` }];

	if (parts[2] === "layout") crumbs.push({ label: "Layout", to: `/jobs/${jobId}/layout` });
	else if (parts[2] === "cabinet" && parts[3])
		crumbs.push({ label: cabinet?.name || parts[3], to: `/jobs/${jobId}/cabinet/${parts[3]}` });

	return (
		<ol className="flex items-center gap-2 text-stropt-brown" aria-label="Breadcrumb">
			{crumbs.map((c, i) => (
				<React.Fragment key={c.to}>
					{i > 0 && <span className="text-gray-400">/</span>}
					<li>
						<NavLink
							to={c.to}
							className={({ isActive }) =>
								`hover:underline ${isActive ? "text-stropt-green" : "text-stropt-brown"}`
							}
						>
							{c.label}
						</NavLink>
					</li>
				</React.Fragment>
			))}
		</ol>
	);
}
