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
  } | null>(null);

  useEffect(() => {
    const fetchHalaqa = async () => {
      const supabase = createClient();

      const { data: halaqa, error: hError } = await supabase
        .from("halaqas")
        .select("id, name, max_members, halaqa_members(count)")
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

    router.push("/halaqa");
  };

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6 text-center relative">
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            background:
              "linear-gradient(180deg, #141210 0%, #1A2820 45%, #1E1A10 100%)",
          }}
        />
        <div className="relative animate-pulse-soft">
          <div className="text-4xl mb-4 animate-float">🔍</div>
          <p style={{ color: "var(--foreground-muted)" }}>Finding circle...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center p-6 text-center relative">
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            background:
              "linear-gradient(180deg, #141210 0%, #1A2820 45%, #1E1A10 100%)",
          }}
        />
        <div
          className="glass relative max-w-sm w-full p-8 animate-bounce-in"
          style={{ borderRadius: "var(--radius-xl)" }}
        >
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-2">Circle Not Found</h1>
          <p className="text-sm mb-6" style={{ color: "var(--foreground-muted)" }}>
            {error}
          </p>
          <button onClick={() => router.push("/halaqa")} className="btn btn-primary w-full">
            Go to Halaqas
          </button>
        </div>
      </main>
    );
  }

  const isFull = halaqaInfo && halaqaInfo.member_count >= halaqaInfo.max_members;

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 relative">
      {/* Sacred Dawn background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "linear-gradient(180deg, #141210 0%, #1A2820 45%, #1E1A10 100%)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 pattern-bg"
        style={{ opacity: 0.04 }}
      />

      <div
        className="glass relative max-w-sm w-full p-8 text-center animate-bounce-in"
        style={{ borderRadius: "var(--radius-xl)" }}
      >
        <p
          className="text-xs uppercase tracking-widest mb-2"
          style={{ color: "var(--foreground-muted)" }}
        >
          You&apos;ve been invited to
        </p>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--foreground)" }}
        >
          {halaqaInfo?.name}
        </h1>

        {/* Gold divider */}
        <div
          className="h-px w-16 mx-auto mb-4"
          style={{ background: "var(--gradient-gold)" }}
        />

        {/* Capacity pill */}
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
          style={{
            background: "rgba(76, 175, 130, 0.12)",
            color: "var(--primary)",
            border: "1px solid rgba(76, 175, 130, 0.2)",
          }}
        >
          <span>👥</span>
          {halaqaInfo?.member_count} / {halaqaInfo?.max_members} members
        </div>

        {isFull ? (
          <div
            className="p-4 rounded-xl text-sm font-medium mb-4"
            style={{
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
            className="btn btn-accent w-full text-base mb-3 shadow-lg"
          >
            {joining ? "Joining..." : "Accept Invite 🤝"}
          </button>
        )}

        <button
          onClick={() => router.push("/halaqa")}
          className="btn btn-ghost text-sm w-full"
          style={{ color: "var(--foreground-muted)" }}
        >
          Cancel
        </button>
      </div>
    </main>
  );
}
