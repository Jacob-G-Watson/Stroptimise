export function PrimaryButton({ children, className = "", ...props }) {
	return (
		<button
			className={`px-3 py-1 bg-stropt-green text-white rounded hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-stropt-green ${className}`}
			{...props}
		>
			{children}
		</button>
	);
}

export function DangerButton({ children, className = "", ...props }) {
	return (
		<button
			className={`px-2 m-1 py-1 bg-stropt-brown text-white rounded hover:bg-black focus:outline-none focus:ring-2 focus:ring-stropt-brown ${className}`}
			{...props}
		>
			{children}
		</button>
	);
}
