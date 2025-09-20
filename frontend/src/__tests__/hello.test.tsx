import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

function Hello() {
	return <div>Hello, world!</div>;
}

test("renders hello world (static)", () => {
	const html = renderToStaticMarkup(<Hello />);
	expect(html).toContain("Hello, world!");
});
