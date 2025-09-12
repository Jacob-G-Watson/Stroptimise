import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SelectionContext from "../utils/SelectionContext";
import { getJob, getJobCabinets, addCabinetToJob, deleteCabinet, ApiError } from "../services/api";
import { notify } from "../services/notify";
import CabinetDetails from "./CabinetDetails";
import { PrimaryButton, DangerButton } from "../utils/ThemeUtils";

function JobDetails({ job: jobProp, onEditCabinet, handleViewLayout }) {
	const params = useParams();
	const { job: contextJob, setJob: setContextJob } = React.useContext(SelectionContext);
	const jobIdFromParams = params.jobId;
	const [job, setJob] = useState(jobProp || contextJob || null);
	const [cabinets, setCabinets] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [adding, setAdding] = useState(false);
	const [cabinetName, setCabinetName] = useState("");
	const [expanded, setExpanded] = useState({});

	useEffect(() => {
		let cancelled = false;
		const ac = new AbortController();

		(async () => {
			try {
				if (!job && jobIdFromParams) {
					try {
						const j = await getJob(jobIdFromParams, { signal: ac.signal });
						if (!cancelled) {
							setJob(j);
							if (setContextJob) setContextJob(j);
						}
					} catch (e) {
						if (e.name === "AbortError") return;
					}
				}
			} catch (e) {
				if (e.name === "AbortError") return;
			}
		})();

		if (!job?.id)
			return () => {
				cancelled = true;
				ac.abort();
			};

		setLoading(true);
		getJobCabinets(job.id, { signal: ac.signal })
			.then((data) => {
				if (!cancelled) {
					setCabinets(Array.isArray(data) ? data : []);
					setLoading(false);
				}
			})
			.catch((err) => {
				if (err.name === "AbortError") return;
				if (!cancelled) {
					const msg = err instanceof ApiError ? err.serverMessage : "Failed to fetch cabinets";
					setError(msg);
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
			ac.abort();
		};
	}, [job, jobIdFromParams]);

	const toggleExpanded = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

	const handleAddCabinet = async (e) => {
		e.preventDefault();
		setAdding(true);
		setError("");
		try {
			const newCabinet = await addCabinetToJob(job.id, { name: cabinetName });
			setCabinets((prev) => [...prev, newCabinet]);
			setCabinetName("");
		} catch (err) {
			const msg = err instanceof ApiError ? err.serverMessage : err.message;
			setError(msg);
			notify({ type: "error", message: msg });
		} finally {
			setAdding(false);
		}
	};

	if (!job) return null;

	const cabinetList = (
		<ul className="pl-0">
			{cabinets.map((cabinet) => (
				<li key={cabinet.id} className="mb-2 border rounded">
					<div className="flex items-center justify-between p-2">
						<div className="flex items-center gap-2">
							<button
								aria-label={expanded[cabinet.id] ? "Collapse" : "Expand"}
								onClick={() => toggleExpanded(cabinet.id)}
								className="text-xl w-6 h-6 flex items-center justify-center"
							>
								{expanded[cabinet.id] ? "▾" : "▸"}
							</button>
							<span className="font-medium text-stropt-brown">{cabinet.name || cabinet.id}</span>
						</div>
						<div>
							<PrimaryButton onClick={() => onEditCabinet(cabinet)}>Edit</PrimaryButton>
							<DangerButton
								onClick={async () => {
									if (!window.confirm("Delete this cabinet and its pieces?")) return;
									try {
										await deleteCabinet(cabinet.id);
										setCabinets((prev) => prev.filter((c) => c.id !== cabinet.id));
									} catch (err) {
										const msg = err instanceof ApiError ? err.serverMessage : err.message;
										setError(msg || "Delete failed");
										notify({ type: "error", message: msg });
									}
								}}
							>
								Delete
							</DangerButton>
						</div>
					</div>

					{expanded[cabinet.id] && <CabinetDetails cabinet={cabinet} />}
				</li>
			))}
		</ul>
	);
	const cabinetForm = (
		<form onSubmit={handleAddCabinet} className="mb-4 flex gap-2 items-center">
			<input
				type="text"
				placeholder="Cabinet name"
				value={cabinetName}
				onChange={(e) => setCabinetName(e.target.value)}
				className="border px-2 py-1 rounded"
				required
			/>
			<PrimaryButton type="submit" className="" disabled={adding}>
				{adding ? "Adding..." : "Add Cabinet"}
			</PrimaryButton>
		</form>
	);
	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6 px-4 items-start">
			{/* left spacer on large screens */}
			<div className="hidden lg:block" />

			{/* FIRST BOX: centered on small, middle column on large. Prevent overflow with min-w-0 and max-w-full */}
			<div className="p-4 bg-white rounded shadow stropt-border w-full max-w-full mx-auto min-w-0 overflow-hidden">
				<div className="flex items-center justify-between mb-3 gap-2">
					<h2 className="text-xl font-bold text-stropt-brown truncate">Current Job: {job.name || job.id}</h2>
					<PrimaryButton onClick={() => handleViewLayout(true)}>View Layout</PrimaryButton>
				</div>

				{loading && <div>Loading cabinets...</div>}
				{error && <div className="text-red-500">{error}</div>}

				<div className="min-w-0">
					<h3 className="font-semibold">Cabinets</h3>
					{cabinetList}
					{cabinetForm}
				</div>
			</div>

			{/* SECOND BOX: stacks below on small screens; on large screens it's placed in column 3 and right-aligned */}
			<div className="p-4 bg-white rounded shadow stropt-border w-full max-w-full min-w-0 lg:justify-self-end overflow-hidden">
				{/* SECOND BOX */}
			</div>
		</div>
	);
}

export default JobDetails;
