import React, { useEffect, useState } from "react";
import LayoutViewer from "./LayoutViewer";

function JobLayoutViewer({ job, onOptimised }) {
	const [pieces, setPieces] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [result, setResult] = useState(null);

	useEffect(() => {
		if (!job?.id) return;
		fetch(`/api/jobs/${job.id}/pieces`)
			.then((r) => r.json())
			.then((data) => setPieces(Array.isArray(data) ? data : []))
			.catch(() => setPieces([]));
	}, [job]);

	const handleStroptimise = async () => {
		if (!job) return;
		setLoading(true);
		setError("");
		setResult(null);
		try {
			const pid = job.id;
			// Re-fetch the latest pieces from the API to ensure we're using server state
			const [piecesRes] = await Promise.all([fetch(`/api/jobs/${pid}/pieces`)]);
			if (!piecesRes.ok) throw new Error("Failed to load pieces from server");
			const freshPieces = await piecesRes.json();
			setPieces(Array.isArray(freshPieces) ? freshPieces : []);

			if (!freshPieces || freshPieces.length === 0) {
				throw new Error("Job pieces on the server before optimising");
			}

			// Call optimise with a standard sheet size (1600x800)
			const res = await fetch(`/api/jobs/${pid}/optimise`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sheets: [{ width: 1600, height: 800 }] }),
			});
			if (!res.ok) {
				const txt = await res.text().catch(() => null);
				throw new Error(txt || "Failed to stroptimise");
			}
			const data = await res.json();
			setResult(data);
			if (onOptimised) onOptimised(data);
		} catch (err) {
			setError(err.message || String(err));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="bg-gray-100 p-4 rounded shadow mt-6">
			<h3 className="text-lg font-bold mb-2">Job Layout Viewer</h3>
			<div className="text-gray-600">Job ID: {job?.id}</div>
			<div className="text-gray-600">Job Name: {job?.name}</div>

			<div className="mt-4">
				<h4 className="font-semibold mb-2">Pieces</h4>
				<ul className="list-disc pl-6 mb-2">
					{pieces.map((p) => (
						<li key={p.id}>
							{p.name || p.id} - {p.width} x {p.height}
						</li>
					))}
				</ul>
			</div>

			<div className="my-4">
				<button
					className="px-4 py-2 bg-blue-500 text-white rounded"
					onClick={handleStroptimise}
					disabled={loading || !job}
				>
					{loading ? "Stroptimising..." : "Stroptimise"}
				</button>
				{error && <div className="text-red-500 mt-2">{error}</div>}
				{result && (
					<div className="mt-4">
						<LayoutViewer
							sheets={[{ id: "live-1600x800", width: 1600, height: 800 }]}
							placements={Array.isArray(result?.placements) ? result.placements : []}
							binsUsed={result?.bins_used}
							placementsByBin={result?.placements_by_bin || result?.placementsByBin}
						/>
					</div>
				)}
			</div>
		</div>
	);
}

export default JobLayoutViewer;
