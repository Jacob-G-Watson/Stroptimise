import React from "react";
import type { Job, Cabinet } from "../types/api";

interface SelectionContextValue {
	job: Job | null;
	setJob: (j: Job | null) => void;
	cabinet: Cabinet | null;
	setCabinet: (c: Cabinet | null) => void;
}

const SelectionContext = React.createContext<SelectionContextValue>({
	job: null,
	setJob: () => {},
	cabinet: null,
	setCabinet: () => {},
});

export default SelectionContext;
