"use client";

import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeProvider";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  const handleSignIn = async () => {
    const supabase = createClient();

    let redirectUrl = `${window.location.origin}/auth/callback`;
    try {
      const next = sessionStorage.getItem("redirect_after_login");
      if (next) {
        redirectUrl += `?next=${encodeURIComponent(next)}`;
        sessionStorage.removeItem("redirect_after_login");
      }
    } catch (e) {
      console.error("Session storage error:", e);
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl },
    });
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--background)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="glass glass-hover cursor-pointer"
        style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 50,
          padding: "12px",
          borderRadius: "var(--radius-full)",
          border: "none",
          fontSize: "1rem",
        }}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      {/* Content column */}
      <div
        className="animate-fade-in"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: "680px",
          width: "100%",
        }}
      >
        {/* Bismillah */}
        <div
          className="animate-float"
          style={{
            fontFamily: "var(--font-arabic)",
            fontSize: "3.5rem",
            color: "var(--accent)",
            lineHeight: 1,
            marginBottom: "48px",
          }}
        >
          بِسْمِ ٱللَّٰهِ
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 300,
            fontSize: "clamp(2.8rem, 7vw, 5rem)",
            lineHeight: 1.08,
            color: "var(--foreground)",
            marginBottom: "32px",
          }}
        >
          Expand on your Ramadan<br />
          <span style={{ fontStyle: "italic", color: "var(--accent)" }}>
            Legacy
          </span>
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "1rem",
            color: "var(--foreground-muted)",
            lineHeight: 1.7,
            maxWidth: "42ch",
            marginBottom: "56px",
          }}
        >
          Sustainable spiritual habits built with precision,
          accountability, and AI-powered guidance.
        </p>

        {/* Feature tags */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "12px",
            marginBottom: "72px",
          }}
        >
          {["AI Step-Down", "Halaqa Circles", "Streak Sync"].map((f) => (
            <span
              key={f}
              style={{
                padding: "8px 20px",
                fontSize: "0.65rem",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--foreground-muted)",
                border: "1px solid var(--surface-border)",
                borderRadius: "3px",
              }}
            >
              {f}
            </span>
          ))}
        </div>

        {/* Hadith quote card */}
        <div
          style={{
            maxWidth: "520px",
            width: "100%",
            borderLeft: "2px solid var(--accent)",
            padding: "24px 32px",
            background: "var(--background-secondary)",
            borderRadius: "0 4px 4px 0",
            textAlign: "left",
            marginBottom: "72px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "1.1rem",
              color: "var(--foreground)",
              lineHeight: 1.65,
              marginBottom: "12px",
            }}
          >
            &ldquo;The most beloved of deeds to Allah are those that are most
            consistent, even if it is small.&rdquo;
          </p>
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--accent)",
            }}
          >
            — Sahih al-Bukhari
          </span>
        </div>

        {/* Google sign-in button */}
        <button
          onClick={handleSignIn}
          id="google-sign-in"
          className="active:scale-[0.98]"
          style={{
            width: "100%",
            maxWidth: "520px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "18px 24px",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "1rem",
            background: "#FFFFFF",
            color: "#1C1A14",
            boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.08)",
            cursor: "pointer",
            marginBottom: "20px",
            transition: "all 0.2s ease",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        {/* Privacy note */}
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--foreground-muted)",
            opacity: 0.55,
          }}
        >
          🛡️ No ads. No data sales. Ever.
        </p>
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "var(--accent)",
          opacity: 0.3,
        }}
      />
    </main>
  );
}
