import { useState } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import UserLogin from "./components/UserLogin";
import UserJobsList from "./components/UserJobsList";
import JobDetails from "./components/JobDetails";
import CabinetDetails from "./components/CabinetDetails";
import JobLayoutViewer from "./components/JobLayoutViewer";
import Navbar from "./components/Navbar";
import SelectionContext from "./utils/SelectionContext";
import ProtectedRoute from "./utils/ProtectedRoute";
import { useSession } from "./services/useSession";
import NotificationCenter from "./utils/NotificationCenter";
import type { Job, CabinetBase, User } from "./types/api";

function App() {
	const { user, setUser } = useSession();
	const [job, setJob] = useState<Job | null>(null);
	const [cabinet, setCabinet] = useState<CabinetBase | null>(null);
	const navigate = useNavigate();

	const handleLogout = () => {
		setUser(null as unknown as User | null);
		setJob(null);
		window.__access_token = undefined;
		navigate("/", { replace: true });
	};

	return (
		<div className=" bg-stropt-beige p-4">
			<NotificationCenter />
			<SelectionContext.Provider value={{ job, setJob, cabinet, setCabinet }}>
				<Navbar user={user} onLogout={handleLogout} />
				<Routes>
					<Route
						path="/"
						element={
							user ? (
								<Navigate to="/jobs" replace />
							) : (
								<UserLogin
									onLogin={(u) => {
										setUser(u);
										navigate("/jobs");
									}}
								/>
							)
						}
					/>
					<Route
						path="/login"
						element={
							user ? (
								<Navigate to="/jobs" replace />
							) : (
								<UserLogin
									onLogin={(u) => {
										setUser(u);
										navigate("/jobs");
									}}
								/>
							)
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
										navigate(`/jobs/${job?.id || cab.owner_id}/cabinet/${cab.id}`);
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
