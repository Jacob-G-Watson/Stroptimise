import React from "react";
import { centroid as computeCentroid } from "../services/layoutUtils";

function SheetSvg({ sheet }) {
	const displayWidth = 600; // px target
	const scale = displayWidth / sheet.width;
	const displayHeight = Math.round(sheet.height * scale);
	const polyIds = new Set((sheet.polygons || []).map((p) => p.piece_id));

	const centroid = (pts) => computeCentroid(pts);

	return (
		<div className="flex-none" style={{ width: `${displayWidth}px`, maxWidth: "100%" }}>
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
					// compute bounding box for the polygon to pick a font size that fits
					const xs = pg.points.map((p) => p[0]);
					const ys = pg.points.map((p) => p[1]);
					const minX = Math.min(...xs);
					const maxX = Math.max(...xs);
					const minY = Math.min(...ys);
					const maxY = Math.max(...ys);
					const bw = Math.max(0, maxX - minX);
					const bh = Math.max(0, maxY - minY);
					// pick font size as fraction of the smaller dimension, clamp for readability
					const fontSizeMain = Math.max(8, Math.min(Math.round(Math.min(bw, bh) * 0.25), 48));
					const fontSizeAngle = Math.max(8, Math.round(fontSizeMain * 0.65));
					const dimFont = fontSizeMain;
					return (
						<g key={`poly-${pg.piece_id}-${idx}`}>
							<path d={d} fill="#ffe8cc" stroke="#9a3412" />
							<text
								x={c.x}
								y={c.y}
								fontSize={fontSizeMain}
								fill="#0f172a"
								textAnchor="middle"
								dominantBaseline="middle"
								style={{ pointerEvents: "none" }}
							>
								{pg.name}
							</text>
							{pg.angle ? (
								<text
									x={c.x}
									y={c.y + 26}
									fontSize={fontSizeAngle}
									fill="#334155"
									textAnchor="middle"
									dominantBaseline="hanging"
									style={{ pointerEvents: "none" }}
								>
									{`${pg.angle}°`}
								</text>
							) : null}
							{/* Edge measurements for polygon */}
							{pg.points.map((p0, i) => {
								const p1 = pg.points[(i + 1) % pg.points.length];
								const [x0, y0] = p0;
								const [x1, y1] = p1;
								const mx = (x0 + x1) / 2;
								const my = (y0 + y1) / 2;
								const dx = x1 - x0;
								const dy = y1 - y0;
								const len = Math.hypot(dx, dy);
								// Offset label a bit towards polygon centroid
								const vx = c.x - mx;
								const vy = c.y - my;
								const vlen = Math.hypot(vx, vy) || 1;
								const off = 30; // mm
								const lx = mx + (vx / vlen) * off;
								const ly = my + (vy / vlen) * off;
								const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
								return (
									<text
										key={`poly-dim-${pg.piece_id}-${i}`}
										x={lx}
										y={ly}
										fontSize={dimFont}
										fill="#0f172a"
										textAnchor="middle"
										dominantBaseline="middle"
										transform={`rotate(${angle} ${lx} ${ly})`}
										style={{ pointerEvents: "none" }}
									>
										{`${Math.round(len)} mm`}
									</text>
								);
							})}
						</g>
					);
				})}
				{sheet.rects
					.filter((r) => !polyIds.has(r.piece_id))
					.map((r) => {
						// pick font sizes based on rect size (use the smaller dimension)
						const rSmall = Math.min(r.w, r.h);
						const rLabelSize = Math.max(8, Math.min(Math.round(rSmall * 0.12), 20));
						const rInfoSize = Math.max(6, Math.round(rLabelSize * 0.85));
						const dimFont = rLabelSize;
						return (
							<g key={r.piece_id}>
								<rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#cfe8ff" stroke="#1e40af" />
								<text x={r.x + 4} y={r.y + 4 + rLabelSize} fontSize={rLabelSize} fill="#0f172a">
									{r.name}
								</text>
								<text x={r.x + 4} y={r.y + r.h - 4} fontSize={rInfoSize} fill="#334155">
									{r.w}×{r.h} {r.angle && r.angle !== 0 ? `(${r.angle}°)` : ""}
								</text>
								{/* Edge measurements for rectangle */}
								{/* Top */}
								<text
									x={r.x + r.w / 2}
									y={r.y - 6}
									fontSize={dimFont}
									fill="#0f172a"
									textAnchor="middle"
									dominantBaseline="middle"
									style={{ pointerEvents: "none" }}
								>
									{`${Math.round(r.w)} mm`}
								</text>
								{/* Bottom */}
								<text
									x={r.x + r.w / 2}
									y={r.y + r.h + 6}
									fontSize={dimFont}
									fill="#0f172a"
									textAnchor="middle"
									dominantBaseline="middle"
									style={{ pointerEvents: "none" }}
								>
									{`${Math.round(r.w)} mm`}
								</text>
								{/* Left (rotated) */}
								<text
									x={r.x - 6}
									y={r.y + r.h / 2}
									fontSize={dimFont}
									fill="#0f172a"
									textAnchor="middle"
									dominantBaseline="middle"
									transform={`rotate(-90 ${r.x - 6} ${r.y + r.h / 2})`}
									style={{ pointerEvents: "none" }}
								>
									{`${Math.round(r.h)} mm`}
								</text>
								{/* Right (rotated) */}
								<text
									x={r.x + r.w + 6}
									y={r.y + r.h / 2}
									fontSize={dimFont}
									fill="#0f172a"
									textAnchor="middle"
									dominantBaseline="middle"
									transform={`rotate(-90 ${r.x + r.w + 6} ${r.y + r.h / 2})`}
									style={{ pointerEvents: "none" }}
								>
									{`${Math.round(r.h)} mm`}
								</text>
							</g>
						);
					})}
			</svg>
		</div>
	);
}

export default SheetSvg;
