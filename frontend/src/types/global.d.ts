// Global ambient declarations

export {}; // ensure this file is a module

declare global {
	interface Window {
		__access_token?: string;
	}
}
