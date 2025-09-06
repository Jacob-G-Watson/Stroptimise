function Navbar({ steps, currentStep, onNavigate, onLogout }) {
	const handleLogout = async () => {
		try {
			await fetch("/api/auth/logout", { method: "POST" });
		} catch (e) {
			/* ignore */
		}
		window.__access_token = undefined;
		onLogout && onLogout();
	};
	return (
		<nav className="bg-gray-200 px-4 py-2 flex items-center text-sm rounded mb-4">
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-lg select-none">
					O
				</div>
				<span className="font-bold text-gray-700">Stroptimise</span>
			</div>
			<div className="flex items-center gap-2 ml-6">
				{steps.slice(0, currentStep + 1).map((step, idx) => (
					<span key={step.key} className="flex items-center">
						<button
							className={`font-semibold ${idx === currentStep ? "text-blue-600" : "text-gray-700"}`}
							disabled={idx === currentStep}
							onClick={() => onNavigate(idx)}
						>
							{step.label}
						</button>
						{idx < currentStep && <span className="mx-2 text-gray-400">/</span>}
					</span>
				))}
			</div>
			<div className="ml-auto">
				<button onClick={handleLogout} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">
					Logout
				</button>
			</div>
		</nav>
	);
}

export default Navbar;
