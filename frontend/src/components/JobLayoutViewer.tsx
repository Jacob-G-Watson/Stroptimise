import React, { useState, useEffect } from "react";
import {
	getJob,
	computeJobLayout,
	exportLayoutPdf,
	getCutsheetPdf,
	quickDownloadJobPath,
	ApiError,
} from "../services/api";
import { notify } from "../services/notify";
import SheetSvg from "../utils/SheetSvg";
import { useParams } from "react-router-dom";
import SelectionContext from "../utils/SelectionContext";
import { PrimaryButton } from "../utils/ThemeUtils";
import type { Job, LayoutResult } from "../types/api";

interface Props {
	job: Job | null;
	onOptimised?: (result: LayoutResult) => void;
}

function JobLayoutViewer({ job: propJob, onOptimised }: Props) {
	const { jobId } = useParams();
	const { setJob: setCtxJob, job: ctxJob } = React.useContext(SelectionContext);
	const [fetchedJob, setFetchedJob] = useState<Job | null>(null);
	const job = propJob || ctxJob || fetchedJob;

	useEffect(() => {
		let cancelled = false;
		if (!job && jobId) {
			(async () => {
				try {
					const j = await getJob(jobId);
					if (!cancelled) {
						setFetchedJob(j);
						setCtxJob && setCtxJob(j);
					}
				} catch {
					/* ignore */
				}
			})();
		}
		return () => {
			cancelled = true;
		};
	}, [job, jobId, setCtxJob]);

	const [sheetWidth, setSheetWidth] = useState<number | string>(2400);
	const [sheetHeight, setSheetHeight] = useState<number | string>(1200);
	const [allowRotation, setAllowRotation] = useState(true);
	const [kerf, setKerf] = useState<number | string>(3);
	const [packingMode, setPackingMode] = useState("heuristic");
	const [result, setResult] = useState<LayoutResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleCompute = async () => {
		if (!job?.id) return;
		setLoading(true);
		setError("");
		try {
			const data = await computeJobLayout(job.id, {
				sheet_width: Number(sheetWidth),
				sheet_height: Number(sheetHeight),
				allow_rotation: allowRotation,
				kerf_mm: Number(kerf) || 3,
				packing_mode: packingMode,
			});
			setResult(data);
			onOptimised && onOptimised(data);
		} catch (e: any) {
			const msg = e instanceof ApiError ? e.serverMessage : e.message;
			setError(msg || String(e));
			notify({ type: "error", message: msg });
		} finally {
			setLoading(false);
		}
	};

	const sheets = result?.sheets || [];

	const handleExportPdf = async () => {
		if (!job?.id) return;
		setError("");
		try {
			const res = await exportLayoutPdf(job.id, {
				sheet_width: Number(sheetWidth),
				sheet_height: Number(sheetHeight),
				allow_rotation: allowRotation,
				kerf_mm: Number(kerf) || 3,
				packing_mode: packingMode,
			});
			if (!res.ok) throw new Error("Failed to export PDF");
			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = res.headers.get("X-Filename") || "layout.pdf";
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url);
		} catch (e: any) {
			const msg = e instanceof ApiError ? e.serverMessage : e.message;
			setError(msg || String(e));
			notify({ type: "error", message: msg });
		}
	};

	const handleExportCutsheetPdf = async () => {
		if (!job?.id) return;
		setError("");
		try {
			const res = await getCutsheetPdf(job.id);
			if (!res.ok) throw new Error("Failed to export cutsheet PDF");
			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = res.headers.get("X-Filename") || "cutsheet.pdf";
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url);
		} catch (e: any) {
			const msg = e instanceof ApiError ? e.serverMessage : e.message;
			setError(msg || String(e));
			notify({ type: "error", message: msg });
		}
	};

	const quickDownload = async (path: string) => {
		if (!job?.id) return;
		try {
			const res = await quickDownloadJobPath(job.id, path);
			if (!res.ok) throw new Error(`Failed to download ${path}`);
			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = res.headers.get("X-Filename") || path.split("/").pop() || "download";
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url);
		} catch (e: any) {
			const msg = e instanceof ApiError ? e.serverMessage : e.message;
			setError(msg || String(e));
			notify({ type: "error", message: msg });
		}
	};

	return (
		<div className="p-4 bg-white rounded shadow mx-auto mt-6 stropt-border min-w-[50%] w-auto max-w-[90vw]">
			<div className="mb-4 flex flex-wrap items-end gap-3">
				<div>
					<label className="block text-sm text-stropt-brown">Sheet width (mm)</label>
					<input
						type="number"
						value={sheetWidth}
						onChange={(e) => setSheetWidth(e.target.value)}
						className="border px-2 py-1 rounded w-32"
					/>
				</div>
				<div>
					<label className="block text-sm text-stropt-brown">Sheet height (mm)</label>
					<input
						type="number"
						value={sheetHeight}
						onChange={(e) => setSheetHeight(e.target.value)}
						className="border px-2 py-1 rounded w-32"
					/>
				</div>
				<div>
					<label className="block text-sm text-stropt-brown">Kerf (mm)</label>
					<input
						type="number"
						value={kerf}
						onChange={(e) => setKerf(e.target.value)}
						className="border px-2 py-1 rounded w-24"
					/>
				</div>
				<div>
					<label className="block text-sm text-stropt-brown">Packing mode</label>
					<select
						value={packingMode}
						onChange={(e) => setPackingMode(e.target.value)}
						className="border px-2 py-1 rounded w-32"
						aria-label="Packing mode (only heuristic available)"
					>
						<option value="simple" disabled title="Simple packing not available">
							Simple
						</option>
						<option value="heuristic">Heuristic</option>
						<option value="exhaustive" disabled title="Exhaustive packing not available">
							Exhaustive
						</option>
					</select>
				</div>
				<label className="inline-flex items-center gap-2">
					<input
						type="checkbox"
						checked={allowRotation}
						onChange={(e) => setAllowRotation(e.target.checked)}
					/>
					Allow rotation
				</label>
				<PrimaryButton className="" onClick={handleCompute} disabled={loading}>
					{loading ? "Computing..." : "Compute layout"}
				</PrimaryButton>
				<PrimaryButton className="" onClick={handleExportPdf} disabled={!!loading}>
					Export Layout as PDF
				</PrimaryButton>
				<div className="relative inline-block">
					<select
						className="ml-2 px-2 py-1 border rounded"
						onChange={(e) => {
							const val = e.target.value;
							if (!val) return;
							quickDownload(val);
							e.target.value = "";
						}}
						defaultValue=""
					>
						<option value="" disabled>
							Export Cutsheet
						</option>
						<option value="cutsheet.csv">CSV</option>
						<option value="cutsheet.xlsx">XLSX</option>
						<option value="cutsheet.pdf">PDF</option>
					</select>
				</div>
			</div>
			{error && <div className="text-red-500 mb-3">{error}</div>}
			<div className="flex flex-wrap gap-6 items-start">
				{sheets.length === 0 && !loading && <div>No layout computed yet</div>}
				{sheets.map((sheet) => (
					// Mobile: full width. Desktop (md+): take half the row but subtract
					// half the gap so two items + gap fit within 100% and don't wrap.
					// gap-6 == 1.5rem, half is 0.75rem.
					<div key={sheet.index} className="w-full md:w-[calc(50%_-_0.75rem)] md:flex-shrink-0">
						<SheetSvg sheet={sheet as any} />
					</div>
				))}
			</div>
		</div>
	);
}

export default JobLayoutViewer;
