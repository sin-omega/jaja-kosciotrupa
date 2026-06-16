"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseAnon } from "../../../lib/supabase";
import { startDownload, getJobStatus, getDownloadUrl } from "../../../lib/api";
import { useRequireAuth } from "../../../lib/useRequireAuth";

interface ShortLink {
  code: string;
}

interface Submission {
  id: string;
  url: string;
  platform: "youtube" | "tiktok";
  submitter_username: string;
  submitted_at: string;
  short_links: ShortLink[];
}

type DownloadState = "idle" | "loading" | "done" | "error";

function extractYouTubeId(url: string): string | null {
  const match = url.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function TikTokIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.971-1.166-1.956-1.281-2.638h.004C16.393 1.241 16.434 1 16.442 1h-3.829v14.52c0 .195 0 .388-.008.578v.046c0 .023 0 .046-.004.069v.012a3.16 3.16 0 0 1-.854 1.956 3.127 3.127 0 0 1-2.346 1.049c-1.734 0-3.139-1.406-3.139-3.139 0-1.734 1.405-3.139 3.139-3.139.304 0 .596.044.872.125l.004-3.895a6.989 6.989 0 0 0-5.049 1.737 7.049 7.049 0 0 0-1.877 2.76 6.897 6.897 0 0 0-.401 2.368c0 1.846.719 3.575 2.025 4.88 1.406 1.407 3.278 2.181 5.302 2.181a7.475 7.475 0 0 0 5.3-2.181 7.485 7.485 0 0 0 2.181-5.302v-7.44a9.837 9.837 0 0 0 5.744 1.834v-3.79a5.82 5.82 0 0 1-1.343-.469z"
        fill="#444"
      />
    </svg>
  );
}

/* ── Per-card component ──────────────────────────────────── */

function SubmissionCard({ submission }: { submission: Submission }) {
  const [dlState, setDlState] = useState<DownloadState>("idle");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const shortCode = submission.short_links?.[0]?.code ?? null;
  const youtubeId =
    submission.platform === "youtube"
      ? extractYouTubeId(submission.url)
      : null;

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  const handleDownload = async () => {
    if (dlState === "loading") return;
    setDlState("loading");

    try {
      const jobId = await startDownload(submission.id);

      pollingRef.current = setInterval(async () => {
        try {
          const { status } = await getJobStatus(jobId);

          if (status === "done") {
            stopPolling();
            window.open(getDownloadUrl(jobId), "_blank");
            setDlState("done");
            setTimeout(() => setDlState("idle"), 3000);
          } else if (status === "error") {
            stopPolling();
            setDlState("error");
            setTimeout(() => setDlState("idle"), 3000);
          }
        } catch {
          stopPolling();
          setDlState("error");
          setTimeout(() => setDlState("idle"), 3000);
        }
      }, 2000);
    } catch {
      setDlState("error");
      setTimeout(() => setDlState("idle"), 3000);
    }
  };

  const btnLabel =
    dlState === "loading"
      ? "Pobieranie…"
      : dlState === "done"
      ? "Pobrano ✓"
      : dlState === "error"
      ? "Błąd — spróbuj ponownie"
      : "Pobierz";

  const btnColor =
    dlState === "done" ? "#4dff91" : dlState === "error" ? "#ff4d4d" : "#f0f0f0";

  return (
    <article
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: "8px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Thumbnail */}
      {submission.platform === "youtube" && youtubeId ? (
        <img
          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
          alt={`Miniaturka – ${submission.submitter_username}`}
          style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
          loading="lazy"
        />
      ) : (
        <div
          style={{
            width: "100%",
            aspectRatio: "16/9",
            background: "#0d0d0d",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="TikTok — brak miniatury"
        >
          <TikTokIcon />
        </div>
      )}

      {/* Meta */}
      <div style={{ padding: "12px", flexGrow: 1 }}>
        <p style={{ color: "#666", fontSize: "0.75rem", textTransform: "lowercase", letterSpacing: "0.05em" }}>
          {submission.platform}
        </p>
        <p style={{ color: "#f0f0f0", fontSize: "0.95rem", fontWeight: 500, marginTop: "4px" }}>
          {submission.submitter_username}
        </p>
        <p style={{ color: "#666", fontSize: "0.8rem", marginTop: "4px" }}>
          {formatDate(submission.submitted_at)}
        </p>
        {shortCode && (
          <p style={{ color: "#444", fontSize: "0.8rem", fontFamily: "monospace", marginTop: "6px" }}>
            /r/{shortCode}
          </p>
        )}
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={dlState === "loading"}
        style={{
          width: "100%",
          padding: "12px",
          background: "none",
          border: "none",
          borderTop: "1px solid #222",
          color: btnColor,
          cursor: dlState === "loading" ? "not-allowed" : "pointer",
          fontSize: "0.9rem",
          transition: "background 150ms ease, color 150ms ease",
        }}
        onMouseEnter={(e) => {
          if (dlState !== "loading") {
            (e.currentTarget as HTMLButtonElement).style.background = "#1a1a1a";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "none";
        }}
      >
        {btnLabel}
      </button>
    </article>
  );
}

/* ── Page ────────────────────────────────────────────────── */

export default function GalleryPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  useRequireAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabaseAnon
        .from("submissions")
        .select(`
          id,
          url,
          platform,
          submitter_username,
          submitted_at,
          short_links ( code )
        `)
        .eq("status", "approved")
        .order("submitted_at", { ascending: false });

      setSubmissions((data as Submission[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{ minHeight: "100dvh", padding: "32px 24px" }}>
      <h1
        style={{
          fontWeight: 300,
          fontSize: "2rem",
          letterSpacing: "-0.01em",
          marginBottom: "32px",
        }}
      >
        Galeria
      </h1>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "80px" }}>
          <div className="spinner" />
        </div>
      ) : submissions.length === 0 ? (
        <p className="muted">Brak zatwierdzonych zgłoszeń.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {submissions.map((s) => (
            <SubmissionCard key={s.id} submission={s} />
          ))}
        </div>
      )}
    </div>
  );
}