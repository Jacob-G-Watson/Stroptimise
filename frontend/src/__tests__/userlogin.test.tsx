import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import UserLogin from "../components/UserLogin";

// Mock API functions used by UserLogin so no network calls happen.
jest.mock("../services/api", () => ({
	authLogin: jest.fn().mockResolvedValue({ access_token: "fake" }),
	bootstrapRefresh: jest.fn().mockResolvedValue(null),
	getCurrentUser: jest.fn().mockResolvedValue({ id: "u1", email: "a@b.c", name: "Test" }),
	authRegister: jest.fn().mockResolvedValue(null),
	ApiError: class ApiError extends Error {},
}));

test("UserLogin renders and shows Login heading", () => {
	const html = renderToStaticMarkup(<UserLogin onLogin={jest.fn()} />);
	expect(html).toMatch(/Login|Email|Strop/);
});
