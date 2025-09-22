import React, { useEffect, useState, useContext } from "react";
import CabinetCollection from "./CabinetCollection";
import { getUserCabinets, addUserCabinet, deleteUserCabinet } from "../services/api";
import { notify } from "../services/notify";
import type { User, UserCabinet } from "../types/api";
import SelectionContext from "../utils/SelectionContext";
import { useNavigate } from "react-router-dom";

interface Props {
	user: User | null;
}

export default function UserCabinetsList({ user }: Props) {
	const [cabinets, setCabinets] = useState<UserCabinet[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const { setCabinet } = useContext(SelectionContext);
	const navigate = useNavigate();

	useEffect(() => {
		if (!user?.id) return;
		let cancelled = false;
		const ac = new AbortController();
		setLoading(true);
		getUserCabinets(user.id, { signal: ac.signal })
			.then((data) => {
				if (!cancelled) {
					setCabinets(data);
					setLoading(false);
				}
			})
			.catch((err: any) => {
				if (err.name === "AbortError") return;
				if (!cancelled) {
					setError(err.message || "Failed to load cabinets");
					notify({ type: "error", message: err.message || "Failed to load cabinets" });
					setLoading(false);
				}
			});
		return () => {
			cancelled = true;
			ac.abort();
		};
	}, [user]);

	if (!user?.id) return null;

	// cabinetCollection implements the API CabinetCollection expects
	const cabinetCollection = {
		items: cabinets,
		loading,
		error,
		isAdding,
		setError: (s: string) => setError(s),
		add: async ({ name }: { name: string }) => {
			setIsAdding(true);
			try {
				const newCab = await addUserCabinet(user.id, { name });
				setCabinets((p) => [...p, newCab]);
				return newCab;
			} finally {
				setIsAdding(false);
			}
		},
		remove: async (id: string) => {
			await deleteUserCabinet(id);
			setCabinets((p) => p.filter((c) => c.id !== id));
		},
	} as const;

	return (
		<div className="p-4 bg-white rounded shadow stropt-border w-max max-w-[90vw] mx-auto mt-6">
			<CabinetCollection
				title="Your Library"
				allowExpand={true}
				onEdit={(cab: UserCabinet) => {
					setCabinet(cab);
					navigate(`/user_cabinets/${cab.id}`);
				}}
				cabinetCollection={cabinetCollection as any}
				addPlaceholder="Cabinet name"
				addLabel="Add"
			/>
		</div>
	);
}
