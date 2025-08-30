import React, { useState } from "react";

function CabinetDetails({ cabinet }) {
	const [pieces, setPieces] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [pieceName, setPieceName] = useState("");
	const [pieceWidth, setPieceWidth] = useState("");
	const [pieceHeight, setPieceHeight] = useState("");
	const [polygonText, setPolygonText] = useState(""); // JSON [[x,y],...]
	const [adding, setAdding] = useState(false);

	React.useEffect(() => {
		if (!cabinet?.id) return;
		setLoading(true);
		fetch(`/api/cabinets/${cabinet.id}/pieces`)
			.then((res) => res.json())
			.then((data) => {
				setPieces(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				setError("Failed to fetch pieces");
				setLoading(false);
			});
	}, [cabinet]);

	const handleAddPiece = async (e) => {
		e.preventDefault();
		setAdding(true);
		setError("");
		try {
			const res = await fetch(`/api/cabinets/${cabinet.id}/pieces`, {
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
			setPieceHeight("");
			setPolygonText("");
		} catch (err) {
			setError(err.message);
		} finally {
			setAdding(false);
		}
	};

	if (!cabinet) return null;

	return (
		<div className="bg-white p-4 rounded shadow my-4">
			<h2 className="text-xl font-bold mb-2">Cabinet: {cabinet.name}</h2>
			{loading && <div>Loading pieces...</div>}
			{error && <div className="text-red-500">{error}</div>}
			<form onSubmit={handleAddPiece} className="mb-4 flex gap-2 items-center">
				<input
					type="text"
					placeholder="Piece name"
					value={pieceName}
					onChange={(e) => setPieceName(e.target.value)}
					className="border px-2 py-1 rounded"
					required
				/>
				<input
					type="number"
					placeholder="Width"
					value={pieceWidth}
					onChange={(e) => setPieceWidth(e.target.value)}
					className="border px-2 py-1 rounded"
				/>
				<input
					type="number"
					placeholder="Height"
					value={pieceHeight}
					onChange={(e) => setPieceHeight(e.target.value)}
					className="border px-2 py-1 rounded"
				/>
				<textarea
					placeholder='Polygon points JSON e.g. [[0,0],[300,0],[300,50],[50,50],[50,200],[0,200]]'
					value={polygonText}
					onChange={(e) => setPolygonText(e.target.value)}
					className="border px-2 py-1 rounded w-full md:w-[480px] h-20"
				/>
				<button type="submit" className="px-3 py-1 bg-blue-500 text-white rounded" disabled={adding}>
					{adding ? "Adding..." : "Add Piece"}
				</button>
			</form>
			<div>
				<h3 className="font-semibold">Pieces</h3>
				<ul className="list-disc pl-6">
					{pieces.map((piece) => (
						<li key={piece.id}>
							{piece.name || piece.id} - {piece.width} x {piece.height}
							{piece.polygon ? <span className="ml-2 text-xs bg-amber-200 text-amber-800 px-1 rounded">polygon</span> : null}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

export default CabinetDetails;
