import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import SelectionContext from "../utils/SelectionContext";
import { authFetch } from "../services/authFetch";
import { PrimaryButton, DangerButton } from "../utils/ThemeUtils";

function CabinetDetails({ cabinet: cabinetProp }) {
	const params = useParams();
	const location = useLocation();
	const { cabinet: contextCabinet } = React.useContext(SelectionContext);
	const cabinetIdFromParams = params.cabinetId;
	const cabinetFromState = location?.state?.cabinet;
	const [cabinet, setCabinet] = useState(cabinetProp || cabinetFromState || contextCabinet || null);
	const [pieces, setPieces] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [pieceName, setPieceName] = useState("");
	const [pieceWidth, setPieceWidth] = useState("");
	const [pieceHeight, setPieceHeight] = useState("");
	const [polygonText, setPolygonText] = useState(""); // JSON [[x,y],...]
	// whether the form has any user input (used to choose initial width)
	const formHasValue = pieceName || pieceWidth || pieceHeight || polygonText;
	const [adding, setAdding] = useState(false);
	const [deletingIds, setDeletingIds] = useState(new Set());

	React.useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				if (!cabinet && cabinetIdFromParams) {
					const r = await authFetch(`/api/cabinets/${cabinetIdFromParams}`);
					if (r.ok) {
						const c = await r.json();
						if (!cancelled) setCabinet(c);
					}
				}
			} catch (e) {
				/* ignore */
			}
		})();

		if (!cabinet?.id) return;
		setLoading(true);
		authFetch(`/api/cabinets/${cabinet.id}/pieces`)
			.then((res) => res.json())
			.then((data) => {
				setPieces(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				setError("Failed to fetch pieces");
				setLoading(false);
			});
	}, [cabinet, cabinetIdFromParams]);

	const handleAddPiece = async (e) => {
		e.preventDefault();
		setAdding(true);
		setError("");
		try {
			const res = await authFetch(`/api/cabinets/${cabinet.id}/pieces`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: pieceName,
					width: pieceWidth || undefined,
					height: pieceHeight || undefined,
					polygon: polygonText ? JSON.parse(polygonText) : undefined,
				}),
			});
			if (!res.ok) throw new Error("Failed to add piece");
			const newPiece = await res.json();
			setPieces((prev) => [...prev, newPiece]);
			setPieceName("");
			setPieceWidth("");
			setPieceHeight("");
			setPolygonText("");
		} catch (err) {
			setError(err.message);
		} finally {
			setAdding(false);
		}
	};

	const handleDeletePiece = async (id) => {
		if (!id) return;
		if (!window.confirm("Delete this piece? This cannot be undone.")) return;
		setError("");
		setDeletingIds((prev) => new Set(prev).add(id));
		try {
			const res = await authFetch(`/api/pieces/${id}`, { method: "DELETE" });
			if (!res.ok) throw new Error("Failed to delete piece");
			setPieces((prev) => prev.filter((p) => p.id !== id));
		} catch (err) {
			setError(err.message || "Delete failed");
		} finally {
			setDeletingIds((prev) => {
				const copy = new Set(prev);
				copy.delete(id);
				return copy;
			});
		}
	};

	if (!cabinet)
		return (
			<div className="p-4 bg-white rounded shadow mx-auto mt-6 stropt-border min-w-[50%] w-auto max-w-[50vw]">
				<div>Loading cabinet...</div>
			</div>
		);

	return (
		<div className="p-4 bg-white rounded shadow stropt-border w-max max-w-[90vw] mx-auto mt-6">
			<h2 className="text-xl font-bold mb-2 text-stropt-brown">Cabinet: {cabinet.name}</h2>
			{loading && <div>Loading pieces...</div>}
			{error && <div className="text-red-500">{error}</div>}
			<form
				onSubmit={handleAddPiece}
				className={`mb-4 flex gap-2 items-center w-max max-w-[90vw] border p-2 rounded`}
			>
				<div className="flex-shrink-0 w-48 flex flex-col gap-2">
					<input
						type="text"
						placeholder="Piece name"
						value={pieceName}
						onChange={(e) => setPieceName(e.target.value)}
						className="border px-2 py-1 rounded text-sm w-full"
						required
					/>
					<div className="flex gap-2">
						<input
							type="number"
							placeholder="Width"
							value={pieceWidth}
							onChange={(e) => setPieceWidth(e.target.value)}
							className="border px-2 py-1 rounded text-sm w-1/2"
						/>
						<input
							type="number"
							placeholder="Height"
							value={pieceHeight}
							onChange={(e) => setPieceHeight(e.target.value)}
							className="border px-2 py-1 rounded text-sm w-1/2"
						/>
					</div>
				</div>
				<div className="">
					<textarea
						placeholder="Polygon points JSON e.g. [[0,0],[300,0],[300,50],[50,50],[50,200],[0,200]]"
						value={polygonText}
						onChange={(e) => setPolygonText(e.target.value)}
						className="border px-2 py-1 my-1 rounded text-sm "
					/>
					<div className="flex-shrink-0">
						<PrimaryButton
							type="submit"
							disabled={adding}
							className="whitespace-nowrap px-3 py-1 my-1 text-sm"
						>
							{adding ? "Adding..." : "Add Piece"}
						</PrimaryButton>
					</div>
				</div>
			</form>
			<div className="">
				<h3 className="font-semibold">Pieces</h3>
				{/* Width might not be an issue with the top fixed */}
				<ul className="list-disc pl-6 min-w-[30%] max-w-fit">
					{pieces.map((piece) => (
						<li key={piece.id} className="flex items-center gap-4">
							<span className="flex-1 break-all">
								{piece.name || piece.id} - {piece.width} x {piece.height}
							</span>
							{piece.polygon ? (
								<span className="ml-2 text-xs bg-stropt-green-light text-stropt-brown px-1 rounded">
									polygon
								</span>
							) : null}
							<DangerButton
								onClick={() => handleDeletePiece(piece.id)}
								disabled={deletingIds.has(piece.id)}
							>
								{deletingIds.has(piece.id) ? "Deleting..." : "Delete"}
							</DangerButton>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

export default CabinetDetails;
