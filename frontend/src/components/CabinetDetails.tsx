import { useState, useEffect, useContext } from "react";
import { useParams, useLocation } from "react-router-dom";
import SelectionContext from "../utils/SelectionContext";
import {
	addPieceToCabinet,
	addPieceToUserCabinet,
	getCabinet,
	getCabinetPieces,
	getUserCabinetPieces,
	deletePiece,
	deleteUserPiece,
	ApiError,
} from "../services/api";
import { notify } from "../services/notify";
import { PrimaryButton, DangerButton } from "../utils/ThemeUtils";
import PieceEditor from "./PieceEditor";
import type { CabinetBase, PieceBase } from "../types/api";

interface Props {
	cabinet: CabinetBase | null;
}

function CabinetDetails({ cabinet: cabinetProp }: Props) {
	const params = useParams();
	const location = useLocation();
	const { cabinet: contextCabinet } = useContext(SelectionContext);
	const cabinetIdFromParams = params.cabinetId;
	const cabinetFromState = (location as any)?.state?.cabinet as CabinetBase | undefined;
	const [cabinet, setCabinet] = useState<CabinetBase | null>(
		cabinetProp || cabinetFromState || contextCabinet || null
	);
	const [pieces, setPieces] = useState<PieceBase[]>([]);
	const [editingPiece, setEditingPiece] = useState<PieceBase | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [pieceName, setPieceName] = useState("");
	const [pieceWidth, setPieceWidth] = useState("");
	const [pieceHeight, setPieceHeight] = useState("");
	const [polygonText, setPolygonText] = useState("");
	const [adding, setAdding] = useState(false);
	const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

	// Determine cabinet type (job vs user) based on normalization field added in api.ts
	const isUserCabinet = (cab: CabinetBase | null) => (cab as any)?.owner_type === "user";

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				if (!cabinet && cabinetIdFromParams) {
					// Attempt job cabinet fetch first; if that fails silently we leave as null.
					// (Optional enhancement: add a getUserCabinet API call and try that second.)
					try {
						const c = await getCabinet(cabinetIdFromParams);
						if (!cancelled) setCabinet(c);
					} catch {
						/* ignore */
					}
				}
			} catch {
				/* ignore */
			}
		})();
		if (!cabinet?.id) return;
		setLoading(true);
		const listFn = isUserCabinet(cabinet) ? getUserCabinetPieces : getCabinetPieces;
		listFn(cabinet.id)
			.then((data) => {
				setPieces(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch(() => {
				setError("Failed to fetch pieces");
				setLoading(false);
			});
	}, [cabinet, cabinetIdFromParams]);

	const handleAddPiece = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!cabinet) return;
		setAdding(true);
		setError("");
		try {
			await tryAddViaApiAndResetPiece();
		} catch (err: any) {
			if (err instanceof ApiError) {
				setError(err.serverMessage || "Error");
				notify({ type: "error", message: err.serverMessage || "Error" });
			} else {
				throw err;
			}
		} finally {
			setAdding(false);
		}
	};

	const tryAddViaApiAndResetPiece = async () => {
		if (!cabinet) return;
		const addFn = isUserCabinet(cabinet) ? addPieceToUserCabinet : addPieceToCabinet;
		const newPiece = await addFn(cabinet.id, {
			name: pieceName,
			width: pieceWidth || undefined,
			height: pieceHeight || undefined,
			polygon: polygonText ? (JSON.parse(polygonText) as number[][]) : undefined,
		});
		setPieces((prev) => [...prev, newPiece]);
		setPieceName("");
		setPieceWidth("");
		setPieceHeight("");
		setPolygonText("");
	};

	const handleDeletePiece = async (id: string) => {
		if (!id) return;
		if (!window.confirm("Delete this piece? This cannot be undone.")) return;
		setError("");
		setDeletingIds((prev) => new Set(prev).add(id));
		try {
			const delFn = isUserCabinet(cabinet) ? deleteUserPiece : deletePiece;
			await delFn(id);
			setPieces((prev) => prev.filter((p) => p.id !== id));
		} catch (err: any) {
			if (err instanceof ApiError) {
				setError(err.serverMessage || "Error");
				notify({ type: "error", message: err.serverMessage || "Error" });
			} else {
				throw err;
			}
		} finally {
			setDeletingIds((prev) => {
				const copy = new Set(prev);
				copy.delete(id);
				return copy;
			});
		}
	};

	const handleEditPiece = (piece: PieceBase) => {
		setError("");
		setEditingPiece(piece);
	};

	const renderPieceItem = (
		piece: PieceBase,
		handleEditPiece: (p: PieceBase) => void,
		handleDeletePiece: (id: string) => void,
		deletingIds: Set<string>
	) => {
		return (
			<>
				<span className="flex-1 break-all">
					{piece.name || piece.id} - {piece.width} x {piece.height}
				</span>
				{piece.polygon ? (
					<span className="ml-2 text-xs bg-stropt-green-light text-stropt-brown px-1 rounded">polygon</span>
				) : null}
				<PrimaryButton onClick={() => handleEditPiece(piece)} className="whitespace-nowrap px-3 py-1 text-sm">
					Edit
				</PrimaryButton>
				<DangerButton onClick={() => handleDeletePiece(piece.id)} disabled={deletingIds.has(piece.id)}>
					{deletingIds.has(piece.id) ? "Deleting..." : "Delete"}
				</DangerButton>
			</>
		);
	};

	const renderPieceEditor = (editingPiece: PieceBase, setError: (msg: string) => void) => {
		const handleSavedPiece = (updated: PieceBase) => {
			setPieces((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
			setEditingPiece(null);
		};
		return (
			<div className="w-full">
				<PieceEditor
					piece={editingPiece}
					onSaved={handleSavedPiece}
					onCancel={() => setEditingPiece(null)}
					onError={(msg) => setError(msg)}
					patchPathPrefix={isUserCabinet(cabinet) ? `/api/user_pieces` : `/api/pieces`}
				/>
			</div>
		);
	};

	const renderPiecesList = () => (
		<div className="">
			<h3 className="font-semibold">Pieces</h3>
			<ul className="list-disc pl-6 min-w-[30%] max-w-fit">
				{pieces.map((piece) => (
					<li key={piece.id} className="flex items-center gap-4 w-full">
						{editingPiece && editingPiece.id === piece.id
							? renderPieceEditor(editingPiece, setError)
							: renderPieceItem(piece, handleEditPiece, handleDeletePiece, deletingIds)}
					</li>
				))}
			</ul>
		</div>
	);

	const renderAddPieceForm = () => (
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
					<PrimaryButton type="submit" disabled={adding} className="whitespace-nowrap px-3 py-1 my-1 text-sm">
						{adding ? "Adding..." : "Add Piece"}
					</PrimaryButton>
				</div>
			</div>
		</form>
	);

	return (
		<div className="p-4 bg-white rounded shadow stropt-border w-max max-w-[90vw] mx-auto mt-6">
			{!cabinet ? (
				<div className="min-w-[50%] w-auto max-w-[50vw] mx-auto">
					<div>Loading cabinet...</div>
				</div>
			) : (
				<>
					<h2 className="text-xl font-bold mb-2 text-stropt-brown">Cabinet: {cabinet.name}</h2>
					{loading && <div>Loading pieces...</div>}
					{error && <div className="text-red-500">{error}</div>}
					{renderAddPieceForm()}
					{renderPiecesList()}
				</>
			)}
		</div>
	);
}

export default CabinetDetails;
