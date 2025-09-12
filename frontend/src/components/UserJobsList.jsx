import React, { useEffect, useState } from "react";
import { getJobsForUser, createJob, ApiError } from "../services/api";
import { notify } from "../services/notify";
import { PrimaryButton } from "../utils/ThemeUtils";

function UserJobsList({ user, onSelectJob }) {
	const [jobs, setJobs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [adding, setAdding] = useState(false);
	const [jobName, setJobName] = useState("");

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
			.catch((err) => {
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

	const handleAddJob = async (e) => {
		e.preventDefault();
		setAdding(true);
		setError("");
		try {
			const newJob = await createJob({ name: jobName, user_id: user.id });
			setJobs((prev) => [...prev, newJob]);
			setJobName("");
		} catch (err) {
			const msg = err instanceof ApiError ? err.serverMessage : err.message;
			setError(msg);
			notify({ type: "error", message: msg });
		} finally {
			setAdding(false);
		}
	};

	if (!user?.id) return null;

	return (
		<div className="p-4 bg-white rounded shadow stropt-border w-max max-w-[90vw] mx-auto mt-6">
			<h3 className="text-lg font-bold mb-2">Your Jobs</h3>
			<form onSubmit={handleAddJob} className="mb-4 flex gap-2 items-center">
				<input
					type="text"
					placeholder="Job name"
					value={jobName}
					onChange={(e) => setJobName(e.target.value)}
					className="border px-2 py-1 rounded"
					required
				/>
				<PrimaryButton type="submit" disabled={adding}>
					{adding ? "Adding..." : "Add Job"}
				</PrimaryButton>
			</form>
			{loading && <div>Loading jobs...</div>}
			{error && <div className="text-red-500">{error}</div>}
			<ul>
				{jobs.map((job) => (
					<li key={job.id} className="mb-2">
						<div className="flex items-center justify-between gap-4">
							<span className="break-all" title={job.name || job.id}>
								{job.name || job.id}
							</span>
							<PrimaryButton onClick={() => onSelectJob(job)}>Select</PrimaryButton>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}

export default UserJobsList;
