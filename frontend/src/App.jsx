import React, { useState } from "react";
import ProjectForm from "./components/ProjectForm";
import SheetForm from "./components/SheetForm";
import PieceForm from "./components/PieceForm";
import LayoutViewer from "./components/LayoutViewer";

function App() {
	const [project, setProject] = useState(null);
	const [sheets, setSheets] = useState([]);
	const [pieces, setPieces] = useState([]);
	const [placements, setPlacements] = useState([]);

	const handleOptimize = async () => {
		if (!project) return;
		const pid = project.id;
		await fetch(`/api/projects/${pid}/sheets`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(sheets),
		});
		await fetch(`/api/projects/${pid}/pieces`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(pieces),
		});
		const res = await fetch(`/api/projects/${pid}/optimize`, { method: "POST" });
		const data = await res.json();
		setPlacements(data.placements || []);
	};

	return (
		<div className="min-h-screen bg-gray-100 p-4">
			<h1 className="text-2xl font-bold mb-4">Stroptimise 2D Stock Cutting</h1>
			<div className="bg-white p-4 rounded shadow">
				<ProjectForm onSubmit={setProject} />
				{project && (
					<>
						<SheetForm onSubmit={setSheets} />
						<PieceForm onSubmit={setPieces} />
						<button className="mt-4 px-4 py-2 bg-blue-500 text-white" onClick={handleOptimize}>
							Optimize
						</button>
					</>
				)}
				<LayoutViewer sheets={sheets} placements={placements} />
			</div>
		</div>
	);
}

export default App;
