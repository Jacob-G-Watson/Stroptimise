import React, { useEffect, useState } from "react";
import { getJobsForUser, createJob, ApiError } from "../services/api";
import { notify } from "../services/notify";
import { PrimaryButton } from "../utils/ThemeUtils";
import { useNavigate } from "react-router-dom";
import type { User, Job } from "../types/api";

interface Props {
	user: User | null;
	onSelectJob: (job: Job) => void;
}

export default function UserJobsList({ user, onSelectJob }: Props) {
	const [jobs, setJobs] = useState<Job[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [adding, setAdding] = useState(false);
	const [jobName, setJobName] = useState("");
	const navigate = useNavigate();

	useEffect(() => {
		if (!user?.id) return;
		let cancelled = false;
		const ac = new AbortController();
		setLoading(true);
		getJobsForUser(user.id, { signal: ac.signal })
			.then((data) => {
				if (!cancelled) {
					setJobs(data);
					setLoading(false);
				}
			})
			.catch((err: any) => {
				if (err.name === "AbortError") return;
				if (!cancelled) {
					const msg = err instanceof ApiError ? err.serverMessage : err.message;
					setError(msg);
					setLoading(false);
				}
			});
		return () => {
			cancelled = true;
			ac.abort();
		};
	}, [user]);

	const handleAddJob = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;
		setAdding(true);
		setError("");
		try {
			const newJob = await createJob({ name: jobName, user_id: user.id });
			setJobs((prev) => [...prev, newJob]);
			setJobName("");
		} catch (err: any) {
			const msg = err instanceof ApiError ? err.serverMessage : err.message;
			setError(msg);
			notify({ type: "error", message: msg });
		} finally {
			setAdding(false);
		}
	};

	if (!user?.id) return null;

	return (
		<div className="flex flex-col sm:flex-row items-start gap-4 justify-center">
			{/* Left: jobs card */}
			<div className="p-4 bg-white rounded shadow stropt-border w-full sm:w-max max-w-[90vw] mx-auto mt-6">
				<div className="mb-2">
					<h3 className="text-lg font-bold">Your Jobs</h3>
				</div>
				<form onSubmit={handleAddJob} className="mb-4 flex flex-col sm:flex-row gap-2 items-center">
					<input
						type="text"
						placeholder="Job name"
						value={jobName}
						onChange={(e) => setJobName(e.target.value)}
						className="border px-2 py-1 rounded w-full"
						required
					/>
					<PrimaryButton className="w-full sm:w-auto sm:whitespace-nowrap" type="submit" disabled={adding}>
						{adding ? "Adding..." : "Add Job"}
					</PrimaryButton>
				</form>
				{loading && <div>Loading jobs...</div>}
				{error && <div className="text-red-500">{error}</div>}
				<ul>
					{jobs.map((job) => (
						<li key={job.id} className="mb-2">
							<div className="flex items-center justify-between gap-4">
								<span className="break-words" title={job.name || job.id}>
									{job.name || job.id}
								</span>
								<PrimaryButton onClick={() => onSelectJob(job)}>Select</PrimaryButton>
							</div>
						</li>
					))}
				</ul>
			</div>

			{/* Right: library box with the button */}
			<div className="p-4 bg-white rounded shadow stropt-border w-full sm:w-40 flex items-center justify-center mt-6">
				<PrimaryButton className="whitespace-nowrap" onClick={() => navigate("/user_cabinets")}>
					Your Library
				</PrimaryButton>
			</div>
		</div>
	);
}
