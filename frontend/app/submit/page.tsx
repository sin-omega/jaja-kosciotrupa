"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseAnon } from "../../lib/supabase";

type Platform = "youtube" | "tiktok";
type Step = 1 | 2 | 3 | 4;

function isYouTubeShorts(url: string): boolean {
  return (
    url.includes("youtube.com/shorts/") ||
    (url.includes("youtu.be/") && url.includes("/shorts/")) ||
    url.includes("youtube.com/shorts")
  );
}

function isTikTok(url: string): boolean {
  return url.includes("tiktok.com/") || url.includes("vm.tiktok.com/");
}

function detectPlatform(url: string): Platform | null {
  if (url.includes("youtube") || url.includes("youtu.be")) {
    return isYouTubeShorts(url) ? "youtube" : null;
  }
  if (isTikTok(url)) return "tiktok";
  return null;
}

function validateUrl(url: string): string | null {
  if (!url.trim()) return "Podaj link do filmu.";
  const platform = detectPlatform(url);
  if (!platform) {
    return "Link musi prowadzić do YouTube Shorts lub TikToka.";
  }
  return null;
}

/* ── SVG Checkmark ─────────────────────────────────────── */
function Checkmark() {
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="26"
        cy="26"
        r="24"
        stroke="#e0e0e0"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="150.8"
        strokeDashoffset="0"
        style={{
          animation: "drawCircle 300ms ease-in-out forwards",
        }}
      />
      <path
        d="M 14 26 L 22 34 L 38 18"
        stroke="#e0e0e0"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray="30"
        strokeDashoffset="0"
        style={{
          animation: "drawCheck 300ms ease-in-out 300ms forwards",
          strokeDashoffset: "30",
        }}
      />
    </svg>
  );
}

/* ── Shared input style ─────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "16px 0",
  border: "none",
  borderBottom: "1px solid #222",
  background: "transparent",
  color: "#f0f0f0",
  fontSize: "clamp(1rem, 4vw, 1.1rem)",
  outline: "none",
  transition: "border-bottom-color 150ms ease",
};

/* ── Shared button style ────────────────────────────────── */
const btnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid #333",
  color: "#f0f0f0",
  padding: "14px 32px",
  borderRadius: "4px",
  fontSize: "0.95rem",
  letterSpacing: "0.05em",
  cursor: "pointer",
  marginTop: "24px",
  transition: "border-color 150ms ease, background 150ms ease",
};

