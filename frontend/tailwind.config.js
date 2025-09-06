module.exports = {
	content: ["./src/**/*.{js,jsx,ts,tsx}"],
	theme: {
		extend: {
			colors: {
				// Colour scheme derived from provided SVG:
				// green: #7b8754, brown: #3b2314, beige (chosen as a soft background): #e9dcc2
				stropt: {
					green: "#7b8754",
					"green-light": "#9aa76a",
					brown: "#3b2314",
					beige: "#e9dcc2",
				},
			},
		},
	},
	plugins: [],
};
