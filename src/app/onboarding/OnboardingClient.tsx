"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PRESET_HABITS, type PresetHabit, type ActionableStep, type WeekEntry } from "@/lib/types";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/Toast";

interface SelectedHabit extends PresetHabit {
  ramadanAmount: string;
  acceptedAmount?: string;
  corePhilosophy?: string;
  actionableSteps?: ActionableStep[];
  weeklyRoadmap?: WeekEntry[];
  intensity: "easy" | "moderate" | "full";
  timeAvailable: "5-10" | "15-30" | "60+";
}

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

  // Core state
  const [preferredName, setPreferredName] = useState("");
  const [gender, setGender] = useState<"Brother" | "Sister" | "">("");
  const [step, setStep] = useState(1);
  const [selectedHabits, setSelectedHabits] = useState<SelectedHabit[]>([]);
  const [customHabitName, setCustomHabitName] = useState("");
  const [includeShawwal, setIncludeShawwal] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Step 4 — generation
  const [savedHabitIds, setSavedHabitIds] = useState<Record<string, string>>({});
  const [streamedText, setStreamedText] = useState<Record<string, string>>({});
  const [plansComplete, setPlansComplete] = useState<Record<string, boolean>>({});
  const [parsedPlans, setParsedPlans] = useState<Record<string, Record<string, unknown>>>({});
  const [isPrepping, setIsPrepping] = useState(false);
  const generationStarted = useRef(false);
  const planSkipped = useRef(false);

  // Step 6 — circles
  const [inviteCode, setInviteCode] = useState("");
  const [circleInfo, setCircleInfo] = useState<{ id: string; name: string; member_count: number } | null>(null);
  const [circleError, setCircleError] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const MAX_HABITS = 3;
  const TOTAL_STEPS = 6;

  // ─── Step 2: Habit selection ────────────────────────────────────────────────
  const shakeGrid = () => {
    if (gridRef.current) {
      gridRef.current.style.animation = "none";
      void gridRef.current.offsetHeight;
      gridRef.current.style.animation = "shake 0.4s ease";
      setTimeout(() => { if (gridRef.current) gridRef.current.style.animation = ""; }, 400);
    }
    toast.error("Focus on 3 habits for the best results");
  };

  const toggleHabit = (habit: PresetHabit) => {
    setSelectedHabits((prev) => {
      const exists = prev.find((h) => h.name === habit.name);
      if (exists) return prev.filter((h) => h.name !== habit.name);
      if (prev.length >= MAX_HABITS) { shakeGrid(); return prev; }
      return [...prev, { ...habit, ramadanAmount: habit.defaultRamadanAmount, intensity: "moderate", timeAvailable: "15-30" }];
    });
  };

  const addCustomHabit = () => {
    if (!customHabitName.trim()) return;
    if (selectedHabits.length >= MAX_HABITS) { shakeGrid(); return; }
    setSelectedHabits((prev) => [...prev, {
      name: customHabitName.trim(), icon: "✨",
      defaultRamadanAmount: "", category: "lifestyle",
      ramadanAmount: "", intensity: "moderate", timeAvailable: "15-30",
    }]);
    setCustomHabitName("");
  };

  // ─── Step 3: Update per-habit context ───────────────────────────────────────
  const updateHabit = (index: number, patch: Partial<SelectedHabit>) => {
    setSelectedHabits((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...patch };
      return updated;
    });
  };

  // ─── Step 4: Generate plans ──────────────────────────────────────────────────
  const getPhilosophyPreview = (text: string): string => {
    const full = text.match(/"corePhilosophy"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (full) return full[1].replace(/\\"/g, '"');
    const partial = text.match(/"corePhilosophy"\s*:\s*"([^"]*)/);
    if (partial) return partial[1];
    return "";
  };

  const allPlansComplete = selectedHabits.length > 0 &&
    selectedHabits.every((h) => plansComplete[h.name]);

  useEffect(() => {
    if (step !== 4) return;
    if (generationStarted.current) return;
    generationStarted.current = true;
    planSkipped.current = false;

    const run = async () => {
      setIsPrepping(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      // Upsert habits to get real IDs before generating
      const habitsToUpsert = selectedHabits.map((h) => ({
        user_id: user.id,
        name: h.name,
        icon: h.icon,
        ramadan_amount: h.ramadanAmount,
        is_active: true,
      }));
      await supabase.from("habits").upsert(habitsToUpsert, { onConflict: "user_id,name" });

      const { data: saved } = await supabase
        .from("habits").select("id, name")
        .eq("user_id", user.id)
        .in("name", selectedHabits.map((h) => h.name));

      const ids: Record<string, string> = {};
      saved?.forEach((h) => { ids[h.name] = h.id; });
      setSavedHabitIds(ids);
      setIsPrepping(false);

      // Stream plans for all habits in parallel
      selectedHabits.forEach(async (habit) => {
        const habitId = ids[habit.name];
        if (!habitId) { setPlansComplete((p) => ({ ...p, [habit.name]: true })); return; }

        try {
          const res = await fetch("/api/ai/plan/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              habitId,
              habitName: habit.name,
              ramadanAmount: habit.ramadanAmount,
              acceptedAmount: "",
              gender,
              intensity: habit.intensity,
              timeAvailable: habit.timeAvailable,
            }),
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
              try {
                const p = JSON.parse(payload) as { text?: string };
                if (p.text) {
                  accumulated += p.text;
                  if (!planSkipped.current) {
                    setStreamedText((prev) => ({ ...prev, [habit.name]: accumulated }));
                  }
                }
              } catch {}
            }
          }

          if (!planSkipped.current) {
            try {
              const plan = JSON.parse(accumulated) as {
                corePhilosophy?: string;
                actionableSteps?: ActionableStep[];
                weeklyRoadmap?: WeekEntry[];
              };
              setParsedPlans((prev) => ({ ...prev, [habit.name]: plan as Record<string, unknown> }));
              setSelectedHabits((prev) => prev.map((h) =>
                h.name === habit.name
                  ? { ...h, corePhilosophy: plan.corePhilosophy, actionableSteps: plan.actionableSteps, weeklyRoadmap: plan.weeklyRoadmap, acceptedAmount: plan.weeklyRoadmap?.[0]?.target || "" }
                  : h
              ));
            } catch {}
          }
        } catch {}

        setPlansComplete((prev) => ({ ...prev, [habit.name]: true }));
      });
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleSkipGeneration = () => {
    planSkipped.current = true;
    setStep(5);
  };

  // ─── Step 5: Save habits + plans ────────────────────────────────────────────
  const saveHabits = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      await supabase.from("profiles").upsert({
        id: user.id,
        preferred_name: preferredName,
        gender: gender as "Brother" | "Sister",
      });

      // Update habits with final acceptedAmount + plan data
      await Promise.all(selectedHabits.map(async (h) => {
        const habitId = savedHabitIds[h.name];
        if (!habitId) return;

        await supabase.from("habits").update({
          accepted_amount: h.acceptedAmount || null,
          core_philosophy: h.corePhilosophy || null,
          actionable_steps: h.actionableSteps?.length ? h.actionableSteps : null,
          weekly_roadmap: h.weeklyRoadmap?.length ? h.weeklyRoadmap : null,
        }).eq("id", habitId);

        const plan = parsedPlans[h.name];
        if (plan) {
          await fetch("/api/ai/plan/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ habitId, plan }),
          });
        }
      }));

      await supabase.from("streaks").upsert(
        { user_id: user.id, current_streak: 0, longest_streak: 0, total_completions: 0 },
        { onConflict: "user_id", ignoreDuplicates: true }
      );

      setStep(6);
    } catch {
      toast.error("Failed to save your plan. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Step 6: Circles ────────────────────────────────────────────────────────
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
      if (!user) { router.push("/dashboard"); return; }
      await supabase.from("halaqa_members").insert({ halaqa_id: circleInfo.id, user_id: user.id });
    } catch {}
    router.push("/dashboard");
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const step3Valid = selectedHabits.every((h) => h.ramadanAmount.trim());
  const step5Valid = selectedHabits.every((h) => (h.acceptedAmount || "").trim());

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
        @keyframes pulse-soft {
          0%,100%{opacity:1} 50%{opacity:0.4}
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
              Build your Core 3
            </h2>
            <p style={{ color: "var(--foreground-muted)", marginBottom: "32px" }}>Select up to 3 habits to carry forward from Ramadan.</p>

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
                      padding: "28px 16px", cursor: "pointer", transition: "all 0.18s",
                      background: isSelected ? (theme === "dark" ? "rgba(217,119,6,0.12)" : "rgba(253,230,138,0.22)") : "var(--surface)",
                      border: isSelected ? "2px solid var(--accent)" : "1.5px solid rgba(0,0,0,0.12)",
                      borderRadius: "12px",
                    }}
                  >
                    {isSelected && (
                      <div style={{ position: "absolute", top: "10px", right: "10px", width: "20px", height: "20px", borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>✓</div>
                    )}
                    <span style={{ fontSize: "1.8rem", marginBottom: "10px", lineHeight: 1 }}>{habit.icon}</span>
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--foreground-muted)", textAlign: "center", lineHeight: 1.3 }}>{habit.name}</span>
                  </button>
                );
              })}
            </div>

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

        {/* ══════════════ STEP 3: AI CONTEXT ══════════════ */}
        {step === 3 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 300, fontSize: "clamp(2rem, 5vw, 2.8rem)", lineHeight: 1.1, marginBottom: "8px" }}>
              Tell us about your practice
            </h2>
            <p style={{ color: "var(--foreground-muted)", marginBottom: "32px" }}>This helps the AI build you a plan that actually fits your life.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px", flex: 1, overflowY: "auto", marginBottom: "24px" }}>
              {selectedHabits.map((habit, index) => (
                <div key={habit.name} style={{ background: "var(--surface)", border: "1px solid var(--surface-border)", borderRadius: "12px", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
                    <span style={{ fontSize: "1.25rem" }}>{habit.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: "1rem" }}>{habit.name}</span>
                  </div>

                  {/* Ramadan amount */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={S.labelSmall}>How much did you do in Ramadan?</label>
                    <input
                      type="text"
                      value={habit.ramadanAmount}
                      onChange={(e) => updateHabit(index, { ramadanAmount: e.target.value })}
                      placeholder="e.g. 1 Juz / day, every night, after Fajr..."
                      style={{ ...S.inputBase, height: "46px", border: "1.5px solid var(--surface-border)" }}
                    />
                  </div>

                  {/* Intensity */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={S.labelSmall}>Intensity preference</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                      {([
                        { value: "easy", label: "Ease In", desc: "Gentle start" },
                        { value: "moderate", label: "Moderate", desc: "Steady pace" },
                        { value: "full", label: "Full", desc: "Max growth" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => updateHabit(index, { intensity: opt.value })}
                          style={{
                            padding: "10px 8px", borderRadius: "8px", cursor: "pointer",
                            border: habit.intensity === opt.value ? "2px solid var(--accent)" : "1.5px solid var(--surface-border)",
                            background: habit.intensity === opt.value ? (theme === "dark" ? "rgba(217,119,6,0.1)" : "rgba(253,230,138,0.2)") : "transparent",
                            transition: "all 0.15s",
                          }}
                        >
                          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: habit.intensity === opt.value ? "var(--accent)" : "var(--foreground)", marginBottom: "2px" }}>{opt.label}</p>
                          <p style={{ fontSize: "0.65rem", color: "var(--foreground-muted)" }}>{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time available */}
                  <div>
                    <label style={S.labelSmall}>Time available per day</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                      {([
                        { value: "5-10", label: "5–10 min" },
                        { value: "15-30", label: "15–30 min" },
                        { value: "60+", label: "1 hr+" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => updateHabit(index, { timeAvailable: opt.value })}
                          style={{
                            padding: "10px 8px", borderRadius: "8px", cursor: "pointer",
                            border: habit.timeAvailable === opt.value ? "2px solid var(--accent)" : "1.5px solid var(--surface-border)",
                            background: habit.timeAvailable === opt.value ? (theme === "dark" ? "rgba(217,119,6,0.1)" : "rgba(253,230,138,0.2)") : "transparent",
                            transition: "all 0.15s",
                          }}
                        >
                          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: habit.timeAvailable === opt.value ? "var(--accent)" : "var(--foreground)" }}>{opt.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px" }}>
              <button onClick={() => setStep(2)} style={S.btnBack}>BACK</button>
              <button
                onClick={() => setStep(4)}
                disabled={!step3Valid}
                style={{ ...S.btnAmber, opacity: !step3Valid ? 0.45 : 1, cursor: !step3Valid ? "not-allowed" : "pointer" }}
              >
                Generate My Plan
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 4: PLAN GENERATION ══════════════ */}
        {step === 4 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 300, fontSize: "clamp(2rem, 5vw, 2.8rem)", lineHeight: 1.1, marginBottom: "8px" }}>
              {allPlansComplete ? "Your plans are ready." : "Building your 28-day plan..."}
            </h2>
            <p style={{ color: "var(--foreground-muted)", marginBottom: "32px" }}>
              {allPlansComplete ? "Personalized for your habits, your pace, and your goals." : "The AI is crafting a personalized plan for each habit."}
            </p>

            {isPrepping && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--foreground-muted)", fontSize: "0.875rem" }}>
                Preparing...
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1, overflowY: "auto", marginBottom: "24px" }}>
              {selectedHabits.map((habit) => {
                const isDone = plansComplete[habit.name];
                const preview = getPhilosophyPreview(streamedText[habit.name] || "");

                return (
                  <div
                    key={habit.name}
                    className="animate-fade-in"
                    style={{ background: "var(--surface)", border: `1px solid ${isDone ? "var(--accent)" : "var(--surface-border)"}`, borderRadius: "12px", padding: "20px", transition: "border-color 0.4s" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                      <span style={{ fontSize: "1.1rem" }}>{habit.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{habit.name}</span>
                      {isDone && <span style={{ marginLeft: "auto", fontSize: "0.7rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em" }}>DONE ✓</span>}
                    </div>

                    {!isDone && (
                      <div>
                        <div style={{ display: "flex", gap: "4px", marginBottom: "10px" }}>
                          {[0, 1, 2].map((i) => (
                            <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", animation: `pulse-soft 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                          ))}
                        </div>
                        {preview && (
                          <p style={{ fontSize: "0.85rem", fontStyle: "italic", color: "var(--foreground-muted)", lineHeight: 1.55 }}>{preview}</p>
                        )}
                      </div>
                    )}

                    {isDone && parsedPlans[habit.name] && (() => {
                      const plan = parsedPlans[habit.name] as {
                        corePhilosophy?: string;
                        weeklyRoadmap?: WeekEntry[];
                        dailyActions?: { day: number; action: string }[];
                      };
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {plan.corePhilosophy && (
                            <p style={{ fontSize: "0.85rem", fontStyle: "italic", color: "var(--foreground-muted)", lineHeight: 1.55 }}>&ldquo;{plan.corePhilosophy}&rdquo;</p>
                          )}
                          {plan.weeklyRoadmap?.[0] && (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <div style={{ padding: "8px 12px", background: "rgba(217,119,6,0.08)", borderRadius: "6px", border: "1px solid rgba(217,119,6,0.2)", flex: 1 }}>
                                <p style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.1em", marginBottom: "2px" }}>WEEK 1</p>
                                <p style={{ fontSize: "0.8rem", fontWeight: 600 }}>{plan.weeklyRoadmap[0].focus}</p>
                              </div>
                              {plan.dailyActions?.[0] && (
                                <div style={{ padding: "8px 12px", background: "var(--background-secondary)", borderRadius: "6px", border: "1px solid var(--surface-border)", flex: 1 }}>
                                  <p style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--foreground-muted)", letterSpacing: "0.1em", marginBottom: "2px" }}>DAY 1</p>
                                  <p style={{ fontSize: "0.8rem" }}>{plan.dailyActions[0].action}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {isDone && !parsedPlans[habit.name] && (
                      <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>Plan generation failed. You can generate from the dashboard later.</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px" }}>
              <button onClick={handleSkipGeneration} style={S.btnBack}>Skip for now</button>
              <button
                onClick={() => setStep(5)}
                disabled={!allPlansComplete}
                style={{ ...S.btnAmber, opacity: !allPlansComplete ? 0.45 : 1, cursor: !allPlansComplete ? "not-allowed" : "pointer" }}
              >
                Set My Commitment
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 5: COMMITMENTS ══════════════ */}
        {step === 5 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 300, fontSize: "clamp(2rem, 5vw, 2.8rem)", lineHeight: 1.1, marginBottom: "8px" }}>
              Make your commitment.
            </h2>
            <p style={{ color: "var(--foreground-muted)", marginBottom: "32px" }}>
              Set a realistic daily target for each habit. You can always adjust later.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1, marginBottom: "24px" }}>
              {selectedHabits.map((habit, index) => (
                <div key={habit.name} style={{ background: "var(--surface)", border: "1px solid var(--surface-border)", borderRadius: "12px", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                    <span style={{ fontSize: "1.1rem" }}>{habit.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{habit.name}</span>
                  </div>

                  <label style={S.labelSmall}>I will...</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "0.9rem", color: "var(--foreground-muted)", whiteSpace: "nowrap" }}>I will</span>
                    <input
                      type="text"
                      value={habit.acceptedAmount || ""}
                      onChange={(e) => updateHabit(index, { acceptedAmount: e.target.value })}
                      placeholder="e.g. read half a Juz every morning"
                      style={{ ...S.inputBase, flex: 1, height: "46px", border: (habit.acceptedAmount || "").trim() ? "1.5px solid var(--accent)" : "1.5px solid var(--surface-border)" }}
                    />
                  </div>
                </div>
              ))}

              {/* Shawwal toggle */}
              <button
                onClick={() => setIncludeShawwal(!includeShawwal)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "16px",
                  padding: "18px 20px", cursor: "pointer", textAlign: "left",
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
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px" }}>
              <button onClick={() => setStep(4)} style={S.btnBack}>BACK</button>
              <button
                onClick={saveHabits}
                disabled={isSaving || !step5Valid}
                style={{ ...S.btnAmber, opacity: isSaving || !step5Valid ? 0.55 : 1, cursor: isSaving || !step5Valid ? "not-allowed" : "pointer" }}
              >
                {isSaving ? "Saving..." : "Lock It In →"}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 6: CIRCLES ══════════════ */}
        {step === 6 && (
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
                    disabled={isJoining}
                    style={{ ...S.btnAmber, width: "100%", textAlign: "center" as const, opacity: isJoining ? 0.7 : 1, cursor: isJoining ? "not-allowed" : "pointer" }}
                  >
                    {isJoining ? "Joining..." : "Join Circle →"}
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px" }}>
              <button onClick={() => setStep(5)} style={S.btnBack}>BACK</button>
              <button
                onClick={() => router.push("/dashboard")}
                style={{ ...S.btnAmber, background: "transparent", color: "var(--foreground-muted)", border: "1.5px solid var(--surface-border)" }}
              >
                Skip for now →
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
