"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseAnon } from "../../../lib/supabase";
import { useRequireAuth } from "../../../lib/useRequireAuth";

interface Submission {
  id: string;
  url: string;
  platform: "youtube" | "tiktok";
  submitter_username: string;
  submitted_at: string;
  status: string;
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function extractTikTokId(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? null;
  } catch {
    return null;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

function generateShortCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function VideoEmbed({ submission }: { submission: Submission }) {
  if (submission.platform === "youtube") {
    const videoId = extractYouTubeId(submission.url);
    if (!videoId) return <div style={placeholderStyle}>Nie można załadować wideo</div>;
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        style={{ width: "100%", aspectRatio: "9/16", border: "none" }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={`YouTube Shorts – ${submission.submitter_username}`}
      />
    );
  }

  const videoId = extractTikTokId(submission.url);
  if (!videoId) return <div style={placeholderStyle}>Nie można załadować wideo</div>;
  return (
    <iframe
      src={`https://www.tiktok.com/embed/v2/${videoId}`}
      style={{ width: "100%", aspectRatio: "9/16", border: "none" }}
      allow="autoplay"
      allowFullScreen
      title={`TikTok – ${submission.submitter_username}`}
    />
  );
}

const placeholderStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "9/16",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0d0d0d",
  color: "#444",
  fontSize: "0.85rem",
};

export default function ReviewPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  useRequireAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cardVisible, setCardVisible] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabaseAnon
        .from("submissions")
        .select("id, url, platform, submitter_username, submitted_at, status")
        .eq("status", "pending")
        .order("submitted_at", { ascending: true })
        .limit(50);

      setSubmissions(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const advance = useCallback(() => {
    setCardVisible(false);
    setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setCardVisible(true);
      setActionInProgress(false);
    }, 200);
  }, []);

  const handleReject = useCallback(async () => {
    if (actionInProgress) return;
    const submission = submissions[currentIndex];
    if (!submission) return;

    setActionInProgress(true);
    await supabaseAnon
      .from("submissions")
      .update({ status: "rejected" })
      .eq("id", submission.id);
    advance();
  }, [submissions, currentIndex, actionInProgress, advance]);

  const handleApprove = useCallback(async () => {
    if (actionInProgress) return;
    const submission = submissions[currentIndex];
    if (!submission) return;

    setActionInProgress(true);

    await supabaseAnon
      .from("submissions")
      .update({ status: "approved" })
      .eq("id", submission.id);

    const code = generateShortCode();
    await supabaseAnon.from("short_links").insert({
      code,
      submission_id: submission.id,
      original_url: submission.url,
    });

    advance();
  }, [submissions, currentIndex, actionInProgress, advance]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "n" || e.key === "N") handleReject();
      if (e.key === "ArrowRight" || e.key === "t" || e.key === "T") handleApprove();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleReject, handleApprove]);

  if (loading) {
    return (
      <div style={centeredStyle}>
        <div className="spinner" />
      </div>
    );
  }

  if (currentIndex >= submissions.length) {
    return (
      <div style={centeredStyle}>
        <p className="muted" style={{ fontSize: "1rem" }}>
          Wszystko przejrzane.
        </p>
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: "8px" }}>
          {submissions.length === 0 ? "Brak oczekujących zgłoszeń." : `Przejrzano ${submissions.length} zgłoszeń.`}
        </p>
      </div>
    );
  }

  const submission = submissions[currentIndex];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        padding: "24px",
        gap: "24px",
      }}
    >
      {/* Progress */}
      <p className="muted" style={{ fontSize: "0.8rem", letterSpacing: "0.05em" }}>
        {currentIndex + 1} / {submissions.length}
      </p>

      {/* Card */}
      <div
        style={{
          maxWidth: "420px",
          width: "100%",
          border: "1px solid #222",
          borderRadius: "8px",
          overflow: "hidden",
          background: "#111",
          opacity: cardVisible ? 1 : 0,
          transition: "opacity 200ms ease",
        }}
      >
        <VideoEmbed submission={submission} />

        <div style={{ padding: "16px" }}>
          <p style={{ color: "#666", fontSize: "0.8rem", textTransform: "lowercase", letterSpacing: "0.05em" }}>
            {submission.platform}
          </p>
          <p style={{ color: "#f0f0f0", fontSize: "1.1rem", fontWeight: 500, marginTop: "4px" }}>
            {submission.submitter_username}
          </p>
          <p style={{ color: "#666", fontSize: "0.85rem", marginTop: "6px" }}>
            {formatDate(submission.submitted_at)}
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "16px" }}>
        <button
          onClick={handleReject}
          disabled={actionInProgress}
          style={rejectBtnStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#ff4d4d";
            (e.currentTarget as HTMLButtonElement).style.color = "#ff4d4d";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#333";
            (e.currentTarget as HTMLButtonElement).style.color = "#666";
          }}
          aria-label="Odrzuć (strzałka w lewo lub N)"
        >
          NIE
        </button>

        <button
          onClick={handleApprove}
          disabled={actionInProgress}
          style={approveBtnStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#4dff91";
            (e.currentTarget as HTMLButtonElement).style.color = "#4dff91";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#e0e0e0";
            (e.currentTarget as HTMLButtonElement).style.color = "#f0f0f0";
          }}
          aria-label="Zatwierdź (strzałka w prawo lub T)"
        >
          TAK
        </button>
      </div>

      <p className="muted" style={{ fontSize: "0.75rem" }}>
        ← N: odrzuć &nbsp;|&nbsp; T →: zatwierdź
      </p>
    </div>
  );
}

const centeredStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100dvh",
  gap: "8px",
};

const baseBtnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid",
  padding: "16px 40px",
  borderRadius: "4px",
  fontSize: "1rem",
  cursor: "pointer",
  letterSpacing: "0.05em",
  transition: "border-color 150ms ease, color 150ms ease",
};

const rejectBtnStyle: React.CSSProperties = {
  ...baseBtnStyle,
  borderColor: "#333",
  color: "#666",
};

const approveBtnStyle: React.CSSProperties = {
  ...baseBtnStyle,
  borderColor: "#e0e0e0",
  color: "#f0f0f0",
};