"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PROPHETIC_QUOTES, type Habit, type HabitLog, type Streak } from "@/lib/types";
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
  const [expandedMasterplan, setExpandedMasterplan] = useState<string | null>(null);

  const todayQuote = PROPHETIC_QUOTES[new Date().getDate() % PROPHETIC_QUOTES.length];
  const today = new Date().toISOString().split("T")[0];

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    // Pull preferred_name from profiles table
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

    if (habitsData) setHabits(habitsData);

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

    await updateStreak(user.id);
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

  const updateStreak = async (userId: string) => {
    const supabase = createClient();
    const { data: allHabits } = await supabase
      .from("habits")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const { data: todayCompletedLogs } = await supabase
      .from("habit_logs")
      .select("habit_id")
      .eq("user_id", userId)
      .eq("date", today)
      .eq("completed", true);

    const allCompleted =
      allHabits &&
      todayCompletedLogs &&
      allHabits.length > 0 &&
      todayCompletedLogs.length >= allHabits.length;

    if (allCompleted && streak) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = twoDaysAgo.toISOString().split("T")[0];

      let newStreak = 1;
      let newGraceDate = streak.last_grace_date;

      if (streak.last_completed_date === today) {
        newStreak = streak.current_streak;
      } else if (streak.last_completed_date === yesterdayStr) {
        newStreak = streak.current_streak + 1;
      } else if (streak.last_completed_date === twoDaysAgoStr) {
        let canUseGrace = true;
        if (streak.last_grace_date) {
          const diffDays = Math.floor(
            (new Date().getTime() - new Date(streak.last_grace_date).getTime()) /
              (1000 * 3600 * 24)
          );
          if (diffDays <= 7) canUseGrace = false;
        }
        if (canUseGrace) {
          newStreak = streak.current_streak + 1;
          newGraceDate = yesterdayStr;
        } else {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      const newLongest = Math.max(streak.longest_streak, newStreak);

      await supabase
        .from("streaks")
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
          last_completed_date: today,
          last_grace_date: newGraceDate,
          total_completions: streak.total_completions + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      setStreak((prev) =>
        prev
          ? {
              ...prev,
              current_streak: newStreak,
              longest_streak: newLongest,
              last_completed_date: today,
              last_grace_date: newGraceDate,
              total_completions: prev.total_completions + 1,
            }
          : prev
      );
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
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      window.open(url, "_blank");
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

  const isGraceActive = (() => {
    if (!streak?.last_grace_date) return false;
    const diffDays = Math.floor(
      (new Date().getTime() - new Date(streak.last_grace_date).getTime()) /
        (1000 * 3600 * 24)
    );
    return diffDays <= 7;
  })();

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="text-center animate-pulse-soft">
          <div className="text-4xl mb-4 animate-float">🌙</div>
          <p style={{ color: "var(--foreground-muted)" }}>Loading your habits...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh pb-8">
      <div className="relative z-10 max-w-lg mx-auto px-5 pt-6 sm:pt-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">
              {greeting}, {userName || "friend"} 👋
            </h1>
            <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="glass glass-hover p-2.5 cursor-pointer"
            style={{ borderRadius: "var(--radius-full)" }}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Daily Quote — Arabic + English */}
        <div
          className="glass p-4 mb-5 animate-fade-in"
          style={{ borderRadius: "var(--radius-lg)" }}
        >
          <p className="text-sm italic" style={{ color: "var(--foreground-muted)" }}>
            &ldquo;{todayQuote.text}&rdquo;
          </p>
          <p
            className="text-xs mt-1 font-medium"
            style={{ color: "var(--accent)", opacity: 0.85 }}
          >
            — {todayQuote.source}
          </p>
        </div>

        {/* Streak & Progress row */}
        <div className="flex gap-3 mb-5">
          {/* Streak card */}
          <div
            className="glass flex-1 p-4 text-center relative"
            style={{ borderRadius: "var(--radius-lg)" }}
          >
            {isGraceActive && (
              <div
                className="absolute top-2 right-2 text-xs flex items-center gap-1 px-2 py-0.5 rounded-full animate-fade-in"
                style={{
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                  background: "rgba(201, 150, 58, 0.1)",
                }}
                title="Grace day used this week — streak protected!"
              >
                <span>🛡️</span> Grace
              </div>
            )}

            <div className="text-3xl mb-1 animate-streak-fire">🔥</div>
            <div
              className="text-3xl font-bold mb-0.5"
              style={{ color: "var(--accent)" }}
            >
              {streak?.current_streak || 0}
            </div>
            <div className="text-xs" style={{ color: "var(--foreground-muted)" }}>
              day streak
            </div>

            {streak && streak.current_streak > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mt-2">
                {getMilestones(streak.current_streak).map((m) => (
                  <span
                    key={m.label}
                    className="streak-badge text-xs animate-bounce-in"
                    title={m.label}
                  >
                    {m.emoji}
                  </span>
                ))}
              </div>
            )}

            {streak && streak.current_streak > 0 && (
              <button
                onClick={shareMilestone}
                className="mt-3 text-xs px-3 py-1.5 rounded-full transition-colors flex items-center justify-center gap-1 mx-auto"
                style={{
                  background: "rgba(201, 150, 58, 0.15)",
                  color: "var(--accent)",
                  border: "1px solid rgba(201, 150, 58, 0.3)",
                }}
              >
                <span>📤</span> Share
              </button>
            )}

            {streak && streak.current_streak === 0 && (
              <button
                onClick={() => setShowResetModal(true)}
                className="mt-2 text-xs underline cursor-pointer"
                style={{ color: "var(--accent)" }}
              >
                Start Fresh
              </button>
            )}
          </div>

          {/* Progress ring */}
          <div
            className="glass flex-1 p-4 text-center"
            style={{ borderRadius: "var(--radius-lg)" }}
          >
            <div className="relative w-20 h-20 mx-auto mb-2">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="var(--surface-border)"
                  strokeWidth="5"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke={completionPercentage === 100 ? "var(--accent)" : "var(--foreground-muted)"}
                  strokeWidth="5"
                  strokeDasharray={`${(completionPercentage / 100) * 213.63} 213.63`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-base font-bold"
                  style={{
                    color: completionPercentage === 100 ? "var(--accent)" : "var(--foreground)",
                  }}
                >
                  {completionPercentage}%
                </span>
              </div>
            </div>
            <div className="text-xs" style={{ color: "var(--foreground-muted)" }}>
              {completedCount}/{habits.length} today
            </div>
          </div>
        </div>

        {/* Shawwal Tracker — crescent moons */}
        <div
          className="glass-gold p-4 mb-5"
          style={{ borderRadius: "var(--radius-lg)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold">Shawwal Fasting</h3>
              <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                {shawwalDaysCompleted}/6 days — like fasting the whole year
              </p>
            </div>
            <button
              onClick={toggleShawwalFast}
              className="btn text-xs px-3 py-1.5 cursor-pointer"
              style={{
                background:
                  shawwalDaysCompleted >= 6
                    ? "var(--success)"
                    : "var(--accent)",
                color: "white",
                borderRadius: "var(--radius-full)",
              }}
            >
              {shawwalDaysCompleted >= 6 ? "Complete ✓" : "Log Today"}
            </button>
          </div>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5, 6].map((day) => (
              <div
                key={day}
                className="flex-1 flex items-center justify-center text-xl transition-all duration-300"
                style={{
                  filter: day <= shawwalDaysCompleted ? "none" : "grayscale(1) opacity(0.3)",
                  transform: day <= shawwalDaysCompleted ? "scale(1.1)" : "scale(1)",
                }}
              >
                🌙
              </div>
            ))}
          </div>
        </div>

        {/* Habits List */}
        <h2 className="text-base font-semibold mb-3" style={{ color: "var(--foreground-muted)" }}>
          TODAY&apos;S HABITS
        </h2>
        <div className="space-y-3 mb-6">
          {habits.map((habit, index) => {
            const isCompleted = todayLogs[habit.id];
            const hasMasterplan = (habit.weekly_roadmap?.length ?? 0) > 0;
            const isMasterplanOpen = expandedMasterplan === habit.id;
            return (
              <div
                key={habit.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
              >
                <button
                  onClick={() => toggleHabit(habit.id)}
                  className="glass glass-hover w-full p-5 flex items-center gap-4 text-left cursor-pointer transition-all duration-200"
                  style={{
                    borderRadius: hasMasterplan && isMasterplanOpen
                      ? "var(--radius-lg) var(--radius-lg) 0 0"
                      : "var(--radius-lg)",
                    border: isCompleted
                      ? "1px solid rgba(217, 119, 6, 0.35)"
                      : "1px solid var(--surface-border)",
                    background: isCompleted
                      ? theme === "dark"
                        ? "rgba(217, 119, 6, 0.08)"
                        : "rgba(217, 119, 6, 0.05)"
                      : undefined,
                  }}
                >
                  {/* Check circle */}
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                    style={{
                      background: isCompleted ? "var(--success)" : "var(--background-secondary)",
                      border: isCompleted ? "none" : "2px solid var(--surface-border)",
                    }}
                  >
                    {isCompleted ? (
                      <span className="text-white font-bold animate-check">✓</span>
                    ) : (
                      <span className="text-xl">{habit.icon}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-medium transition-all duration-200"
                      style={{ color: "var(--foreground)" }}
                    >
                      {habit.name}
                    </h3>
                    <p
                      className="text-xs truncate mt-0.5"
                      style={{ color: "var(--foreground-muted)" }}
                    >
                      {habit.accepted_amount || habit.suggested_amount || ""}
                    </p>
                  </div>

                  {isCompleted && (
                    <span
                      className="text-xs font-semibold animate-bounce-in shrink-0"
                      style={{ color: "var(--success)" }}
                    >
                      Done ✓
                    </span>
                  )}
                </button>

                {/* Masterplan toggle + panel */}
                {hasMasterplan && (
                  <>
                    <button
                      onClick={() =>
                        setExpandedMasterplan(isMasterplanOpen ? null : habit.id)
                      }
                      className="w-full flex items-center justify-between px-5 py-2 text-xs transition-all"
                      style={{
                        background: theme === "dark"
                          ? "rgba(201, 150, 58, 0.07)"
                          : "rgba(201, 150, 58, 0.05)",
                        border: "1px solid rgba(201, 150, 58, 0.2)",
                        borderTop: "none",
                        borderRadius: isMasterplanOpen
                          ? "0"
                          : "0 0 var(--radius-lg) var(--radius-lg)",
                        color: "var(--accent)",
                      }}
                    >
                      <span>✨ AI Masterplan</span>
                      <span
                        className="transition-transform duration-200"
                        style={{ transform: isMasterplanOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                      >
                        ▾
                      </span>
                    </button>

                    {isMasterplanOpen && (
                      <div
                        className="glass p-5 space-y-4 animate-fade-in"
                        style={{
                          borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
                          border: "1px solid rgba(201, 150, 58, 0.15)",
                          borderTop: "none",
                        }}
                      >
                        {/* Core philosophy */}
                        {habit.core_philosophy && (
                          <div>
                            <p
                              className="text-xs font-semibold uppercase tracking-wider mb-1"
                              style={{ color: "var(--accent)" }}
                            >
                              Core Philosophy
                            </p>
                            <p className="text-sm italic" style={{ color: "var(--foreground-muted)" }}>
                              {habit.core_philosophy}
                            </p>
                          </div>
                        )}

                        {/* Actionable steps */}
                        {(habit.actionable_steps?.length ?? 0) > 0 && (
                          <div>
                            <p
                              className="text-xs font-semibold uppercase tracking-wider mb-2"
                              style={{ color: "var(--primary)" }}
                            >
                              Action Steps
                            </p>
                            <div className="space-y-2">
                              {habit.actionable_steps!.map((step, i) => (
                                <div key={i} className="flex gap-2">
                                  <span
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                                    style={{
                                      background: "var(--primary)",
                                      color: "white",
                                    }}
                                  >
                                    {i + 1}
                                  </span>
                                  <div>
                                    <p className="text-sm font-medium">{step.step}</p>
                                    <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                                      {step.description}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Weekly roadmap */}
                        <div>
                          <p
                            className="text-xs font-semibold uppercase tracking-wider mb-2"
                            style={{ color: "var(--primary)" }}
                          >
                            4-Week Roadmap
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {habit.weekly_roadmap!.map((week) => (
                              <div
                                key={week.week}
                                className="p-3 rounded-lg"
                                style={{
                                  background: "var(--background-secondary)",
                                  border: "1px solid var(--surface-border)",
                                }}
                              >
                                <p
                                  className="text-xs font-bold mb-0.5"
                                  style={{ color: "var(--accent)" }}
                                >
                                  Week {week.week}
                                </p>
                                <p className="text-xs font-medium">{week.focus}</p>
                                <p
                                  className="text-xs mt-0.5"
                                  style={{ color: "var(--foreground-muted)" }}
                                >
                                  {week.target}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Completion celebration */}
        {completionPercentage === 100 && (
          <div
            className="glass p-6 text-center mb-6 animate-bounce-in"
            style={{
              borderRadius: "var(--radius-xl)",
              border: "1px solid rgba(217, 119, 6, 0.3)",
              background:
                theme === "dark"
                  ? "rgba(217, 119, 6, 0.08)"
                  : "rgba(217, 119, 6, 0.04)",
            }}
          >
            <div className="flex justify-center gap-2 text-3xl mb-3 animate-float">
              🎉 🤲 ⭐
            </div>
            <h3 className="font-bold text-lg mb-1" style={{ color: "var(--success)" }}>
              MashaAllah! All done!
            </h3>
            <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>
              May Allah accept your efforts and make it easy for you.
            </p>
          </div>
        )}

        {/* Settings link */}
        <div className="text-center">
          <button
            onClick={() => router.push("/settings")}
            className="text-sm cursor-pointer underline"
            style={{ color: "var(--foreground-muted)" }}
          >
            Manage habits &amp; settings
          </button>
        </div>
      </div>

      {/* Reset/Taubah Modal */}
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="glass p-6 max-w-sm w-full animate-bounce-in"
            style={{ borderRadius: "var(--radius-xl)" }}
          >
            <div className="text-center">
              <div className="text-4xl mb-3">🤲</div>
              <h3 className="text-lg font-bold mb-2">Start Fresh</h3>
              <p className="text-sm mb-1" style={{ color: "var(--foreground-muted)" }}>
                Everyone stumbles. What matters is getting back up.
              </p>
              <p className="text-sm italic mb-6" style={{ color: "var(--accent)" }}>
                &ldquo;The best of sinners are those who repent.&rdquo;
                <span className="block text-xs opacity-70">— Sunan at-Tirmidhi</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button onClick={resetStreak} className="btn btn-primary flex-1">
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
