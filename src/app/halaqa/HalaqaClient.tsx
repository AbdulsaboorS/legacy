"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import type { Halaqa } from "@/lib/types";

interface CircleCardData {
  halaqa: Halaqa;
  memberCount: number;
  doneCount: number;
  memberPreviews: { preferred_name: string }[];
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

function AvatarStack({ members }: { members: { preferred_name: string }[] }) {
  const visible = members.slice(0, 4);
  const overflow = members.length - visible.length;

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {visible.map((m, i) => (
        <div
          key={i}
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: getAvatarColor(m.preferred_name),
            border: "2px solid var(--surface)",
            marginLeft: i === 0 ? 0 : "-8px",
            zIndex: visible.length - i,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "0.6rem",
            fontWeight: 700,
          }}
        >
          {getInitials(m.preferred_name)}
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "var(--surface-border)",
            border: "2px solid var(--surface)",
            marginLeft: "-8px",
            zIndex: 0,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--foreground-muted)",
            fontSize: "0.6rem",
            fontWeight: 700,
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

export default function HalaqaClient() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [userGender, setUserGender] = useState<"Brother" | "Sister">("Brother");
  const [myHalaqas, setMyHalaqas] = useState<Halaqa[]>([]);
  const [activeTab, setActiveTab] = useState<"lobby" | "mine">(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("halaqaTab");
      sessionStorage.removeItem("halaqaTab"); // consume once
      return (saved as "lobby" | "mine") ?? "mine";
    }
    return "mine";
  });
  const [publicLobbies, setPublicLobbies] = useState<(Halaqa & { member_count: number })[]>([]);
  const [creating, setCreating] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  const [circleCards, setCircleCards] = useState<CircleCardData[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const activeHalaqaInitialized = useRef(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadCircleCardData = useCallback(async () => {
    if (myHalaqas.length === 0) return;

    const supabase = createClient();

    const cards: CircleCardData[] = await Promise.all(
      myHalaqas.map(async (halaqa) => {
        const { data: memberRows } = await supabase
          .from("halaqa_members")
          .select("user_id, profiles(preferred_name)")
          .eq("halaqa_id", halaqa.id);

        // Handle RLS propagation delay for newly created circles
        if (!memberRows || memberRows.length === 0) {
          return {
            halaqa,
            memberCount: 1,
            doneCount: 0,
            memberPreviews: [],
          };
        }

        const memberUserIds = memberRows.map((m) => m.user_id);

        const { data: logs } = await supabase
          .from("habit_logs")
          .select("user_id")
          .in("user_id", memberUserIds)
          .eq("date", today)
          .eq("completed", true);

        const doneCount = new Set(logs?.map((r) => r.user_id)).size;

        const memberPreviews = memberRows
          .map((m) => {
            const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
            return profile ? { preferred_name: (profile as { preferred_name: string }).preferred_name } : null;
          })
          .filter((p): p is { preferred_name: string } => p !== null);

        return {
          halaqa,
          memberCount: memberRows.length,
          doneCount,
          memberPreviews,
        };
      })
    );

    setCircleCards(cards);
  }, [myHalaqas, today]);

  useEffect(() => {
    loadCircleCardData();
  }, [loadCircleCardData]);

  const joinLobby = async (halaqaId: string) => {
    setSavingAction(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("halaqa_members").upsert(
        { halaqa_id: halaqaId, user_id: user.id },
        { onConflict: "halaqa_id,user_id", ignoreDuplicates: true }
      );
      if (error) throw error;

      toast.success("Joined! Welcome to the circle");
      router.push(`/halaqa/${halaqaId}`);
    } catch (error) {
      console.error("Failed to join circle:", error);
      toast.error("Failed to join. Please try again.");
    } finally {
      setSavingAction(false);
    }
  };

  const createPrivateGroup = async () => {
    if (!newCircleName.trim()) return;
    setCreating(true);
    setShowCreateModal(false);

    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const inviteCode = crypto.randomUUID().replace(/-/g, "").substring(0, 6).toUpperCase();
      const circleName = newCircleName.trim();

      const { data: newHalaqaId, error: halaqaError } = await supabase.rpc(
        "create_private_halaqa",
        {
          p_name: circleName,
          p_gender: userGender,
          p_invite_code: inviteCode,
        }
      );

      if (halaqaError) throw halaqaError;

      // Construct the halaqa object locally — don't fetch from DB since RLS
      // on halaqas has a recursive dependency through halaqa_members that
      // prevents reading the row immediately after creation
      const newHalaqa: import("@/lib/types").Halaqa = {
        id: newHalaqaId,
        name: circleName,
        invite_code: inviteCode,
        gender: userGender,
        is_public: false,
        max_members: 8,
        created_by: user.id,
        created_at: new Date().toISOString(),
      };
      setMyHalaqas((prev) =>
        prev.find((h) => h.id === newHalaqaId) ? prev : [...prev, newHalaqa]
      );
      activeHalaqaInitialized.current = true;
      router.push(`/halaqa/${newHalaqaId}`);
    } catch (error) {
      console.error("Failed to create circle:", error);
      toast.error("Failed to create circle. Please try again.");
    } finally {
      setNewCircleName("");
      setCreating(false);
    }
  };

  if (loading) {
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
        <p style={{ color: "var(--foreground-muted)" }}>Loading circles...</p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100dvh", background: "var(--background)" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "48px 24px 100px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "2.4rem",
              color: "var(--foreground)",
            }}
          >
            Halaqa
          </h1>
        </div>

        {/* Tab bar — underline style */}
        <div
          style={{
            display: "flex",
            borderBottom: "1.5px solid var(--surface-border)",
            marginBottom: "28px",
          }}
        >
          {(
            [
              { key: "mine", label: "My Circles" },
              { key: "lobby", label: "Lobby" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1,
                padding: "12px 0",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === key
                    ? "2.5px solid var(--accent)"
                    : "2.5px solid transparent",
                marginBottom: "-1.5px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: activeTab === key ? 700 : 400,
                color:
                  activeTab === key ? "var(--foreground)" : "var(--foreground-muted)",
                transition: "all 0.2s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ===== LOBBY TAB ===== */}
        {activeTab === "lobby" && (
          <div className="animate-fade-in">
            <p
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--foreground-muted)",
                marginBottom: "16px",
              }}
            >
              Public Lobbies ({userGender}s)
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginBottom: "28px",
              }}
            >
              {publicLobbies.length === 0 ? (
                <p
                  style={{
                    color: "var(--foreground-muted)",
                    fontSize: "0.9rem",
                    textAlign: "center",
                    padding: "24px 0",
                  }}
                >
                  No open public lobbies right now.
                </p>
              ) : (
                publicLobbies.map((lobby) => (
                  <div
                    key={lobby.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px",
                      border: "1.5px solid var(--surface-border)",
                      borderRadius: "12px",
                    }}
                  >
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "6px" }}>
                        {lobby.name}
                      </h4>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "80px",
                            height: "6px",
                            background: "var(--surface-border)",
                            borderRadius: "999px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${(lobby.member_count / lobby.max_members) * 100}%`,
                              background: "var(--accent)",
                              borderRadius: "999px",
                              transition: "width 0.3s",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
                          {lobby.member_count}/{lobby.max_members}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => joinLobby(lobby.id)}
                      disabled={savingAction}
                      style={{
                        height: "36px",
                        padding: "0 20px",
                        background: "var(--foreground)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        cursor: savingAction ? "not-allowed" : "pointer",
                        opacity: savingAction ? 0.6 : 1,
                      }}
                    >
                      Join
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Create private circle button */}
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={creating}
              style={{
                width: "100%",
                height: "52px",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "0.85rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: creating ? "not-allowed" : "pointer",
                opacity: creating ? 0.7 : 1,
              }}
            >
              {creating ? "Creating..." : "+ Create Private Circle"}
            </button>
          </div>
        )}

        {/* ===== MINE TAB — empty state ===== */}
        {activeTab === "mine" && myHalaqas.length === 0 && (
          <div
            style={{ textAlign: "center", padding: "48px 0" }}
            className="animate-fade-in"
          >
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🕌</div>
            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.5rem",
                fontWeight: 400,
                marginBottom: "8px",
              }}
            >
              Join your first circle
            </h3>
            <p
              style={{
                fontSize: "0.9rem",
                color: "var(--foreground-muted)",
                maxWidth: "300px",
                margin: "0 auto",
                marginBottom: "28px",
              }}
            >
              Studies show you&apos;re 70% more likely to keep your habits with an
              accountability squad.
            </p>
            <button
              onClick={() => setActiveTab("lobby")}
              style={{
                width: "100%",
                height: "52px",
                background: "var(--foreground)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "0.85rem",
                letterSpacing: "0.1em",
                cursor: "pointer",
              }}
            >
              Find or Create a Circle
            </button>
          </div>
        )}

        {/* ===== MINE TAB — with circles ===== */}
        {activeTab === "mine" && myHalaqas.length > 0 && (
          <div className="animate-fade-in">
            {circleCards.length === 0 ? (
              // Loading state: skeleton cards
              Array.from({ length: Math.min(myHalaqas.length, 2) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: "100%",
                    height: "72px",
                    border: "1.5px solid var(--surface-border)",
                    borderRadius: "12px",
                    marginBottom: "12px",
                    background: "var(--background-secondary)",
                    backgroundImage:
                      "linear-gradient(90deg, var(--background-secondary) 25%, var(--surface-border) 50%, var(--background-secondary) 75%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 2s linear infinite",
                  }}
                />
              ))
            ) : (
              circleCards.map((card) => (
                <button
                  key={card.halaqa.id}
                  onClick={() => router.push(`/halaqa/${card.halaqa.id}`)}
                  className="animate-fade-in"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px",
                    border: "1.5px solid var(--surface-border)",
                    borderRadius: "12px",
                    background: "var(--surface)",
                    cursor: "pointer",
                    textAlign: "left",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        marginBottom: "4px",
                        color: "var(--foreground)",
                      }}
                    >
                      {card.halaqa.name}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
                      {card.doneCount}/{card.memberCount} done today
                    </p>
                  </div>
                  <AvatarStack members={card.memberPreviews} />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Circle Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            className="animate-slide-up"
            style={{
              background: "var(--surface)",
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "480px",
              border: "1px solid var(--surface-border)",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.5rem",
                fontWeight: 400,
                marginBottom: "6px",
              }}
            >
              Name your circle
            </h3>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--foreground-muted)",
                marginBottom: "20px",
              }}
            >
              Choose a meaningful name for your accountability group.
            </p>
            <input
              type="text"
              value={newCircleName}
              onChange={(e) => setNewCircleName(e.target.value)}
              placeholder="e.g., Dawn Brothers, Al-Fajr Sisters..."
              style={{
                width: "100%",
                height: "48px",
                padding: "0 16px",
                fontSize: "0.95rem",
                background: "var(--background-secondary)",
                border: `1.5px solid ${newCircleName ? "var(--accent)" : "var(--surface-border)"}`,
                borderRadius: "10px",
                outline: "none",
                color: "var(--foreground)",
                boxSizing: "border-box",
                marginBottom: "16px",
              }}
              onKeyDown={(e) => e.key === "Enter" && createPrivateGroup()}
              autoFocus
            />
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCircleName("");
                }}
                style={{
                  flex: 1,
                  height: "48px",
                  background: "transparent",
                  border: "1.5px solid var(--surface-border)",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: 600,
                  color: "var(--foreground)",
                  fontSize: "0.875rem",
                }}
              >
                Cancel
              </button>
              <button
                onClick={createPrivateGroup}
                disabled={!newCircleName.trim()}
                style={{
                  flex: 1,
                  height: "48px",
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  cursor: !newCircleName.trim() ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  opacity: !newCircleName.trim() ? 0.5 : 1,
                }}
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
