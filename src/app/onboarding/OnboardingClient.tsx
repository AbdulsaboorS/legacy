"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PRESET_HABITS, type PresetHabit } from "@/lib/types";
import { useTheme } from "@/components/ThemeProvider";

interface SelectedHabit extends PresetHabit {
  ramadanAmount: string;
  suggestedAmount?: string;
  motivation?: string;
  tip?: string;
  acceptedAmount?: string;
  isLoadingSuggestion?: boolean;
}

export default function OnboardingClient() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  
  // Step 1: Profile
  const [preferredName, setPreferredName] = useState("");
  const [gender, setGender] = useState<"Brother" | "Sister" | "">("");
  
  const [step, setStep] = useState(1);
  const [selectedHabits, setSelectedHabits] = useState<SelectedHabit[]>([]);
  const [customHabitName, setCustomHabitName] = useState("");
  const [customHabitIcon, setCustomHabitIcon] = useState("✨");
  const [includeShawwal, setIncludeShawwal] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);

  const totalSteps = 4;
  const MAX_HABITS = 3;

  // Toggle habit selection
  const toggleHabit = (habit: PresetHabit) => {
    setSelectedHabits((prev) => {
      const exists = prev.find((h) => h.name === habit.name);
      if (exists) {
        return prev.filter((h) => h.name !== habit.name);
      }
      
      // Enforce max 3 habits
      if (prev.length >= MAX_HABITS) {
        alert("To guarantee success, please focus on a maximum of 3 core habits for now. You can add more later!");
        return prev;
      }
      
      return [
        ...prev,
        {
          ...habit,
          ramadanAmount: habit.defaultRamadanAmount,
        },
      ];
    });
  };

  // Add custom habit
  const addCustomHabit = () => {
    if (!customHabitName.trim()) return;
    
    if (selectedHabits.length >= MAX_HABITS) {
      alert("To guarantee success, please focus on a maximum of 3 core habits for now. You can add more later!");
      return;
    }
    
    const customHabit: SelectedHabit = {
      name: customHabitName.trim(),
      icon: customHabitIcon,
      defaultRamadanAmount: "",
      category: "lifestyle",
      ramadanAmount: "",
    };
    setSelectedHabits((prev) => [...prev, customHabit]);
    setCustomHabitName("");
    setCustomHabitIcon("✨");
  };

  // Update Ramadan amount for a habit
  const updateRamadanAmount = (index: number, amount: string) => {
    setSelectedHabits((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ramadanAmount: amount };
      return updated;
    });
  };

  // Fetch AI suggestion for a habit
  const fetchSuggestion = async (index: number) => {
    const habit = selectedHabits[index];
    if (!habit.ramadanAmount) return;

    setSelectedHabits((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isLoadingSuggestion: true };
      return updated;
    });

    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habitName: habit.name,
          ramadanAmount: habit.ramadanAmount,
        }),
      });

      const data = await res.json();

      setSelectedHabits((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          suggestedAmount: data.suggestedAmount || "Start small and build up",
          motivation: data.motivation || "",
          tip: data.tip || "",
          acceptedAmount: data.suggestedAmount || "",
          isLoadingSuggestion: false,
        };
        return updated;
      });
    } catch {
      setSelectedHabits((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          suggestedAmount: "Start with a small, consistent amount",
          motivation: "Consistency is key in Islam.",
          tip: "Set a specific time each day for this habit.",
          acceptedAmount: "Start with a small, consistent amount",
          isLoadingSuggestion: false,
        };
        return updated;
      });
    }
  };

  // Fetch suggestions sequentially when entering step 3
  useEffect(() => {
    if (step === 3 && selectedHabits.length > 0) {
      const fetchNext = async () => {
        if (currentSuggestionIndex < selectedHabits.length) {
          const habit = selectedHabits[currentSuggestionIndex];
          if (!habit.suggestedAmount && !habit.isLoadingSuggestion) {
            await fetchSuggestion(currentSuggestionIndex);
            setCurrentSuggestionIndex((prev) => prev + 1);
          } else {
            setCurrentSuggestionIndex((prev) => prev + 1);
          }
        }
      };
      fetchNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, currentSuggestionIndex]);

  // Save habits to Supabase
  const saveHabits = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      // Create profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        preferred_name: preferredName,
        gender: gender as "Brother" | "Sister",
      });

      if (profileError) throw profileError;

      // Insert habits
      const habitsToInsert = selectedHabits.map((habit) => ({
        user_id: user.id,
        name: habit.name,
        icon: habit.icon,
        ramadan_amount: habit.ramadanAmount,
        suggested_amount: habit.suggestedAmount || null,
        accepted_amount: habit.acceptedAmount || habit.suggestedAmount || null,
        is_active: true,
      }));

      const { error: habitsError } = await supabase
        .from("habits")
        .insert(habitsToInsert);

      if (habitsError) throw habitsError;

      // Create streak tracking
      const { error: streakError } = await supabase.from("streaks").insert({
        user_id: user.id,
        current_streak: 0,
        longest_streak: 0,
        total_completions: 0,
      });

      if (streakError) throw streakError;

      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to save habits:", error);
      setIsSaving(false);
    }
  };

  return (
    <main className="relative min-h-dvh flex flex-col overflow-hidden">
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            theme === "dark"
              ? "radial-gradient(ellipse at 30% 20%, rgba(13, 148, 136, 0.12) 0%, transparent 60%)"
              : "radial-gradient(ellipse at 30% 20%, rgba(13, 148, 136, 0.08) 0%, transparent 60%)",
        }}
      />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 glass glass-hover p-3 cursor-pointer"
        style={{ borderRadius: "var(--radius-full)" }}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-40 h-1" style={{ background: "var(--background-secondary)" }}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${(step / totalSteps) * 100}%`,
            background: "linear-gradient(90deg, var(--primary), var(--accent))",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col max-w-lg mx-auto w-full px-6 pt-16 pb-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className="flex items-center gap-2"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300"
                style={{
                  background: s <= step ? "var(--primary)" : "var(--surface)",
                  color: s <= step ? "var(--primary-foreground)" : "var(--foreground-muted)",
                  border: s <= step ? "none" : "1px solid var(--surface-border)",
                }}
              >
                {s < step ? "✓" : s}
              </div>
              {s < 4 && (
                <div
                  className="w-8 h-0.5 transition-all duration-300"
                  style={{
                    background: s < step ? "var(--primary)" : "var(--surface-border)",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* ========== STEP 1: Profile Setup ========== */}
        {step === 1 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h2 className="text-2xl font-bold mb-2">Welcome to Legacy 🌙</h2>
            <p className="mb-6" style={{ color: "var(--foreground-muted)" }}>
              Let&apos;s personalize your experience.
            </p>

            <div className="space-y-6 mb-8">
              <div>
                <label className="text-sm font-medium mb-2 block">What should we call you?</label>
                <input
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="e.g., Bilal or Sarah"
                  className="w-full h-12 px-4 rounded-xl border-none text-base transition-shadow"
                  style={{
                    background: "var(--background-secondary)",
                    color: "var(--foreground)",
                    boxShadow: preferredName ? "0 0 0 2px var(--primary)" : "none",
                  }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Gender (for group matchmaking)</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setGender("Brother")}
                    className="h-12 rounded-xl font-medium transition-all"
                    style={{
                      background: gender === "Brother" ? "var(--primary)" : "var(--background-secondary)",
                      color: gender === "Brother" ? "var(--primary-foreground)" : "var(--foreground)",
                    }}
                  >
                    Brother
                  </button>
                  <button
                    onClick={() => setGender("Sister")}
                    className="h-12 rounded-xl font-medium transition-all"
                    style={{
                      background: gender === "Sister" ? "var(--primary)" : "var(--background-secondary)",
                      color: gender === "Sister" ? "var(--primary-foreground)" : "var(--foreground)",
                    }}
                  >
                    Sister
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--foreground-muted)" }}>
                  Required so we can place you in strictly gender-segregated accountability circles.
                </p>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-end">
              <button
                onClick={() => setStep(2)}
                className="btn btn-primary"
                disabled={!preferredName.trim() || !gender}
                style={{
                  opacity: (!preferredName.trim() || !gender) ? 0.5 : 1,
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ========== STEP 2: Select Habits ========== */}
        {step === 2 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h2 className="text-2xl font-bold mb-2">Build your Core 3</h2>
            <p className="mb-6" style={{ color: "var(--foreground-muted)" }}>
              Select a maximum of 3 habits to focus on. Less is more.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {PRESET_HABITS.map((habit) => {
                const isSelected = selectedHabits.some((h) => h.name === habit.name);
                return (
                  <button
                    key={habit.name}
                    onClick={() => toggleHabit(habit)}
                    className="glass glass-hover p-4 text-left cursor-pointer transition-all duration-200"
                    style={{
                      borderRadius: "var(--radius-md)",
                      border: isSelected
                        ? "2px solid var(--primary)"
                        : "1px solid var(--surface-border)",
                      background: isSelected
                        ? theme === "dark"
                          ? "rgba(13, 148, 136, 0.15)"
                          : "rgba(13, 148, 136, 0.08)"
                        : undefined,
                    }}
                  >
                    <span className="text-2xl block mb-1">{habit.icon}</span>
                    <span className="text-sm font-medium block leading-tight">
                      {habit.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom habit */}
            <div className="glass p-4 mb-6" style={{ borderRadius: "var(--radius-md)" }}>
              <p className="text-sm font-medium mb-3" style={{ color: "var(--foreground-muted)" }}>
                + Add a custom habit
              </p>
              <div className="flex gap-2">
                <select
                  value={customHabitIcon}
                  onChange={(e) => setCustomHabitIcon(e.target.value)}
                  className="w-12 h-10 text-center rounded-lg border-none cursor-pointer text-lg"
                  style={{
                    background: "var(--background-secondary)",
                    color: "var(--foreground)",
                  }}
                >
                  {["✨", "📚", "🤲", "💪", "🧘", "📝", "🎯", "❤️"].map((emoji) => (
                    <option key={emoji} value={emoji}>
                      {emoji}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={customHabitName}
                  onChange={(e) => setCustomHabitName(e.target.value)}
                  placeholder="e.g., Reading Islamic books"
                  className="flex-1 h-10 px-3 rounded-lg border-none text-sm"
                  style={{
                    background: "var(--background-secondary)",
                    color: "var(--foreground)",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && addCustomHabit()}
                />
                <button
                  onClick={addCustomHabit}
                  className="btn btn-primary h-10 px-4 text-sm"
                  disabled={!customHabitName.trim()}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Selected count + Next */}
            <div className="mt-auto flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="btn btn-secondary w-20"
              >
                ← Back
              </button>
              <div className="text-center flex-1 mx-4">
                <span className="text-sm font-medium" style={{ 
                  color: selectedHabits.length === MAX_HABITS ? "var(--primary)" : "var(--foreground-muted)" 
                }}>
                  {selectedHabits.length} / {MAX_HABITS} selected
                </span>
                <div className="h-1 w-full bg-slate-800 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300" 
                    style={{ width: `${(selectedHabits.length / MAX_HABITS) * 100}%` }}
                  />
                </div>
              </div>
              <button
                onClick={() => setStep(3)}
                className="btn btn-primary w-20"
                disabled={selectedHabits.length === 0}
                style={{
                  opacity: selectedHabits.length === 0 ? 0.5 : 1,
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ========== STEP 3: AI Step-Down Suggestions ========== */}
        {step === 3 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h2 className="text-2xl font-bold mb-2">Your graceful step-down plan</h2>
            <p className="mb-6" style={{ color: "var(--foreground-muted)" }}>
              AI-powered suggestions to make your habits sustainable.
            </p>

            <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-1" style={{ maxHeight: "calc(100dvh - 320px)" }}>
              {selectedHabits.map((habit, index) => (
                <div
                  key={habit.name}
                  className="glass p-5 animate-slide-up"
                  style={{
                    borderRadius: "var(--radius-lg)",
                    animationDelay: `${index * 100}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{habit.icon}</span>
                    <div>
                      <h3 className="font-semibold">{habit.name}</h3>
                      <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                        Ramadan: {habit.ramadanAmount || "Not specified"}
                      </p>
                    </div>
                  </div>

                  {/* Ramadan amount input */}
                  <div className="mb-3">
                    <label className="text-xs font-medium block mb-1" style={{ color: "var(--foreground-muted)" }}>
                      How much did you do in Ramadan?
                    </label>
                    <input
                      type="text"
                      value={habit.ramadanAmount}
                      onChange={(e) => updateRamadanAmount(index, e.target.value)}
                      placeholder="e.g., 1 Juz per day"
                      className="w-full h-9 px-3 rounded-lg border-none text-sm"
                      style={{
                        background: "var(--background-secondary)",
                        color: "var(--foreground)",
                      }}
                    />
                  </div>

                  {/* AI Suggestion */}
                  {habit.isLoadingSuggestion ? (
                    <div
                      className="p-3 rounded-lg flex items-center gap-2"
                      style={{ background: "var(--background-secondary)" }}
                    >
                      <div className="animate-pulse-soft">✨</div>
                      <span className="text-sm" style={{ color: "var(--foreground-muted)" }}>
                        AI is thinking...
                      </span>
                    </div>
                  ) : habit.suggestedAmount ? (
                    <div
                      className="p-3 rounded-lg"
                      style={{
                        background: theme === "dark" ? "rgba(13, 148, 136, 0.1)" : "rgba(13, 148, 136, 0.06)",
                        border: "1px solid rgba(13, 148, 136, 0.2)",
                      }}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-sm">💡</span>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--primary)" }}>
                            Suggested: {habit.suggestedAmount}
                          </p>
                          {habit.motivation && (
                            <p className="text-xs mt-1 italic" style={{ color: "var(--foreground-muted)" }}>
                              {habit.motivation}
                            </p>
                          )}
                          {habit.tip && (
                            <p className="text-xs mt-1" style={{ color: "var(--foreground-muted)" }}>
                              💪 {habit.tip}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Editable accepted amount */}
                      <div className="mt-3">
                        <label className="text-xs font-medium block mb-1" style={{ color: "var(--foreground-muted)" }}>
                          Your commitment:
                        </label>
                        <input
                          type="text"
                          value={habit.acceptedAmount || ""}
                          onChange={(e) => {
                            setSelectedHabits((prev) => {
                              const updated = [...prev];
                              updated[index] = { ...updated[index], acceptedAmount: e.target.value };
                              return updated;
                            });
                          }}
                          className="w-full h-9 px-3 rounded-lg border-none text-sm"
                          style={{
                            background: "var(--background)",
                            color: "var(--foreground)",
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fetchSuggestion(index)}
                      className="btn btn-secondary text-sm w-full"
                      disabled={!habit.ramadanAmount}
                    >
                      ✨ Get AI suggestion
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="btn btn-secondary"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="btn btn-primary"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ========== STEP 4: Review & Confirm ========== */}
        {step === 4 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h2 className="text-2xl font-bold mb-2">Your Post-Ramadan Plan</h2>
            <p className="mb-6" style={{ color: "var(--foreground-muted)" }}>
              Review your habits and launch your journey.
            </p>

            {/* Shawwal opt-in */}
            <button
              onClick={() => setIncludeShawwal(!includeShawwal)}
              className="glass glass-hover p-4 mb-6 w-full text-left cursor-pointer flex items-center gap-4"
              style={{
                borderRadius: "var(--radius-lg)",
                border: includeShawwal
                  ? "2px solid var(--accent)"
                  : "1px solid var(--surface-border)",
                background: includeShawwal
                  ? theme === "dark"
                    ? "rgba(217, 119, 6, 0.1)"
                    : "rgba(217, 119, 6, 0.06)"
                  : undefined,
              }}
            >
              <span className="text-3xl">🌙</span>
              <div className="flex-1">
                <h3 className="font-semibold">Shawwal 6-Day Fast Challenge</h3>
                <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                  Fast 6 days in Shawwal — it&apos;s like fasting the entire year!
                </p>
              </div>
              <div
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                style={{
                  borderColor: includeShawwal ? "var(--accent)" : "var(--foreground-muted)",
                  background: includeShawwal ? "var(--accent)" : "transparent",
                }}
              >
                {includeShawwal && <span className="text-white text-xs">✓</span>}
              </div>
            </button>

            {/* Habits summary */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-6" style={{ maxHeight: "calc(100dvh - 400px)" }}>
              {selectedHabits.map((habit, index) => (
                <div
                  key={habit.name}
                  className="glass p-4 flex items-center gap-3 animate-slide-up"
                  style={{
                    borderRadius: "var(--radius-md)",
                    animationDelay: `${index * 80}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <span className="text-xl">{habit.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{habit.name}</h4>
                    <p className="text-xs truncate" style={{ color: "var(--primary)" }}>
                      Goal: {habit.acceptedAmount || habit.suggestedAmount || "To be set"}
                    </p>
                  </div>
                  <span className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                    was: {habit.ramadanAmount}
                  </span>
                </div>
              ))}
            </div>

            {/* Motivational quote */}
            <div
              className="glass p-4 mb-6 text-center text-sm italic"
              style={{
                borderRadius: "var(--radius-md)",
                color: "var(--foreground-muted)",
              }}
            >
              &ldquo;Take up good deeds only as much as you are able, for the best deeds are those done regularly even if they are few.&rdquo;
              <span className="block mt-1 text-xs opacity-70">— Sunan Ibn Majah</span>
            </div>

            <div className="mt-auto flex items-center justify-between pt-6">
              <button
                onClick={() => setStep(3)}
                className="btn btn-secondary"
              >
                ← Back
              </button>
              <button
                onClick={saveHabits}
                className="btn btn-accent text-base px-8"
                disabled={isSaving}
                style={{ opacity: isSaving ? 0.7 : 1 }}
              >
                {isSaving ? "Saving..." : "Start My Legacy 🚀"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
