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
    <main className="relative min-h-dvh flex flex-col items-center justify-center overflow-hidden px-6">
      {/* Sacred Dawn background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            theme === "dark"
              ? "linear-gradient(180deg, #141210 0%, #1A2820 45%, #1E1A10 100%)"
              : "linear-gradient(180deg, #F9F7F2 0%, #E8F5EE 45%, #FFF8EC 100%)",
        }}
      />

      {/* Islamic geometric pattern overlay */}
      <div
        className="pointer-events-none fixed inset-0 pattern-bg"
        style={{ opacity: theme === "dark" ? 0.04 : 0.03 }}
      />

      {/* Radial glow accents */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            theme === "dark"
              ? "radial-gradient(ellipse at 50% 0%, rgba(76, 175, 130, 0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(201, 150, 58, 0.08) 0%, transparent 50%)"
              : "radial-gradient(ellipse at 50% 0%, rgba(27, 94, 69, 0.08) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(201, 150, 58, 0.06) 0%, transparent 50%)",
        }}
      />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 glass glass-hover p-3 cursor-pointer"
        style={{ borderRadius: "var(--radius-full)" }}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full animate-fade-in">
        {/* Bismillah */}
        <div
          className="mb-3 text-3xl animate-float"
          style={{
            fontFamily: "var(--font-arabic)",
            background: "var(--gradient-gold)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          بِسْمِ ٱللَّٰهِ
        </div>

        {/* App pill */}
        <div
          className="mb-6 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
          style={{
            background: "rgba(27, 94, 69, 0.12)",
            color: "var(--primary)",
            border: "1px solid rgba(27, 94, 69, 0.2)",
          }}
        >
          Legacy
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 leading-tight">
          <span
            style={{
              background: "var(--gradient-primary)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Your Ramadan
          </span>
          <br />
          <span style={{ color: "var(--foreground)" }}>
            doesn&apos;t have to end.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-base mb-6 max-w-xs"
          style={{ color: "var(--foreground-muted)" }}
        >
          Build sustainable habits beyond Ramadan with AI-powered guidance,
          accountability circles, and Prophetic motivation.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {["✨ AI Step-Down", "👥 Halaqa Circles", "🔥 Streak Tracking"].map(
            (f) => (
              <span
                key={f}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--surface-border)",
                  color: "var(--foreground-muted)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {f}
              </span>
            )
          )}
        </div>

        {/* Hadith quote card */}
        <div
          className="glass mb-8 py-4 px-5 text-sm max-w-sm w-full"
          style={{ color: "var(--foreground-muted)", fontStyle: "italic" }}
        >
          <p>
            &ldquo;The most beloved of deeds to Allah are those that are most
            consistent, even if it is small.&rdquo;
          </p>
          <span
            className="block mt-1.5 text-xs font-medium not-italic"
            style={{ color: "var(--accent)" }}
          >
            — Sahih al-Bukhari
          </span>
        </div>

        {/* Google sign-in button */}
        <button
          onClick={handleSignIn}
          id="google-sign-in"
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-semibold text-base mb-4 transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
          style={{
            background: theme === "dark" ? "#FFFFFF" : "#FFFFFF",
            color: "#1C1A14",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        {/* Privacy trust badge */}
        <p
          className="text-xs flex items-center gap-1.5 justify-center"
          style={{ color: "var(--foreground-muted)", opacity: 0.7 }}
        >
          <span>🛡️</span>
          No ads. No data sales. Ever.
        </p>
      </div>

      {/* Bottom accent line */}
      <div
        className="fixed bottom-0 left-0 right-0 h-0.5"
        style={{
          background:
            "linear-gradient(90deg, var(--primary), var(--accent), var(--primary))",
          opacity: 0.4,
        }}
      />
    </main>
  );
}
