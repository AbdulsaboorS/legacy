"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PRESET_HABITS, type PresetHabit } from "@/lib/types";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/Toast";

const TOTAL_STEPS = 4;

const S = {
  labelSmall: {
    display: "block" as const,
    fontSize: "0.65rem",
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    color: "var(--foreground-muted)",
    marginBottom: "10px",
  },
  inputBase: {
    width: "100%",
    height: "52px",
    padding: "0 16px",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box" as const,
    background: "var(--background-secondary)",
    color: "var(--foreground)",
    borderRadius: "10px",
    transition: "border-color 0.2s",
  },
  btnAmber: {
    background: "var(--accent)",
    color: "#ffffff",
    border: "none",
    borderRadius: "999px",
    padding: "14px 32px",
    fontWeight: 700,
    fontSize: "0.8rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  btnBack: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: "var(--foreground-muted)",
    padding: "14px 0",
  },
};

export default function OnboardingClient() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const [preferredName, setPreferredName] = useState("");
  const [gender, setGender] = useState<"Brother" | "Sister" | "">("");
  const [step, setStep] = useState(1);
  const [selectedHabits, setSelectedHabits] = useState<PresetHabit[]>([]);
  const [customHabitName, setCustomHabitName] = useState("");
  const [includeShawwal, setIncludeShawwal] = useState(true);
  const [isPrepping, setIsPrepping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Circles
  const [inviteCode, setInviteCode] = useState("");
  const [circleInfo, setCircleInfo] = useState<{ id: string; name: string; member_count: number } | null>(null);
  const [circleError, setCircleError] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);

  // ─── Step 2: Habit selection ─────────────────────────────────────────────────

  const shakeGrid = () => {
    if (gridRef.current) {
      gridRef.current.style.animation = "none";
      void gridRef.current.offsetHeight;
      gridRef.current.style.animation = "shake 0.4s ease";
      setTimeout(() => { if (gridRef.current) gridRef.current.style.animation = ""; }, 400);
    }
  };

  const toggleHabit = (habit: PresetHabit) => {
    const exists = selectedHabits.find((h) => h.name === habit.name);
    if (exists) {
      setSelectedHabits((prev) => prev.filter((h) => h.name !== habit.name));
      return;
    }
    setSelectedHabits((prev) => [...prev, habit]);
  };

  const addCustomHabit = () => {
    if (!customHabitName.trim()) return;
    const name = customHabitName.trim();
    if (selectedHabits.find((h) => h.name === name)) return;
    setSelectedHabits((prev) => [...prev, {
      name,
      icon: "✨",
      defaultRamadanAmount: "",
      category: "lifestyle",
    }]);
    setCustomHabitName("");
  };

  // ─── Step 2 → 3: Save habits + fire background plan gen ──────────────────────

  const saveAndAdvance = async () => {
    if (selectedHabits.length === 0) return;
    setIsPrepping(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      // Upsert all selected habits
      await supabase.from("habits").upsert(
        selectedHabits.map((h) => ({
          user_id: user.id,
          name: h.name,
          icon: h.icon,
          ramadan_amount: h.defaultRamadanAmount || null,
          is_active: true,
        })),
        { onConflict: "user_id,name" }
      );

      // Fetch back IDs (name-keyed for reliable mapping)
      const { data: saved } = await supabase
        .from("habits").select("id, name")
        .eq("user_id", user.id)
        .in("name", selectedHabits.map((h) => h.name));

      const ids: Record<string, string> = {};
      saved?.forEach((h) => { ids[h.name] = h.id; });

      // Fire background plan generation for first 3 habits (no await — fire and forget)
      selectedHabits.slice(0, 3).forEach((habit) => {
        const habitId = ids[habit.name];
        if (!habitId) return;
        fetch("/api/ai/plan/generate-and-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ habitId, habitName: habit.name, gender: gender || undefined }),
        });
        // response intentionally ignored — dashboard polls for result
      });

      setStep(3);
    } catch {
      toast.error("Failed to save your habits. Please try again.");
    } finally {
      setIsPrepping(false);
    }
  };

  // ─── Step 4: Circles ──────────────────────────────────────────────────────────

  const lookupCircle = async () => {
    if (!inviteCode.trim()) return;
    setIsLookingUp(true);
    setCircleError("");
    setCircleInfo(null);
    try {
      const supabase = createClient();
      const { data: halaqa } = await supabase
        .from("halaqas")
        .select("id, name, max_members, halaqa_members(count)")
        .eq("invite_code", inviteCode.toUpperCase().trim())
        .single();

      if (!halaqa) {
        setCircleError("Circle not found. Check the invite code.");
      } else {
        setCircleInfo({
          id: halaqa.id,
          name: halaqa.name,
          member_count: (halaqa.halaqa_members as { count: number }[])[0]?.count || 0,
        });
      }
    } catch {
      setCircleError("Circle not found. Check the invite code.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const joinCircle = async () => {
    if (!circleInfo) return;
    setIsJoining(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { await finishOnboarding(); return; }
      await supabase.from("halaqa_members").insert({ halaqa_id: circleInfo.id, user_id: user.id });
    } catch {}
    await finishOnboarding();
  };

  const finishOnboarding = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      await supabase.from("profiles").upsert({
        id: user.id,
        preferred_name: preferredName.trim() || user.user_metadata?.full_name?.split(" ")[0] || "Friend",
        gender: (gender || "Brother") as "Brother" | "Sister",
      });

      await supabase.from("streaks").upsert(
        { user_id: user.id, current_streak: 0, longest_streak: 0, total_completions: 0 },
        { onConflict: "user_id", ignoreDuplicates: true }
      );

      router.push("/dashboard");
    } catch {
      toast.error("Failed to complete setup. Please try again.");
      setIsSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <main style={{ minHeight: "100dvh", background: "var(--background)", position: "relative", overflowX: "hidden" }}>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-5px)}
          80%{transform:translateX(5px)}
        }
      `}</style>

      {/* Progress bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 40, height: "3px", background: "var(--background-secondary)" }}>
        <div style={{ height: "100%", width: `${(step / TOTAL_STEPS) * 100}%`, background: "var(--accent)", transition: "width 0.5s ease" }} />
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        style={{ position: "fixed", top: "20px", right: "20px", zIndex: 50, width: "40px", height: "40px", borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--surface-border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      {/* "Plans generating" banner — visible on steps 3 and 4 */}
      {step >= 3 && selectedHabits.length > 0 && (
        <div style={{ position: "fixed", top: "3px", left: 0, right: 0, zIndex: 39, background: "rgba(217,119,6,0.08)", borderBottom: "1px solid rgba(217,119,6,0.2)", padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)" }}>
            ✦ Your AI plans are generating — they&apos;ll be ready when you arrive
          </span>
        </div>
      )}

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "72px 32px 80px", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>

        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginBottom: "52px" }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              style={{
                width: "34px", height: "34px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: 700,
                background: s < step ? "var(--accent)" : "transparent",
                color: s < step ? "#fff" : s === step ? "var(--accent)" : "var(--foreground-muted)",
                border: s < step ? "none" : s === step ? "2px solid var(--accent)" : "1.5px solid var(--surface-border)",
                transition: "all 0.3s",
                flexShrink: 0,
              }}
            >
              {s < step ? "✓" : s}
            </div>
          ))}
        </div>

        {/* ══════════════ STEP 1: PROFILE ══════════════ */}
        {step === 1 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 300, fontSize: "clamp(2rem, 5vw, 2.8rem)", lineHeight: 1.1, marginBottom: "8px" }}>
              Welcome to Legacy 🌙
            </h2>
            <p style={{ color: "var(--foreground-muted)", marginBottom: "44px" }}>Let&apos;s personalize your experience.</p>

            <div style={{ marginBottom: "36px" }}>
              <label style={S.labelSmall}>What should we call you?</label>
              <input
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="e.g., Bilal or Sarah"
                style={{ ...S.inputBase, border: preferredName ? "1.5px solid var(--accent)" : "1.5px solid var(--surface-border)" }}
              />
            </div>

            <div style={{ marginBottom: "60px" }}>
              <label style={S.labelSmall}>Gender (for group matchmaking)</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {(["Brother", "Sister"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    style={{
                      height: "52px", fontWeight: 600, fontSize: "1rem",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      cursor: "pointer", transition: "all 0.2s",
                      background: gender === g ? "var(--foreground)" : "var(--background-secondary)",
                      color: gender === g ? "var(--background)" : "var(--foreground)",
                      border: gender === g ? "none" : "1.5px solid var(--surface-border)",
                      borderRadius: "10px",
                    }}
                  >
                    {gender === g && <span style={{ fontSize: "0.85rem" }}>✓</span>}
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setStep(2)}
                disabled={!preferredName.trim() || !gender}
                style={{ ...S.btnAmber, opacity: !preferredName.trim() || !gender ? 0.45 : 1, cursor: !preferredName.trim() || !gender ? "not-allowed" : "pointer" }}
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 2: SELECT HABITS ══════════════ */}
        {step === 2 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 300, fontSize: "clamp(2rem, 5vw, 2.8rem)", lineHeight: 1.1, marginBottom: "8px" }}>
              Choose your habits
            </h2>
            <p style={{ color: "var(--foreground-muted)", marginBottom: "32px" }}>
              Your first 3 habits get a personalized AI plan. Add as many as you like to track.
            </p>

            <div
              ref={gridRef}
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}
            >
              {PRESET_HABITS.map((habit) => {
                const selectionIndex = selectedHabits.findIndex((h) => h.name === habit.name);
                const isSelected = selectionIndex !== -1;
                const isMain = isSelected && selectionIndex < 3;
                return (
                  <button
                    key={habit.name}
                    onClick={() => toggleHabit(habit)}
                    style={{
                      position: "relative",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      padding: "28px 16px", cursor: "pointer", transition: "all 0.18s",
                      background: isSelected ? (theme === "dark" ? "rgba(217,119,6,0.12)" : "rgba(253,230,138,0.22)") : "var(--surface)",
                      border: isSelected ? "2px solid var(--accent)" : "1.5px solid rgba(0,0,0,0.12)",
                      borderRadius: "12px",
                    }}
                  >
                    {isSelected && (
                      <div style={{ position: "absolute", top: "10px", right: "10px", width: "20px", height: "20px", borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>✓</div>
                    )}
                    {isMain && (
                      <div style={{ position: "absolute", top: "10px", left: "10px", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.06em", color: "var(--accent)", background: "rgba(217,119,6,0.12)", borderRadius: "4px", padding: "2px 5px" }}>★ PLAN</div>
                    )}
                    <span style={{ fontSize: "1.8rem", marginBottom: "10px", lineHeight: 1 }}>{habit.icon}</span>
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--foreground-muted)", textAlign: "center", lineHeight: 1.3 }}>{habit.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom habit row */}
            {selectedHabits.filter((h) => !PRESET_HABITS.find((p) => p.name === h.name)).map((habit) => {
              const selectionIndex = selectedHabits.findIndex((h2) => h2.name === habit.name);
              const isMain = selectionIndex < 3;
              return (
                <div
                  key={habit.name}
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", marginBottom: "8px", background: theme === "dark" ? "rgba(217,119,6,0.12)" : "rgba(253,230,138,0.22)", border: "2px solid var(--accent)", borderRadius: "10px" }}
                >
                  <span style={{ fontSize: "1.1rem" }}>{habit.icon}</span>
                  <span style={{ flex: 1, fontSize: "0.85rem", fontWeight: 600 }}>{habit.name}</span>
                  {isMain && <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "var(--accent)", background: "rgba(217,119,6,0.12)", borderRadius: "4px", padding: "2px 5px" }}>★ PLAN</span>}
                  <button onClick={() => setSelectedHabits((prev) => prev.filter((h) => h.name !== habit.name))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", fontSize: "1rem" }}>✕</button>
                </div>
              );
            })}

            <div style={{ display: "flex", gap: "10px", marginBottom: "40px" }}>
              <input
                type="text"
                value={customHabitName}
                onChange={(e) => setCustomHabitName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomHabit()}
                placeholder="✦  Add custom habit..."
                style={{ ...S.inputBase, flex: 1, height: "48px", border: "1.5px solid var(--surface-border)" }}
              />
              <button
                onClick={addCustomHabit}
                disabled={!customHabitName.trim()}
                style={{ ...S.btnAmber, borderRadius: "10px", padding: "0 20px", height: "48px", fontSize: "0.72rem", opacity: !customHabitName.trim() ? 0.45 : 1, cursor: !customHabitName.trim() ? "not-allowed" : "pointer" }}
              >
                ADD
              </button>
            </div>

            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button onClick={() => setStep(1)} style={S.btnBack}>BACK</button>
              <button
                onClick={saveAndAdvance}
                disabled={selectedHabits.length === 0 || isPrepping}
                style={{ ...S.btnAmber, opacity: selectedHabits.length === 0 || isPrepping ? 0.45 : 1, cursor: selectedHabits.length === 0 || isPrepping ? "not-allowed" : "pointer" }}
              >
                {isPrepping ? "Saving..." : "Next Step"}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 3: SHAWWAL ══════════════ */}
        {step === 3 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 300, fontSize: "clamp(2rem, 5vw, 2.8rem)", lineHeight: 1.1, marginBottom: "8px" }}>
              One more Sunnah.
            </h2>
            <p style={{ color: "var(--foreground-muted)", marginBottom: "40px" }}>
              The Prophet ﷺ said: whoever fasts Ramadan then follows it with 6 days in Shawwal — it&apos;s as if they fasted the entire year.
            </p>

            <button
              onClick={() => setIncludeShawwal(!includeShawwal)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "16px",
                padding: "24px 20px", cursor: "pointer", textAlign: "left",
                background: includeShawwal ? (theme === "dark" ? "rgba(217,119,6,0.08)" : "rgba(253,230,138,0.18)") : "var(--surface)",
                border: includeShawwal ? "2px solid rgba(217,119,6,0.45)" : "1.5px solid var(--surface-border)",
                borderRadius: "16px", transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "2rem" }}>🌙</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "4px" }}>Track Shawwal 6-Day Fast</p>
                <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>We&apos;ll add a tracker to your dashboard so you don&apos;t lose count.</p>
              </div>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: `2px solid ${includeShawwal ? "var(--accent)" : "var(--foreground-muted)"}`, background: includeShawwal ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                {includeShawwal && <span style={{ color: "#fff", fontSize: "12px", fontWeight: 700 }}>✓</span>}
              </div>
            </button>

            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "32px" }}>
              <button onClick={() => setStep(2)} style={S.btnBack}>BACK</button>
              <button onClick={() => setStep(4)} style={S.btnAmber}>
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 4: CIRCLES ══════════════ */}
        {step === 4 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 300, fontSize: "clamp(2rem, 5vw, 2.8rem)", lineHeight: 1.1, marginBottom: "8px" }}>
              Accountability is the secret weapon.
            </h2>
            <p style={{ color: "var(--foreground-muted)", marginBottom: "8px" }}>
              Studies show you&apos;re 65% more likely to stick to a habit when you commit to someone else.
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", marginBottom: "40px" }}>
              Got an invite code? Join your circle now. Otherwise, you can create or browse circles anytime from the app.
            </p>

            <div style={{ background: "var(--surface)", border: "1px solid var(--surface-border)", borderRadius: "12px", padding: "28px", marginBottom: "16px" }}>
              <label style={S.labelSmall}>Circle Invite Code</label>
              <div style={{ display: "flex", gap: "10px", marginBottom: circleInfo || circleError ? "16px" : "0" }}>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setCircleInfo(null); setCircleError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && lookupCircle()}
                  placeholder="e.g. LEGACY42"
                  maxLength={12}
                  style={{ ...S.inputBase, flex: 1, height: "48px", border: "1.5px solid var(--surface-border)", fontFamily: "monospace", letterSpacing: "0.1em" }}
                />
                <button
                  onClick={lookupCircle}
                  disabled={!inviteCode.trim() || isLookingUp}
                  style={{ ...S.btnAmber, borderRadius: "10px", padding: "0 20px", height: "48px", fontSize: "0.72rem", opacity: !inviteCode.trim() || isLookingUp ? 0.45 : 1, cursor: !inviteCode.trim() || isLookingUp ? "not-allowed" : "pointer" }}
                >
                  {isLookingUp ? "..." : "Find"}
                </button>
              </div>

              {circleError && (
                <p style={{ fontSize: "0.8rem", color: "var(--error, #ef4444)", marginTop: "8px" }}>{circleError}</p>
              )}

              {circleInfo && (
                <div className="animate-fade-in" style={{ padding: "16px", background: "rgba(217,119,6,0.06)", border: "1.5px solid rgba(217,119,6,0.3)", borderRadius: "10px" }}>
                  <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "4px" }}>{circleInfo.name}</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", marginBottom: "16px" }}>{circleInfo.member_count} member{circleInfo.member_count !== 1 ? "s" : ""}</p>
                  <button
                    onClick={joinCircle}
                    disabled={isJoining || isSaving}
                    style={{ ...S.btnAmber, width: "100%", textAlign: "center" as const, opacity: isJoining || isSaving ? 0.7 : 1, cursor: isJoining || isSaving ? "not-allowed" : "pointer" }}
                  >
                    {isJoining || isSaving ? "Joining..." : "Join Circle →"}
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px" }}>
              <button onClick={() => setStep(3)} style={S.btnBack}>BACK</button>
              <button
                onClick={finishOnboarding}
                disabled={isSaving}
                style={{ ...S.btnAmber, background: "transparent", color: isSaving ? "var(--foreground-muted)" : "var(--foreground)", border: "1.5px solid var(--surface-border)", opacity: isSaving ? 0.6 : 1 }}
              >
                {isSaving ? "Setting up..." : "Skip for now →"}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
