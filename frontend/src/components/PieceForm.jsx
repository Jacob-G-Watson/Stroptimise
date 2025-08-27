import React, { useState } from "react";

function PieceForm({ onSubmit }) {
  const [pieces, setPieces] = useState([]);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [quantity, setQuantity] = useState("");

  const addPiece = (e) => {
    e.preventDefault();
    setPieces([...pieces, { width: parseInt(width), height: parseInt(height), quantity: parseInt(quantity) }]);
    setWidth("");
    setHeight("");
    setQuantity("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(pieces);
  };

  return (
    <form className="mb-4" onSubmit={handleSubmit}>
      <div className="flex mb-2">
        <input
          type="number"
          placeholder="Piece Width"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          className="border px-2 py-1 mr-2"
        />
        <input
          type="number"
          placeholder="Piece Height"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          className="border px-2 py-1 mr-2"
        />
        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="border px-2 py-1 mr-2"
        />
        <button className="px-2 py-1 bg-blue-500 text-white" onClick={addPiece}>
          Add Piece
        </button>
      </div>
      <ul>
        {pieces.map((p, i) => (
          <li key={i}>
            Piece {i + 1}: {p.width} × {p.height} (Qty: {p.quantity})
          </li>
        ))}
      </ul>
      <button className="mt-2 px-4 py-1 bg-green-500 text-white" type="submit">
        Save Pieces
      </button>
    </form>
  );
}

export default PieceForm;
