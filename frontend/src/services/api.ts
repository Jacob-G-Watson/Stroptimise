import { authFetch } from "./authFetch";
import type {
	AuthLoginResponse,
	RefreshResponse,
	User,
	Job,
	Cabinet,
	Piece,
	UserPiece,
	LayoutResult,
} from "../types/api";

export class ApiError extends Error {
	status: number;
	serverMessage?: string;
	body: unknown;
	constructor(status: number, serverMessage?: string, body?: unknown) {
		super(serverMessage || `HTTP ${status}`);
		this.name = "ApiError";
		this.status = status;
		this.serverMessage = serverMessage;
		this.body = body;
	}
}

async function parseJson<T>(res: Response): Promise<T> {
	return (await res.json()) as T;
}

// Authentication endpoints
export async function authLogin(username: string, password: string): Promise<AuthLoginResponse> {
	const body = new URLSearchParams({ username, password }).toString();
	const res = await fetch(`/api/auth/jwt/login`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body,
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new ApiError(res.status, text || res.statusText, text);
	}
	return await parseJson<AuthLoginResponse>(res);
}

export async function authRegister({
	email,
	password,
	name,
}: {
	email: string;
	password: string;
	name: string;
}): Promise<AuthLoginResponse> {
	const res = await fetch(`/api/auth/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password, name }),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		const msg = (body as any)?.detail || (body as any)?.message || (await res.text().catch(() => ""));
		throw new ApiError(res.status, msg || res.statusText, body);
	}
	return await parseJson<AuthLoginResponse>(res);
}

export async function bootstrapRefresh(accessToken: string): Promise<RefreshResponse | null> {
	const res = await fetch(`/api/auth/refresh/bootstrap`, {
		method: "POST",
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new ApiError(res.status, text || res.statusText, text);
	}
	return await res.json().catch(() => null);
}

export async function refreshToken(): Promise<RefreshResponse | null> {
	const res = await fetch(`/api/auth/refresh`, { method: "POST" });
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new ApiError(res.status, text || res.statusText, text);
	}
	return await res.json().catch(() => null);
}

async function handleResponse<T>(res: Response): Promise<T> {
	if (!res.ok) {
		try {
			const body = await res.json();
			const msg = (body as any)?.message || (body as any)?.error || JSON.stringify(body);
			throw new ApiError(res.status, msg, body);
		} catch (e) {
			const text = await res.text().catch(() => "");
			throw new ApiError(res.status, text || res.statusText, text);
		}
	}
	if (res.status === 204) return null as unknown as T;
	const contentType = res.headers.get("content-type") || "";
	if (contentType.includes("application/json")) {
		return await res.json();
	}
	return (await res.text().catch(() => null)) as unknown as T;
}

export async function addPieceToCabinet(
	cabinetId: string,
	{
		name,
		width,
		height,
		polygon,
	}: { name: string; width?: number | string; height?: number | string; polygon?: number[][] } = { name: "" }
): Promise<Piece> {
	const res = await authFetch(`/api/cabinets/${cabinetId}/pieces`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name, width, height, polygon }),
	});
	return await handleResponse<Piece>(res);
}

export async function getCabinet(cabinetId: string): Promise<Cabinet> {
	const res = await authFetch(`/api/cabinets/${cabinetId}`);
	return await handleResponse<Cabinet>(res);
}

export async function getCabinetPieces(cabinetId: string): Promise<Piece[]> {
	const res = await authFetch(`/api/cabinets/${cabinetId}/pieces`);
	return await handleResponse<Piece[]>(res);
}

export async function deletePiece(pieceId: string): Promise<null> {
	const res = await authFetch(`/api/pieces/${pieceId}`, { method: "DELETE" });
	return await handleResponse<null>(res);
}

// User-scoped pieces
export async function addPieceToUserCabinet(
	userCabinetId: string,
	{
		name,
		width,
		height,
		polygon,
	}: { name: string; width?: number | string; height?: number | string; polygon?: number[][] } = { name: "" }
): Promise<UserPiece> {
	const res = await authFetch(`/api/user_cabinets/${userCabinetId}/pieces`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name, width, height, polygon }),
	});
	return await handleResponse<UserPiece>(res);
}

export async function getUserCabinetPieces(userCabinetId: string): Promise<UserPiece[]> {
	const res = await authFetch(`/api/user_cabinets/${userCabinetId}/pieces`);
	return await handleResponse<UserPiece[]>(res);
}

export async function deleteUserPiece(pieceId: string): Promise<null> {
	const res = await authFetch(`/api/user_pieces/${pieceId}`, { method: "DELETE" });
	return await handleResponse<null>(res);
}

export async function patchUserPiece(pieceId: string, body: Record<string, unknown> = {}): Promise<UserPiece> {
	return await patchPiece<UserPiece>(pieceId, body, "/api/user_pieces");
}

// Jobs
export async function getJobsForUser(userId: string, { signal }: { signal?: AbortSignal } = {}): Promise<Job[]> {
	const res = await authFetch(`/api/jobs?user_id=${userId}`, { signal });
	return await handleResponse<Job[]>(res);
}

export async function createJob({ name, user_id }: { name: string; user_id: string }): Promise<Job> {
	const res = await authFetch(`/api/jobs`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name, user_id }),
	});
	return await handleResponse<Job>(res);
}

export async function getJob(jobId: string, { signal }: { signal?: AbortSignal } = {}): Promise<Job> {
	const res = await authFetch(`/api/jobs/${jobId}`, { signal });
	return await handleResponse<Job>(res);
}

// Cabinets
export async function getJobCabinets(jobId: string, { signal }: { signal?: AbortSignal } = {}): Promise<Cabinet[]> {
	const res = await authFetch(`/api/jobs/${jobId}/cabinets`, { signal });
	return await handleResponse<Cabinet[]>(res);
}

export async function addCabinetToJob(jobId: string, { name }: { name: string }): Promise<Cabinet> {
	const res = await authFetch(`/api/jobs/${jobId}/cabinets`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name }),
	});
	return await handleResponse<Cabinet>(res);
}

export async function deleteCabinet(cabinetId: string): Promise<null> {
	const res = await authFetch(`/api/cabinets/${cabinetId}`, { method: "DELETE" });
	return await handleResponse<null>(res);
}

// User cabinets
export async function getUserCabinets(userId: string, { signal }: { signal?: AbortSignal } = {}): Promise<Cabinet[]> {
	const res = await authFetch(`/api/users/${userId}/cabinets`, { signal });
	return await handleResponse<Cabinet[]>(res);
}

export async function addUserCabinet(userId: string, { name }: { name: string }): Promise<Cabinet> {
	const res = await authFetch(`/api/users/${userId}/cabinets`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name }),
	});
	return await handleResponse<Cabinet>(res);
}

export async function deleteUserCabinet(userCabinetId: string): Promise<null> {
	const res = await authFetch(`/api/user_cabinets/${userCabinetId}`, { method: "DELETE" });
	return await handleResponse<null>(res);
}

// Layout / exports
export async function computeJobLayout(jobId: string, body: Record<string, unknown> = {}): Promise<LayoutResult> {
	const res = await authFetch(`/api/jobs/${jobId}/layout`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	return await handleResponse<LayoutResult>(res);
}

export async function exportLayoutPdf(jobId: string, body: Record<string, unknown> = {}): Promise<Response> {
	return await authFetch(`/api/jobs/${jobId}/layout/export/pdf`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

export async function getCutsheetPdf(jobId: string): Promise<Response> {
	return await authFetch(`/api/jobs/${jobId}/cutsheet.pdf`);
}

export async function quickDownloadJobPath(jobId: string, path: string): Promise<Response> {
	return await authFetch(`/api/jobs/${jobId}/${path}`);
}

// Generic PATCH piece helper
export async function patchPiece<T = Piece>(
	pieceId: string,
	body: Record<string, unknown> = {},
	patchPathPrefix = "/api/pieces"
): Promise<T> {
	const res = await authFetch(`${patchPathPrefix}/${pieceId}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	return await handleResponse<T>(res);
}

// Current user
export async function getCurrentUser(): Promise<User> {
	const res = await authFetch(`/api/users/me`);
	return await handleResponse<User>(res);
}
