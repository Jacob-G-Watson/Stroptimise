import { useState } from "react";
import { patchPiece, ApiError } from "../services/api";
import { notify } from "../services/notify";
import { PrimaryButton, DangerButton } from "../utils/ThemeUtils";
import type { PieceBase } from "../types/api";

interface Props {
	piece: PieceBase;
	onSaved: (piece: PieceBase) => void;
	onCancel: () => void;
	onError?: (msg: string) => void;
	// caller should pass "/api/pieces" or "/api/user_pieces" depending on piece type
	patchPathPrefix?: string;
}

function PieceEditor({ piece, onSaved, onCancel, onError, patchPathPrefix = "/api/pieces" }: Props) {
	const [name, setName] = useState(piece.name || "");
	const [width, setWidth] = useState<string | number>(piece.width || "");
	const [height, setHeight] = useState<string | number>(piece.height || "");
	const [polygonText, setPolygonText] = useState(piece.polygon ? JSON.stringify(piece.polygon) : "");
	const [saving, setSaving] = useState(false);

	const handleSave = async () => {
		setSaving(true);
		if (onError) onError("");
		try {
			const body: Record<string, unknown> = {
				name,
				width: width || undefined,
				height: height || undefined,
				polygon: polygonText ? JSON.parse(polygonText) : undefined,
			};
			// patchPathPrefix controls whether we call /api/pieces or /api/user_pieces
			const updated = await patchPiece(piece.id, body, patchPathPrefix);
			if (onSaved) onSaved(updated);
		} catch (err: any) {
			const msg = err instanceof ApiError ? err.serverMessage : err.message;
			if (onError) onError(msg || "Save failed");
			notify({ type: "error", message: msg });
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="flex-1 flex flex-col gap-2 border p-4 rounded my-3">
			<input
				type="text"
				value={name}
				onChange={(e) => setName(e.target.value)}
				className="border px-2 py-1 rounded text-sm w-full"
			/>
			<div className="flex gap-2">
				<input
					type="number"
					value={width}
					onChange={(e) => setWidth(e.target.value)}
					className="border px-2 py-1 rounded text-sm w-1/2"
				/>
				<input
					type="number"
					value={height}
					onChange={(e) => setHeight(e.target.value)}
					className="border px-2 py-1 rounded text-sm w-1/2"
				/>
			</div>
			<textarea
				value={polygonText}
				onChange={(e) => setPolygonText(e.target.value)}
				className="border px-2 py-1 my-1 rounded text-sm"
			/>
			<div className="flex gap-2">
				<PrimaryButton onClick={handleSave} disabled={saving}>
					{saving ? "Saving..." : "Save"}
				</PrimaryButton>
				<DangerButton onClick={onCancel}>Cancel</DangerButton>
			</div>
		</div>
	);
}

export default PieceEditor;
