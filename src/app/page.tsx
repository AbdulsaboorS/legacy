"use client";

import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeProvider";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  const handleSignIn = async () => {
    const supabase = createClient();
    
    // Check if we have a pending invite link to redirect to
    let redirectUrl = `${window.location.origin}/auth/callback`;
    try {
      const next = sessionStorage.getItem("redirect_after_login");
      if (next) {
        redirectUrl += `?next=${encodeURIComponent(next)}`;
        sessionStorage.removeItem("redirect_after_login"); // Clear it
      }
    } catch (e) {
      console.error("Session storage error:", e);
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });
  };

  return (
    <main className="relative min-h-dvh flex flex-col items-center justify-center overflow-hidden px-6">
      {/* Background gradient */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            theme === "dark"
              ? "radial-gradient(ellipse at 50% 0%, rgba(13, 148, 136, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(217, 119, 6, 0.08) 0%, transparent 50%)"
              : "radial-gradient(ellipse at 50% 0%, rgba(13, 148, 136, 0.1) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(217, 119, 6, 0.05) 0%, transparent 50%)",
        }}
      />

      {/* Subtle geometric pattern overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23${theme === "dark" ? "ffffff" : "000000"}' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
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
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg animate-fade-in">
        {/* Logo / Bismillah */}
        <div
          className="mb-8 text-2xl opacity-60"
          style={{ fontFamily: "var(--font-arabic)" }}
        >
          بِسْمِ ٱللَّٰهِ
        </div>

        {/* Main heading */}
        <h1
          className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
          style={{
            background: `linear-gradient(135deg, var(--primary), var(--accent))`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            lineHeight: "1.2",
          }}
        >
          Your Ramadan doesn&apos;t have to end.
        </h1>

        {/* Subtitle */}
        <p
          className="text-lg mb-2 max-w-md"
          style={{ color: "var(--foreground-muted)" }}
        >
          Build a lasting legacy from the habits you built this Ramadan.
          AI-powered guidance to scale down gracefully — not drop off.
        </p>

        {/* Hadith */}
        <div
          className="glass mb-10 py-3 px-5 text-sm max-w-sm"
          style={{
            color: "var(--foreground-muted)",
            fontStyle: "italic",
          }}
        >
          &ldquo;The most beloved of deeds to Allah are those that are most
          consistent, even if it is small.&rdquo;
          <span className="block mt-1 text-xs opacity-70">
            — Sahih al-Bukhari
          </span>
        </div>

        {/* Sign in button */}
        <button
          onClick={handleSignIn}
          id="google-sign-in"
          className="btn btn-primary text-base px-8 py-4 mb-4"
          style={{ fontSize: "1rem" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        {/* Secondary info */}
        <p
          className="text-xs max-w-xs"
          style={{ color: "var(--foreground-muted)", opacity: 0.7 }}
        >
          Free forever. Your data stays private. Add to your home screen for the
          full experience.
        </p>
      </div>

      {/* Bottom decorative element */}
      <div
        className="fixed bottom-0 left-0 right-0 h-1"
        style={{
          background:
            "linear-gradient(90deg, var(--primary), var(--accent), var(--primary))",
          opacity: 0.5,
        }}
      />
    </main>
  );
}
