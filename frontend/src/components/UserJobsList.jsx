import React, { useEffect, useState } from "react";
import { authFetch } from "../authFetch";

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
		authFetch(`/api/jobs?user_id=${user.id}`, { signal: ac.signal })
			.then((res) => {
				if (!res.ok) throw new Error("Failed to fetch jobs");
				return res.json();
			})
			.then((data) => {
				if (!cancelled) {
					setJobs(data);
					setLoading(false);
				}
			})
			.catch((err) => {
				if (err.name === "AbortError") return;
				if (!cancelled) {
					setError(err.message);
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
			const res = await authFetch("/api/jobs", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: jobName, user_id: user.id }),
			});
			if (!res.ok) throw new Error("Failed to add job");
			const newJob = await res.json();
			setJobs((prev) => [...prev, newJob]);
			setJobName("");
		} catch (err) {
			setError(err.message);
		} finally {
			setAdding(false);
		}
	};

	if (!user?.id) return null;

	return (
		<div className="p-4 bg-white rounded shadow max-w-md mx-auto mt-6">
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
				<button type="submit" className="px-3 py-1 bg-blue-500 text-white rounded" disabled={adding}>
					{adding ? "Adding..." : "Add Job"}
				</button>
			</form>
			{loading && <div>Loading jobs...</div>}
			{error && <div className="text-red-500">{error}</div>}
			<ul>
				{jobs.map((job) => (
					<li key={job.id} className="mb-2 flex justify-between items-center">
						<span>{job.name || job.id}</span>
						<button className="px-2 py-1 bg-blue-500 text-white rounded" onClick={() => onSelectJob(job)}>
							Select
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}

export default UserJobsList;
