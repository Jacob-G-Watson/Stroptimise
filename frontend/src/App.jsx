import React, { useState } from "react";
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
			<Navbar steps={steps} currentStep={currentStep} onNavigate={handleNavigate} />
			{content}
		</div>
	);
}

export default App;
