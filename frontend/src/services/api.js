// Service helper for piece-related API calls
import { authFetch } from "./authFetch";

export class ApiError extends Error {
	constructor(status, serverMessage, body) {
		super(serverMessage || `HTTP ${status}`);
		this.name = "ApiError";
		this.status = status;
		this.serverMessage = serverMessage;
		this.body = body;
	}
}

async function handleResponse(res) {
	// Throw on non-OK
	if (!res.ok) {
		// try to extract useful error message
		try {
			const body = await res.json();
			const msg = body?.message || body?.error || JSON.stringify(body);
			throw new ApiError(res.status, msg, body);
		} catch (e) {
			// fallback to text
			const text = await res.text().catch(() => "");
			throw new ApiError(res.status, text || res.statusText, text);
		}
	}

	// No content
	if (res.status === 204) return null;

	// Try parse JSON, otherwise return text
	const contentType = res.headers.get("content-type") || "";
	if (contentType.includes("application/json")) {
		return await res.json();
	}
	const text = await res.text().catch(() => null);
	return text;
}

export async function addPieceToCabinet(cabinetId, { name, width, height, polygon } = {}) {
	const res = await authFetch(`/api/cabinets/${cabinetId}/pieces`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			name,
			width,
			height,
			polygon,
		}),
	});
	return await handleResponse(res);
}

export async function getCabinet(cabinetId) {
	const res = await authFetch(`/api/cabinets/${cabinetId}`);
	return await handleResponse(res);
}

export async function getCabinetPieces(cabinetId) {
	const res = await authFetch(`/api/cabinets/${cabinetId}/pieces`);
	return await handleResponse(res);
}

export async function deletePiece(pieceId) {
	const res = await authFetch(`/api/pieces/${pieceId}`, { method: "DELETE" });
	return await handleResponse(res);
}

// Jobs
export async function getJobsForUser(userId, { signal } = {}) {
	const res = await authFetch(`/api/jobs?user_id=${userId}`, { signal });
	return await handleResponse(res);
}

export async function createJob({ name, user_id }) {
	const res = await authFetch(`/api/jobs`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name, user_id }),
	});
	return await handleResponse(res);
}

export async function getJob(jobId, { signal } = {}) {
	const res = await authFetch(`/api/jobs/${jobId}`, { signal });
	return await handleResponse(res);
}

// Cabinets
export async function getJobCabinets(jobId, { signal } = {}) {
	const res = await authFetch(`/api/jobs/${jobId}/cabinets`, { signal });
	return await handleResponse(res);
}

export async function addCabinetToJob(jobId, { name }) {
	const res = await authFetch(`/api/jobs/${jobId}/cabinets`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name }),
	});
	return await handleResponse(res);
}

export async function deleteCabinet(cabinetId) {
	const res = await authFetch(`/api/cabinets/${cabinetId}`, { method: "DELETE" });
	return await handleResponse(res);
}

// Layout / exports - some endpoints return binary blobs; return raw Response so callers can handle blob()
export async function computeJobLayout(jobId, body = {}) {
	const res = await authFetch(`/api/jobs/${jobId}/layout`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	return await handleResponse(res);
}

export async function exportLayoutPdf(jobId, body = {}) {
	return await authFetch(`/api/jobs/${jobId}/layout/export/pdf`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

export async function getCutsheetPdf(jobId) {
	return await authFetch(`/api/jobs/${jobId}/cutsheet.pdf`);
}

export async function quickDownloadJobPath(jobId, path) {
	return await authFetch(`/api/jobs/${jobId}/${path}`);
}

// Pieces
export async function patchPiece(pieceId, body = {}, patchPathPrefix = "/api/pieces") {
	const res = await authFetch(`${patchPathPrefix}/${pieceId}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	return await handleResponse(res);
}

// Current user
export async function getCurrentUser() {
	const res = await authFetch(`/api/users/me`);
	return await handleResponse(res);
}
