import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has already completed onboarding
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: habits } = await supabase
          .from("habits")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        // If user already has habits
        if (habits && habits.length > 0) {
          // If they came from a join link, let them go there. Otherwise dashboard.
          if (next && next.startsWith("/join/")) {
            return NextResponse.redirect(`${origin}${next}`);
          }
          return NextResponse.redirect(`${origin}/dashboard`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // OAuth error — redirect to landing with error
  return NextResponse.redirect(`${origin}/?error=auth`);
}
