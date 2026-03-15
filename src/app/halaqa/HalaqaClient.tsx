"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/Toast";
import type { Halaqa } from "@/lib/types";

interface MemberWithStreak {
  user_id: string;
  preferred_name: string;
  completed_today: boolean;
  current_streak: number;
}

export default function HalaqaClient() {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [userGender, setUserGender] = useState<"Brother" | "Sister">("Brother");
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [myHalaqas, setMyHalaqas] = useState<Halaqa[]>([]);
  const [activeTab, setActiveTab] = useState<"lobby" | "mine">("mine");
  const [publicLobbies, setPublicLobbies] = useState<(Halaqa & { member_count: number })[]>([]);
  const [activeHalaqaId, setActiveHalaqaId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberWithStreak[]>([]);
  const [creating, setCreating] = useState(false);
  const [savingAction, setSavingAction] = useState(false);

  // Create circle modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");

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
      .select("gender")
      .eq("id", user.id)
      .single();

    if (profile) setUserGender(profile.gender as "Brother" | "Sister");

    const { count } = await supabase
      .from("habit_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("date", today)
      .eq("completed", true);

    setHasLoggedToday((count || 0) > 0);

    const { data: membershipData } = await supabase
      .from("halaqa_members")
      .select("halaqa_id")
      .eq("user_id", user.id);

    if (membershipData && membershipData.length > 0) {
      const ids = membershipData.map((m) => m.halaqa_id);
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
      setActiveTab("lobby");
    }

    if (profile) {
      const { data: lobbies } = await supabase
        .from("halaqas")
        .select("*, halaqa_members(count)")
        .eq("is_public", true)
        .eq("gender", profile.gender)
        .order("created_at", { ascending: false });

      if (lobbies) {
        const parsedLobbies = lobbies
          .map((l) => ({ ...l, member_count: l.halaqa_members[0].count }))
          .filter((l) => l.member_count < l.max_members);
        setPublicLobbies(parsedLobbies);
      }
    }

    setLoading(false);
  }, [router, today, activeHalaqaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!activeHalaqaId || !hasLoggedToday) return;

    const loadGridData = async () => {
      const supabase = createClient();

      const { data: memberRows } = await supabase
        .from("halaqa_members")
        .select("user_id")
        .eq("halaqa_id", activeHalaqaId);

      if (!memberRows) return;
      const userIds = memberRows.map((m) => m.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, preferred_name")
        .in("id", userIds);

      const { data: streaks } = await supabase
        .from("streaks")
        .select("user_id, current_streak")
        .in("user_id", userIds);

      const { data: logs } = await supabase
        .from("habit_logs")
        .select("user_id")
        .in("user_id", userIds)
        .eq("date", today)
        .eq("completed", true);

      const logSet = new Set(logs?.map((l) => l.user_id));
      const streakMap = new Map(streaks?.map((s) => [s.user_id, s.current_streak]));

      const gridMembers: MemberWithStreak[] = (profiles || []).map((p) => ({
        user_id: p.id,
        preferred_name: p.preferred_name,
        completed_today: logSet.has(p.id),
        current_streak: streakMap.get(p.id) || 0,
      }));

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

  const joinLobby = async (halaqaId: string) => {
    setSavingAction(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("halaqa_members").insert({
        halaqa_id: halaqaId,
        user_id: user.id,
      });
      setActiveHalaqaId(halaqaId);
      setActiveTab("mine");
      await loadData();
      toast.success("Joined! Welcome to the circle 🤝");
    }
    setSavingAction(false);
  };

  const createPrivateGroup = async () => {
    if (!newCircleName.trim()) return;
    setCreating(true);
    setShowCreateModal(false);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: newHalaqa, error } = await supabase
        .from("halaqas")
        .insert({
          name: newCircleName.trim(),
          created_by: user.id,
          invite_code: inviteCode,
          gender: userGender,
          is_public: false,
          max_members: 8,
        })
        .select()
        .single();

      if (newHalaqa && !error) {
        await supabase.from("halaqa_members").insert({
          halaqa_id: newHalaqa.id,
          user_id: user.id,
        });

        setActiveHalaqaId(newHalaqa.id);
        setActiveTab("mine");
        await loadData();

        // Share invite link via clipboard or native share
        const url = `${window.location.origin}/join/${inviteCode}`;
        if (navigator.share) {
          navigator
            .share({
              title: "Join my Legacy Circle",
              text: `Hold me accountable post-Ramadan. Join my circle: ${newCircleName.trim()}`,
              url,
            })
            .catch(console.error);
        } else {
          try {
            await navigator.clipboard.writeText(url);
            toast.copied("Invite link copied to clipboard!");
          } catch {
            toast.info(`Invite code: ${inviteCode}`);
          }
        }
      }
    }

    setNewCircleName("");
    setCreating(false);
  };

  const sendReaction = async (receiverId: string, emoji: string) => {
    if (!activeHalaqaId) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user && user.id !== receiverId) {
      await supabase.from("halaqa_reactions").insert({
        halaqa_id: activeHalaqaId,
        sender_id: user.id,
        receiver_id: receiverId,
        emoji,
        date: today,
      });
      toast.success(`MashaAllah! ${emoji} sent!`);
    }
  };

  const copyInviteLink = async (halaqaId: string) => {
    const code = myHalaqas.find((h) => h.id === halaqaId)?.invite_code;
    const url = `${window.location.origin}/join/${code}`;
    if (navigator.share) {
      navigator.share({ title: "Join my Legacy Circle", url }).catch(console.error);
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.copied("Invite link copied!");
      } catch {
        toast.info(`Invite code: ${code}`);
      }
    }
  };

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center relative">
        <div className="text-center animate-pulse-soft">
          <div className="text-4xl mb-4 animate-float">👥</div>
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
              ? "radial-gradient(ellipse at 50% 0%, rgba(76, 175, 130, 0.08) 0%, transparent 50%)"
              : "radial-gradient(ellipse at 50% 0%, rgba(27, 94, 69, 0.05) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 max-w-lg mx-auto px-5 pt-6 sm:pt-24">
        {/* Tab switcher */}
        <div
          className="flex rounded-xl p-1 mb-6 border"
          style={{
            background: "var(--background-secondary)",
            borderColor: "var(--surface-border)",
          }}
        >
          <button
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
            style={{
              background: activeTab === "mine" ? "var(--surface)" : "transparent",
              color:
                activeTab === "mine" ? "var(--foreground)" : "var(--foreground-muted)",
              boxShadow:
                activeTab === "mine" ? "var(--shadow-sm)" : "none",
            }}
            onClick={() => setActiveTab("mine")}
          >
            My Circles
          </button>
          <button
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
            style={{
              background: activeTab === "lobby" ? "var(--surface)" : "transparent",
              color:
                activeTab === "lobby" ? "var(--foreground)" : "var(--foreground-muted)",
              boxShadow:
                activeTab === "lobby" ? "var(--shadow-sm)" : "none",
            }}
            onClick={() => setActiveTab("lobby")}
          >
            Find a Circle
          </button>
        </div>

        {/* ===== LOBBY TAB ===== */}
        {activeTab === "lobby" && (
          <div className="animate-fade-in">
            {/* Create private circle card */}
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={creating}
              className="w-full glass glass-hover p-5 mb-6 text-center cursor-pointer"
              style={{
                borderRadius: "var(--radius-lg)",
                border: "2px dashed rgba(201, 150, 58, 0.5)",
              }}
            >
              <span className="text-2xl mb-2 block">🤝</span>
              <span
                className="font-semibold block mb-1"
                style={{ color: "var(--accent)" }}
              >
                {creating ? "Creating..." : "Create Private Circle"}
              </span>
              <span
                className="text-xs block"
                style={{ color: "var(--foreground-muted)" }}
              >
                Invite your friends with a private link.
              </span>
            </button>

            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider" style={{ color: "var(--foreground-muted)" }}>
              Public Lobbies ({userGender}s)
            </h3>
            <div className="space-y-3">
              {publicLobbies.length === 0 ? (
                <div
                  className="text-center p-6 glass text-sm"
                  style={{
                    color: "var(--foreground-muted)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  No open public lobbies right now. Create a circle to get started!
                </div>
              ) : (
                publicLobbies.map((lobby) => (
                  <div
                    key={lobby.id}
                    className="glass p-4 flex items-center justify-between"
                    style={{ borderRadius: "var(--radius-md)" }}
                  >
                    <div>
                      <h4 className="font-semibold text-sm">{lobby.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{
                            width: "80px",
                            background: "var(--surface-border)",
                          }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(lobby.member_count / lobby.max_members) * 100}%`,
                              background: "var(--primary)",
                            }}
                          />
                        </div>
                        <span
                          className="text-xs"
                          style={{ color: "var(--foreground-muted)" }}
                        >
                          {lobby.member_count}/{lobby.max_members}
                        </span>
                      </div>
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

        {/* ===== MY CIRCLES TAB — empty state ===== */}
        {activeTab === "mine" && myHalaqas.length === 0 && (
          <div className="text-center p-8 animate-fade-in">
            <div className="text-5xl mb-4 animate-float">🕌</div>
            <h3 className="font-bold mb-2 text-lg">Join your first circle</h3>
            <p
              className="text-sm mb-6"
              style={{ color: "var(--foreground-muted)" }}
            >
              Studies show you&apos;re 70% more likely to keep your habits with
              an accountability squad.
            </p>
            <button
              onClick={() => setActiveTab("lobby")}
              className="btn btn-primary w-full"
            >
              Find or Create a Circle
            </button>
          </div>
        )}

        {/* ===== MY CIRCLES TAB — with circles ===== */}
        {activeTab === "mine" && myHalaqas.length > 0 && (
          <div className="animate-fade-in">
            {/* Multi-halaqa pill switcher */}
            {myHalaqas.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-4 mb-2 hidescrollbar">
                {myHalaqas.map((hq) => (
                  <button
                    key={hq.id}
                    onClick={() => setActiveHalaqaId(hq.id)}
                    className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all shrink-0"
                    style={{
                      background:
                        activeHalaqaId === hq.id
                          ? "var(--gradient-primary)"
                          : "var(--surface)",
                      color:
                        activeHalaqaId === hq.id
                          ? "var(--primary-foreground)"
                          : "var(--foreground)",
                      border:
                        activeHalaqaId === hq.id
                          ? "none"
                          : "1px solid var(--surface-border)",
                    }}
                  >
                    {hq.name}
                  </button>
                ))}
              </div>
            )}

            {/* Reciprocal Gate */}
            {!hasLoggedToday ? (
              <div
                className="glass p-8 text-center mt-4 animate-bounce-in"
                style={{ borderRadius: "var(--radius-xl)" }}
              >
                <div className="text-5xl mb-4">🔒</div>
                <h2 className="font-bold text-lg mb-2">Complete your habits first</h2>
                <p
                  className="text-sm mb-2"
                  style={{ color: "var(--foreground-muted)" }}
                >
                  Muraqabah begins with yourself.
                </p>
                <p
                  className="text-sm italic mb-6"
                  style={{ color: "var(--primary)" }}
                >
                  Log your habits today, then witness your circle.
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="btn btn-primary w-full"
                >
                  Go to Today&apos;s Habits
                </button>
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                {/* Circle header */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">
                    {myHalaqas.find((h) => h.id === activeHalaqaId)?.name}
                  </h3>
                  <button
                    onClick={() => activeHalaqaId && copyInviteLink(activeHalaqaId)}
                    className="text-xs px-3 py-1.5 rounded-full transition-all"
                    style={{
                      background: "rgba(201, 150, 58, 0.12)",
                      border: "1px solid rgba(201, 150, 58, 0.3)",
                      color: "var(--accent)",
                    }}
                  >
                    📋 Invite Link
                  </button>
                </div>

                {/* Member cards */}
                <div className="grid grid-cols-1 gap-3">
                  {members.map((member, i) => (
                    <div
                      key={member.user_id}
                      className="glass p-4 flex items-center gap-4 animate-slide-up"
                      style={{
                        borderRadius: "var(--radius-lg)",
                        animationDelay: `${i * 50}ms`,
                        animationFillMode: "both",
                        border: member.completed_today
                          ? "1px solid rgba(34, 197, 94, 0.35)"
                          : "1px solid var(--surface-border)",
                      }}
                    >
                      {/* Avatar initial */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                        style={{
                          background: member.completed_today
                            ? "var(--success)"
                            : "var(--primary)",
                          color: "white",
                          opacity: member.completed_today ? 1 : 0.7,
                        }}
                      >
                        {member.preferred_name?.[0]?.toUpperCase() || "?"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{member.preferred_name}</h4>
                        <div
                          className="flex items-center gap-1.5 text-xs"
                          style={{ color: "var(--foreground-muted)" }}
                        >
                          <span>🔥</span>
                          <span>{member.current_streak} days</span>
                          {member.completed_today && (
                            <span
                              className="ml-1 font-semibold"
                              style={{ color: "var(--success)" }}
                            >
                              ✓ Done today
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reaction nudge buttons */}
                      <div className="flex gap-1.5 shrink-0">
                        {["🤲", "💪", "🔥"].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => sendReaction(member.user_id, emoji)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-transform hover:scale-110 active:scale-95"
                            style={{
                              background: "var(--background-secondary)",
                              border: "1px solid var(--surface-border)",
                            }}
                            title={`Send ${emoji}`}
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

      {/* Create Circle Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="glass w-full max-w-sm p-6 animate-slide-up"
            style={{ borderRadius: "var(--radius-xl)" }}
          >
            <h3 className="text-lg font-bold mb-1">Name your circle</h3>
            <p className="text-sm mb-4" style={{ color: "var(--foreground-muted)" }}>
              Choose a meaningful name for your accountability group.
            </p>
            <input
              type="text"
              value={newCircleName}
              onChange={(e) => setNewCircleName(e.target.value)}
              placeholder="e.g., Dawn Brothers, Al-Fajr Sisters..."
              className="w-full h-12 px-4 rounded-xl border-none text-base mb-4 outline-none"
              style={{
                background: "var(--background-secondary)",
                color: "var(--foreground)",
                boxShadow: newCircleName ? "0 0 0 2px var(--primary)" : "0 0 0 1px var(--surface-border)",
              }}
              onKeyDown={(e) => e.key === "Enter" && createPrivateGroup()}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCircleName("");
                }}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={createPrivateGroup}
                disabled={!newCircleName.trim()}
                className="btn btn-primary flex-1"
                style={{ opacity: !newCircleName.trim() ? 0.5 : 1 }}
              >
                Create Circle
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
