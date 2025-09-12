import { useEffect, useState } from "react";

function NotificationCenter() {
	const [toasts, setToasts] = useState([]);

	useEffect(() => {
		function onNotify(e) {
			const { type, message } = e.detail || {};
			const id = Date.now() + Math.random();
			setToasts((t) => [...t, { id, type, message }]);
			// auto remove
			setTimeout(() => {
				setToasts((t) => t.filter((x) => x.id !== id));
			}, 5000);
		}

		window.addEventListener("app:notify", onNotify);
		return () => window.removeEventListener("app:notify", onNotify);
	}, []);

	if (!toasts.length) return null;

	return (
		<div className="fixed top-4 right-4 flex flex-col gap-2 z-50">
			{toasts.map((t) => (
				<div
					key={t.id}
					className={`px-3 py-2 rounded shadow text-sm max-w-xs break-words ${
						t.type === "error" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-900"
					}`}
				>
					{t.message}
				</div>
			))}
		</div>
	);
}

export default NotificationCenter;
