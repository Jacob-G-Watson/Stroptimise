import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SelectionContext from "../utils/SelectionContext";
import {
	getJob,
	getJobCabinets,
	addCabinetToJob,
	deleteCabinet,
	addUserCabinet,
	getUserCabinets,
	deleteUserCabinet,
	importUserCabinetToJob,
} from "../services/api";
import CabinetCollection from "./CabinetCollection";
import useEntityCollection from "../hooks/useEntityCollection";
import { PrimaryButton } from "../utils/ThemeUtils";
import type { Job, CabinetBase } from "../types/api";

interface Props {
	job: Job | null;
	onEditCabinet: (cabinet: CabinetBase) => void;
	handleViewLayout: () => void;
}

function JobDetails({ job: jobProp, onEditCabinet, handleViewLayout }: Props) {
	const params = useParams();
	const { job: contextJob, setJob: setContextJob } = React.useContext(SelectionContext);
	const jobIdFromParams = params.jobId!;
	const [job, setJob] = useState<Job | null>(jobProp || contextJob || null);

	useEffect(() => {
		let cancelled = false;
		const ac = new AbortController();
		fetchJobIfNotProvided(job, jobIdFromParams, ac, cancelled, setJob, setContextJob);

		return () => {
			cancelled = true;
			ac.abort();
		};
		// keep dependency on job so fetchJobIfNotProvided runs when it changes
	}, [job, jobIdFromParams, setContextJob]);

	function fetchJobIfNotProvided(
		job: Job | null,
		jobIdFromParams: string,
		ac: AbortController,
		cancelled: boolean,
		setJob: React.Dispatch<React.SetStateAction<Job | null>>,
		setContextJob: (j: Job | null) => void
	) {
		(async () => {
			try {
				if (!job && jobIdFromParams) {
					try {
						const j = await getJob(jobIdFromParams, { signal: ac.signal });
						if (!cancelled) {
							setJob(j);
							if (setContextJob) setContextJob(j);
						}
					} catch (e: any) {
						if (e.name === "AbortError") return;
					}
				}
			} catch (e: any) {
				if (e.name === "AbortError") return;
			}
		})();
	}

	// useEntityCollection will handle loading/add/delete for job and user cabinets
	// we'll wire them below once job is available

	// create per-collection hooks when job becomes available
	const jobCabinetCollection = useEntityCollection(
		(opts?: { signal?: AbortSignal }) => {
			if (!job) return Promise.resolve([]);
			return getJobCabinets(job.id, { signal: opts?.signal });
		},
		(p: { name: string }) => {
			if (!job) return Promise.reject(new Error("No job"));
			return addCabinetToJob(job.id, p);
		},
		(id: string) => deleteCabinet(id).then(() => undefined),
		// refetch when job id changes
		[job?.id]
	);

	const userCabinetCollection = useEntityCollection(
		(opts?: { signal?: AbortSignal }) => {
			if (!job) return Promise.resolve([]);
			return getUserCabinets(job.user_id, { signal: opts?.signal });
		},
		(p: { name: string }) => {
			if (!job) return Promise.reject(new Error("No job"));
			return addUserCabinet(job.user_id, p);
		},
		(id: string) => deleteUserCabinet(id).then(() => undefined),
		[job?.user_id]
	);

	const jobCabinetList = (
		<CabinetCollection
			title="Cabinets"
			allowExpand
			onEdit={onEditCabinet}
			cabinetCollection={{
				items: jobCabinetCollection.items,
				loading: jobCabinetCollection.loading,
				error: jobCabinetCollection.error,
				isAdding: jobCabinetCollection.isAdding,
				add: jobCabinetCollection.add,
				remove: jobCabinetCollection.remove,
				setError: jobCabinetCollection.setError,
			}}
			addLabel="Add Cabinet"
		/>
	);

	const userCabinetList = (
		<CabinetCollection
			title="Your Library"
			allowExpand={true}
			onEdit={onEditCabinet}
			cabinetCollection={{
				items: userCabinetCollection.items,
				loading: userCabinetCollection.loading,
				error: userCabinetCollection.error,
				isAdding: userCabinetCollection.isAdding,
				add: userCabinetCollection.add,
				remove: userCabinetCollection.remove,
				setError: userCabinetCollection.setError,
			}}
			addLabel="Add User Cabinet"
			extraCabinetActions={(cab) => (
				<PrimaryButton
					className="!px-3 !py-1 text-sm"
					onClick={async (e) => {
						e.preventDefault();
						if (!job) return;
						try {
							const newCab = await importUserCabinetToJob(job.id, cab.id);
							jobCabinetCollection.setItems((prev) => [...prev, newCab]);
						} catch (err: any) {
							userCabinetCollection.setError?.(err?.serverMessage || err?.message || "Import failed");
						}
					}}
				>
					Add to Job
				</PrimaryButton>
			)}
		/>
	);

	// no job handling could be improved
	return !job ? null : (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6 px-4 items-start">
			<div className="hidden lg:block" />
			<div className="p-4 bg-white rounded shadow stropt-border w-full max-w-full mx-auto min-w-0 overflow-hidden">
				<div className="flex items-center justify-between mb-3 gap-2">
					<h2 className="text-xl font-bold text-stropt-brown truncate">Job: {job.name || job.id}</h2>
					<PrimaryButton onClick={() => handleViewLayout()}>View Layout</PrimaryButton>
				</div>
				{jobCabinetCollection.loading && <div>Loading cabinets...</div>}
				{jobCabinetCollection.error && <div className="text-red-500">{jobCabinetCollection.error}</div>}
				<div className="min-w-0">{jobCabinetList}</div>
			</div>
			<div className="p-4 bg-white rounded shadow stropt-border w-full max-w-full min-w-0 lg:justify-self-end overflow-hidden">
				<div className="flex items-center justify-between mb-3 gap-2">
					<h3 className="font-bold text-stropt-brown truncate">User Cabinets</h3>
				</div>
				{userCabinetCollection.loading && <div>Loading cabinets...</div>}
				{userCabinetCollection.error && <div className="text-red-500">{userCabinetCollection.error}</div>}
				<div className="min-w-0">{userCabinetList}</div>
			</div>
		</div>
	);
}

export default JobDetails;
