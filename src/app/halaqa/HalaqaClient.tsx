"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import type { Halaqa, Streak } from "@/lib/types";

// Extended member type with streak data
interface MemberWithStreak {
  user_id: string;
  preferred_name: string;
  completed_today: boolean;
  current_streak: number;
}

export default function HalaqaClient() {
  const router = useRouter();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [userGender, setUserGender] = useState<"Brother" | "Sister">("Brother");
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [myHalaqas, setMyHalaqas] = useState<Halaqa[]>([]);
  const [activeTab, setActiveTab] = useState<"lobby" | "mine">("mine");
  const [publicLobbies, setPublicLobbies] = useState<(Halaqa & { member_count: number })[]>([]);
  const [activeHalaqaId, setActiveHalaqaId] = useState<string | null>(null);
  
  // Grid data
  const [members, setMembers] = useState<MemberWithStreak[]>([]);
  const [creating, setCreating] = useState(false);
  const [savingAction, setSavingAction] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("gender")
      .eq("id", user.id)
      .single();

    if (profile) setUserGender(profile.gender as "Brother" | "Sister");

    // Check if logged today (for Reciprocal Gate)
    const { count } = await supabase
      .from("habit_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("date", today)
      .eq("completed", true);

    const loggedToday = (count || 0) > 0;
    setHasLoggedToday(loggedToday);

    // Load user's halaqas
    const { data: membershipData } = await supabase
      .from("halaqa_members")
      .select("halaqa_id")
      .eq("user_id", user.id);

    if (membershipData && membershipData.length > 0) {
      const ids = membershipData.map(m => m.halaqa_id);
      const { data: halaqasData } = await supabase
        .from("halaqas")
        .select("*")
        .in("id", ids);

      if (halaqasData) {
        setMyHalaqas(halaqasData);
        if (halaqasData.length > 0 && !activeHalaqaId) {
          setActiveHalaqaId(halaqasData[0].id);
        }
      }
    } else {
      setActiveTab("lobby"); // Force to lobby if they have none
    }

    // Load public lobbies matching gender
    if (profile) {
      const { data: lobbies } = await supabase
        .from("halaqas")
        .select("*, halaqa_members(count)")
        .eq("is_public", true)
        .eq("gender", profile.gender)
        .order("created_at", { ascending: false });

      if (lobbies) {
        // Parse the count
        const parsedLobbies = lobbies.map(l => ({
          ...l,
          member_count: l.halaqa_members[0].count,
        })).filter(l => l.member_count < l.max_members); 
        // Only show not full lobbies

        setPublicLobbies(parsedLobbies);
      }
    }

    setLoading(false);
  }, [router, today, activeHalaqaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load active Halaqa members when activeHalaqaId changes AND user has logged today
  useEffect(() => {
    if (!activeHalaqaId || !hasLoggedToday) return;

    const loadGridData = async () => {
      const supabase = createClient();
      
      // 1. Get all members of this halaqa
      const { data: memberRows } = await supabase
        .from("halaqa_members")
        .select("user_id")
        .eq("halaqa_id", activeHalaqaId);

      if (!memberRows) return;
      const userIds = memberRows.map(m => m.user_id);

      // 2. Get their profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, preferred_name")
        .in("id", userIds);

      // 3. Get their streaks
      const { data: streaks } = await supabase
        .from("streaks")
        .select("user_id, current_streak")
        .in("user_id", userIds);

      // 4. Check who checked in today
      const { data: logs } = await supabase
        .from("habit_logs")
        .select("user_id")
        .in("user_id", userIds)
        .eq("date", today)
        .eq("completed", true);

      // Compile data
      const logSet = new Set(logs?.map(l => l.user_id));
      const streakMap = new Map(streaks?.map(s => [s.user_id, s.current_streak]));

      const gridMembers: MemberWithStreak[] = (profiles || []).map(p => ({
        user_id: p.id,
        preferred_name: p.preferred_name,
        completed_today: logSet.has(p.id),
        current_streak: streakMap.get(p.id) || 0,
      }));

      // Sort: Completed today first, then highest streak
      gridMembers.sort((a, b) => {
        if (a.completed_today === b.completed_today) {
          return b.current_streak - a.current_streak;
        }
        return a.completed_today ? -1 : 1;
      });

      setMembers(gridMembers);
    };

    loadGridData();
  }, [activeHalaqaId, hasLoggedToday, today]);

  // Join a public lobby
  const joinLobby = async (halaqaId: string) => {
    setSavingAction(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from("halaqa_members").insert({
        halaqa_id: halaqaId,
        user_id: user.id
      });
      setActiveHalaqaId(halaqaId);
      setActiveTab("mine");
      await loadData();
    }
    setSavingAction(false);
  };

  // Create a new private group
  const createPrivateGroup = async () => {
    setCreating(true);
    const name = prompt("Enter a name for your private circle:");
    if (!name) {
      setCreating(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data: newHalaqa, error } = await supabase.from("halaqas").insert({
        name,
        created_by: user.id,
        invite_code: inviteCode,
        gender: userGender,
        is_public: false,
        max_members: 8
      }).select().single();

      if (newHalaqa && !error) {
        await supabase.from("halaqa_members").insert({
          halaqa_id: newHalaqa.id,
          user_id: user.id
        });
        
        setActiveHalaqaId(newHalaqa.id);
        setActiveTab("mine");
        await loadData();
        
        // Share via Navigator if possible
        const url = `${window.location.origin}/join/${inviteCode}`;
        if (navigator.share) {
          navigator.share({
            title: 'Join my Legacy Circle',
            text: `Hold me accountable post-Ramadan. Join my circle: ${name}`,
            url: url,
          }).catch(console.error);
        } else {
          prompt("Copy this link to invite friends:", url);
        }
      }
    }
    setCreating(false);
  };

  const sendReaction = async (receiverId: string, emoji: string) => {
    if (!activeHalaqaId) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && user.id !== receiverId) {
      // Optimistic visual feedback could go here
      await supabase.from("halaqa_reactions").insert({
        halaqa_id: activeHalaqaId,
        sender_id: user.id,
        receiver_id: receiverId,
        emoji,
        date: today
      });
      
      // Flash a toast or animation
      alert(`Sent ${emoji} nudge!`); // Replace with toast later
    }
  };

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center relative">
        <div className="text-center animate-pulse-soft">
          <div className="text-4xl mb-4">👥</div>
          <p style={{ color: "var(--foreground-muted)" }}>Loading circles...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh pb-24">
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

      <div className="relative z-10 max-w-lg mx-auto px-5 pt-6 sm:pt-24">
        {/* Header Tabs */}
        <div className="flex bg-background/50 rounded-xl p-1 mb-6 border" style={{ borderColor: 'var(--surface-border)' }}>
          <button 
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
            style={{ 
              background: activeTab === "mine" ? 'var(--surface)' : 'transparent',
              color: activeTab === "mine" ? 'var(--foreground)' : 'var(--foreground-muted)',
              boxShadow: activeTab === "mine" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
            onClick={() => setActiveTab("mine")}
          >
            My Circles
          </button>
          <button 
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
            style={{ 
              background: activeTab === "lobby" ? 'var(--surface)' : 'transparent',
              color: activeTab === "lobby" ? 'var(--foreground)' : 'var(--foreground-muted)',
              boxShadow: activeTab === "lobby" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
            onClick={() => setActiveTab("lobby")}
          >
            Find a Circle
          </button>
        </div>

        {activeTab === "lobby" && (
          <div className="animate-fade-in">
            <button 
              onClick={createPrivateGroup}
              disabled={creating}
              className="w-full glass glass-hover p-4 mb-6 text-center cursor-pointer border-dashed"
              style={{ borderRadius: "var(--radius-lg)", border: "2px dashed var(--primary)" }}
            >
              <span className="text-2xl mb-1 block">🤝</span>
              <span className="font-semibold block" style={{ color: "var(--primary)" }}>
                {creating ? "Creating..." : "Create Private Circle"}
              </span>
              <span className="text-xs mt-1 block" style={{ color: "var(--foreground-muted)" }}>
                Get an invite link to send to your friends.
              </span>
            </button>

            <h3 className="font-semibold mb-3">Public Lobbies ({userGender}s)</h3>
            <div className="space-y-3">
              {publicLobbies.length === 0 ? (
                <div className="text-center p-6 glass text-sm" style={{ color: "var(--foreground-muted)", borderRadius: "var(--radius-md)" }}>
                  No open public lobbies right now. Create a circle to get started!
                </div>
              ) : (
                publicLobbies.map(lobby => (
                  <div key={lobby.id} className="glass p-4 flex items-center justify-between" style={{ borderRadius: "var(--radius-md)" }}>
                    <div>
                      <h4 className="font-semibold text-sm">{lobby.name}</h4>
                      <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                        {lobby.member_count} / {lobby.max_members} members
                      </p>
                    </div>
                    <button 
                      onClick={() => joinLobby(lobby.id)}
                      disabled={savingAction}
                      className="btn btn-primary text-xs px-4 py-2"
                    >
                      Join
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "mine" && myHalaqas.length === 0 && (
          <div className="text-center p-8 animate-fade-in">
            <div className="text-5xl mb-4 opacity-50">👀</div>
            <h3 className="font-bold mb-2">You aren't in a circle yet</h3>
            <p className="text-sm mb-6 pb-2" style={{ color: "var(--foreground-muted)" }}>
              Data shows you're 70% more likely to keep your habits if you have an accountability squad.
            </p>
            <button 
              onClick={() => setActiveTab("lobby")}
              className="btn btn-primary w-full"
            >
              Find a Circle
            </button>
          </div>
        )}

        {activeTab === "mine" && myHalaqas.length > 0 && (
          <div className="animate-fade-in">
            {/* Horizontal Scroll for multiple groups */}
            {myHalaqas.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-4 mb-2 hidescrollbar">
                {myHalaqas.map(hq => (
                  <button
                    key={hq.id}
                    onClick={() => setActiveHalaqaId(hq.id)}
                    className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all shrink-0"
                    style={{
                      background: activeHalaqaId === hq.id ? "var(--primary)" : "var(--surface)",
                      color: activeHalaqaId === hq.id ? "var(--primary-foreground)" : "var(--foreground)",
                      border: activeHalaqaId === hq.id ? "none" : "1px solid var(--surface-border)"
                    }}
                  >
                    {hq.name}
                  </button>
                ))}
              </div>
            )}

            {/* Reciprocal Gate */}
            {!hasLoggedToday ? (
              <div className="glass p-8 text-center mt-4 animate-bounce-in" style={{ borderRadius: "var(--radius-xl)" }}>
                <div className="text-5xl mb-4">🔒</div>
                <h2 className="font-bold text-lg mb-2">Log Habits to Unlock</h2>
                <p className="text-sm mb-6" style={{ color: "var(--foreground-muted)" }}>
                  You must log your own habits today before you can see your circle's progress. 
                  Muraqabah starts with yourself.
                </p>
                <button 
                  onClick={() => router.push("/dashboard")}
                  className="btn btn-primary w-full shadow-lg"
                >
                  Go to Home
                </button>
              </div>
            ) : (
              /* Halaqa Grid */
              <div className="space-y-4 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{myHalaqas.find(h => h.id === activeHalaqaId)?.name}</h3>
                  <button 
                    onClick={() => {
                      const code = myHalaqas.find(h => h.id === activeHalaqaId)?.invite_code;
                      const url = `${window.location.origin}/join/${code}`;
                      if (navigator.share) {
                        navigator.share({ title: 'Join my Legacy Circle', url });
                      } else {
                        prompt("Copy invite link:", url);
                      }
                    }}
                    className="text-xs bg-surface border px-3 py-1.5 rounded-full"
                    style={{ borderColor: "var(--surface-border)" }}
                  >
                    Invite Link
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {members.map((member, i) => (
                    <div 
                      key={member.user_id} 
                      className="glass p-4 flex items-center gap-4 animate-slide-up"
                      style={{ 
                        borderRadius: "var(--radius-lg)",
                        animationDelay: `${i * 50}ms`,
                        border: member.completed_today ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid var(--surface-border)"
                      }}
                    >
                      {/* Status Icon */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
                        style={{
                          background: member.completed_today ? "var(--success)" : "var(--surface)",
                          color: member.completed_today ? "white" : "var(--foreground-muted)",
                        }}
                      >
                        {member.completed_today ? "✓" : "○"}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{member.preferred_name}</h4>
                        <div className="flex items-center gap-1 text-xs" style={{ color: "var(--foreground-muted)" }}>
                          <span className="text-orange-500">🔥</span> {member.current_streak} days
                        </div>
                      </div>

                      {/* Reaction Nudges */}
                      <div className="flex gap-1 shrink-0">
                        {["🤲", "💪", "🔥"].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => sendReaction(member.user_id, emoji)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm glass-hover"
                            style={{ background: "var(--background-secondary)" }}
                            title={`Send ${emoji} nudge`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
