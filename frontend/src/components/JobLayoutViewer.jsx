import React, { useState } from "react";

function JobLayoutViewer({ job, onOptimised }) {
	const [sheetWidth, setSheetWidth] = useState(2400); // mm
	const [sheetHeight, setSheetHeight] = useState(1200); // mm
	const [allowRotation, setAllowRotation] = useState(true);
	const [kerf, setKerf] = useState(0);
	const [packingMode, setPackingMode] = useState("heuristic");
	const [result, setResult] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

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
					packing_mode: packingMode,
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
				<div>
					<label className="block text-sm text-gray-600">Packing mode</label>
					<select
						value={packingMode}
						onChange={(e) => setPackingMode(e.target.value)}
						className="border px-2 py-1 rounded w-32"
					>
						<option value="simple">Simple</option>
						<option value="heuristic">Heuristic</option>
						<option value="exhaustive">Exhaustive</option>
					</select>
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
				{sheets.length === 0 && !loading && <div>No layout computed yet</div>}
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
	const polyIds = new Set((sheet.polygons || []).map((p) => p.piece_id));

	const centroid = (pts) => {
		if (!pts || pts.length < 3) {
			// fallback to average
			const n = pts?.length || 0;
			if (!n) return { x: 0, y: 0 };
			const sx = pts.reduce((a, [x]) => a + x, 0);
			const sy = pts.reduce((a, [, y]) => a + y, 0);
			return { x: sx / n, y: sy / n };
		}
		let a = 0,
			cx = 0,
			cy = 0;
		for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
			const [x0, y0] = pts[j];
			const [x1, y1] = pts[i];
			const f = x0 * y1 - x1 * y0;
			a += f;
			cx += (x0 + x1) * f;
			cy += (y0 + y1) * f;
		}
		a *= 0.5;
		if (Math.abs(a) < 1e-6) {
			// degenerate; average
			const n = pts.length;
			const sx = pts.reduce((s, [x]) => s + x, 0);
			const sy = pts.reduce((s, [, y]) => s + y, 0);
			return { x: sx / n, y: sy / n };
		}
		cx = cx / (6 * a);
		cy = cy / (6 * a);
		return { x: cx, y: cy };
	};

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
				{/* Polygons first to avoid covering labels */}
				{(sheet.polygons || []).map((pg, idx) => {
					if (!pg.points || pg.points.length === 0) return null;
					const d = `M ${pg.points.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`;
					const c = centroid(pg.points);
					return (
						<g key={`poly-${pg.piece_id}-${idx}`}>
							<path d={d} fill="#ffe8cc" stroke="#9a3412" />
							<text
								x={c.x}
								y={c.y}
								fontSize="14"
								fill="#0f172a"
								textAnchor="middle"
								alignmentBaseline="middle"
								style={{ pointerEvents: "none" }}
							>
								{pg.name}
							</text>
							{pg.angle ? (
								<text
									x={c.x}
									y={c.y + 16}
									fontSize="12"
									fill="#334155"
									textAnchor="middle"
									alignmentBaseline="hanging"
									style={{ pointerEvents: "none" }}
								>
									{`${pg.angle}°`}
								</text>
							) : null}
						</g>
					);
				})}
				{sheet.rects
					.filter((r) => !polyIds.has(r.piece_id))
					.map((r) => (
						<g key={r.piece_id}>
							<rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#cfe8ff" stroke="#1e40af" />
							<text x={r.x + 4} y={r.y + 14} fontSize="14" fill="#0f172a">
								{r.name}
							</text>
							<text x={r.x + 4} y={r.y + r.h - 4} fontSize="12" fill="#334155">
								{r.w}×{r.h} {r.angle && r.angle !== 0 ? `(${r.angle}°)` : ""}
							</text>
						</g>
					))}
			</svg>
		</div>
	);
}

export default JobLayoutViewer;
