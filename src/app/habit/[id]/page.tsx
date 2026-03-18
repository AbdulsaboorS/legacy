"use client";
import HabitDetailClient from "./HabitDetailClient";

export default function HabitDetailPage({ params }: { params: { id: string } }) {
  return <HabitDetailClient habitId={params.id} />;
}
