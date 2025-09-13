import React from "react";
import type { Job, CabinetBase } from "../types/api";

interface SelectionContextValue {
	job: Job | null;
	setJob: (j: Job | null) => void;
	cabinet: CabinetBase | null;
	setCabinet: (c: CabinetBase | null) => void;
}

const SelectionContext = React.createContext<SelectionContextValue>({
	job: null,
	setJob: () => {},
	cabinet: null,
	setCabinet: () => {},
});

export default SelectionContext;
