"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PRESET_HABITS, type PresetHabit, type ActionableStep, type WeekEntry } from "@/lib/types";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/Toast";

interface SelectedHabit extends PresetHabit {
  ramadanAmount: string;
  suggestedAmount?: string;
  motivation?: string;
  tip?: string;
  acceptedAmount?: string;
  isLoadingSuggestion?: boolean;
  corePhilosophy?: string;
  actionableSteps?: ActionableStep[];
  weeklyRoadmap?: WeekEntry[];
}

// ─── Shared style tokens ───────────────────────────────────────────────────────
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
  const [selectedHabits, setSelectedHabits] = useState<SelectedHabit[]>([]);
  const [customHabitName, setCustomHabitName] = useState("");
  const [includeShawwal, setIncludeShawwal] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingStep, setSavingStep] = useState<"saving" | "generating">("saving");

  const gridRef = useRef<HTMLDivElement>(null);
  const MAX_HABITS = 3;

  // ─── Shake animation on limit ─────────────────────────────────────────────
  const shakeGrid = () => {
    if (gridRef.current) {
      gridRef.current.style.animation = "none";
      void gridRef.current.offsetHeight;
      gridRef.current.style.animation = "shake 0.4s ease";
      setTimeout(() => { if (gridRef.current) gridRef.current.style.animation = ""; }, 400);
    }
    toast.error("Focus on 3 habits for the best results");
  };

  // ─── Habit selection ─────────────────────────────────────────────────────
  const toggleHabit = (habit: PresetHabit) => {
    setSelectedHabits((prev) => {
      const exists = prev.find((h) => h.name === habit.name);
      if (exists) return prev.filter((h) => h.name !== habit.name);
      if (prev.length >= MAX_HABITS) { shakeGrid(); return prev; }
      return [...prev, { ...habit, ramadanAmount: habit.defaultRamadanAmount }];
    });
  };

  const addCustomHabit = () => {
    if (!customHabitName.trim()) return;
    if (selectedHabits.length >= MAX_HABITS) { shakeGrid(); return; }
    setSelectedHabits((prev) => [...prev, {
      name: customHabitName.trim(), icon: "✨",
      defaultRamadanAmount: "", category: "lifestyle", ramadanAmount: "",
    }]);
    setCustomHabitName("");
  };

  const updateRamadanAmount = (index: number, amount: string) => {
    setSelectedHabits((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ramadanAmount: amount };
      return updated;
    });
  };

  // ─── AI suggestion fetch ─────────────────────────────────────────────────
  const fetchSuggestion = async (index: number) => {
    const habit = selectedHabits[index];
    if (!habit.ramadanAmount) return;

    setSelectedHabits((prev) => {
      const u = [...prev]; u[index] = { ...u[index], isLoadingSuggestion: true }; return u;
    });

    try {
      const res = await fetch("/api/ai/masterplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitName: habit.name, ramadanAmount: habit.ramadanAmount, acceptedAmount: habit.acceptedAmount || "", gender }),
      });
      if (!res.body) throw new Error("No body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try { const p = JSON.parse(payload); if (p.text) accumulated += p.text; } catch { /* partial */ }
        }
      }

      const data = JSON.parse(accumulated);
      setSelectedHabits((prev) => {
        const u = [...prev];
        u[index] = {
          ...u[index],
          suggestedAmount: data.suggestedAmount || "Start small and build up",
          motivation: data.motivation || "",
          tip: data.tip || "",
          acceptedAmount: data.suggestedAmount || "",
          corePhilosophy: data.corePhilosophy || "",
          actionableSteps: data.actionableSteps || [],
          weeklyRoadmap: data.weeklyRoadmap || [],
          isLoadingSuggestion: false,
        };
        return u;
      });
    } catch {
      setSelectedHabits((prev) => {
        const u = [...prev];
        u[index] = {
          ...u[index],
          suggestedAmount: "Start with a small, consistent amount",
          motivation: "Consistency is key in Islam.",
          tip: "Set a specific time each day for this habit.",
          acceptedAmount: "Start with a small, consistent amount",
          isLoadingSuggestion: false,
        };
        return u;
      });
    }
  };

  useEffect(() => {
    if (step !== 3 || selectedHabits.length === 0) return;
    const toFetch = selectedHabits.map((_, i) => i).filter((i) => !selectedHabits[i].suggestedAmount && !selectedHabits[i].isLoadingSuggestion);
    if (toFetch.length === 0) return;
    Promise.all(toFetch.map((i) => fetchSuggestion(i)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ─── Save ─────────────────────────────────────────────────────────────────
  const saveHabits = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      await supabase.from("profiles").upsert({ id: user.id, preferred_name: preferredName, gender: gender as "Brother" | "Sister" });

      const habitsToInsert = selectedHabits.map((h) => ({
        user_id: user.id, name: h.name, icon: h.icon,
        ramadan_amount: h.ramadanAmount, suggested_amount: h.suggestedAmount || null,
        accepted_amount: h.acceptedAmount || h.suggestedAmount || null, is_active: true,
        core_philosophy: h.corePhilosophy || null,
        actionable_steps: h.actionableSteps?.length ? h.actionableSteps : null,
        weekly_roadmap: h.weeklyRoadmap?.length ? h.weeklyRoadmap : null,
      }));

      const { error: habitsError } = await supabase.from("habits").upsert(habitsToInsert, { onConflict: "user_id,name" });
      if (habitsError) throw habitsError;

      // Get saved habit IDs so we can create 28-day AI plans
      const { data: savedHabits } = await supabase
        .from("habits")
        .select("id, name")
        .eq("user_id", user.id)
        .in("name", selectedHabits.map((h) => h.name));

      if (savedHabits && savedHabits.length > 0) {
        setSavingStep("generating");
        await Promise.all(
          savedHabits.map(async (savedHabit) => {
            const h = selectedHabits.find((s) => s.name === savedHabit.name);
            if (!h) return;
            try {
              const res = await fetch("/api/ai/plan/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ habitId: savedHabit.id, habitName: h.name, ramadanAmount: h.ramadanAmount, acceptedAmount: h.acceptedAmount || h.suggestedAmount || "", gender }),
              });
              if (!res.body) return;
              const reader = res.body.getReader();
              const decoder = new TextDecoder();
              let accumulated = "";
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                for (const line of decoder.decode(value, { stream: true }).split("\n")) {
                  if (!line.startsWith("data: ")) continue;
                  const payload = line.slice(6);
                  if (payload === "[DONE]") break;
                  try { const p = JSON.parse(payload) as { text?: string }; if (p.text) accumulated += p.text; } catch {}
                }
              }
              const plan = JSON.parse(accumulated);
              await fetch("/api/ai/plan/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ habitId: savedHabit.id, plan }) });
            } catch {
              // Non-blocking — plan generation failure doesn't block onboarding
            }
          })
        );
      }

      await supabase.from("streaks").upsert(
        { user_id: user.id, current_streak: 0, longest_streak: 0, total_completions: 0 },
        { onConflict: "user_id", ignoreDuplicates: true }
      );

      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to save habits:", error);
      toast.error("Failed to save your habits. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
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
        <div style={{ height: "100%", width: `${(step / 4) * 100}%`, background: "var(--accent)", transition: "width 0.5s ease" }} />
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        style={{ position: "fixed", top: "20px", right: "20px", zIndex: 50, width: "40px", height: "40px", borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--surface-border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      {/* ── Page container ── */}
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "72px 32px 80px", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>

        {/* Step dots — centered */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginBottom: "52px" }}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              style={{
                width: "38px", height: "38px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px", fontWeight: 700,
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
            <h2 className="text-2xl mb-2">Welcome to Legacy 🌙</h2>
            <p className="mb-6" style={{ color: "var(--foreground-muted)" }}>
              Let&apos;s personalize your experience.
            </p>

            {/* Name */}
            <div style={{ marginBottom: "44px" }}>
              <label style={S.labelSmall}>What should we call you?</label>
              <input
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="e.g., Bilal or Sarah"
                style={{ ...S.inputBase, border: preferredName ? "1.5px solid var(--accent)" : "1.5px solid var(--surface-border)" }}
              />
            </div>

            {/* Gender */}
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
            <h2 className="text-2xl mb-2">Build your Core 3</h2>
            <p className="mb-6" style={{ color: "var(--foreground-muted)" }}>
              Select up to 3 habits to focus on. Less is more.
            </p>

            {/* Habit grid */}
            <div
              ref={gridRef}
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}
            >
              {PRESET_HABITS.map((habit) => {
                const isSelected = selectedHabits.some((h) => h.name === habit.name);
                return (
                  <button
                    key={habit.name}
                    onClick={() => toggleHabit(habit)}
                    style={{
                      position: "relative",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      padding: "28px 16px",
                      cursor: "pointer", transition: "all 0.18s",
                      background: isSelected
                        ? theme === "dark" ? "rgba(217,119,6,0.12)" : "rgba(253,230,138,0.22)"
                        : "var(--surface)",
                      border: isSelected ? "2px solid var(--accent)" : "1.5px solid rgba(0,0,0,0.12)",
                      borderRadius: "12px",
                    }}
                  >
                    {isSelected && (
                      <div style={{
                        position: "absolute", top: "10px", right: "10px",
                        width: "20px", height: "20px", borderRadius: "50%",
                        background: "var(--accent)", color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "11px", fontWeight: 700,
                      }}>✓</div>
                    )}
                    <span style={{ fontSize: "1.8rem", marginBottom: "10px", lineHeight: 1 }}>{habit.icon}</span>
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--foreground-muted)", textAlign: "center", lineHeight: 1.3 }}>
                      {habit.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom habit */}
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
                onClick={() => setStep(3)}
                disabled={selectedHabits.length === 0}
                style={{ ...S.btnAmber, opacity: selectedHabits.length === 0 ? 0.45 : 1, cursor: selectedHabits.length === 0 ? "not-allowed" : "pointer" }}
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 3: AI MASTERPLAN ══════════════ */}
        {step === 3 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h2 className="text-2xl mb-2">Your graceful step-down plan</h2>
            <p className="mb-6" style={{ color: "var(--foreground-muted)" }}>
              AI-powered suggestions to make your habits sustainable.
            </p>

            {/* Title */}
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 300, fontSize: "clamp(2.2rem, 5vw, 3rem)", lineHeight: 1.1, color: "var(--foreground)", marginBottom: 0 }}>
                Your graceful<br />
                <em>step-down.</em>
              </h2>
              <div style={{ height: "2px", background: "var(--accent)", width: "240px", marginTop: "20px" }} />
            </div>

            {/* Habit cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1, overflowY: "auto", marginBottom: "24px" }}>
              {selectedHabits.map((habit, index) => (
                <div
                  key={habit.name}
                  style={{ background: "var(--surface)", border: "1px solid var(--surface-border)", borderRadius: "12px", padding: "24px" }}
                >
                  {/* Habit header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                    <span style={{ fontSize: "1.25rem", color: "var(--accent)" }}>{habit.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--foreground)" }}>{habit.name}</span>
                  </div>

                  {/* Ramadan volume */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={S.labelSmall}>Ramadan Volume</label>
                    <input
                      type="text"
                      value={habit.ramadanAmount}
                      onChange={(e) => updateRamadanAmount(index, e.target.value)}
                      placeholder="e.g. 1 Juz / day"
                      style={{
                        width: "100%", background: "transparent", color: "var(--foreground)",
                        border: "none", borderBottom: "1px solid var(--surface-border)",
                        padding: "8px 0", fontSize: "0.95rem", outline: "none", borderRadius: 0,
                      }}
                    />
                  </div>

                  {/* AI suggestion */}
                  {habit.isLoadingSuggestion && (
                    <div style={{ borderLeft: "3px solid var(--accent)", paddingLeft: "14px", marginBottom: "20px" }}>
                      <div style={{ height: "10px", background: "var(--surface-border)", borderRadius: "4px", width: "60%", marginBottom: "8px", opacity: 0.6 }} />
                      <div style={{ height: "10px", background: "var(--surface-border)", borderRadius: "4px", width: "80%", opacity: 0.4 }} />
                    </div>
                  )}

                  {!habit.isLoadingSuggestion && habit.suggestedAmount && (
                    <div style={{ borderLeft: "3px solid var(--accent)", paddingLeft: "14px", marginBottom: "20px" }}>
                      <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "8px" }}>
                        ⚡ Suggested: {habit.suggestedAmount}
                      </p>
                      {habit.motivation && (
                        <p style={{ fontSize: "0.9rem", fontStyle: "italic", color: "var(--foreground-muted)", lineHeight: 1.55 }}>
                          &ldquo;{habit.motivation}&rdquo;
                        </p>
                      )}
                    </div>
                  )}

                  {!habit.isLoadingSuggestion && !habit.suggestedAmount && (
                    <button
                      onClick={() => fetchSuggestion(index)}
                      disabled={!habit.ramadanAmount}
                      style={{ background: "none", border: "none", cursor: !habit.ramadanAmount ? "not-allowed" : "pointer", fontSize: "0.85rem", color: "var(--accent)", padding: "4px 0", marginBottom: "20px", opacity: !habit.ramadanAmount ? 0.45 : 1 }}
                    >
                      ✨ Get AI suggestion
                    </button>
                  )}

                  {/* Commitment */}
                  {habit.suggestedAmount && (
                    <div>
                      <label style={S.labelSmall}>Your Commitment</label>
                      <input
                        type="text"
                        value={habit.acceptedAmount || ""}
                        onChange={(e) => setSelectedHabits((prev) => { const u = [...prev]; u[index] = { ...u[index], acceptedAmount: e.target.value }; return u; })}
                        style={{ ...S.inputBase, height: "46px", border: "1.5px solid var(--surface-border)" }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px" }}>
              <button onClick={() => setStep(2)} style={S.btnBack}>BACK</button>
              <button onClick={() => setStep(4)} style={S.btnAmber}>Set Plan</button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 4: REVIEW ══════════════ */}
        {step === 4 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h2 className="text-2xl mb-2">Your Post-Ramadan Plan</h2>
            <p className="mb-6" style={{ color: "var(--foreground-muted)" }}>
              Review your habits and launch your journey.
            </p>

            {/* Shawwal */}
            <button
              onClick={() => setIncludeShawwal(!includeShawwal)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "16px",
                padding: "18px 20px", cursor: "pointer", textAlign: "left", marginBottom: "24px",
                background: includeShawwal ? (theme === "dark" ? "rgba(217,119,6,0.08)" : "rgba(253,230,138,0.18)") : "var(--surface)",
                border: includeShawwal ? "2px solid rgba(217,119,6,0.45)" : "1.5px solid var(--surface-border)",
                borderRadius: "12px", transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "1.75rem" }}>🌙</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "4px" }}>Shawwal 6-Day Fast Challenge</p>
                <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>Fast 6 days in Shawwal — it&apos;s like fasting the entire year!</p>
              </div>
              <div style={{ width: "22px", height: "22px", borderRadius: "50%", border: `2px solid ${includeShawwal ? "var(--accent)" : "var(--foreground-muted)"}`, background: includeShawwal ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                {includeShawwal && <span style={{ color: "#fff", fontSize: "11px", fontWeight: 700 }}>✓</span>}
              </div>
            </button>

            {/* Habits summary */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
              {selectedHabits.map((habit, i) => (
                <div key={habit.name} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", background: "var(--surface)", border: "1.5px solid var(--surface-border)", borderRadius: "10px" }}>
                  <span style={{ fontSize: "1.25rem" }}>{habit.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "2px" }}>{habit.name}</p>
                    <p style={{ fontSize: "0.78rem", color: "var(--accent)" }}>Goal: {habit.acceptedAmount || habit.suggestedAmount || "To be set"}</p>
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "var(--foreground-muted)", whiteSpace: "nowrap" }}>was: {habit.ramadanAmount || "—"}</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)", marginLeft: "4px" }}>{i + 1}</span>
                </div>
              ))}
            </div>

            {/* Quote */}
            <div style={{ padding: "20px 24px", background: "var(--background-secondary)", borderRadius: "10px", marginBottom: "32px", textAlign: "center" }}>
              <p style={{ fontSize: "0.9rem", fontStyle: "italic", color: "var(--foreground-muted)", lineHeight: 1.6 }}>
                &ldquo;Take up good deeds only as much as you are able, for the best deeds are those done regularly even if they are few.&rdquo;
              </p>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)", marginTop: "10px" }}>— Sunan Ibn Majah</p>
            </div>

            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button onClick={() => setStep(3)} style={S.btnBack}>BACK</button>
              <button
                onClick={saveHabits}
                disabled={isSaving}
                style={{ ...S.btnAmber, opacity: isSaving ? 0.7 : 1, cursor: isSaving ? "not-allowed" : "pointer", padding: "14px 36px", fontSize: "0.9rem" }}
              >
                {isSaving ? (savingStep === "generating" ? "Generating 28-day plans..." : "Saving...") : "Start My Legacy"}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
