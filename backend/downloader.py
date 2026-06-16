"""
downloader.py — Download video via yt-dlp, append branded ending, merge.
Called in a background thread from app.py.
"""

import os
import subprocess
import threading
from datetime import datetime, timezone

import yt_dlp
from supabase import create_client

from config import Config

_supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)

_lock = threading.Lock()


def _update_job(job_id: str, **fields: object) -> None:
    """Patch a download_jobs row; always refreshes updated_at."""
    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    _supabase.table("download_jobs").update(fields).eq("id", job_id).execute()


def _cleanup(job_id: str) -> None:
    """Remove all temporary files associated with this job."""
    suffixes = ["_raw.mp4", "_ending.mp4", "_list.txt"]
    for suffix in suffixes:
        path = f"/tmp/{job_id}{suffix}"
        try:
            if os.path.exists(path):
                os.remove(path)
        except OSError:
            pass


def _run(cmd: list[str]) -> None:
    """Run a subprocess command, raising on non-zero exit."""
    subprocess.run(cmd, check=True, capture_output=True)


def _platform_label(platform: str) -> str:
    return "YouTube Shorts" if platform == "youtube" else "TikTok"


def process_download(submission_id: str, job_id: str) -> None:
    """
    Full pipeline:
      1. Fetch submission + short_link from Supabase.
      2. Download raw video via yt-dlp.
      3. Build 1-second branded ending with ffmpeg.
      4. Concat raw + ending.
      5. Clean up temp files.
      6. Mark job as done (or error).
    """
    raw_path    = f"/tmp/{job_id}_raw.mp4"
    ending_path = f"/tmp/{job_id}_ending.mp4"
    list_path   = f"/tmp/{job_id}_list.txt"
    final_path  = f"/tmp/{job_id}.mp4"

    try:
        # ── Step 1: Fetch submission ──────────────────────────────────────
        sub_resp = (
            _supabase.table("submissions")
            .select("url, platform, submitter_username")
            .eq("id", submission_id)
            .single()
            .execute()
        )
        submission = sub_resp.data
        if not submission:
            raise ValueError(f"Submission {submission_id} not found.")

        link_resp = (
            _supabase.table("short_links")
            .select("code")
            .eq("submission_id", submission_id)
            .single()
            .execute()
        )
        short_link = link_resp.data
        if not short_link:
            raise ValueError(f"Short link for submission {submission_id} not found.")

        url                = submission["url"]
        platform           = submission["platform"]
        submitter_username = submission["submitter_username"]
        code               = short_link["code"]

        _update_job(job_id, status="processing")

        # ── Step 2: Download via yt-dlp ───────────────────────────────────
        ydl_opts = {
            "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "outtmpl": f"/tmp/{job_id}_raw.%(ext)s",
            "merge_output_format": "mp4",
            "quiet": True,
            "no_warnings": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        if not os.path.exists(raw_path):
            raise FileNotFoundError(f"yt-dlp did not produce {raw_path}")

        # ── Step 3: Build branded ending (1-second black screen + text) ───
        platform_label  = _platform_label(platform)
        nick_line       = f"@{submitter_username}"
        link_line       = f"{Config.BASE_URL}/r/{code}"
        join_line       = f"Dolacz: {Config.WHATSAPP_CHANNEL_LINK}"

        # Build drawtext filter chain — four centred lines of white text.
        # Line spacing: 60px apart, anchored around vertical centre.
        # We use the default ffmpeg built-in font (no external fontfile needed).
        line_height  = 60
        base_y       = "(h/2 - 90)"   # top of first line

        def dt(text: str, line_index: int) -> str:
            escaped = text.replace("'", r"'\''").replace(":", r"\:").replace("\\", r"\\")
            y_expr  = f"({base_y} + {line_index * line_height})"
            return (
                f"drawtext=text='{escaped}'"
                f":fontsize=36"
                f":fontcolor=white"
                f":x=(w-text_w)/2"
                f":y={y_expr}"
            )

        vf = ",".join([
            dt(platform_label, 0),
            dt(nick_line,      1),
            dt(link_line,      2),
            dt(join_line,      3),
        ])

        _run([
            "ffmpeg", "-y",
            "-f", "lavfi",
            "-i", "color=c=black:s=1080x1920:r=30:d=1",
            "-vf", vf,
            "-t", "1",
            "-pix_fmt", "yuv420p",
            ending_path,
        ])

        # ── Step 4: Concat raw + ending ───────────────────────────────────
        with open(list_path, "w") as f:
            f.write(f"file '{raw_path}'\n")
            f.write(f"file '{ending_path}'\n")

        _run([
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", list_path,
            "-c", "copy",
            final_path,
        ])

        # ── Step 5: Remove temp files ─────────────────────────────────────
        for path in (raw_path, ending_path, list_path):
            try:
                os.remove(path)
            except OSError:
                pass

        # ── Step 6: Mark done ─────────────────────────────────────────────
        _update_job(job_id, status="done")

    except Exception as exc:
        _update_job(job_id, status="error", error_message=str(exc))
        _cleanup(job_id)
        # Remove final output if partially created
        try:
            if os.path.exists(final_path):
                os.remove(final_path)
        except OSError:
            pass
