import React, { useState } from "react";

function SheetForm({ onSubmit }) {
  const [sheets, setSheets] = useState([]);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  const addSheet = (e) => {
    e.preventDefault();
    setSheets([...sheets, { width: parseInt(width), height: parseInt(height) }]);
    setWidth("");
    setHeight("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(sheets);
  };

  return (
    <form className="mb-4" onSubmit={handleSubmit}>
      <div className="flex mb-2">
        <input
          type="number"
          placeholder="Sheet Width"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          className="border px-2 py-1 mr-2"
        />
        <input
          type="number"
          placeholder="Sheet Height"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          className="border px-2 py-1 mr-2"
        />
        <button className="px-2 py-1 bg-blue-500 text-white" onClick={addSheet}>
          Add Sheet
        </button>
      </div>
      <ul>
        {sheets.map((s, i) => (
          <li key={i}>
            Sheet {i + 1}: {s.width} × {s.height}
          </li>
        ))}
      </ul>
      <button className="mt-2 px-4 py-1 bg-green-500 text-white" type="submit">
        Save Sheets
      </button>
    </form>
  );
}

export default SheetForm;
