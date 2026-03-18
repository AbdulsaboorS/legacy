"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function JoinClient({ inviteCode }: { inviteCode: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [halaqaInfo, setHalaqaInfo] = useState<{
    id: string;
    name: string;
    member_count: number;
    max_members: number;
    description?: string | null;
  } | null>(null);

  useEffect(() => {
    const fetchHalaqa = async () => {
      const supabase = createClient();

      const { data: halaqa, error: hError } = await supabase
        .from("halaqas")
        .select("id, name, max_members, description, halaqa_members(count)")
        .eq("invite_code", inviteCode.toUpperCase())
        .single();

      if (hError || !halaqa) {
        setError("Invalid or expired invite link.");
        setLoading(false);
        return;
      }

      setHalaqaInfo({
        id: halaqa.id,
        name: halaqa.name,
        member_count: halaqa.halaqa_members[0].count,
        max_members: halaqa.max_members,
        description: halaqa.description,
      });
      setLoading(false);
    };

    fetchHalaqa();
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!halaqaInfo) return;
    setJoining(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      sessionStorage.setItem("redirect_after_login", `/join/${inviteCode}`);
      router.push("/");
      return;
    }

    const { error: joinError } = await supabase.from("halaqa_members").insert({
      halaqa_id: halaqaInfo.id,
      user_id: user.id,
    });

    if (joinError && joinError.code !== "23505") {
      setError("Failed to join. Please try again.");
      setJoining(false);
      return;
    }

    router.push(`/halaqa/${halaqaInfo.id}`);
  };

  if (loading) {
    return (
      <main
        style={{
          background: "var(--background)",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div className="relative animate-pulse-soft">
          <div className="text-4xl mb-4 animate-float">🔍</div>
          <p style={{ color: "var(--foreground-muted)" }}>Finding circle...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main
        style={{
          background: "var(--background)",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div
          className="glass relative animate-bounce-in"
          style={{
            borderRadius: "var(--radius-xl)",
            maxWidth: "384px",
            width: "100%",
            padding: "32px",
          }}
        >
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-2">Circle Not Found</h1>
          <p
            style={{
              fontSize: "0.875rem",
              marginBottom: "24px",
              color: "var(--foreground-muted)",
            }}
          >
            {error}
          </p>
          <button
            onClick={() => router.push("/halaqa")}
            className="btn btn-primary"
            style={{ width: "100%" }}
          >
            Go to Halaqas
          </button>
        </div>
      </main>
    );
  }

  const isFull = halaqaInfo && halaqaInfo.member_count >= halaqaInfo.max_members;

  return (
    <main
      style={{
        background: "var(--background)",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
      }}
    >
      <div
        className="glass relative animate-bounce-in"
        style={{
          borderRadius: "var(--radius-xl)",
          maxWidth: "384px",
          width: "100%",
          padding: "32px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: "8px",
            color: "var(--foreground-muted)",
          }}
        >
          You&apos;ve been invited to
        </p>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "2.4rem",
            lineHeight: 1.1,
            color: "var(--foreground)",
            marginBottom: "12px",
            letterSpacing: "-0.01em",
          }}
        >
          {halaqaInfo?.name}
        </h1>

        {/* Amber divider */}
        <div
          style={{
            height: "2px",
            width: "56px",
            margin: "0 auto 20px",
            background: "var(--accent)",
            borderRadius: "2px",
          }}
        />

        {halaqaInfo?.description && (
          <p
            style={{
              fontStyle: "italic",
              color: "var(--foreground-muted)",
              fontSize: "0.875rem",
              marginBottom: "16px",
              lineHeight: 1.5,
            }}
          >
            {halaqaInfo.description}
          </p>
        )}

        {/* Capacity pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: 600,
            marginBottom: "24px",
            background: "rgba(217, 119, 6, 0.10)",
            color: "var(--accent)",
            border: "1px solid rgba(217, 119, 6, 0.25)",
          }}
        >
          <span>👥</span>
          {halaqaInfo?.member_count} / {halaqaInfo?.max_members} members
        </div>

        {isFull ? (
          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              fontSize: "0.875rem",
              fontWeight: 500,
              marginBottom: "16px",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#EF4444",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            This circle is currently full. Try again later.
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="btn btn-accent"
            style={{
              width: "100%",
              fontSize: "1rem",
              marginBottom: "12px",
              boxShadow: "0 4px 12px rgba(217, 119, 6, 0.3)",
            }}
          >
            {joining ? "Joining..." : `Join ${halaqaInfo?.name}`}
          </button>
        )}

        <button
          onClick={() => router.push("/halaqa")}
          className="btn btn-ghost"
          style={{
            width: "100%",
            fontSize: "0.875rem",
            color: "var(--foreground-muted)",
          }}
        >
          Cancel
        </button>
      </div>
    </main>
  );
}
