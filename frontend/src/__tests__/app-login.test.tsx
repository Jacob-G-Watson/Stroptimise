import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Tell Jest to use the manual mock in src/__mocks__/react-router-dom.js
jest.mock("react-router-dom");

jest.mock("../services/useSession", () => ({
	useSession: () => ({ user: null, setUser: jest.fn(), restoring: false }),
}));

const App = require("../App").default;

test("App renders login page when user is not authenticated", () => {
	const html = renderToStaticMarkup(React.createElement(App));
	expect(html).toMatch(/Login|Email|Strop/);
});
