"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { type Habit, type HabitLog, type HabitPlan, type WeekEntry } from "@/lib/types";

// Copied verbatim from DashboardClient
const getCurrentWeek = (plan: HabitPlan): WeekEntry | null => {
  if (!plan.weekly_roadmap?.length) return null;
  const dayN = Math.floor((Date.now() - new Date(plan.created_at).getTime()) / 86400000) + 1;
  const weekIndex = Math.max(0, Math.min(Math.ceil(dayN / 7), 4) - 1);
  return plan.weekly_roadmap[weekIndex] ?? null;
};

// Copied verbatim from DashboardClient
const streamPlan = async (url: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
      try { const p = JSON.parse(payload) as { text?: string }; if (p.text) accumulated += p.text; } catch { /* ignore */ }
    }
  }
  return JSON.parse(accumulated);
};

export default function HabitDetailClient({ habitId }: { habitId: string }) {
  const router = useRouter();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<HabitPlan | null>(null);
  const [heatmapLogs, setHeatmapLogs] = useState<HabitLog[]>([]);
  const [totalCompletions, setTotalCompletions] = useState(0);
  const [isCompletedToday, setIsCompletedToday] = useState(false);
  const [refineMessage, setRefineMessage] = useState("");
  const [refineStreaming, setRefineStreaming] = useState(false);
  const [refinedPlan, setRefinedPlan] = useState<Record<string, unknown> | null>(null);
  const [showRefine, setShowRefine] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      // Fetch habit
      const { data: habitData } = await supabase
        .from("habits")
        .select("*")
        .eq("id", habitId)
        .eq("user_id", user.id)
        .single();

      if (habitData) setHabit(habitData);

      // Fetch active plan
      const plans: HabitPlan[] = await fetch(`/api/ai/plan/list?habitId=${habitId}`)
        .then((r) => r.json())
        .catch(() => []);
      if (plans[0]) setPlan(plans[0]);

      // Fetch last 30 days of logs for heatmap
      const { data: logsData } = await supabase
        .from("habit_logs")
        .select("*")
        .eq("habit_id", habitId)
        .eq("user_id", user.id)
        .gte("date", thirtyDaysAgo)
        .order("date", { ascending: true });

      if (logsData) setHeatmapLogs(logsData);

      // Total completion count
      const { count } = await supabase
        .from("habit_logs")
        .select("*", { count: "exact", head: true })
        .eq("habit_id", habitId)
        .eq("user_id", user.id)
        .eq("completed", true);

      setTotalCompletions(count || 0);

      // Today's completion status
      const { data: todayLog } = await supabase
        .from("habit_logs")
        .select("date, completed")
        .eq("habit_id", habitId)
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      setIsCompletedToday(todayLog?.completed ?? false);

      setLoading(false);
    };

    loadData();
  }, [habitId, router, today, thirtyDaysAgo]);

  const handleRegeneratePlan = async () => {
    setShowRegenerateConfirm(false);
    setRegenerating(true);
    try {
      const res = await fetch("/api/ai/plan/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, habitName: habit!.name }),
      });
      if (!res.ok || !res.body) throw new Error("Stream failed");
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
          try { const p = JSON.parse(payload) as { text?: string }; if (p.text) accumulated += p.text; } catch { /* ignore */ }
        }
      }
      await fetch("/api/ai/plan/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, plan: JSON.parse(accumulated) }),
      });
      const updatedPlans: HabitPlan[] = await fetch(`/api/ai/plan/list?habitId=${habitId}`)
        .then((r) => r.json())
        .catch(() => []);
      if (updatedPlans[0]) setPlan(updatedPlans[0]);
    } finally {
      setRegenerating(false);
    }
  };

  const handleRefinePlan = async () => {
    if (!refineMessage.trim() || !plan) return;
    setRefineStreaming(true);
    try {
      const refined = await streamPlan("/api/ai/plan/refine", {
        habitId,
        currentPlan: plan,
        refinementMessage: refineMessage,
      });
      // Normalize: Gemini may return camelCase or snake_case depending on input format.
      // Save route expects camelCase, so coerce here.
      const normalized: Record<string, unknown> = {
        corePhilosophy: refined.corePhilosophy ?? refined.core_philosophy ?? null,
        actionableSteps: refined.actionableSteps ?? refined.actionable_steps ?? [],
        weeklyRoadmap: refined.weeklyRoadmap ?? refined.weekly_roadmap ?? [],
      };
      setRefinedPlan(normalized);
    } catch { /* ignore */ } finally {
      setRefineStreaming(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!refinedPlan) return;
    await fetch("/api/ai/plan/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId, plan: refinedPlan }),
    });
    const updatedPlans: HabitPlan[] = await fetch(`/api/ai/plan/list?habitId=${habitId}`)
      .then((r) => r.json())
      .catch(() => []);
    if (updatedPlans[0]) setPlan(updatedPlans[0]);
    setRefinedPlan(null);
    setRefineMessage("");
    setShowRefine(false);
  };

  // Build 30-day date array for heatmap
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    return d.toISOString().split("T")[0];
  });
  const completedDates = new Set(heatmapLogs.filter((l) => l.completed).map((l) => l.date));

  if (loading) {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <p style={{ color: "var(--foreground-muted)" }}>Loading...</p>
      </main>
    );
  }

  if (!loading && !habit) {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)", flexDirection: "column", gap: "16px" }}>
        <p style={{ color: "var(--foreground-muted)", fontSize: "0.95rem" }}>Habit not found.</p>
        <button
          onClick={() => router.push("/dashboard")}
          style={{ background: "none", border: "none", color: "var(--foreground-muted)", cursor: "pointer", fontSize: "0.875rem", textDecoration: "underline" }}
        >
          Back to Dashboard
        </button>
      </main>
    );
  }

  const currentWeek = plan ? getCurrentWeek(plan) : null;

  return (
    <main style={{ minHeight: "100dvh", background: "var(--background)" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "48px 24px 100px" }}>

        {/* Back arrow row */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{ background: "none", border: "none", color: "var(--foreground-muted)", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "4px", padding: 0 }}
          >
            <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>‹</span>
            <span>Back</span>
          </button>
        </div>

        {/* Habit header card */}
        <div className="glass" style={{ padding: "20px", borderRadius: "12px", marginBottom: "28px" }}>
          {/* Row 1: icon + name */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <span style={{ fontSize: "1.8rem" }}>{habit!.icon}</span>
            <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "1.6rem", color: "var(--foreground)", lineHeight: 1.2, margin: 0 }}>
              {habit!.name}
            </h1>
          </div>
          {/* Row 2: subtitle */}
          {(habit!.accepted_amount || habit!.suggested_amount) && (
            <p style={{ fontSize: "0.875rem", color: "var(--foreground-muted)", marginBottom: "10px" }}>
              {habit!.accepted_amount || habit!.suggested_amount}
            </p>
          )}
          {/* Row 3: today's status */}
          <div>
            {isCompletedToday ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "999px", border: "1px solid currentColor", color: "var(--success)", fontSize: "0.72rem", fontWeight: 700 }}>
                ✓ Completed today
              </span>
            ) : (
              <span style={{ fontSize: "0.72rem", color: "var(--foreground-muted)" }}>
                Not logged today
              </span>
            )}
          </div>
        </div>

        {/* Completion count */}
        <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", marginBottom: "24px" }}>
          Completed {totalCompletions} time{totalCompletions !== 1 ? "s" : ""}
        </p>

        {/* 30-day heatmap */}
        <div style={{ marginBottom: "28px" }}>
          <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--foreground-muted)", marginBottom: "10px" }}>
            30-Day History
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {days.map((date) => (
              <div
                key={date}
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: completedDates.has(date) ? "var(--accent)" : "var(--surface-border)",
                  opacity: completedDates.has(date) ? 1 : 0.5,
                }}
              />
            ))}
          </div>
        </div>

        {/* Plan section */}
        {plan ? (
          <div style={{ marginTop: "28px" }}>
            <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--foreground-muted)", marginBottom: "16px" }}>
              Your Plan
            </p>

            {/* 5a: This week's focus card */}
            {currentWeek && (
              <div style={{ background: "var(--accent)", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)", marginBottom: "4px" }}>
                  Week {currentWeek.week} of 4 — {currentWeek.focus}
                </p>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff", margin: 0 }}>
                  {currentWeek.target}
                </p>
              </div>
            )}

            {/* 5b: Core philosophy */}
            {plan.core_philosophy && (
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--foreground-muted)", marginBottom: "8px" }}>
                  Core Philosophy
                </p>
                <p style={{ fontSize: "0.875rem", fontStyle: "italic", color: "var(--foreground-muted)", lineHeight: 1.6 }}>
                  {plan.core_philosophy}
                </p>
              </div>
            )}

            {/* 5c: Action steps */}
            {(plan.actionable_steps?.length ?? 0) > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--foreground-muted)", marginBottom: "10px" }}>
                  Action Steps
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {plan.actionable_steps!.map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px" }}>
                      <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--foreground)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0, marginTop: "2px" }}>
                        {i + 1}
                      </span>
                      <div>
                        <p style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "2px", color: "var(--foreground)" }}>{step.step}</p>
                        <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5d: 4-week roadmap */}
            {(plan.weekly_roadmap?.length ?? 0) > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--foreground-muted)", marginBottom: "10px" }}>
                  4-Week Roadmap
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {plan.weekly_roadmap!.map((week) => (
                    <div key={week.week} style={{ background: "var(--background-secondary)", border: "1px solid var(--surface-border)", borderRadius: "8px", padding: "12px" }}>
                      <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent)", marginBottom: "2px" }}>Week {week.week}</p>
                      <p style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "2px", color: "var(--foreground)" }}>{week.focus}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>{week.target}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5e: Plan action buttons */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
              <button
                onClick={() => { setShowRefine(!showRefine); setRefinedPlan(null); setRefineMessage(""); }}
                style={{ fontSize: "0.72rem", fontWeight: 700, padding: "6px 14px", borderRadius: "999px", background: "none", border: "1.5px solid var(--surface-border)", color: "var(--foreground-muted)", cursor: "pointer" }}
              >
                ✏️ Refine your plan
              </button>
              <button
                onClick={() => setShowRegenerateConfirm(true)}
                disabled={regenerating}
                style={{ fontSize: "0.72rem", fontWeight: 700, padding: "6px 14px", borderRadius: "999px", background: "none", border: "1.5px solid var(--surface-border)", color: "var(--foreground-muted)", cursor: regenerating ? "not-allowed" : "pointer", opacity: regenerating ? 0.6 : 1 }}
              >
                {regenerating ? "Generating..." : "🔄 Refresh plan"}
              </button>
            </div>

            {/* 5f: Regenerate confirm dialog */}
            {showRegenerateConfirm && (
              <div style={{ padding: "12px 14px", background: "var(--background-secondary)", borderRadius: "8px", border: "1px solid var(--surface-border)", marginBottom: "16px" }}>
                <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", marginBottom: "10px" }}>
                  This will replace your current plan. Continue?
                </p>
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setShowRegenerateConfirm(false)}
                    style={{ fontSize: "0.72rem", fontWeight: 700, padding: "6px 14px", borderRadius: "999px", background: "none", border: "1.5px solid var(--surface-border)", color: "var(--foreground-muted)", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRegeneratePlan}
                    style={{ fontSize: "0.72rem", fontWeight: 700, padding: "6px 14px", borderRadius: "999px", background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer" }}
                  >
                    Replace Plan
                  </button>
                </div>
              </div>
            )}

            {/* 5g: Refine UI */}
            {showRefine && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                <textarea
                  value={refineMessage}
                  onChange={(e) => setRefineMessage(e.target.value)}
                  placeholder="Tell me how to adjust it..."
                  rows={3}
                  style={{ width: "100%", padding: "10px 12px", fontSize: "0.875rem", borderRadius: "8px", border: "1.5px solid var(--surface-border)", background: "var(--background-secondary)", color: "var(--foreground)", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
                {!refinedPlan && (
                  <button
                    onClick={handleRefinePlan}
                    disabled={refineStreaming || !refineMessage.trim()}
                    style={{ alignSelf: "flex-end", fontSize: "0.75rem", fontWeight: 700, padding: "8px 20px", borderRadius: "999px", background: "var(--accent)", color: "#fff", border: "none", cursor: refineStreaming || !refineMessage.trim() ? "not-allowed" : "pointer", opacity: refineStreaming || !refineMessage.trim() ? 0.6 : 1 }}
                  >
                    {refineStreaming ? "Refining..." : "Refine →"}
                  </button>
                )}

                {/* 5h: Refined plan preview */}
                {refinedPlan && (
                  <div style={{ padding: "12px 14px", background: "var(--background-secondary)", borderRadius: "8px", border: "1px solid var(--surface-border)" }}>
                    <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "10px" }}>
                      Revised Plan Preview
                    </p>
                    {(refinedPlan as { corePhilosophy?: string }).corePhilosophy && (
                      <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", fontStyle: "italic", marginBottom: "8px", lineHeight: 1.5 }}>
                        {(refinedPlan as { corePhilosophy?: string }).corePhilosophy}
                      </p>
                    )}
                    {((refinedPlan as { actionableSteps?: { step: string }[] }).actionableSteps ?? []).length > 0 && (
                      <div style={{ marginBottom: "8px" }}>
                        {((refinedPlan as { actionableSteps?: { step: string }[] }).actionableSteps ?? []).slice(0, 2).map((s, i) => (
                          <p key={i} style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginBottom: "2px" }}>
                            {i + 1}. {s.step}
                          </p>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "10px" }}>
                      <button
                        onClick={() => { setRefinedPlan(null); setRefineMessage(""); }}
                        style={{ fontSize: "0.72rem", fontWeight: 700, padding: "6px 14px", borderRadius: "999px", background: "none", border: "1.5px solid var(--surface-border)", color: "var(--foreground-muted)", cursor: "pointer" }}
                      >
                        Discard
                      </button>
                      <button
                        onClick={handleApprovePlan}
                        style={{ fontSize: "0.72rem", fontWeight: 700, padding: "6px 14px", borderRadius: "999px", background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer" }}
                      >
                        Approve ✓
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* No plan state */
          <p style={{ fontSize: "0.875rem", color: "var(--foreground-muted)", textAlign: "center", padding: "24px 0" }}>
            No plan yet. Generate one from the dashboard.
          </p>
        )}

      </div>
    </main>
  );
}
