import { use } from "react";
import HabitDetailClient from "./HabitDetailClient";

export default function HabitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <HabitDetailClient habitId={id} />;
}
