const React = require("react");

module.exports = {
	__esModule: true,
	MemoryRouter: ({ children }) => React.createElement(React.Fragment, null, children),
	BrowserRouter: ({ children }) => React.createElement(React.Fragment, null, children),
	Routes: ({ children }) => React.createElement(React.Fragment, null, children),
	Route: ({ element }) => element,
	Navigate: () => null,
	useNavigate: () => () => {},
	useLocation: () => ({ pathname: "/" }),
	Outlet: () => null,
	useParams: () => ({}),
};
