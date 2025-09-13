import React from "react";
import { PrimaryButton, DangerButton } from "../utils/ThemeUtils";
import CabinetDetails from "./CabinetDetails";
import type { CabinetBase } from "../types/api";

interface CabinetCollection<T> {
	items: T[];
	loading: boolean;
	error: string;
	isAdding: boolean;
	add: (p: any) => Promise<T>;
	remove: (id: string) => Promise<void>;
	setError?: (s: string) => void;
}

interface Props<T extends CabinetBase> {
	title?: string;
	allowExpand?: boolean;
	onEdit?: (cab: T) => void;
	cabinetCollection: CabinetCollection<T>;
	addPlaceholder?: string;
	addLabel?: string;
	extraCabinetActions?: (cab: T) => React.ReactNode;
}

export default function CabinetCollection<T extends CabinetBase>({
	title = "Cabinets",
	allowExpand = false,
	onEdit,
	cabinetCollection: collection,
	addPlaceholder = "Cabinet name",
	addLabel = "Add",
	extraCabinetActions,
}: Props<T>) {
	const [value, setValue] = React.useState("");
	const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
	const [normalizedItems, setNormalizedItems] = React.useState<T[]>(() => collection.items);

	// Normalise cabinets when incoming list changes (helps when objects are augmented lazily after import)
	React.useEffect(() => {
		const norm = (cab: any) => {
			if (!cab || typeof cab !== "object") return cab;
			if (cab.owner_id === undefined) {
				if (cab.job_id !== undefined) {
					cab.owner_id = cab.job_id;
					cab.owner_type = "job";
				} else if (cab.user_id !== undefined) {
					cab.owner_id = cab.user_id;
					cab.owner_type = "user";
				} else {
					cab.owner_id = null;
					cab.owner_type = null;
				}
			}
			return cab;
		};
		setNormalizedItems(collection.items.map((c: any) => ({ ...norm({ ...c }) })) as T[]);
	}, [collection.items]);

	return (
		<div>
			<h3 className="font-semibold">{title}</h3>
			{collection.loading && <div>Loading cabinets...</div>}
			{collection.error && <div className="text-red-500">{collection.error}</div>}
			{renderCabinetList<T>(
				{ ...collection, items: normalizedItems },
				expanded,
				allowExpand,
				setExpanded,
				onEdit,
				extraCabinetActions
			)}
			{renderAddCabinetForm<T>(collection, value, setValue, addPlaceholder, addLabel)}
		</div>
	);
}
function renderAddCabinetForm<T extends CabinetBase>(
	collection: CabinetCollection<T>,
	value: string,
	setValue: React.Dispatch<React.SetStateAction<string>>,
	addPlaceholder: string,
	addLabel: string
) {
	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				collection
					.add({ name: value })
					.then(() => setValue(""))
					.catch(() => {});
			}}
			className="mb-4 flex gap-2 items-center"
		>
			<input
				type="text"
				placeholder={addPlaceholder}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				className="border px-2 py-1 rounded"
				required
			/>
			<PrimaryButton type="submit" disabled={collection.isAdding}>
				{collection.isAdding ? "Adding..." : addLabel}
			</PrimaryButton>
		</form>
	);
}

function renderCabinetList<T extends CabinetBase>(
	collection: CabinetCollection<T>,
	expanded: Record<string, boolean>,
	allowExpand: boolean,
	setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
	onEdit: ((cab: T) => void) | undefined,
	extraCabinetActions?: (cab: T) => React.ReactNode
) {
	return (
		<ul className="pl-0">
			{collection.items.map((cab) => {
				const isExpanded = expanded[cab.id];
				return (
					<li key={cab.id} className="mb-2 border rounded">
						<div className="flex items-center justify-between p-2">
							<div className="flex items-center gap-2">
								{allowExpand && (
									<button
										aria-label={isExpanded ? "Collapse" : "Expand"}
										onClick={() => setExpanded((p) => ({ ...p, [cab.id]: !p[cab.id] }))}
										className="text-xl w-6 h-6 flex items-center justify-center"
									>
										{isExpanded ? "▾" : "▸"}
									</button>
								)}
								<span className="font-medium text-stropt-brown truncate" title={cab.name || cab.id}>
									{cab.name || cab.id}
								</span>
							</div>
							<div className="flex gap-2">
								{extraCabinetActions && extraCabinetActions(cab)}
								{onEdit && <PrimaryButton onClick={() => onEdit(cab)}>Edit</PrimaryButton>}
								<DangerButton
									onClick={() => {
										if (!window.confirm("Delete this cabinet and its pieces?")) return;
										collection.remove(cab.id).catch((err: any) => {
											const msg = err?.serverMessage ?? err?.message;
											console.error("Cabinet delete failed", { id: cab.id, err });
											if (collection.setError) collection.setError(msg || "Delete failed");
										});
									}}
								>
									Delete
								</DangerButton>
							</div>
						</div>
						{allowExpand && isExpanded && <CabinetDetails cabinet={cab} />}
					</li>
				);
			})}
		</ul>
	);
}
