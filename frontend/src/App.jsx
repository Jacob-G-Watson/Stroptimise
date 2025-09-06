import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import UserLogin from "./components/UserLogin";
import UserJobsList from "./components/UserJobsList";
import JobDetails from "./components/JobDetails";
import CabinetDetails from "./components/CabinetDetails";
import JobLayoutViewer from "./components/JobLayoutViewer";
import Navbar from "./components/Navbar";
import SelectionContext from "./contexts/SelectionContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { useSession } from "./hooks/useSession";

function App() {
	const { user, setUser } = useSession();
	const [job, setJob] = useState(null);
	const [cabinet, setCabinet] = useState(null);
	const navigate = useNavigate();

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
					<Route element={<ProtectedRoute user={user} />}>
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
										navigate(`/jobs/${job?.id || cab.job_id}/cabinet/${cab.id}`);
									}}
									handleViewLayout={() => navigate(`/jobs/${job?.id}/layout`)}
								/>
							}
						/>
						<Route path="/jobs/:jobId/layout" element={<JobLayoutViewer job={job} />} />
						<Route path="/jobs/:jobId/cabinet/:cabinetId" element={<CabinetDetails cabinet={cabinet} />} />
					</Route>
				</Routes>
			</SelectionContext.Provider>
		</div>
	);
}

export default App;
