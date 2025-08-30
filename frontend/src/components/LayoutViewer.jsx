function LayoutViewer({ sheets, placements, binsUsed, placementsByBin }) {
	// prefer grouped placements or explicit binsUsed when available
	const havePlacements = Array.isArray(placements) && placements.length > 0;
	const haveGrouped = Array.isArray(placementsByBin) && placementsByBin.length > 0;
	if (!sheets.length || (!havePlacements && !haveGrouped)) return null;

	// Determine how many bins/sheets to render
	const bins =
		typeof binsUsed === "number" && binsUsed > 0
			? binsUsed
			: haveGrouped
			? placementsByBin.length
			: Math.max(1, placements.reduce((m, p) => Math.max(m, Number(p.bin_index || 0)), -1) + 1);

	// If optimizer returned more bins than we were given sheet definitions for,
	// clone the first sheet definition to fill the rest so we can render them.
	const displaySheets = (() => {
		if (sheets.length >= bins) return sheets;
		const base = sheets[0] || { width: 1600, height: 800 };
		const out = [...sheets];
		for (let i = sheets.length; i < bins; i++) {
			out.push({ ...base, id: base.id ? `${base.id}-${i}` : undefined });
		}
		return out;
	})();

	return (
		<div className="mt-8">
			<h2 className="font-semibold mb-2">Layout Preview</h2>
			{displaySheets.map((sheet, idx) => {
				const sheetPlacements = haveGrouped
					? placementsByBin[idx] || []
					: placements.filter((p) => Number(p.bin_index || 0) === idx);
				return (
					<div key={sheet.id || idx} className="w-full">
						<div className="mb-1 text-sm text-gray-600">
							Sheet {idx + 1}: {sheet.width}×{sheet.height} ({sheetPlacements.length} pieces)
						</div>
						<svg
							viewBox={`0 0 ${sheet.width} ${sheet.height}`}
							preserveAspectRatio="xMidYMid meet"
							className="w-full h-auto max-h-[80vh] border mb-4 block"
						>
							<rect x={0} y={0} width={sheet.width} height={sheet.height} fill="#f3f3f3" stroke="#333" />
							{sheetPlacements.map((p, i) => (
								<rect
									key={i}
									x={p.x}
									y={p.y}
									width={p.w}
									height={p.h}
									fill="#90cdf4"
									stroke="#2b6cb0"
								/>
							))}
						</svg>
					</div>
				);
			})}
		</div>
	);
}

export default LayoutViewer;
