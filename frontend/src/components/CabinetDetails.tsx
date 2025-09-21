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
	updateCabinetName,
	updateUserCabinetName,
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
	const [renaming, setRenaming] = useState(false);
	const [newName, setNewName] = useState("");
	const [savingName, setSavingName] = useState(false);

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

	const beginRename = () => {
		if (!cabinet) return;
		setNewName(cabinet.name || "");
		setRenaming(true);
	};

	const cancelRename = () => {
		setRenaming(false);
		setNewName("");
	};

	const saveRename = async () => {
		if (!cabinet) return;
		if (!newName.trim()) return;
		setSavingName(true);
		setError("");
		try {
			const fn = isUserCabinet(cabinet) ? updateUserCabinetName : updateCabinetName;
			const updated = await fn(cabinet.id, newName.trim());
			setCabinet({ ...(cabinet as any), name: updated.name });
			setRenaming(false);
			notify({ type: "info", message: "Cabinet renamed" });
		} catch (err: any) {
			if (err instanceof ApiError) {
				setError(err.serverMessage || "Rename failed");
				notify({ type: "error", message: err.serverMessage || "Rename failed" });
			} else {
				throw err;
			}
		} finally {
			setSavingName(false);
		}
	};

	const renderPieceItem = (
		piece: PieceBase,
		handleEditPiece: (p: PieceBase) => void,
		handleDeletePiece: (id: string) => void,
		deletingIds: Set<string>
	) => {
		return (
			<>
				<span className="flex-1 break-words">
					{piece.name || piece.id} - {piece.width} x {piece.height}
				</span>
				<div className="flex items-center gap-2 ml-4">
					{piece.polygon ? (
						<span className="text-xs bg-stropt-green-light text-stropt-brown px-1 rounded">polygon</span>
					) : null}
					<div className="flex items-center gap-2">
						<PrimaryButton
							onClick={() => handleEditPiece(piece)}
							className="whitespace-nowrap px-3 py-1 text-sm"
						>
							Edit
						</PrimaryButton>
						<DangerButton onClick={() => handleDeletePiece(piece.id)} disabled={deletingIds.has(piece.id)}>
							{deletingIds.has(piece.id) ? "Deleting..." : "Delete"}
						</DangerButton>
					</div>
				</div>
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
		<div className="w-full">
			<h3 className="font-semibold">Pieces</h3>
			<ul className="list-disc pl-6 w-full">
				{pieces.map((piece) => {
					const isEditing = editingPiece && editingPiece.id === piece.id;
					return (
						<li key={piece.id} className={"flex flex-col sm:flex-row sm:items-center gap-4 w-full"}>
							{isEditing ? (
								<div className="w-full">{renderPieceEditor(editingPiece as PieceBase, setError)}</div>
							) : (
								// renderPieceItem returns sibling elements (name + button group) so they become direct children of the li
								renderPieceItem(piece, handleEditPiece, handleDeletePiece, deletingIds)
							)}
						</li>
					);
				})}
			</ul>
		</div>
	);

	const renderAddPieceForm = () => (
		<form
			onSubmit={handleAddPiece}
			className={`mb-4 flex flex-col sm:flex-row gap-2 items-start w-full max-w-[90vw] border p-2 rounded`}
		>
			<div className="flex-shrink-0 w-full sm:w-48 flex flex-col gap-2">
				<input
					type="text"
					placeholder="Piece name"
					value={pieceName}
					onChange={(e) => setPieceName(e.target.value)}
					className="border px-2 py-1 rounded text-sm w-full"
					required
				/>
				<div className="flex gap-2 w-full">
					<input
						type="number"
						placeholder="Width"
						value={pieceWidth}
						onChange={(e) => setPieceWidth(e.target.value)}
						className="border px-2 py-1 rounded text-sm w-full sm:w-1/2"
					/>
					<input
						type="number"
						placeholder="Height"
						value={pieceHeight}
						onChange={(e) => setPieceHeight(e.target.value)}
						className="border px-2 py-1 rounded text-sm w-full sm:w-1/2"
					/>
				</div>
			</div>
			<div className="flex-1 w-full">
				<textarea
					placeholder="Polygon points JSON e.g. [[0,0],[300,0],[300,50],[50,50],[50,200],[0,200]]"
					value={polygonText}
					onChange={(e) => setPolygonText(e.target.value)}
					rows={4}
					wrap="soft"
					className="border px-2 py-1 my-1 rounded text-sm w-full max-w-full overflow-auto break-words break-all resize-vertical"
				/>
				<div className="flex-shrink-0 mt-1">
					<PrimaryButton type="submit" disabled={adding} className="whitespace-nowrap px-3 py-1 my-1 text-sm">
						{adding ? "Adding..." : "Add Piece"}
					</PrimaryButton>
				</div>
			</div>
		</form>
	);

	return (
		<div className="p-4 bg-white rounded shadow stropt-border w-full max-w-full min-w-0 overflow-hidden mt-6">
			{!cabinet ? (
				<div className="min-w-[50%] w-auto max-w-[50vw] mx-auto">
					<div>Loading cabinet...</div>
				</div>
			) : (
				<>
					<div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2 mb-2">
						<h2 className="text-xl font-bold text-stropt-brown m-0">
							Cabinet:{" "}
							{!renaming ? (
								<span>{cabinet.name}</span>
							) : (
								<input
									type="text"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									className="border rounded px-2 py-1 text-sm w-full sm:w-auto"
								/>
							)}
						</h2>
						{!renaming ? (
							<PrimaryButton onClick={beginRename} className="px-3 py-1 text-sm">
								Rename
							</PrimaryButton>
						) : (
							<div className="flex items-center gap-2">
								<PrimaryButton
									onClick={saveRename}
									disabled={savingName || !newName.trim()}
									className="px-3 py-1 text-sm"
								>
									{savingName ? "Saving..." : "Save"}
								</PrimaryButton>
								<DangerButton
									onClick={cancelRename}
									disabled={savingName}
									className="px-3 py-1 text-sm"
								>
									Cancel
								</DangerButton>
							</div>
						)}
					</div>
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
