import React, { useEffect, useState } from "react";
import { centroid as computeCentroid, PointTuple } from "../services/layoutUtils";
import type { LayoutSheet } from "../types/api";

interface Props {
	sheet: LayoutSheet;
}

function calculateFontSizes(xs: number[], ys: number[]) {
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);
	const bw = Math.max(0, maxX - minX);
	const bh = Math.max(0, maxY - minY);
	const fontSizeMain = Math.max(8, Math.min(Math.round(Math.min(bw, bh) * 0.25), 48));
	const fontSizeAngle = Math.max(8, Math.round(fontSizeMain * 0.65));
	return { fontSizeMain, fontSizeAngle };
}

function SheetSvg({ sheet }: Props) {
	const polyIds = new Set((sheet.polygons || []).map((p) => p.piece_id));

	const centroid = (pts: PointTuple[]) => computeCentroid(pts);

	const renderPolygons = (sheet.polygons || []).map((pg, idx) => {
		if (!pg.points || pg.points.length === 0) return null;
		const d = `M ${pg.points.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`;
		const c = centroid(pg.points as PointTuple[]);
		const xCoordinatesArray = pg.points.map((p) => p[0]);
		const yCoordinatesArray = pg.points.map((p) => p[1]);
		const { fontSizeMain, fontSizeAngle } = calculateFontSizes(xCoordinatesArray, yCoordinatesArray);

		const edgeLengthLabels = pg.points.map((p0, i) => {
			const p1 = pg.points[(i + 1) % pg.points.length];
			const [x0, y0] = p0;
			const [x1, y1] = p1;
			const mx = (x0 + x1) / 2;
			const my = (y0 + y1) / 2;
			const dx = x1 - x0;
			const dy = y1 - y0;
			const len = Math.hypot(dx, dy);
			const vx = c.x - mx;
			const vy = c.y - my;
			const vlen = Math.hypot(vx, vy) || 1;
			const off = 30;
			const lx = mx + (vx / vlen) * off;
			const ly = my + (vy / vlen) * off;
			const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
			return (
				<text
					key={`poly-dim-${pg.piece_id}-${i}`}
					x={lx}
					y={ly}
					fontSize={fontSizeMain}
					fill="#0f172a"
					textAnchor="middle"
					dominantBaseline="middle"
					transform={`rotate(${angle} ${lx} ${ly})`}
					className="pointer-events-none"
				>
					{`${Math.round(len)} mm`}
				</text>
			);
		});
		const angleLabel = pg.angle ? (
			<text
				x={c.x}
				y={c.y + 26}
				fontSize={fontSizeAngle}
				fill="#334155"
				textAnchor="middle"
				dominantBaseline="hanging"
				className="pointer-events-none"
			>
				{`${pg.angle}°`}
			</text>
		) : null;
		const nameLabel = (
			<text
				x={c.x}
				y={c.y}
				fontSize={fontSizeMain}
				fill="#0f172a"
				textAnchor="middle"
				dominantBaseline="middle"
				className="pointer-events-none"
			>
				{pg.name}
			</text>
		);

		return (
			<g key={`poly-${pg.piece_id}-${idx}`}>
				<path d={d} fill="#ffe8cc" stroke="#9a3412" />
				{nameLabel}
				{angleLabel}
				{edgeLengthLabels}
			</g>
		);
	});

	const renderRectangles = sheet.rects
		.filter((r) => !polyIds.has(r.piece_id))
		.map((r) => {
			const xs = [r.x, r.x + r.w, r.x + r.w, r.x];
			const ys = [r.y, r.y, r.y + r.h, r.y + r.h];
			const { fontSizeMain, fontSizeAngle } = calculateFontSizes(xs, ys);
			return (
				<g key={r.piece_id}>
					<rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#cfe8ff" stroke="#1e40af" />
					<text x={r.x + 4} y={r.y + 4 + fontSizeMain} fontSize={fontSizeMain} fill="#0f172a">
						{r.name}
					</text>
					<text x={r.x + 4} y={r.y + r.h - 4} fontSize={fontSizeAngle} fill="#334155">
						{r.w}×{r.h} {r.angle && r.angle !== 0 ? `(${r.angle}°)` : ""}
					</text>
					<text
						x={r.x + r.w / 2}
						y={r.y - 6}
						fontSize={fontSizeMain}
						fill="#0f172a"
						textAnchor="middle"
						dominantBaseline="middle"
						className="pointer-events-none"
					>
						{`${Math.round(r.w)} mm`}
					</text>
					<text
						x={r.x + r.w / 2}
						y={r.y + r.h + 6}
						fontSize={fontSizeMain}
						fill="#0f172a"
						textAnchor="middle"
						dominantBaseline="middle"
						className="pointer-events-none"
					>
						{`${Math.round(r.w)} mm`}
					</text>
					<text
						x={r.x - 6}
						y={r.y + r.h / 2}
						fontSize={fontSizeMain}
						fill="#0f172a"
						textAnchor="middle"
						dominantBaseline="middle"
						transform={`rotate(-90 ${r.x - 6} ${r.y + r.h / 2})`}
						className="pointer-events-none"
					>
						{`${Math.round(r.h)} mm`}
					</text>
					<text
						x={r.x + r.w + 6}
						y={r.y + r.h / 2}
						fontSize={fontSizeMain}
						fill="#0f172a"
						textAnchor="middle"
						dominantBaseline="middle"
						transform={`rotate(-90 ${r.x + r.w + 6} ${r.y + r.h / 2})`}
						className="pointer-events-none"
					>
						{`${Math.round(r.h)} mm`}
					</text>
				</g>
			);
		});
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const mq = window.matchMedia("(max-width: 640px)");
		const update = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile((e as any).matches ?? !!mq.matches);
		// Set initial
		setIsMobile(mq.matches);
		// Add listener (use addEventListener where available)
		if (mq.addEventListener) {
			mq.addEventListener("change", update as any);
			return () => mq.removeEventListener("change", update as any);
		}
	}, []);

	const SheetSvgElement: React.FC = () => {
		// When rotating 90deg we swap the viewBox dims so the rotated content fits.
		const svgViewBox = isMobile ? `0 0 ${sheet.height} ${sheet.width}` : `0 0 ${sheet.width} ${sheet.height}`;
		// rotate 90deg about the origin then translate up by the original height so content is visible.
		const transform90WhenMobile: string | undefined = isMobile
			? `rotate(90) translate(0 -${sheet.height})`
			: undefined;

		return (
			<div className="w-full overflow-auto flex justify-center">
				<svg
					width="100%"
					viewBox={svgViewBox}
					className="border bg-gray-50 block"
					preserveAspectRatio="xMinYMin meet"
				>
					<g transform={transform90WhenMobile}>
						<rect x="0" y="0" width={sheet.width} height={sheet.height} fill="#fff" stroke="#111" />
						{renderPolygons}
						{/* TODO currently all shapes are being renders as polygons based on how the backend is flagging them, because of this the layout of rectangles is very broken and untested */}
						{renderRectangles}
					</g>
				</svg>
			</div>
		);
	};
	const SheetInfoDisplay: React.FC = () => (
		<div className="text-sm text-gray-600 mb-1">
			Sheet #{sheet.index + 1} – {sheet.width} x {sheet.height} mm
		</div>
	);
	return (
		<div className="w-full">
			<SheetInfoDisplay />
			<SheetSvgElement />
		</div>
	);
}

export default SheetSvg;
