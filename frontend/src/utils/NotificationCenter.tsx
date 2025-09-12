import { useEffect, useState } from "react";

interface Toast {
	id: number;
	type: string;
	message: string;
}

function NotificationCenter() {
	const [toasts, setToasts] = useState<Toast[]>([]);
	useEffect(() => {
		function onNotify(e: Event) {
			const ce = e as CustomEvent<{ type: string; message: string }>;
			const { type, message } = ce.detail || { type: "info", message: "" };
			const id = Date.now() + Math.random();
			setToasts((t) => [...t, { id, type, message }]);
			setTimeout(() => {
				setToasts((t) => t.filter((x) => x.id !== id));
			}, 5000);
		}
		window.addEventListener("app:notify", onNotify as EventListener);
		return () => window.removeEventListener("app:notify", onNotify as EventListener);
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
