"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PROPHETIC_QUOTES, type Habit, type HabitLog, type Streak, type HabitPlan } from "@/lib/types";
import { useTheme } from "@/components/ThemeProvider";

export default function DashboardClient() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayLogs, setTodayLogs] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [shawwalDaysCompleted, setShawwalDaysCompleted] = useState(0);
  const [habitPlans, setHabitPlans] = useState<Record<string, HabitPlan>>({});
  const [generatingHabitId, setGeneratingHabitId] = useState<string | null>(null);
  const [generationText, setGenerationText] = useState<Record<string, string>>({});
  const [generationError, setGenerationError] = useState<Record<string, boolean>>({});

  const todayQuote = PROPHETIC_QUOTES[new Date().getDate() % PROPHETIC_QUOTES.length];
  const today = new Date().toISOString().split("T")[0];

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_name")
      .eq("id", user.id)
      .single();

    setUserName(
      profile?.preferred_name ||
      user.user_metadata?.full_name?.split(" ")[0] ||
      ""
    );

    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (habitsData) {
      setHabits(habitsData);
      if (habitsData.length > 0) {
        const planResults = await Promise.all(
          habitsData.map((h) =>
            fetch(`/api/ai/plan/list?habitId=${h.id}`)
              .then((r) => r.json())
              .then((plans: HabitPlan[]) => ({ habitId: h.id, plan: plans[0] ?? null }))
              .catch(() => ({ habitId: h.id, plan: null as HabitPlan | null }))
          )
        );
        const plansMap: Record<string, HabitPlan> = {};
        planResults.forEach(({ habitId, plan }) => { if (plan) plansMap[habitId] = plan; });
        setHabitPlans(plansMap);
      }
    }

    const { data: logsData } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today);

    if (logsData) {
      const logMap: Record<string, boolean> = {};
      logsData.forEach((log: HabitLog) => {
        logMap[log.habit_id] = log.completed;
      });
      setTodayLogs(logMap);
    }

    const { data: streakData } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (streakData) setStreak(streakData);

    const { count } = await supabase
      .from("shawwal_fasts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("completed", true);

    setShawwalDaysCompleted(count || 0);
    setLoading(false);
  }, [router, today]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const toggleHabit = async (habitId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isCompleted = todayLogs[habitId];
    setTodayLogs((prev) => ({ ...prev, [habitId]: !isCompleted }));

    if (isCompleted) {
      await supabase
        .from("habit_logs")
        .delete()
        .eq("habit_id", habitId)
        .eq("date", today);
    } else {
      await supabase.from("habit_logs").upsert({
        habit_id: habitId,
        user_id: user.id,
        date: today,
        completed: true,
      });
    }

    await supabase.rpc("recalculate_streak", { p_user_id: user.id });

    const [{ data: freshStreak }, { data: freshHabits }] = await Promise.all([
      supabase.from("streaks").select("*").eq("user_id", user.id).single(),
      supabase.from("habits").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: true }),
    ]);
    if (freshStreak) setStreak(freshStreak);
    if (freshHabits) setHabits(freshHabits);
  };

  const toggleShawwalFast = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from("shawwal_fasts")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    if (existing) {
      await supabase.from("shawwal_fasts").delete().eq("id", existing.id);
      setShawwalDaysCompleted((prev) => Math.max(0, prev - 1));
    } else {
      await supabase.from("shawwal_fasts").insert({
        user_id: user.id,
        date: today,
        completed: true,
      });
      setShawwalDaysCompleted((prev) => prev + 1);
    }
  };

  const resetStreak = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("streaks")
      .update({
        current_streak: 0,
        last_completed_date: null,
        last_grace_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    setStreak((prev) =>
      prev
        ? { ...prev, current_streak: 0, last_completed_date: null, last_grace_date: null }
        : prev
    );
    setShowResetModal(false);
  };

  const shareMilestone = async () => {
    if (!streak) return;
    const url = `${window.location.origin}/api/og?name=${encodeURIComponent(userName || "Friend")}&streak=${streak.current_streak}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Post-Ramadan Legacy",
          text: `I've built a ${streak.current_streak}-day streak of my core habits post-Ramadan! Join me on Legacy.`,
          url,
        });
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== "AbortError") console.error("Error sharing:", err);
      }
    } else {
      window.open(url, "_blank");
    }
  };

  const refreshPlanForHabit = async (habitId: string) => {
    const plans: HabitPlan[] = await fetch(`/api/ai/plan/list?habitId=${habitId}`).then((r) => r.json()).catch(() => []);
    if (plans[0]) setHabitPlans((prev) => ({ ...prev, [habitId]: plans[0] }));
  };

  const handleGeneratePlan = async (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    setGeneratingHabitId(habitId);
    setGenerationText((prev) => ({ ...prev, [habitId]: "" }));
    setGenerationError((prev) => { const n = { ...prev }; delete n[habitId]; return n; });
    try {
      const res = await fetch("/api/ai/plan/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, habitName: habit.name }),
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
          try {
            const p = JSON.parse(payload) as { text?: string; error?: string };
            if (p.error) throw new Error(p.error);
            if (p.text) {
              accumulated += p.text;
              setGenerationText((prev) => ({ ...prev, [habitId]: accumulated }));
            }
          } catch { /* ignore parse errors on partial chunks */ }
        }
      }
      // Save the accumulated plan
      await fetch("/api/ai/plan/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, plan: JSON.parse(accumulated) }),
      });
      await refreshPlanForHabit(habitId);
      setGenerationText((prev) => { const n = { ...prev }; delete n[habitId]; return n; });
    } catch {
      setGenerationError((prev) => ({ ...prev, [habitId]: true }));
    } finally {
      setGeneratingHabitId(null);
    }
  };

  const completedCount = Object.values(todayLogs).filter(Boolean).length;
  const completionPercentage =
    habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const getMilestones = (streakCount: number) => {
    const milestones = [];
    if (streakCount >= 3) milestones.push({ label: "3 Days", emoji: "⭐" });
    if (streakCount >= 7) milestones.push({ label: "1 Week", emoji: "🌟" });
    if (streakCount >= 14) milestones.push({ label: "2 Weeks", emoji: "💪" });
    if (streakCount >= 30) milestones.push({ label: "30 Days", emoji: "🏆" });
    if (streakCount >= 60) milestones.push({ label: "60 Days", emoji: "👑" });
    return milestones;
  };

  const isGraceActive = habits.some((habit) => {
    if (!habit.last_grace_date) return false;
    const diffDays = Math.floor(
      (new Date().getTime() - new Date(habit.last_grace_date).getTime()) /
        (1000 * 3600 * 24)
    );
    return diffDays <= 7;
  });

  if (loading) {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <p style={{ color: "var(--foreground-muted)" }}>Loading your habits...</p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100dvh", background: "var(--background)" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "48px 24px 100px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 300, fontSize: "2.2rem", lineHeight: 1.1, color: "var(--foreground)", marginBottom: "6px" }}>
              {greeting}, {userName || "friend"}
            </h1>
            <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--foreground-muted)" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            style={{ background: "none", border: "1.5px solid var(--surface-border)", borderRadius: "50%", width: "38px", height: "38px", cursor: "pointer", fontSize: "1rem", flexShrink: 0 }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Daily Quote */}
        <div style={{ borderLeft: "3px solid var(--accent)", paddingLeft: "16px", marginBottom: "32px" }}>
          <p style={{ fontStyle: "italic", color: "var(--foreground-muted)", fontSize: "0.875rem", lineHeight: 1.65 }}>
            &ldquo;{todayQuote.text}&rdquo;
          </p>
          <p style={{ color: "var(--accent)", fontSize: "0.75rem", marginTop: "8px", fontWeight: 500 }}>
            — {todayQuote.source}
          </p>
        </div>

        {/* Streak + Progress row */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
          {/* Streak card */}
          <div style={{ flex: 1, border: "1.5px solid var(--surface-border)", borderRadius: "12px", padding: "20px 16px", textAlign: "center", position: "relative" }}>
            {isGraceActive && (
              <div style={{ position: "absolute", top: "8px", right: "8px", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em", padding: "3px 8px", borderRadius: "999px", border: "1px solid var(--accent)", color: "var(--accent)", background: "rgba(217,119,6,0.08)" }}>
                🛡️ Grace
              </div>
            )}
            <div style={{ fontSize: "1.6rem", marginBottom: "8px" }}>🔥</div>
            <div style={{ fontSize: "2.4rem", fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>
              {streak?.current_streak || 0}
            </div>
            <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--foreground-muted)", marginTop: "6px" }}>
              Day Streak
            </div>
            {streak && streak.current_streak > 0 && (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px", marginTop: "10px" }}>
                  {getMilestones(streak.current_streak).map((m) => (
                    <span key={m.label} className="streak-badge" style={{ fontSize: "0.75rem" }} title={m.label}>{m.emoji}</span>
                  ))}
                </div>
                <button
                  onClick={shareMilestone}
                  style={{ marginTop: "10px", fontSize: "0.7rem", fontWeight: 600, padding: "5px 14px", borderRadius: "999px", background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.3)", color: "var(--accent)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  📤 Share
                </button>
              </>
            )}
            {streak && streak.current_streak === 0 && (
              <button
                onClick={() => setShowResetModal(true)}
                style={{ marginTop: "8px", fontSize: "0.75rem", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                Start Fresh
              </button>
            )}
          </div>

          {/* Progress card */}
          <div style={{ flex: 1, border: "1.5px solid var(--surface-border)", borderRadius: "12px", padding: "20px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "relative", width: "80px", height: "80px", marginBottom: "10px" }}>
              <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface-border)" strokeWidth="5" />
                <circle
                  cx="40" cy="40" r="34" fill="none"
                  stroke={completionPercentage === 100 ? "var(--accent)" : "var(--foreground-muted)"}
                  strokeWidth="5"
                  strokeDasharray={`${(completionPercentage / 100) * 213.63} 213.63`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dasharray 0.5s ease" }}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "1rem", fontWeight: 700, color: completionPercentage === 100 ? "var(--accent)" : "var(--foreground)" }}>
                  {completionPercentage}%
                </span>
              </div>
            </div>
            <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--foreground-muted)" }}>Daily Goal</div>
            <div style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginTop: "4px" }}>
              {completedCount}/{habits.length} habits
            </div>
          </div>
        </div>

        {/* Shawwal section */}
        <div style={{ border: "1.5px solid rgba(217,119,6,0.3)", borderRadius: "12px", padding: "20px", marginBottom: "36px", background: "rgba(217,119,6,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)" }}>Shawwal Fasting</p>
              <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--accent)", marginTop: "4px" }}>
                {shawwalDaysCompleted} of 6 days
              </p>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {[1, 2, 3, 4, 5, 6].map((day) => (
                <span key={day} style={{ fontSize: "1.3rem", opacity: day <= shawwalDaysCompleted ? 1 : 0.2, transition: "opacity 0.2s" }}>🌙</span>
              ))}
            </div>
          </div>
          <button
            onClick={toggleShawwalFast}
            style={{ width: "100%", height: "48px", background: shawwalDaysCompleted >= 6 ? "var(--success)" : "var(--accent)", color: "#fff", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}
          >
            {shawwalDaysCompleted >= 6 ? "Complete ✓" : "Log Fast Today"}
          </button>
        </div>

        {/* Habits section */}
        <h2 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 400, fontSize: "1.5rem", color: "var(--foreground)", marginBottom: "4px" }}>
          Today&apos;s Intentions
        </h2>

        <div style={{ marginBottom: "36px" }}>
          {habits.map((habit, index) => {
            const isCompleted = todayLogs[habit.id];
            const habitPlan = habitPlans[habit.id];
            const hasMasterplan = !!habitPlan || generatingHabitId === habit.id || !!generationText[habit.id] || !!generationError[habit.id];
            const showGeneratePrompt = !habitPlan && !generatingHabitId && !generationText[habit.id] && !generationError[habit.id] && index < 3;
            return (
              <div
                key={habit.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
              >
                <button
                  onClick={() => toggleHabit(habit.id)}
                  style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 0", width: "100%", background: "none", border: "none", borderBottom: hasMasterplan || showGeneratePrompt ? "none" : "1px solid var(--surface-border)", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ fontSize: "1.3rem", width: "32px", textAlign: "center", flexShrink: 0 }}>{habit.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--foreground)", marginBottom: "2px" }}>{habit.name}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {habit.accepted_amount || habit.suggested_amount || ""}
                    </p>
                  </div>
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", border: isCompleted ? "none" : "2px solid var(--surface-border)", background: isCompleted ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                    {isCompleted && <span style={{ color: "#fff", fontSize: "0.75rem", fontWeight: 700 }}>✓</span>}
                  </div>
                </button>

                {/* Generate AI Plan button — shown when no plan, not generating, first 3 habits only */}
                {!habitPlan && !generatingHabitId && !generationText[habit.id] && !generationError[habit.id] && index < 3 && (
                  <div style={{ paddingLeft: "46px", paddingBottom: "12px", borderBottom: "1px solid var(--surface-border)" }}>
                    <button
                      onClick={() => handleGeneratePlan(habit.id)}
                      style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", padding: "5px 14px", borderRadius: "999px", background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.3)", color: "var(--accent)", cursor: "pointer" }}
                    >
                      ✨ Want a personalized plan?
                    </button>
                  </div>
                )}

                {/* Inline generation progress — shown while streaming for this habit */}
                {(generatingHabitId === habit.id || generationText[habit.id] || generationError[habit.id]) && !habitPlan && (
                  <div style={{ paddingLeft: "46px", paddingBottom: "12px", borderBottom: "1px solid var(--surface-border)" }}>
                    {(generatingHabitId === habit.id || generationText[habit.id]) && (
                      <div style={{ padding: "12px 14px", background: "rgba(217,119,6,0.06)", borderRadius: "8px", border: "1px solid rgba(217,119,6,0.2)", marginBottom: "8px" }}>
                        <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "6px" }}>
                          {generatingHabitId === habit.id ? "Generating your plan..." : "Saving..."}
                        </p>
                        <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                          {generationText[habit.id] || ""}
                        </p>
                      </div>
                    )}
                    {generationError[habit.id] && (
                      <div style={{ padding: "12px 14px", background: "var(--background-secondary)", borderRadius: "8px", border: "1px solid var(--surface-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>Plan generation failed.</p>
                        <button
                          onClick={() => { setGenerationError((prev) => { const n = { ...prev }; delete n[habit.id]; return n; }); handleGeneratePlan(habit.id); }}
                          disabled={generatingHabitId === habit.id}
                          style={{ fontSize: "0.72rem", fontWeight: 700, padding: "6px 14px", borderRadius: "999px", background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer" }}
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Your Plan nav link — shown when habit has a saved plan */}
                {!!habitPlan && (
                  <button
                    onClick={() => router.push(`/habit/${habit.id}`)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0 8px 46px", background: "none", border: "none", borderBottom: "1px solid var(--surface-border)", cursor: "pointer", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent)" }}
                  >
                    <span>✨ Your Plan</span>
                    <span style={{ fontSize: "1rem" }}>›</span>
                  </button>
                )}
              </div>
            );
          })}
          {habits.length === 0 && (
            <p style={{ color: "var(--foreground-muted)", fontSize: "0.9rem", padding: "24px 0", textAlign: "center" }}>
              No active habits yet.{" "}
              <button onClick={() => router.push("/settings")} style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: "0.9rem" }}>
                Add some in settings.
              </button>
            </p>
          )}
        </div>

        {/* Completion celebration */}
        {completionPercentage === 100 && (
          <div
            className="animate-bounce-in"
            style={{ padding: "28px", textAlign: "center", border: "1.5px solid rgba(217,119,6,0.3)", borderRadius: "12px", background: "rgba(217,119,6,0.04)", marginBottom: "28px" }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🎉 🤲 ⭐</div>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", fontWeight: 400, color: "var(--success)", marginBottom: "8px" }}>MashaAllah! All done!</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--foreground-muted)" }}>May Allah accept your efforts and make it easy for you.</p>
          </div>
        )}

        {/* Settings link */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => router.push("/settings")}
            style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            Manage habits &amp; settings
          </button>
        </div>
      </div>

      {/* Reset/Taubah Modal */}
      {showResetModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div
            className="animate-bounce-in"
            style={{ background: "var(--surface)", borderRadius: "16px", padding: "32px", maxWidth: "340px", width: "100%", border: "1px solid var(--surface-border)" }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🤲</div>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", fontWeight: 400, marginBottom: "8px" }}>Start Fresh</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--foreground-muted)", marginBottom: "6px" }}>
                Everyone stumbles. What matters is getting back up.
              </p>
              <p style={{ fontSize: "0.875rem", fontStyle: "italic", color: "var(--accent)", marginBottom: "24px" }}>
                &ldquo;The best of sinners are those who repent.&rdquo;
                <span style={{ display: "block", fontSize: "0.75rem", opacity: 0.7, marginTop: "4px" }}>— Sunan at-Tirmidhi</span>
              </p>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => setShowResetModal(false)}
                  style={{ flex: 1, height: "44px", background: "transparent", border: "1.5px solid var(--surface-border)", borderRadius: "10px", cursor: "pointer", fontWeight: 600, color: "var(--foreground)", fontSize: "0.875rem" }}
                >
                  Cancel
                </button>
                <button
                  onClick={resetStreak}
                  style={{ flex: 1, height: "44px", background: "var(--foreground)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}
                >
                  Start Fresh 🌱
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
