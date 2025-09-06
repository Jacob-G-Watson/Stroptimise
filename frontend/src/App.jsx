import React, { useState, useEffect } from "react";
import { authFetch } from "./authFetch";
import UserLogin from "./components/UserLogin";
import UserJobsList from "./components/UserJobsList";
import JobDetails from "./components/JobDetails";
import CabinetDetails from "./components/CabinetDetails";
import JobLayoutViewer from "./components/JobLayoutViewer";
import Navbar from "./components/Navbar";

function App() {
	const [user, setUser] = useState(null);
	const [job, setJob] = useState(null);
	const [selectedCabinet, setSelectedCabinet] = useState(null);
	const [viewLayout, setViewLayout] = useState(null);
	const [currentStep, setCurrentStep] = useState(0);

	// Silent session restore: on mount try refresh then fetch /users/me
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				// Attempt refresh to get new access token (if refresh cookie present)
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
							setCurrentStep(1);
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
	}, []);

	function getCsrfToken() {
		const m = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
		return m ? decodeURIComponent(m[1]) : "";
	}

	const steps = [
		{ key: "login", label: "Login" },
		{ key: "jobs", label: "Jobs" },
		{ key: "details", label: "Job Details" },
		{ key: "cabinet", label: "Cabinet" },
	];

	const handleNavigate = (stepIdx) => {
		setCurrentStep(stepIdx);
		if (stepIdx === 0) {
			setUser(null);
			setJob(null);
			setSelectedCabinet(null);
			setViewLayout(false);
		} else if (stepIdx === 1) {
			setJob(null);
			setViewLayout(false);
			setSelectedCabinet(null);
		} else if (stepIdx === 2) {
			setSelectedCabinet(null);
			setViewLayout(false);
		}
	};

	let content;
	if (!user) {
		content = (
			<UserLogin
				onLogin={(u) => {
					setUser(u);
					setCurrentStep(1);
				}}
			/>
		);
	} else if (!job) {
		content = (
			<UserJobsList
				user={user}
				onSelectJob={(selectedJob) => {
					setJob(selectedJob);
					setCurrentStep(2);
				}}
			/>
		);
	} else if (!selectedCabinet && !viewLayout) {
		content = (
			<JobDetails
				job={job}
				onEditCabinet={(cabinet) => {
					setSelectedCabinet(cabinet);
					setCurrentStep(3);
				}}
				handleViewLayout={(isViewSelected) => {
					setViewLayout(isViewSelected);
					setCurrentStep(3);
				}}
			/>
		);
	} else if (viewLayout) {
		content = <JobLayoutViewer job={job} />;
	} else {
		content = <CabinetDetails cabinet={selectedCabinet} />;
	}

	return (
		<div className="min-h-screen bg-gray-100 p-4">
			<Navbar
				steps={steps}
				currentStep={currentStep}
				onNavigate={handleNavigate}
				onLogout={() => {
					setUser(null);
					setJob(null);
					setSelectedCabinet(null);
					setViewLayout(null);
					setCurrentStep(0);
				}}
			/>
			{content}
		</div>
	);
}

export default App;
