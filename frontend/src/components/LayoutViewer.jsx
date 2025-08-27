import React from "react";

function LayoutViewer({ sheets, placements }) {
	// Hardcoded sheet and placement for demo
	// const sheets = [{ id: 1, width: 400, height: 300 }];
	// const placements = [
	// 	{ sheet_id: 1, x: 50, y: 40, w: 100, h: 60 },
	// 	{ sheet_id: 1, x: 200, y: 150, w: 80, h: 120 },
	// ];

	console.log(sheets, placements);

	if (!sheets.length || !placements.length) return null;
	return (
		<div className="mt-8">
			<h2 className="font-semibold mb-2">Layout Preview</h2>
			{sheets.map((sheet, idx) => (
				<svg
					key={sheet.id || idx}
					width={sheet.width}
					height={sheet.height}
					style={{ border: "1px solid #333", marginBottom: 16 }}
				>
					<rect x={0} y={0} width={sheet.width} height={sheet.height} fill="#f3f3f3" stroke="#333" />
					{placements
						//todo commented this out because nothing was showing up
						//.filter((p) => p.sheet_id === sheet.id)
						.map((p, i) => (
							<rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill="#90cdf4" stroke="#2b6cb0" />
						))}
				</svg>
			))}
		</div>
	);
}

export default LayoutViewer;
