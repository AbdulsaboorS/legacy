"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function JoinClient({ inviteCode }: { inviteCode: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [halaqaInfo, setHalaqaInfo] = useState<{ id: string; name: string; member_count: number; max_members: number } | null>(null);

  useEffect(() => {
    const fetchHalaqa = async () => {
      const supabase = createClient();
      
      // Get Halaqa by invite code
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
        max_members: halaqa.max_members
      });
      setLoading(false);
    };

    fetchHalaqa();
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!halaqaInfo) return;
    setJoining(true);
    const supabase = createClient();
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Store redirect URL and go to login
      sessionStorage.setItem("redirect_after_login", `/join/${inviteCode}`);
      router.push("/");
      return;
    }

    // Insert membership
    const { error: joinError } = await supabase.from("halaqa_members").insert({
      halaqa_id: halaqaInfo.id,
      user_id: user.id
    });

    if (joinError && joinError.code !== "23505") { // 23505 is unique violation (already joined)
      setError("Failed to join. Please try again.");
      setJoining(false);
      return;
    }

    // Success or already joined
    router.push("/halaqa");
  };

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6 text-center">
        <div className="animate-pulse-soft">
          <div className="text-4xl mb-4">🔍</div>
          <p style={{ color: "var(--foreground-muted)" }}>Finding circuit...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center p-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold mb-2">Circle Not Found</h1>
        <p className="text-sm mb-6" style={{ color: "var(--foreground-muted)" }}>{error}</p>
        <button onClick={() => router.push("/halaqa")} className="btn btn-primary">
          Go back to Halaqas
        </button>
      </main>
    );
  }

  const isFull = halaqaInfo && halaqaInfo.member_count >= halaqaInfo.max_members;

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 relative">
      <div className="glass max-w-sm w-full p-8 text-center animate-bounce-in" style={{ borderRadius: "var(--radius-xl)" }}>
        <div className="text-5xl mb-4">🤝</div>
        <h1 className="text-2xl font-bold mb-2">Join Circle</h1>
        <p className="text-lg font-medium mb-1" style={{ color: "var(--primary)" }}>{halaqaInfo?.name}</p>
        <p className="text-sm mb-6" style={{ color: "var(--foreground-muted)" }}>
          {halaqaInfo?.member_count} / {halaqaInfo?.max_members} members
        </p>

        {isFull ? (
          <div className="p-4 rounded-lg bg-red-500/10 text-red-500 text-sm font-medium">
            Sorry, this circle is currently full.
          </div>
        ) : (
          <button 
            onClick={handleJoin} 
            disabled={joining}
            className="btn btn-primary w-full text-lg shadow-lg"
          >
            {joining ? "Joining..." : "Accept Invite"}
          </button>
        )}
        
        <button 
          onClick={() => router.push("/halaqa")} 
          className="btn text-sm mt-4 w-full"
          style={{ background: "transparent", color: "var(--foreground-muted)" }}
        >
          Cancel
        </button>
      </div>
    </main>
  );
}
