import JoinClient from "./JoinClient";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export async function generateMetadata(
  props: { params: Promise<{ invite_code: string }> }
): Promise<Metadata> {
  const { invite_code } = await props.params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("halaqas")
    .select("name")
    .eq("invite_code", invite_code.toUpperCase())
    .single();
  const circleName = data?.name ?? "Legacy Circle";
  return {
    title: `Join ${circleName} on Legacy`,
    description: `You've been invited to join ${circleName} — an accountability circle for sustaining your Ramadan habits.`,
    openGraph: {
      title: `Join ${circleName} on Legacy`,
      description: `You've been invited to join ${circleName}.`,
    },
  };
}

export default async function JoinPage(props: { params: Promise<{ invite_code: string }> }) {
  const params = await props.params;

  return <JoinClient inviteCode={params.invite_code} />;
}
