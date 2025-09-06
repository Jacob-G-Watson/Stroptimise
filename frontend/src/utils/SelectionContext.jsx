import React from "react";

const SelectionContext = React.createContext({
	job: null,
	setJob: () => {},
	cabinet: null,
	setCabinet: () => {},
});

export default SelectionContext;
