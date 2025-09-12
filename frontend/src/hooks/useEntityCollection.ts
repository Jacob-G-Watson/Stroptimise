import { useEffect, useState } from "react";

type FetchAll<T> = (opts?: { signal?: AbortSignal }) => Promise<T[]>;
type CreateOne<P, T> = (payload: P) => Promise<T>;
type DeleteOne = (id: string) => Promise<void>;

export function useEntityCollection<P, T extends { id: string }>(
	fetchAll: FetchAll<T>,
	createOne: CreateOne<P, T>,
	deleteOne: DeleteOne,
	deps: any[] = []
) {
	const [items, setItems] = useState<T[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [isAdding, setIsAdding] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const ac = new AbortController();
		setLoading(true);
		setError("");
		fetchAll({ signal: ac.signal })
			.then((data) => {
				if (!cancelled) setItems(Array.isArray(data) ? data : []);
			})
			.catch((err: any) => {
				if (err?.name === "AbortError") return;
				const msg = err?.serverMessage ?? err?.message ?? "Failed to fetch";
				if (!cancelled) setError(msg);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
			ac.abort();
		};
	}, deps);

	const add = async (payload: P) => {
		setIsAdding(true);
		setError("");
		try {
			const created = await createOne(payload);
			setItems((p) => [...p, created]);
			return created;
		} catch (err: any) {
			const msg = err?.serverMessage ?? err?.message ?? "Add failed";
			setError(msg);
			throw err;
		} finally {
			setIsAdding(false);
		}
	};

	const remove = async (id: string) => {
		setError("");
		try {
			await deleteOne(id);
			setItems((p) => p.filter((i) => i.id !== id));
		} catch (err: any) {
			const msg = err?.serverMessage ?? err?.message ?? "Delete failed";
			setError(msg);
			throw err;
		}
	};

	return {
		items,
		setItems,
		loading,
		error,
		isAdding,
		add,
		remove,
		setError,
	};
}

export default useEntityCollection;
