import React, { useEffect, useMemo, useState } from "react";

function JobLayoutViewer({ job, onOptimised }) {
	const [sheetWidth, setSheetWidth] = useState(2400); // mm
	const [sheetHeight, setSheetHeight] = useState(1200); // mm
	const [allowRotation, setAllowRotation] = useState(true);
	const [kerf, setKerf] = useState(0);
	const [result, setResult] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		// Auto-run on load with defaults
		if (!job?.id) return;
		handleCompute();
	}, [job?.id]);

	const handleCompute = async () => {
		if (!job?.id) return;
		setLoading(true);
		setError("");
		try {
			const res = await fetch(`/api/jobs/${job.id}/layout`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sheet_width: Number(sheetWidth),
					sheet_height: Number(sheetHeight),
					allow_rotation: allowRotation,
					kerf_mm: Number(kerf) || 0,
				}),
			});
			if (!res.ok) {
				const msg = await res.text();
				throw new Error(msg || "Failed to compute layout");
			}
			const data = await res.json();
			setResult(data);
			onOptimised && onOptimised(data);
		} catch (e) {
			setError(e.message || String(e));
		} finally {
			setLoading(false);
		}
	};

	const sheets = result?.sheets || [];

	return (
		<div className="bg-white p-4 rounded shadow my-4">
			<div className="mb-4 flex flex-wrap items-end gap-3">
				<div>
					<label className="block text-sm text-gray-600">Sheet width (mm)</label>
					<input
						type="number"
						value={sheetWidth}
						onChange={(e) => setSheetWidth(e.target.value)}
						className="border px-2 py-1 rounded w-32"
					/>
				</div>
				<div>
					<label className="block text-sm text-gray-600">Sheet height (mm)</label>
					<input
						type="number"
						value={sheetHeight}
						onChange={(e) => setSheetHeight(e.target.value)}
						className="border px-2 py-1 rounded w-32"
					/>
				</div>
				<div>
					<label className="block text-sm text-gray-600">Kerf (mm)</label>
					<input
						type="number"
						value={kerf}
						onChange={(e) => setKerf(e.target.value)}
						className="border px-2 py-1 rounded w-24"
					/>
				</div>
				<label className="inline-flex items-center gap-2">
					<input
						type="checkbox"
						checked={allowRotation}
						onChange={(e) => setAllowRotation(e.target.checked)}
					/>
					Allow rotation
				</label>
				<button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleCompute} disabled={loading}>
					{loading ? "Computing..." : "Compute layout"}
				</button>
			</div>

			{error && <div className="text-red-600 mb-3">{error}</div>}

			<div className="grid gap-6 md:grid-cols-2">
				{sheets.length === 0 && !loading && <div>No sheets yet</div>}
				{sheets.map((sheet) => (
					<SheetSvg key={sheet.index} sheet={sheet} />
				))}
			</div>
		</div>
	);
}

function SheetSvg({ sheet }) {
	const displayWidth = 600; // px target
	const scale = displayWidth / sheet.width;
	const displayHeight = Math.round(sheet.height * scale);

	return (
		<div>
			<div className="text-sm text-gray-600 mb-1">
				Sheet #{sheet.index + 1} – {sheet.width} x {sheet.height} mm
			</div>
			<svg
				width={displayWidth}
				height={displayHeight}
				viewBox={`0 0 ${sheet.width} ${sheet.height}`}
				className="border bg-gray-50"
				preserveAspectRatio="xMinYMin meet"
			>
				<rect x="0" y="0" width={sheet.width} height={sheet.height} fill="#fff" stroke="#111" />
				{sheet.rects.map((r) => (
					<g key={r.piece_id}>
						<rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#cfe8ff" stroke="#1e40af" />
						<text x={r.x + 4} y={r.y + 14} fontSize="14" fill="#0f172a">
							{r.name}
						</text>
						<text x={r.x + 4} y={r.y + r.h - 4} fontSize="12" fill="#334155">
							{r.w}×{r.h} {r.rotated ? "(rot)" : ""}
						</text>
					</g>
				))}
			</svg>
		</div>
	);
}

export default JobLayoutViewer;
