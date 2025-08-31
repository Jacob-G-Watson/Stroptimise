import React, { useEffect, useState } from "react";
import CabinetDetails from "./CabinetDetails";

function JobDetails({ job, onEditCabinet, handleViewLayout }) {
	const [cabinets, setCabinets] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!job?.id) return;
		setLoading(true);
		fetch(`/api/jobs/${job.id}/cabinets`)
			.then((res) => res.json())
			.then((data) => {
				setCabinets(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				setError("Failed to fetch cabinets");
				setLoading(false);
			});
	}, [job]);

	if (!job) return null;

	const [adding, setAdding] = useState(false);
	const [cabinetName, setCabinetName] = useState("");

	const handleAddCabinet = async (e) => {
		e.preventDefault();
		setAdding(true);
		setError("");
		try {
			const res = await fetch(`/api/jobs/${job.id}/cabinets`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: cabinetName }),
			});
			if (!res.ok) throw new Error("Failed to add cabinet");
			const newCabinet = await res.json();
			setCabinets((prev) => [...prev, newCabinet]);
			setCabinetName("");
		} catch (err) {
			setError(err.message);
		} finally {
			setAdding(false);
		}
	};

	const [expanded, setExpanded] = useState({});

	const toggleExpanded = (id) => {
		setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	return (
		<div className="p-4 bg-white rounded shadow w-full max-w-md md:max-w-3xl mx-auto mt-6">
			<h2 className="text-xl font-bold mb-2">Current Job: {job.name || job.id}</h2>
			<button
				className="mb-4 mr-2 px-3 py-1 bg-green-600 text-white rounded"
				onClick={() => handleViewLayout(true)}
			>
				View Layout
			</button>
			{loading && <div>Loading cabinets...</div>}
			{error && <div className="text-red-500">{error}</div>}

			<div>
				<h3 className="font-semibold">Cabinets</h3>
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
									<span className="font-medium">{cabinet.name || cabinet.id}</span>
								</div>
								<div>
									<button
										className="px-2 py-1 bg-yellow-500 text-white rounded mr-2"
										onClick={() => onEditCabinet(cabinet)}
									>
										Edit
									</button>
									<button
										className="px-2 py-1 bg-red-600 text-white rounded"
										onClick={async () => {
											if (!window.confirm("Delete this cabinet and its pieces?")) return;
											try {
												const res = await fetch(`/api/cabinets/${cabinet.id}`, {
													method: "DELETE",
												});
												if (!res.ok) throw new Error("Failed to delete cabinet");
												setCabinets((prev) => prev.filter((c) => c.id !== cabinet.id));
											} catch (err) {
												setError(err.message || "Delete failed");
											}
										}}
									>
										Delete
									</button>
								</div>
							</div>

							{expanded[cabinet.id] && (
								<div className="p-2 bg-gray-50">
									{/* render CabinetDetails which includes pieces list and add-piece form */}
									<CabinetDetails cabinet={cabinet} />
								</div>
							)}
						</li>
					))}
				</ul>
				<form onSubmit={handleAddCabinet} className="mb-4 flex gap-2 items-center">
					<input
						type="text"
						placeholder="Cabinet name"
						value={cabinetName}
						onChange={(e) => setCabinetName(e.target.value)}
						className="border px-2 py-1 rounded"
						required
					/>
					<button type="submit" className="px-3 py-1 bg-blue-500 text-white rounded" disabled={adding}>
						{adding ? "Adding..." : "Add Cabinet"}
					</button>
				</form>
			</div>
		</div>
	);
}

export default JobDetails;
