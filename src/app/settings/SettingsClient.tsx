"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import type { Habit } from "@/lib/types";

const ICONS = ["📖", "🤲", "🕌", "📿", "💰", "🎓", "💪", "🧘", "📝", "✨"];

const sectionLabel: React.CSSProperties = {
  fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.18em",
  textTransform: "uppercase", color: "var(--accent)", marginBottom: "16px", display: "block",
};
const inputStyle: React.CSSProperties = {
  height: "44px", padding: "0 14px", fontSize: "0.9rem", outline: "none",
  background: "var(--background-secondary)", color: "var(--foreground)",
  border: "1.5px solid var(--surface-border)", borderRadius: "8px", width: "100%",
  boxSizing: "border-box",
};

export default function SettingsClient() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitIcon, setNewHabitIcon] = useState("📖");
  const [newHabitGoal, setNewHabitGoal] = useState("");

  const loadHabits = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    const { data } = await supabase.from("habits").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
    if (data) setHabits(data);
    setLoading(false);
  }, [router]);

  useEffect(() => { loadHabits(); }, [loadHabits]);

  const addHabit = async () => {
    if (!newHabitName.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("habits").insert({ user_id: user.id, name: newHabitName.trim(), icon: newHabitIcon, accepted_amount: newHabitGoal.trim() || null, is_active: true }).select().single();
    if (!error && data) { setHabits((p) => [...p, data]); setNewHabitName(""); setNewHabitIcon("📖"); setNewHabitGoal(""); }
  };

  const toggleHabitActive = async (habitId: string, isActive: boolean) => {
    const supabase = createClient();
    await supabase.from("habits").update({ is_active: !isActive }).eq("id", habitId);
    setHabits((p) => p.map((h) => h.id === habitId ? { ...h, is_active: !isActive } : h));
  };

  const deleteHabit = async (habitId: string) => {
    const supabase = createClient();
    await supabase.from("habits").delete().eq("id", habitId);
    setHabits((p) => p.filter((h) => h.id !== habitId));
  };

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    router.push("/");
  };

  const handleResetAccount = async () => {
    if (!confirm("Reset account? Deletes all habits, logs, and streaks. You'll go through onboarding again.")) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await Promise.all([
      supabase.from("habit_logs").delete().eq("user_id", user.id),
      supabase.from("shawwal_fasts").delete().eq("user_id", user.id),
      supabase.from("streaks").delete().eq("user_id", user.id),
      supabase.from("habits").delete().eq("user_id", user.id),
      supabase.from("halaqa_members").delete().eq("user_id", user.id),
    ]);
    router.push("/onboarding");
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <p style={{ color: "var(--foreground-muted)" }}>Loading settings...</p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100dvh", background: "var(--background)" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "32px 24px 100px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "40px" }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", padding: "8px 12px 8px 0", fontSize: "1.1rem" }}>←</button>
          <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 300, fontSize: "1.8rem", flex: 1, textAlign: "center", color: "var(--foreground)" }}>Settings</h1>
          <div style={{ width: "44px" }} />{/* spacer to center title */}
        </div>

        {/* Appearance */}
        <section style={{ marginBottom: "40px" }}>
          <span style={sectionLabel}>Appearance</span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0" }}>
            <span style={{ fontWeight: 500, fontSize: "1rem" }}>Dark Mode</span>
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              style={{ position: "relative", width: "48px", height: "28px", borderRadius: "999px", background: theme === "dark" ? "var(--accent)" : "var(--surface-border)", border: "none", cursor: "pointer", transition: "background 0.3s" }}
            >
              <span style={{ position: "absolute", top: "3px", width: "22px", height: "22px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.3s", left: theme === "dark" ? "calc(100% - 25px)" : "3px" }} />
            </button>
          </div>
        </section>

        {/* Your Habits */}
        <section style={{ marginBottom: "40px" }}>
          <span style={sectionLabel}>Your Habits</span>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
            {habits.map((habit) => (
              <div key={habit.id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 0", borderBottom: "1px solid var(--surface-border)", opacity: habit.is_active ? 1 : 0.5 }}>
                <span style={{ fontSize: "1.25rem", width: "32px", textAlign: "center" }}>{habit.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "2px" }}>{habit.name}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>Goal: {habit.accepted_amount || habit.suggested_amount || "—"}</p>
                </div>
                <button
                  onClick={() => toggleHabitActive(habit.id, habit.is_active)}
                  style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", padding: "4px 10px", borderRadius: "999px", cursor: "pointer", border: `1px solid ${habit.is_active ? "rgba(34,197,94,0.4)" : "var(--surface-border)"}`, background: habit.is_active ? "rgba(34,197,94,0.08)" : "transparent", color: habit.is_active ? "var(--success)" : "var(--foreground-muted)" }}
                >
                  {habit.is_active ? "ACTIVE" : "PAUSED"}
                </button>
                <button onClick={() => deleteHabit(habit.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: "1rem", padding: "4px", lineHeight: 1 }}>✕</button>
              </div>
            ))}
            {habits.length === 0 && <p style={{ color: "var(--foreground-muted)", fontSize: "0.9rem" }}>No habits yet.</p>}
          </div>

          {/* Add new habit */}
          <span style={sectionLabel}>Add New Habit</span>
          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
            <select
              value={newHabitIcon}
              onChange={(e) => setNewHabitIcon(e.target.value)}
              style={{ ...inputStyle, width: "72px", flex: "none", cursor: "pointer", fontSize: "1.1rem", textAlign: "center" }}
            >
              {ICONS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <input
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="e.g. Surah Mulk"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
          <input
            type="text"
            value={newHabitGoal}
            onChange={(e) => setNewHabitGoal(e.target.value)}
            placeholder="e.g. Daily at 10 PM"
            style={{ ...inputStyle, marginBottom: "14px" }}
          />
          <button
            onClick={addHabit}
            disabled={!newHabitName.trim()}
            style={{ width: "100%", height: "48px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase", cursor: !newHabitName.trim() ? "not-allowed" : "pointer", opacity: !newHabitName.trim() ? 0.45 : 1 }}
          >
            ADD HABIT
          </button>
        </section>

        {/* Account */}
        <section style={{ marginBottom: "40px" }}>
          <span style={sectionLabel}>Account</span>
          <button
            onClick={handleSignOut}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "16px", background: "var(--surface)", border: "1.5px solid var(--surface-border)", borderRadius: "10px", cursor: "pointer", marginBottom: "12px", color: "var(--foreground)" }}
          >
            <span style={{ fontSize: "1.1rem" }}>👋</span>
            <span style={{ fontWeight: 500 }}>Sign Out</span>
          </button>
          <button
            onClick={handleResetAccount}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "16px", background: "rgba(245,158,11,0.06)", border: "1.5px dashed rgba(245,158,11,0.4)", borderRadius: "10px", cursor: "pointer", color: "#F59E0B" }}
          >
            <span style={{ fontSize: "1.1rem" }}>⚠️</span>
            <span style={{ fontWeight: 500 }}>Reset Account (Dev)</span>
          </button>
        </section>

        <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--foreground-muted)", opacity: 0.5 }}>Legacy v1.0.0 · Built for the Ummah</p>
      </div>
    </main>
  );
}
