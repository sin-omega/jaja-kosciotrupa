"""
app.py — Flask backend: /download, /job/<id>, /download/<id>/file
"""

import os
import threading

from flask import Flask, jsonify, request, send_file, abort, Response
from flask_cors import CORS
from supabase import create_client

from config import Config
from downloader import process_download

app = Flask(__name__)
CORS(app, origins=[Config.ALLOWED_ORIGIN])

_supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)


# ── POST /download ────────────────────────────────────────────────────────────

@app.route("/download", methods=["POST"])
def start_download() -> tuple[Response, int]:
    body = request.get_json(silent=True) or {}
    submission_id: str = body.get("submission_id", "").strip()

    if not submission_id:
        return jsonify({"error": "submission_id is required"}), 400

    # Verify submission exists and is approved
    sub_resp = (
        _supabase.table("submissions")
        .select("id, status")
        .eq("id", submission_id)
        .eq("status", "approved")
        .maybe_single()
        .execute()
    )

    if not sub_resp.data:
        return jsonify({"error": "Submission not found or not approved"}), 404

    # Create download job
    job_resp = (
        _supabase.table("download_jobs")
        .insert({"submission_id": submission_id, "status": "queued"})
        .execute()
    )

    job = job_resp.data[0]
    job_id: str = job["id"]

    # Kick off background processing
    thread = threading.Thread(
        target=process_download,
        args=(submission_id, job_id),
        daemon=True,
    )
    thread.start()

    return jsonify({"job_id": job_id, "status": "queued"}), 202


# ── GET /job/<job_id> ─────────────────────────────────────────────────────────

@app.route("/job/<job_id>", methods=["GET"])
def get_job_status(job_id: str) -> tuple[Response, int]:
    resp = (
        _supabase.table("download_jobs")
        .select("status, error_message")
        .eq("id", job_id)
        .maybe_single()
        .execute()
    )

    if not resp.data:
        return jsonify({"error": "Job not found"}), 404

    return jsonify(
        {
            "status": resp.data["status"],
            "error_message": resp.data.get("error_message"),
        }
    ), 200


# ── GET /download/<job_id>/file ───────────────────────────────────────────────

@app.route("/download/<job_id>/file", methods=["GET"])
def download_file(job_id: str) -> Response:
    # Fetch job and verify it's done
    resp = (
        _supabase.table("download_jobs")
        .select("status, submission_id")
        .eq("id", job_id)
        .maybe_single()
        .execute()
    )

    if not resp.data:
        abort(404)

    job = resp.data
    if job["status"] != "done":
        abort(409)  # Conflict — not ready

    final_path = f"/tmp/{job_id}.mp4"
    if not os.path.exists(final_path):
        abort(410)  # Gone — file already cleaned up

    submission_id: str = job["submission_id"]

    def stream_and_delete() -> bytes:
        try:
            with open(final_path, "rb") as f:
                yield from f
        finally:
            try:
                os.remove(final_path)
            except OSError:
                pass

    return Response(
        stream_and_delete(),
        headers={
            "Content-Type": "video/mp4",
            "Content-Disposition": f'attachment; filename="video_{submission_id}.mp4"',
            "Cache-Control": "no-store",
        },
    )


if __name__ == "__main__":
    app.run()
