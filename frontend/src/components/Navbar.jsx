function Navbar({ steps, currentStep, onNavigate }) {
	return (
		<nav className="bg-gray-200 px-4 py-2 flex items-center gap-4 text-sm rounded mb-4">
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-lg select-none">
					O
				</div>
				<span className="font-bold text-gray-700">Stroptimise</span>
			</div>
			<div className="flex items-center gap-2">
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
		</nav>
	);
}

export default Navbar;
