const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export interface JobStatus {
  status: "queued" | "processing" | "done" | "error";
  error_message: string | null;
}

/**
 * Trigger a download job for an approved submission.
 * Returns the new job_id.
 */
export async function startDownload(submissionId: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ submission_id: submissionId }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to start download");
  }

  const data = await res.json() as { job_id: string };
  return data.job_id;
}

/**
 * Poll the status of a download job.
 */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${BACKEND_URL}/job/${jobId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch job status");
  }

  return res.json() as Promise<JobStatus>;
}

/**
 * Returns the URL from which the finished video file can be downloaded.
 */
export function getDownloadUrl(jobId: string): string {
  return `${BACKEND_URL}/download/${jobId}/file`;
}