/* ── Step wrapper ───────────────────────────────────────── */
function StepWrapper({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width: "100%",
        maxWidth: "480px",
        opacity: active ? 1 : 0,
        pointerEvents: active ? "all" : "none",
        transform: active ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 250ms ease, transform 250ms ease",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────── */
export default function SubmitPage() {
  const [step, setStep] = useState<Step>(1);
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [username, setUsername] = useState("");
  const [urlError, setUrlError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [urlShake, setUrlShake] = useState(false);
  const [usernameShake, setUsernameShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const urlInputRef = useRef<HTMLInputElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Prevent accidental navigation while submitting
  useEffect(() => {
    if (step === 3) {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        return "";
      };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }
    // Remove handler on step 4
    return () => {};
  }, [step]);

  // Autofocus username input when entering step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => usernameInputRef.current?.focus(), 260);
    }
  }, [step]);

  /* ── Step 1 → 2 ──────────────────────────────────── */
  const handleUrlNext = useCallback(() => {
    const error = validateUrl(url);
    if (error) {
      setUrlError(error);
      setUrlShake(true);
      return;
    }
    setUrlError("");
    setPlatform(detectPlatform(url));
    setStep(2);
  }, [url]);

  /* ── Step 2 → 3 (+ background submit) ───────────── */
  const handleSubmit = useCallback(async () => {
    if (!username.trim()) {
      setUsernameError("Podaj swój nick.");
      setUsernameShake(true);
      return;
    }
    if (username.length > 50) {
      setUsernameError("Nick może mieć maksymalnie 50 znaków.");
      setUsernameShake(true);
      return;
    }
    setUsernameError("");
    setSubmitting(true);
    setStep(3);

    try {
      const { error } = await supabaseAnon.from("submissions").insert({
        url: url.trim(),
        platform,
        submitter_username: username.trim(),
        status: "pending",
      });

      if (error) throw error;

      setStep(4);
    } catch {
      setSubmitting(false);
      setUsernameError("Coś poszło nie tak. Spróbuj jeszcze raz.");
      setStep(2);
    }
  }, [username, url, platform]);

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100dvh",
        padding: "24px",
        position: "relative",
      }}
    >
      {/* ── Step 1: URL input ──────────────────────── */}
      <StepWrapper active={step === 1}>
        <h1
          style={{
            fontSize: "clamp(2rem, 8vw, 4rem)",
            fontWeight: 300,
            letterSpacing: "-0.02em",
            textAlign: "center",
            marginBottom: "48px",
          }}
        >
          Wrzuć film
        </h1>

        <div style={{ width: "100%", maxWidth: "480px" }}>
          <input
            ref={urlInputRef}
            type="url"
            placeholder="Link do YouTube Shorts lub TikToka"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setUrlError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleUrlNext()}
            onAnimationEnd={() => setUrlShake(false)}
            className={urlShake ? "shake" : ""}
            style={{
              ...inputStyle,
              fontSize: "max(16px, 1.1rem)", // prevent iOS zoom
            }}
            autoComplete="url"
            autoCapitalize="none"
          />
          <p className="error-text" aria-live="polite">
            {urlError}
          </p>
        </div>

        <button
          onClick={handleUrlNext}
          style={btnStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#666";
            (e.currentTarget as HTMLButtonElement).style.background = "#111";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#333";
            (e.currentTarget as HTMLButtonElement).style.background = "none";
          }}
        >
          Dalej
        </button>
      </StepWrapper>

      {/* ── Step 2: Username input ─────────────────── */}
      <StepWrapper active={step === 2}>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 5vw, 2.5rem)",
            fontWeight: 300,
            textAlign: "center",
            marginBottom: "48px",
          }}
        >
          {platform === "youtube"
            ? "Jak masz na nick na YouTube?"
            : "Jak masz na nick na TikToku?"}
        </h1>

        <div style={{ width: "100%", maxWidth: "480px" }}>
          <input
            ref={usernameInputRef}
            type="text"
            maxLength={50}
            placeholder={
              platform === "youtube"
                ? "Twój nick na YouTube"
                : "Twój nick na TikToku"
            }
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setUsernameError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && !submitting && handleSubmit()}
            onAnimationEnd={() => setUsernameShake(false)}
            className={usernameShake ? "shake" : ""}
            style={{
              ...inputStyle,
              fontSize: "max(16px, 1.1rem)",
            }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <p className="error-text" aria-live="polite">
            {usernameError}
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ ...btnStyle, opacity: submitting ? 0.5 : 1 }}
          onMouseEnter={(e) => {
            if (!submitting) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#666";
              (e.currentTarget as HTMLButtonElement).style.background = "#111";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#333";
            (e.currentTarget as HTMLButtonElement).style.background = "none";
          }}
        >
          Wyślij
        </button>
      </StepWrapper>

      {/* ── Step 3: Loading ────────────────────────── */}
      <StepWrapper active={step === 3}>
        <div className="spinner" />
        <p
          className="muted"
          style={{ fontSize: "0.9rem", marginTop: "16px" }}
        >
          Wysyłamy…
        </p>
      </StepWrapper>

      {/* ── Step 4: Success ────────────────────────── */}
      <StepWrapper active={step === 4}>
        <Checkmark />
        <p
          style={{
            color: "#f0f0f0",
            fontSize: "1rem",
            textAlign: "center",
            maxWidth: "280px",
            marginTop: "24px",
            lineHeight: 1.6,
          }}
        >
          Wysłano. Możesz zamknąć tę stronę.
        </p>
      </StepWrapper>

      <style>{`
        @keyframes drawCircle {
          from { stroke-dashoffset: 150.8; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes drawCheck {
          from { stroke-dashoffset: 30; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </main>
  );
}
