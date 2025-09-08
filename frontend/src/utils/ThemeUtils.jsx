export function PrimaryButton({ children, className = "", ...props }) {
	return (
		<button
			className={`px-3 m-1 py-1 bg-stropt-green text-white rounded hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-stropt-green ${className}`}
			{...props}
		>
			{children}
		</button>
	);
}

export function DangerButton({ children, className = "", ...props }) {
	return (
		<button
			className={`px-3 m-1 py-1 bg-stropt-brown text-white rounded hover:bg-black focus:outline-none focus:ring-2 focus:ring-stropt-brown ${className}`}
			{...props}
		>
			{children}
		</button>
	);
}

export function BackButton({ children = "Back", className = "", ...props }) {
	return (
		<button
			aria-label="Go back"
			className={`px-3 py-1 flex items-center gap-1 border-2 border-stropt-green text-stropt-green font-semibold rounded hover:bg-stropt-green hover:text-white focus:outline-none focus:ring-2 focus:ring-stropt-green ${className}`}
			{...props}
		>
			{/* Left Arrow Icon */}
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="-ml-1"
			>
				<polyline points="15 18 9 12 15 6" />
			</svg>
			<span>{children}</span>
		</button>
	);
}
