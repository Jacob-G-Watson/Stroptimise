export interface NotifyOptions {
	type?: "info" | "error";
	message?: string;
}

export function notify({ type = "info", message = "" }: NotifyOptions = {}): void {
	try {
		window.dispatchEvent(new CustomEvent("app:notify", { detail: { type, message } }));
	} catch (e) {
		console[type === "error" ? "error" : "log"](message);
	}
}

export default notify;
