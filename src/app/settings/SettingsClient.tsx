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
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
        <div className="animate-pulse-soft">Loading...</div>
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
              ? "radial-gradient(ellipse at 50% 0%, rgba(13, 148, 136, 0.1) 0%, transparent 50%)"
              : "radial-gradient(ellipse at 50% 0%, rgba(13, 148, 136, 0.06) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 max-w-lg mx-auto px-5 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="glass glass-hover p-2.5 cursor-pointer"
            style={{ borderRadius: "var(--radius-full)" }}
          >
            ←
          </button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>

        {/* Theme */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--foreground-muted)" }}>
            Appearance
          </h2>
          <button
            onClick={toggleTheme}
            className="glass glass-hover w-full p-4 flex items-center justify-between cursor-pointer"
            style={{ borderRadius: "var(--radius-lg)" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{theme === "dark" ? "🌙" : "☀️"}</span>
              <span className="font-medium">
                {theme === "dark" ? "Dark Mode" : "Light Mode"}
              </span>
            </div>
            <span className="text-sm" style={{ color: "var(--foreground-muted)" }}>
              Tap to switch
            </span>
          </button>
        </section>

        {/* Manage Habits */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--foreground-muted)" }}>
            Your Habits
          </h2>

          <div className="space-y-3 mb-4">
            {habits.map((habit) => (
              <div
                key={habit.id}
                className="glass p-4 flex items-center gap-3"
                style={{
                  borderRadius: "var(--radius-md)",
                  opacity: habit.is_active ? 1 : 0.5,
                }}
              >
                <span className="text-xl">{habit.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{habit.name}</p>
                  <p className="text-xs truncate" style={{ color: "var(--foreground-muted)" }}>
                    {habit.accepted_amount || habit.suggested_amount || "No goal set"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleHabitActive(habit.id, habit.is_active)}
                    className="text-xs px-2 py-1 rounded-full cursor-pointer"
                    style={{
                      background: habit.is_active ? "var(--success)" : "var(--surface-border)",
                      color: habit.is_active ? "white" : "var(--foreground-muted)",
                    }}
                  >
                    {habit.is_active ? "Active" : "Paused"}
                  </button>
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    className="text-xs px-2 py-1 rounded-full cursor-pointer"
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
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
                className="flex-1 h-10 px-3 rounded-lg border-none text-sm"
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
                className="flex-1 h-10 px-3 rounded-lg border-none text-sm"
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
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--foreground-muted)" }}>
            Account
          </h2>
          <button
            onClick={handleSignOut}
            className="glass glass-hover w-full p-4 flex items-center gap-3 cursor-pointer"
            style={{ borderRadius: "var(--radius-lg)" }}
          >
            <span className="text-xl">👋</span>
            <span className="font-medium">Sign Out</span>
          </button>
        </section>

        {/* App info */}
        <div className="text-center text-xs" style={{ color: "var(--foreground-muted)", opacity: 0.5 }}>
          <p>Legacy v1.0.0</p>
          <p>Built with ❤️ for the Ummah</p>
        </div>
      </div>
    </main>
  );
}
