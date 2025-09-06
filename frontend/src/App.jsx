import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { authFetch } from "./authFetch";
import UserLogin from "./components/UserLogin";
import UserJobsList from "./components/UserJobsList";
import JobDetails from "./components/JobDetails";
import CabinetDetails from "./components/CabinetDetails";
import JobLayoutViewer from "./components/JobLayoutViewer";
import Navbar from "./components/Navbar";
import SelectionContext from "./contexts/SelectionContext";

function App() {
	const [user, setUser] = useState(null);
	const [job, setJob] = useState(null);
	const [cabinet, setCabinet] = useState(null);
	const navigate = useNavigate();

	// Silent session restore: on mount try refresh then fetch /users/me
	const refreshStartedRef = useRef(false);
	useEffect(() => {
		if (refreshStartedRef.current) return; // avoid duplicate refresh calls (StrictMode double-mount)
		refreshStartedRef.current = true;
		let cancelled = false;
		(async () => {
			try {
				const resp = await fetch("/api/auth/refresh", {
					method: "POST",
					headers: { "X-CSRF-Token": getCsrfToken() },
				});
				if (resp.ok) {
					const data = await resp.json();
					window.__access_token = data.access_token;
					const meRes = await authFetch("/api/users/me");
					if (meRes.ok) {
						const me = await meRes.json();
						if (!cancelled) {
							setUser(me);
							navigate("/jobs", { replace: true });
						}
					}
				}
			} catch (e) {
				// ignore
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [navigate]);

	function getCsrfToken() {
		const m = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
		return m ? decodeURIComponent(m[1]) : "";
	}

	const handleLogout = () => {
		setUser(null);
		setJob(null);
		window.__access_token = undefined;
		navigate("/", { replace: true });
	};

	return (
		<div className="min-h-screen bg-gray-100 p-4">
			<SelectionContext.Provider value={{ job, setJob, cabinet, setCabinet }}>
				<Navbar user={user} onLogout={handleLogout} />
				<Routes>
					<Route
						path="/"
						element={
							<UserLogin
								onLogin={(u) => {
									setUser(u);
									navigate("/jobs");
								}}
							/>
						}
					/>
					<Route
						path="/jobs"
						element={
							<UserJobsList
								user={user}
								onSelectJob={(selectedJob) => {
									setJob(selectedJob);
									navigate(`/jobs/${selectedJob.id}`);
								}}
							/>
						}
					/>
					<Route
						path="/jobs/:jobId"
						element={
							<JobDetails
								job={job}
								onEditCabinet={(cab) => {
									setCabinet(cab);
									navigate(`/jobs/${job?.id}/cabinet/${cab.id}`);
								}}
								handleViewLayout={() => navigate(`/jobs/${job?.id}/layout`)}
							/>
						}
					/>
					<Route path="/jobs/:jobId/layout" element={<JobLayoutViewer job={job} />} />
					<Route path="/jobs/:jobId/cabinet/:cabinetId" element={<CabinetDetails cabinet={null} />} />
				</Routes>
			</SelectionContext.Provider>
		</div>
	);
}

export default App;
