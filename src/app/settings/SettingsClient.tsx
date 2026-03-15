"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import type { Habit } from "@/lib/types";

export default function SettingsClient() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitIcon, setNewHabitIcon] = useState("✨");
  const [newHabitGoal, setNewHabitGoal] = useState("");

  const loadHabits = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    const { data } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (data) setHabits(data);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  const addHabit = async () => {
    if (!newHabitName.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("habits")
      .insert({
        user_id: user.id,
        name: newHabitName.trim(),
        icon: newHabitIcon,
        accepted_amount: newHabitGoal.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (!error && data) {
      setHabits((prev) => [...prev, data]);
      setNewHabitName("");
      setNewHabitIcon("✨");
      setNewHabitGoal("");
    }
  };

  const toggleHabitActive = async (habitId: string, isActive: boolean) => {
    const supabase = createClient();
    await supabase
      .from("habits")
      .update({ is_active: !isActive })
      .eq("id", habitId);
    setHabits((prev) =>
      prev.map((h) => (h.id === habitId ? { ...h, is_active: !isActive } : h))
    );
  };

  const deleteHabit = async (habitId: string) => {
    const supabase = createClient();
    await supabase.from("habits").delete().eq("id", habitId);
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <main
        className="min-h-dvh flex items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <div className="text-center animate-pulse-soft">
          <div className="text-3xl mb-3 animate-float">⚙️</div>
          <p style={{ color: "var(--foreground-muted)" }}>Loading settings...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh pb-8">
      <div className="relative z-10 max-w-lg mx-auto px-5 pt-6 sm:pt-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl">Settings</h1>
          <p className="text-sm mt-1" style={{ color: "var(--foreground-muted)" }}>
            Manage your habits and preferences.
          </p>
        </div>

        {/* Appearance */}
        <section className="mb-8">
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--foreground-muted)" }}
          >
            Appearance
          </h2>

          {/* Visual pill toggle */}
          <div
            className="glass p-4 flex items-center justify-between"
            style={{ borderRadius: "var(--radius-lg)" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{theme === "dark" ? "🌙" : "☀️"}</span>
              <span className="font-medium">
                {theme === "dark" ? "Dark Mode" : "Light Mode"}
              </span>
            </div>
            <button
              onClick={toggleTheme}
              className="relative h-7 w-12 rounded-full transition-all duration-300 cursor-pointer"
              style={{
                background:
                  theme === "dark" ? "var(--accent)" : "var(--surface-border)",
              }}
              aria-label="Toggle theme"
            >
              <span
                className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all duration-300"
                style={{
                  left: theme === "dark" ? "calc(100% - 26px)" : "2px",
                }}
              />
            </button>
          </div>
        </section>

        {/* Your Habits */}
        <section className="mb-8">
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--foreground-muted)" }}
          >
            Your Habits
          </h2>

          <div className="space-y-2 mb-4">
            {habits.map((habit) => (
              <div
                key={habit.id}
                className="glass p-4 flex items-center gap-3 transition-opacity"
                style={{
                  borderRadius: "var(--radius-md)",
                  opacity: habit.is_active ? 1 : 0.5,
                }}
              >
                <span className="text-xl">{habit.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{habit.name}</p>
                  <p
                    className="text-xs truncate"
                    style={{ color: "var(--foreground-muted)" }}
                  >
                    {habit.accepted_amount || habit.suggested_amount || "No goal set"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleHabitActive(habit.id, habit.is_active)}
                    className="text-xs px-2.5 py-1 rounded-full cursor-pointer transition-all font-medium"
                    style={{
                      background: habit.is_active
                        ? "rgba(34, 197, 94, 0.15)"
                        : "var(--surface-border)",
                      color: habit.is_active ? "var(--success)" : "var(--foreground-muted)",
                      border: habit.is_active
                        ? "1px solid rgba(34, 197, 94, 0.3)"
                        : "1px solid transparent",
                    }}
                  >
                    {habit.is_active ? "Active" : "Paused"}
                  </button>
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    className="text-xs w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all"
                    style={{
                      background: "rgba(239, 68, 68, 0.08)",
                      color: "#EF4444",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add new habit */}
          <div className="glass p-4" style={{ borderRadius: "var(--radius-md)" }}>
            <p className="text-sm font-medium mb-3">Add New Habit</p>
            <div className="flex gap-2 mb-2">
              <select
                value={newHabitIcon}
                onChange={(e) => setNewHabitIcon(e.target.value)}
                className="w-12 h-10 text-center rounded-lg border-none cursor-pointer text-lg"
                style={{
                  background: "var(--background-secondary)",
                  color: "var(--foreground)",
                }}
              >
                {["✨", "📖", "🤲", "🕌", "📿", "💰", "🎓", "💪", "🧘", "📝"].map(
                  (emoji) => (
                    <option key={emoji} value={emoji}>
                      {emoji}
                    </option>
                  )
                )}
              </select>
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="Habit name"
                className="flex-1 h-10 px-3 rounded-lg border-none text-sm outline-none"
                style={{
                  background: "var(--background-secondary)",
                  color: "var(--foreground)",
                }}
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newHabitGoal}
                onChange={(e) => setNewHabitGoal(e.target.value)}
                placeholder="Goal (e.g., 2 pages daily)"
                className="flex-1 h-10 px-3 rounded-lg border-none text-sm outline-none"
                style={{
                  background: "var(--background-secondary)",
                  color: "var(--foreground)",
                }}
              />
              <button
                onClick={addHabit}
                className="btn btn-primary h-10 px-4 text-sm"
                disabled={!newHabitName.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="mb-10">
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--foreground-muted)" }}
          >
            Account
          </h2>
          <button
            onClick={handleSignOut}
            className="glass glass-hover w-full p-4 flex items-center gap-3 cursor-pointer transition-all mb-3"
            style={{
              borderRadius: "var(--radius-lg)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#EF4444",
            }}
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
              style={{ background: "rgba(239, 68, 68, 0.1)" }}
            >
              👋
            </span>
            <span className="font-medium">Sign Out</span>
          </button>

          <button
            onClick={async () => {
              if (!confirm("DEV MODE: Are you sure you want to nuke your DB rows? This will delete all your habits, streaks, and circles so you can test Onboarding again.")) return;
              const supabase = createClient();
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;
              
              await Promise.all([
                supabase.from("habits").delete().eq("user_id", user.id),
                supabase.from("streaks").delete().eq("user_id", user.id),
                supabase.from("halaqa_members").delete().eq("user_id", user.id)
              ]);
              
              router.push("/onboarding");
            }}
            className="glass w-full p-4 flex items-center gap-3 cursor-pointer transition-all"
            style={{
              borderRadius: "var(--radius-lg)",
              border: "1px dashed rgba(245, 158, 11, 0.4)",
              color: "#F59E0B",
              background: "rgba(245, 158, 11, 0.05)",
            }}
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
              style={{ background: "rgba(245, 158, 11, 0.1)" }}
            >
              ⚠️
            </span>
            <span className="font-medium">Reset Account (Dev Mode)</span>
          </button>
        </section>

        {/* Footer */}
        <div
          className="text-center text-xs space-y-1"
          style={{ color: "var(--foreground-muted)", opacity: 0.55 }}
        >
          <p>Built with ❤️ for the Ummah</p>
          <p>Legacy v1.0.0</p>
        </div>
      </div>
    </main>
  );
}
