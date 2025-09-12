// Small collection of layout helper functions used by the SVG viewer

export interface Point {
	x: number;
	y: number;
}
export type PointTuple = [number, number];

export function centroid(pts: PointTuple[] | undefined | null): Point {
	if (!pts || pts.length < 3) {
		const arr = pts ?? [];
		const n = arr.length;
		if (!n) return { x: 0, y: 0 };
		const sx = arr.reduce((a, [x]) => a + x, 0);
		const sy = arr.reduce((a, [, y]) => a + y, 0);
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
		const n = pts.length;
		const sx = pts.reduce((s, [x]) => s + x, 0);
		const sy = pts.reduce((s, [, y]) => s + y, 0);
		return { x: sx / n, y: sy / n };
	}
	cx = cx / (6 * a);
	cy = cy / (6 * a);
	return { x: cx, y: cy };
}
