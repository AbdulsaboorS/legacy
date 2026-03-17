"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FeedRow } from "@/lib/types";
import { PROPHETIC_QUOTES } from "@/lib/types";

interface CircleFeedProps {
  halaqaId: string;
  currentUserId: string;
}

// ── Avatar helpers ────────────────────────────────────────────────
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

// ── Relative time helper ──────────────────────────────────────────
function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return "yesterday";
}

// ── Fajr divider helper ───────────────────────────────────────────
function getFeedDate(isoString: string): "today" | "yesterday" | "older" {
  const FAJR_HOUR = 5; // 5:00 AM local time anchors the day
  const now = new Date();
  const fajrToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    FAJR_HOUR
  );
  const fajrYesterday = new Date(fajrToday.getTime() - 86400000);
  const itemDate = new Date(isoString);
  if (itemDate >= fajrToday) return "today";
  if (itemDate >= fajrYesterday) return "yesterday";
  return "older";
}

// ── Milestone emoji helper ────────────────────────────────────────
function milestoneEmoji(streak: number): string {
  if (streak >= 28) return "✨";
  if (streak >= 21) return "⭐";
  if (streak >= 14) return "🌙";
  return "🎉"; // 7
}

// ── Main component ────────────────────────────────────────────────
export default function CircleFeed({ halaqaId, currentUserId }: CircleFeedProps) {
  const [feed, setFeed] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentReactions, setSentReactions] = useState<Set<string>>(new Set());

  const randomQuote = useMemo(
    () => PROPHETIC_QUOTES[Math.floor(Math.random() * PROPHETIC_QUOTES.length)],
    []
  );

  const loadFeed = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_circle_feed", {
      p_halaqa_id: halaqaId,
    });
    if (!error && data) setFeed(data as FeedRow[]);
    setLoading(false);
  }, [halaqaId]);

  useEffect(() => {
    loadFeed();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") loadFeed();
    }, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") loadFeed();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadFeed]);

  const sendReaction = async (row: FeedRow, emoji: string) => {
    if (!row.habit_log_id) return;
    const key = `${row.habit_log_id}:${emoji}`;
    if (sentReactions.has(key)) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id === row.user_id) return; // no self-reactions
    await supabase.from("halaqa_reactions").insert({
      halaqa_id: halaqaId,
      sender_id: user.id,
      receiver_id: row.user_id,
      emoji,
      date: new Date().toISOString().split("T")[0],
      habit_log_id: row.habit_log_id,
    });
    setSentReactions((prev) => new Set([...prev, key]));
    // Optimistically update local reaction count
    setFeed((prev) =>
      prev.map((item) =>
        item.habit_log_id === row.habit_log_id
          ? {
              ...item,
              reactions: {
                ...item.reactions,
                [emoji]: (item.reactions[emoji] ?? 0) + 1,
              },
            }
          : item
      )
    );
    // Clear sent state after 3s
    setTimeout(
      () =>
        setSentReactions((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        }),
      3000
    );
  };

  // Render

  if (loading) {
    return (
      <div style={{ marginBottom: "32px" }}>
        <p
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--foreground-muted)",
            marginBottom: "16px",
          }}
        >
          Circle Activity
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)" }}>
          Loading...
        </p>
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div style={{ marginBottom: "32px" }}>
        <p
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--foreground-muted)",
            marginBottom: "16px",
          }}
        >
          Circle Activity
        </p>
        <div
          style={{
            padding: "28px 20px",
            border: "1px solid var(--surface-border)",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "var(--foreground)",
              marginBottom: "8px",
            }}
          >
            &ldquo;{randomQuote.text}&rdquo;
          </p>
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--foreground-muted)",
              marginBottom: "16px",
            }}
          >
            — {randomQuote.source}
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
            Your circle&apos;s journey starts today. Be the first.
          </p>
        </div>
      </div>
    );
  }

  let lastSection: string | null = null;

  return (
    <div style={{ marginBottom: "32px" }}>
      {/* Section heading */}
      <p
        style={{
          fontSize: "0.65rem",
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--foreground-muted)",
          marginBottom: "16px",
        }}
      >
        Circle Activity
      </p>

      {feed.map((row, index) => {
        const section = getFeedDate(row.created_at);
        const showDivider =
          section !== "older" && section !== lastSection;
        if (section !== "older") lastSection = section;

        // ── Milestone item ────────────────────────────────────────
        if (row.type === "milestone") {
          return (
            <div key={`${row.user_id}-${row.created_at}-${index}`}>
              {showDivider && (
                <div
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--foreground-muted)",
                    padding: "12px 0 6px",
                  }}
                >
                  {section === "today" ? "Today" : "Yesterday"}
                </div>
              )}
              <div
                style={{
                  background: "rgba(217,119,6,0.06)",
                  border: "1px solid rgba(217,119,6,0.2)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  marginBottom: "8px",
                }}
              >
                <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                  {row.user_id === currentUserId ? "You" : row.display_name} hit
                  Day {row.streak} {milestoneEmoji(row.streak)}
                </p>
              </div>
            </div>
          );
        }

        // ── Joined item ───────────────────────────────────────────
        if (row.type === "joined") {
          return (
            <div key={`${row.user_id}-${row.created_at}-${index}`}>
              {showDivider && (
                <div
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--foreground-muted)",
                    padding: "12px 0 6px",
                  }}
                >
                  {section === "today" ? "Today" : "Yesterday"}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--surface-border)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: getAvatarColor(row.display_name),
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {getInitials(row.display_name)}
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--foreground-muted)" }}>
                  <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
                    {row.user_id === currentUserId ? "You" : row.display_name}
                  </span>{" "}
                  joined the circle
                </p>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "0.7rem",
                    color: "var(--foreground-muted)",
                    flexShrink: 0,
                  }}
                >
                  {relativeTime(row.created_at)}
                </span>
              </div>
            </div>
          );
        }

        // ── Log item (default) ────────────────────────────────────
        return (
          <div key={`${row.user_id}-${row.created_at}-${index}`}>
            {showDivider && (
              <div
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--foreground-muted)",
                  padding: "12px 0 6px",
                }}
              >
                {section === "today" ? "Today" : "Yesterday"}
              </div>
            )}
            <div
              style={{
                borderBottom: "1px solid var(--surface-border)",
                padding: "16px 0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                {/* 36px avatar */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: getAvatarColor(row.display_name),
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {getInitials(row.display_name)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name + timestamp */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {row.user_id === currentUserId ? "You" : row.display_name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--foreground-muted)",
                      }}
                    >
                      {relativeTime(row.created_at)}
                    </span>
                  </div>

                  {/* Habit chips — max 3, overflow "+ N more" */}
                  {row.habits.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                        marginBottom: "6px",
                      }}
                    >
                      {row.habits.slice(0, 3).map((h, i) => (
                        <span
                          key={i}
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
                      {row.habits.length > 3 && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--foreground-muted)",
                          }}
                        >
                          +{row.habits.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Streak */}
                  {row.streak > 0 && (
                    <p
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--foreground-muted)",
                        marginBottom: "8px",
                      }}
                    >
                      🔥 Day {row.streak}
                    </p>
                  )}

                  {/* Reaction bar — only for log items with a habit_log_id, not own items */}
                  {row.habit_log_id && row.user_id !== currentUserId && (
                    <div
                      style={{ display: "flex", gap: "6px", alignItems: "center" }}
                    >
                      {["🤲", "💪", "🔥"].map((emoji) => {
                        const key = `${row.habit_log_id}:${emoji}`;
                        const sent = sentReactions.has(key);
                        const count = row.reactions[emoji] ?? 0;
                        return (
                          <button
                            key={emoji}
                            onClick={() => sendReaction(row, emoji)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                              height: "26px",
                              padding: "0 8px",
                              borderRadius: "999px",
                              background: sent
                                ? "rgba(217,119,6,0.12)"
                                : "var(--background-secondary)",
                              border: `1px solid ${
                                sent
                                  ? "rgba(217,119,6,0.4)"
                                  : "var(--surface-border)"
                              }`,
                              cursor: "pointer",
                              fontSize: "0.75rem",
                            }}
                          >
                            <span>{emoji}</span>
                            {sent && (
                              <span
                                style={{
                                  fontSize: "0.6rem",
                                  color: "var(--accent)",
                                }}
                              >
                                ✓
                              </span>
                            )}
                            {count > 0 && (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--foreground-muted)",
                                }}
                              >
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Own item: show received reaction counts only (no send buttons) */}
                  {row.habit_log_id &&
                    row.user_id === currentUserId &&
                    Object.keys(row.reactions).length > 0 && (
                      <div style={{ display: "flex", gap: "6px" }}>
                        {Object.entries(row.reactions).map(([emoji, count]) => (
                          <span key={emoji} style={{ fontSize: "0.8rem" }}>
                            {emoji}{" "}
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: "var(--foreground-muted)",
                              }}
                            >
                              {count}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
