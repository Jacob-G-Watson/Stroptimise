export function notify({ type = "info", message = "" } = {}) {
	// dispatch a simple CustomEvent - NotificationCenter will listen
	try {
		window.dispatchEvent(new CustomEvent("app:notify", { detail: { type, message } }));
	} catch (e) {
		// fallback: console
		console[type === "error" ? "error" : "log"](message);
	}
}

export default notify;
