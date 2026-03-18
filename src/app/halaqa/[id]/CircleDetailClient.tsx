"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import type { Halaqa } from "@/lib/types";
import CircleFeed from "@/components/CircleFeed";

interface MemberDetail {
  user_id: string;
  preferred_name: string;
  completed_today: boolean;
  current_streak: number;
  todayHabits: { habit_id: string; name: string; icon: string }[];
}

const AVATAR_PALETTE = ["#D97706", "#0D9488", "#64748B", "#E11D48"];

function getAvatarColor(name: string): string {
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function SkeletonRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "14px 0",
        borderBottom: "1px solid var(--surface-border)",
      }}
    >
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: "var(--surface-border)",
        }}
      />
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: "var(--surface-border)",
          flexShrink: 0,
        }}
      />
      <div
        style={{
          flex: 1,
          height: "16px",
          borderRadius: "4px",
          background: "var(--background-secondary)",
          backgroundImage:
            "linear-gradient(90deg, var(--background-secondary) 25%, var(--surface-border) 50%, var(--background-secondary) 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 2s linear infinite",
        }}
      />
    </div>
  );
}

export default function CircleDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const halaqaId = params.id as string;
  const today = new Date().toISOString().split("T")[0];

  const [loading, setLoading] = useState(true);
  const [halaqa, setHalaqa] = useState<Halaqa | null>(null);
  const [members, setMembers] = useState<MemberDetail[]>([]);
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [draftDescription, setDraftDescription] = useState("");

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/");
      return;
    }
    setCurrentUserId(user.id);

    // 1. Load halaqa metadata
    // Check sessionStorage for a freshly-created halaqa — RLS recursive
    // dependency prevents reading the row from DB immediately after creation
    // Check sessionStorage for a freshly-created halaqa — RLS recursive
    // dependency prevents reading the row from DB immediately after creation.
    // We keep the key until the DB fetch succeeds so React Strict Mode's
    // double-effect invocation doesn't consume it on the first call.
    let pendingHalaqa: Halaqa | null = null;
    try {
      const raw = sessionStorage.getItem("pendingHalaqa");
      if (raw) {
        const parsed = JSON.parse(raw) as Halaqa;
        if (parsed.id === halaqaId) {
          pendingHalaqa = parsed;
        }
      }
    } catch {
      // ignore sessionStorage errors
    }

    const { data: halaqaData } = await supabase
      .from("halaqas")
      .select("*")
      .eq("id", halaqaId)
      .single();

    // Once DB returns the row, the RLS propagation is complete — safe to clear
    if (halaqaData) {
      try { sessionStorage.removeItem("pendingHalaqa"); } catch { /* ignore */ }
    }

    const resolvedHalaqa = halaqaData ?? pendingHalaqa;
    if (!resolvedHalaqa) {
      router.push("/halaqa");
      return;
    }
    setHalaqa(resolvedHalaqa);

    // 2. Check if current user logged habits today
    const { count: logCount } = await supabase
      .from("habit_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("date", today)
      .eq("completed", true);
    const loggedToday = (logCount || 0) > 0;
    setHasLoggedToday(loggedToday);

    // 3. Load member user_ids
    const { data: memberRows } = await supabase
      .from("halaqa_members")
      .select("user_id")
      .eq("halaqa_id", halaqaId);

    if (!memberRows || memberRows.length === 0) {
      setLoading(false);
      return;
    }

    const userIds = memberRows.map((m) => m.user_id);
    setMemberCount(userIds.length);

    // 3b. Load profiles separately (no direct FK from halaqa_members → profiles)
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, preferred_name")
      .in("id", userIds);
    const profileMap = new Map(
      (profileRows ?? []).map((p) => [p.id, p.preferred_name])
    );

    type MemberRow = { user_id: string };
    const typedMemberRows = memberRows as unknown as MemberRow[];

    // 4. Load streaks
    const { data: streaksData } = await supabase
      .from("streaks")
      .select("user_id, current_streak")
      .in("user_id", userIds);
    const streakMap = new Map(
      streaksData?.map((s) => [s.user_id, s.current_streak]) ?? []
    );
    const best = streaksData
      ? Math.max(...streaksData.map((s) => s.current_streak), 0)
      : 0;
    setBestStreak(best);

    // 5. Load today's logs for all members (deduplicated by user)
    const { data: logs } = await supabase
      .from("habit_logs")
      .select("user_id")
      .in("user_id", userIds)
      .eq("date", today)
      .eq("completed", true);
    const doneUserIds = new Set(logs?.map((l) => l.user_id) ?? []);
    setDoneCount(doneUserIds.size);

    // 6. Load per-member habit breakdown
    const { data: logsWithHabits } = await supabase
      .from("habit_logs")
      .select("user_id, habit_id, habits(name, icon)")
      .in("user_id", userIds)
      .eq("date", today)
      .eq("completed", true);

    type LogWithHabit = {
      user_id: string;
      habit_id: string;
      habits: { name: string; icon: string } | null;
    };
    const typedLogs = (logsWithHabits ?? []) as unknown as LogWithHabit[];

    // Group habits by user_id
    const habitsByUser = new Map<
      string,
      { habit_id: string; name: string; icon: string }[]
    >();
    for (const log of typedLogs) {
      if (!log.habits) continue;
      if (!habitsByUser.has(log.user_id)) habitsByUser.set(log.user_id, []);
      habitsByUser
        .get(log.user_id)!
        .push({
          habit_id: log.habit_id,
          name: log.habits.name,
          icon: log.habits.icon,
        });
    }

    // 7. Build member list, sorted: completed first, then by streak desc
    const memberDetails: MemberDetail[] = typedMemberRows.map((m) => ({
      user_id: m.user_id,
      preferred_name: profileMap.get(m.user_id) ?? "Member",
      completed_today: doneUserIds.has(m.user_id),
      current_streak: streakMap.get(m.user_id) ?? 0,
      todayHabits: habitsByUser.get(m.user_id) ?? [],
    }));
    memberDetails.sort((a, b) => {
      if (a.completed_today !== b.completed_today)
        return a.completed_today ? -1 : 1;
      return b.current_streak - a.current_streak;
    });
    setMembers(memberDetails);
    setLoading(false);
  }, [halaqaId, router, today]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const isOwner = currentUserId !== "" && currentUserId === halaqa?.created_by;

  const saveDescription = async () => {
    if (!halaqa) return;
    const supabase = createClient();
    await supabase
      .from("halaqas")
      .update({ description: draftDescription.trim() || null })
      .eq("id", halaqa.id);
    setHalaqa((prev) =>
      prev ? { ...prev, description: draftDescription.trim() || null } : prev
    );
    setEditingDescription(false);
  };

  const copyInviteLink = async () => {
    if (!halaqa) return;
    const url = `${window.location.origin}/join/${halaqa.invite_code}`;
    if (navigator.share) {
      navigator
        .share({ title: "Join my Legacy Circle", url })
        .catch((e) => {
          if (e?.name !== "AbortError") console.error(e);
        });
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.copied("Invite link copied!");
      } catch {
        toast.info(`Invite code: ${halaqa.invite_code}`);
      }
    }
  };

  const handleBack = () => {
    sessionStorage.setItem("halaqaTab", "mine");
    router.push("/halaqa");
  };

  // Full loading state — before halaqa metadata is loaded
  if (loading && !halaqa) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background)",
        }}
      >
        <p style={{ color: "var(--foreground-muted)" }}>Loading circle...</p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100dvh", background: "var(--background)" }}>
      <div
        style={{
          maxWidth: "560px",
          margin: "0 auto",
          padding: "48px 24px 100px",
        }}
      >
        {/* Back arrow */}
        <div style={{ marginBottom: "24px" }}>
          <button
            onClick={handleBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.2rem",
              color: "var(--foreground-muted)",
              padding: "4px 8px 4px 0",
            }}
            aria-label="Back to circles"
          >
            ←
          </button>
        </div>

        {/* Circle name heading */}
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "2rem",
            color: "var(--foreground)",
            marginBottom: "16px",
          }}
        >
          {halaqa?.name}
        </h1>

        {/* Description — display mode */}
        {halaqa?.description && !editingDescription && (
          <p
            style={{
              fontStyle: "italic",
              color: "var(--foreground-muted)",
              fontSize: "0.9rem",
              marginBottom: "16px",
              lineHeight: 1.55,
            }}
          >
            {halaqa.description}
          </p>
        )}

        {/* Owner "Add a vibe" CTA — only when description absent */}
        {!halaqa?.description && isOwner && !editingDescription && (
          <button
            onClick={() => {
              setDraftDescription("");
              setEditingDescription(true);
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.75rem",
              color: "var(--foreground-muted)",
              textDecoration: "underline",
              marginBottom: "16px",
              padding: 0,
              display: "block",
            }}
          >
            + Add a vibe
          </button>
        )}

        {/* Owner inline edit state */}
        {isOwner && editingDescription && (
          <div style={{ marginBottom: "16px" }}>
            <textarea
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              placeholder="Circle vibe or purpose — 1-2 sentences"
              rows={2}
              maxLength={160}
              autoFocus
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid var(--accent)",
                background: "var(--surface, rgba(0,0,0,0.03))",
                color: "var(--foreground)",
                fontSize: "0.875rem",
                resize: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  color:
                    150 - draftDescription.length < 0
                      ? "#EF4444"
                      : 150 - draftDescription.length < 20
                      ? "var(--accent)"
                      : "var(--foreground-muted)",
                }}
              >
                {150 - draftDescription.length} remaining
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setEditingDescription(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    color: "var(--foreground-muted)",
                    padding: "4px 8px",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveDescription}
                  disabled={150 - draftDescription.length < 0}
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    cursor: 150 - draftDescription.length < 0 ? "not-allowed" : "pointer",
                    opacity: 150 - draftDescription.length < 0 ? 0.5 : 1,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    padding: "4px 12px",
                    borderRadius: "6px",
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Owner edit pencil — when description is present */}
        {halaqa?.description && isOwner && !editingDescription && (
          <button
            onClick={() => {
              setDraftDescription(halaqa.description ?? "");
              setEditingDescription(true);
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.7rem",
              color: "var(--foreground-muted)",
              textDecoration: "underline",
              marginTop: "-12px",
              marginBottom: "16px",
              padding: 0,
              display: "block",
            }}
          >
            Edit
          </button>
        )}

        {/* Stats + Invite row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "32px",
            gap: "12px",
          }}
        >
          {/* Stats bar */}
          <div style={{ display: "flex", gap: "20px" }}>
            {[
              { label: "Members", value: memberCount },
              { label: "Done today", value: `${doneCount}/${memberCount}` },
              { label: "Best streak", value: `${bestStreak}d` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--foreground-muted)",
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--foreground)",
                  }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Amber Invite pill button */}
          <button
            onClick={copyInviteLink}
            style={{
              padding: "6px 16px",
              borderRadius: "999px",
              background: "rgba(217,119,6,0.08)",
              border: "1px solid rgba(217,119,6,0.3)",
              color: "var(--accent)",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            Invite
          </button>
        </div>

        {/* Circle Feed — always visible, not gated by hasLoggedToday */}
        <div style={{ marginBottom: "32px" }}>
          <CircleFeed halaqaId={halaqaId} currentUserId={currentUserId} />
        </div>

        {/* Member list section */}
        {loading ? (
          // Skeleton rows while member data loads (halaqa metadata already loaded)
          <div>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : !hasLoggedToday ? (
          // Gate: member list locked until habits logged today
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              border: "1.5px solid var(--surface-border)",
              borderRadius: "16px",
            }}
            className="animate-bounce-in"
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>🔒</div>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.5rem",
                fontWeight: 400,
                marginBottom: "8px",
              }}
            >
              Complete your habits first
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--foreground-muted)",
                marginBottom: "6px",
              }}
            >
              Muraqabah begins with yourself.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                width: "100%",
                height: "52px",
                background: "var(--foreground)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                fontWeight: 700,
                cursor: "pointer",
                marginTop: "20px",
              }}
            >
              Go to Today&apos;s Habits
            </button>
          </div>
        ) : (
          // Member list with habit chips
          <div>
            {members.map((member, i) => (
              <div
                key={member.user_id}
                className="animate-slide-up"
                style={{
                  animationDelay: `${i * 50}ms`,
                  animationFillMode: "both",
                  display: "flex",
                  flexDirection: "column",
                  padding: "14px 0",
                  borderBottom: "1px solid var(--surface-border)",
                }}
              >
                {/* Main row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    marginBottom: member.todayHabits.length > 0 ? "8px" : 0,
                  }}
                >
                  {/* Status dot */}
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: member.completed_today
                        ? "var(--success)"
                        : "var(--surface-border)",
                      flexShrink: 0,
                    }}
                  />

                  {/* 36px initials avatar */}
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: getAvatarColor(member.preferred_name),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(member.preferred_name)}
                  </div>

                  {/* Name + streak */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      {member.preferred_name}
                    </p>
                    <p
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--foreground-muted)",
                      }}
                    >
                      {member.current_streak} day streak
                    </p>
                  </div>

                </div>

                {/* Habit chips */}
                {member.todayHabits.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      flexWrap: "wrap",
                      paddingLeft: "22px",
                    }}
                  >
                    {member.todayHabits.map((h) => (
                      <span
                        key={h.habit_id}
                        style={{
                          fontSize: "0.7rem",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: "var(--background-secondary)",
                          border: "1px solid var(--surface-border)",
                          color: "var(--foreground-muted)",
                        }}
                      >
                        {h.icon} {h.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
