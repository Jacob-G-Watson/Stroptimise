// Central API/domain model TypeScript interfaces used across the frontend.
// These mirror (a subset of) the backend SQLModel definitions in server/models.py

export interface User {
	id: string;
	name: string;
	email: string;
	is_active: boolean;
	is_superuser: boolean;
	is_verified: boolean;
}

export interface Job {
	id: string;
	name: string;
	user_id: string;
	created_at: string; // ISO from backend
	kerf_mm?: number | null;
	allow_rotation: boolean;
}

export interface CabinetBase {
	id: string;
	name: string;
	// generic owner id (job_id or user_id)
	owner_id: string;
}

export interface Cabinet extends CabinetBase {}

export interface UserCabinet extends CabinetBase {}

export interface PieceBase {
	id: string;
	name?: string | null;
	width: number;
	height: number;
	// Backend stores polygon as points_json; API returns `polygon` already parsed (inferred from usage)
	polygon?: number[][] | null;
	colour_id?: string | null;
	// generic container id (may be a cabinet id or user_cabinet id depending on the piece)
	container_id: string | null;
}

export interface Piece extends PieceBase {}

export interface UserPiece extends PieceBase {}

export interface LayoutRectPlacement {
	piece_id: string;
	name?: string | null;
	x: number; // origin mm
	y: number;
	w: number;
	h: number;
	angle?: number; // degrees
}

export interface LayoutPolygonPlacement {
	piece_id: string;
	name?: string | null;
	points: number[][]; // [[x,y],...]
	angle?: number;
}

export interface LayoutSheet {
	index: number; // zero-based index in result
	width: number; // mm
	height: number; // mm
	rects: LayoutRectPlacement[];
	polygons: LayoutPolygonPlacement[];
}

export interface LayoutResult {
	sheets: LayoutSheet[];
	// Additional meta fields could exist; keep as index signature for forward compat.
	[k: string]: any;
}

export interface AuthLoginResponse {
	access_token: string;
	token_type: string;
	expires_in?: number; // seconds (if backend includes)
}

export interface RefreshResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
}
