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

  // Get daily quote based on date
  const todayQuote = PROPHETIC_QUOTES[new Date().getDate() % PROPHETIC_QUOTES.length];

  // Get today's date in YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0];

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    setUserName(user.user_metadata?.full_name?.split(" ")[0] || "");

    // Load habits
    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (habitsData) setHabits(habitsData);

    // Load today's logs
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

    // Load streak
    const { data: streakData } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (streakData) setStreak(streakData);

    // Load Shawwal fasts count
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

  // Toggle habit completion
  const toggleHabit = async (habitId: string) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const isCompleted = todayLogs[habitId];

    // Optimistic update
    setTodayLogs((prev) => ({ ...prev, [habitId]: !isCompleted }));

    if (isCompleted) {
      // Uncomplete
      await supabase
        .from("habit_logs")
        .delete()
        .eq("habit_id", habitId)
        .eq("date", today);
    } else {
      // Complete
      await supabase.from("habit_logs").upsert({
        habit_id: habitId,
        user_id: user.id,
        date: today,
        completed: true,
      });
    }

    // Update streak after toggling
    await updateStreak(user.id);
  };

  // Toggle Shawwal fast
  const toggleShawwalFast = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: existing } = await supabase
      .from("shawwal_fasts")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    if (existing) {
      await supabase
        .from("shawwal_fasts")
        .delete()
        .eq("id", existing.id);
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

  // Update streak
  const updateStreak = async (userId: string) => {
    const supabase = createClient();

    // Check if all habits are completed today
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
        // Already completed today
        newStreak = streak.current_streak;
      } else if (streak.last_completed_date === yesterdayStr) {
        // Perfect streak
        newStreak = streak.current_streak + 1;
      } else if (streak.last_completed_date === twoDaysAgoStr) {
        // Missed exactly yesterday. Can we use a grace day?
        let canUseGrace = true;
        if (streak.last_grace_date) {
          const graceDate = new Date(streak.last_grace_date);
          const diffDays = Math.floor((new Date().getTime() - graceDate.getTime()) / (1000 * 3600 * 24));
          if (diffDays <= 7) {
            canUseGrace = false;
          }
        }

        if (canUseGrace) {
          // Grace day used! Streak survives.
          newStreak = streak.current_streak + 1; // Or +2 if we want to count the forgiven day, let's just +1
          newGraceDate = yesterdayStr; // Mark yesterday as the grace day
        } else {
          // Missed yesterday and grace not available. Streak breaks.
          newStreak = 1;
        }
      } else {
        // Missed more than 1 day. Streak breaks.
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

  // Reset streak (Taubah)
  const resetStreak = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
      prev ? { ...prev, current_streak: 0, last_completed_date: null, last_grace_date: null } : prev
    );
    setShowResetModal(false);
  };

  // Sign out
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const completedCount = Object.values(todayLogs).filter(Boolean).length;
  const completionPercentage = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  // Determine greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  // Milestone badges
  const getMilestones = (streakCount: number) => {
    const milestones = [];
    if (streakCount >= 3) milestones.push({ label: "3 Days", emoji: "⭐" });
    if (streakCount >= 7) milestones.push({ label: "1 Week", emoji: "🌟" });
    if (streakCount >= 14) milestones.push({ label: "2 Weeks", emoji: "💪" });
    if (streakCount >= 30) milestones.push({ label: "30 Days", emoji: "🏆" });
    if (streakCount >= 60) milestones.push({ label: "60 Days", emoji: "👑" });
    return milestones;
  };

  const shareMilestone = async () => {
    if (!streak) return;
    const url = `${window.location.origin}/api/og?name=${encodeURIComponent(userName || "Friend")}&streak=${streak.current_streak}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Post-Ramadan Legacy',
          text: `I've built a ${streak.current_streak}-day streak of my core habits post-Ramadan! Join me on Legacy.`,
          url: url,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      window.open(url, "_blank");
    }
  };

  if (loading) {
    return (
      <main
        className="min-h-dvh flex items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <div className="text-center animate-pulse-soft">
          <div className="text-4xl mb-4">🌙</div>
          <p style={{ color: "var(--foreground-muted)" }}>Loading your habits...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh pb-8">
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            theme === "dark"
              ? "radial-gradient(ellipse at 20% 0%, rgba(13, 148, 136, 0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(217, 119, 6, 0.06) 0%, transparent 50%)"
              : "radial-gradient(ellipse at 20% 0%, rgba(13, 148, 136, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(217, 119, 6, 0.04) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 max-w-lg mx-auto px-5 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">{greeting}, {userName || "friend"} 👋</h1>
            <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="glass glass-hover p-2.5 cursor-pointer"
              style={{ borderRadius: "var(--radius-full)" }}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              onClick={handleSignOut}
              className="glass glass-hover p-2.5 cursor-pointer text-sm"
              style={{ borderRadius: "var(--radius-full)" }}
              aria-label="Sign out"
            >
              👋
            </button>
          </div>
        </div>

        {/* Daily Quote */}
        <div
          className="glass p-4 mb-5 animate-fade-in"
          style={{ borderRadius: "var(--radius-lg)" }}
        >
          <p className="text-sm italic" style={{ color: "var(--foreground-muted)" }}>
            &ldquo;{todayQuote.text}&rdquo;
          </p>
          <p className="text-xs mt-1 opacity-60">{todayQuote.source}</p>
        </div>

        {/* Streak & Progress */}
        <div className="flex gap-3 mb-5">
          {/* Streak card */}
          <div
            className="glass flex-1 p-4 text-center relative"
            style={{ borderRadius: "var(--radius-lg)" }}
          >
            {/* Grace Shield Indicator */}
            {streak?.last_grace_date && (
              (() => {
                const diffDays = Math.floor((new Date().getTime() - new Date(streak.last_grace_date).getTime()) / (1000 * 3600 * 24));
                if (diffDays <= 7) {
                  return (
                    <div 
                      className="absolute top-2 right-2 text-xs flex items-center gap-1 bg-background px-2 py-0.5 rounded-full border shadow-sm animate-fade-in"
                      style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                      title="Grace day used this week. Your streak is protected!"
                    >
                      <span>🛡️</span> Grace
                    </div>
                  );
                }
                return null;
              })()
            )}

            <div className="text-3xl mb-1 animate-streak-fire">🔥</div>
            <div className="text-2xl font-bold">{streak?.current_streak || 0}</div>
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
                className="mt-3 text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1.5 rounded-full transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <span>📤</span> Share Milestone
              </button>
            )}

            {streak && streak.current_streak === 0 && (
              <button
                onClick={() => setShowResetModal(true)}
                className="mt-2 text-xs underline cursor-pointer"
                style={{ color: "var(--primary)" }}
              >
                Start Fresh
              </button>
            )}
          </div>

          {/* Today's progress */}
          <div
            className="glass flex-1 p-4 text-center"
            style={{ borderRadius: "var(--radius-lg)" }}
          >
            <div className="relative w-16 h-16 mx-auto mb-2">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="var(--surface-border)"
                  strokeWidth="4"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="4"
                  strokeDasharray={`${(completionPercentage / 100) * 175.93} 175.93`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {completionPercentage}%
              </div>
            </div>
            <div className="text-xs" style={{ color: "var(--foreground-muted)" }}>
              {completedCount}/{habits.length} today
            </div>
          </div>
        </div>

        {/* Shawwal Tracker */}
        <div
          className="glass p-4 mb-5"
          style={{
            borderRadius: "var(--radius-lg)",
            border: "1px solid rgba(217, 119, 6, 0.2)",
            background: theme === "dark" ? "rgba(217, 119, 6, 0.06)" : "rgba(217, 119, 6, 0.03)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌙</span>
              <div>
                <h3 className="text-sm font-semibold">Shawwal Fasting</h3>
                <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                  {shawwalDaysCompleted}/6 days complete
                </p>
              </div>
            </div>
            <button
              onClick={toggleShawwalFast}
              className="btn text-xs px-3 py-1.5 cursor-pointer"
              style={{
                background:
                  shawwalDaysCompleted < 6 ? "var(--accent)" : "var(--success)",
                color: "white",
                borderRadius: "var(--radius-full)",
              }}
            >
              {shawwalDaysCompleted >= 6 ? "Complete! ✓" : "Log Today"}
            </button>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((day) => (
              <div
                key={day}
                className="flex-1 h-2 rounded-full transition-all duration-300"
                style={{
                  background:
                    day <= shawwalDaysCompleted
                      ? "var(--accent)"
                      : "var(--surface-border)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Habits List */}
        <h2 className="text-lg font-semibold mb-3">Today&apos;s Habits</h2>
        <div className="space-y-3 mb-6">
          {habits.map((habit, index) => {
            const isCompleted = todayLogs[habit.id];
            return (
              <button
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                className="glass glass-hover w-full p-4 flex items-center gap-4 text-left cursor-pointer animate-slide-up transition-all duration-200"
                style={{
                  borderRadius: "var(--radius-lg)",
                  animationDelay: `${index * 60}ms`,
                  animationFillMode: "both",
                  border: isCompleted
                    ? "1px solid rgba(34, 197, 94, 0.3)"
                    : "1px solid var(--surface-border)",
                  background: isCompleted
                    ? theme === "dark"
                      ? "rgba(34, 197, 94, 0.08)"
                      : "rgba(34, 197, 94, 0.05)"
                    : undefined,
                }}
              >
                {/* Check circle */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                  style={{
                    background: isCompleted ? "var(--success)" : "transparent",
                    border: isCompleted
                      ? "2px solid var(--success)"
                      : "2px solid var(--foreground-muted)",
                  }}
                >
                  {isCompleted ? (
                    <span className="text-white animate-check">✓</span>
                  ) : (
                    <span className="text-lg">{habit.icon}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-medium transition-all duration-200"
                    style={{
                      textDecoration: isCompleted ? "line-through" : "none",
                      opacity: isCompleted ? 0.7 : 1,
                    }}
                  >
                    {habit.name}
                  </h3>
                  <p className="text-xs truncate" style={{ color: "var(--foreground-muted)" }}>
                    {habit.accepted_amount || habit.suggested_amount || ""}
                  </p>
                </div>

                {/* Status */}
                {isCompleted && (
                  <span className="text-xs font-medium animate-bounce-in" style={{ color: "var(--success)" }}>
                    Done!
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Completion celebration */}
        {completionPercentage === 100 && (
          <div
            className="glass p-6 text-center mb-6 animate-bounce-in"
            style={{
              borderRadius: "var(--radius-xl)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              background: theme === "dark"
                ? "rgba(34, 197, 94, 0.08)"
                : "rgba(34, 197, 94, 0.05)",
            }}
          >
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="font-bold text-lg mb-1" style={{ color: "var(--success)" }}>
              MashaAllah! All habits complete!
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
            Manage habits & settings
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
              <p
                className="text-sm italic mb-6"
                style={{ color: "var(--primary)" }}
              >
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
                <button
                  onClick={resetStreak}
                  className="btn btn-primary flex-1"
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
