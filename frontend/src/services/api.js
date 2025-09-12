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
