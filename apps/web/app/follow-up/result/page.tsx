import { redirect } from "next/navigation";

// A follow-up is a full check: its result is that check's recommendation.
export default async function FollowUpResult({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  redirect(s ? `/check/complete?s=${encodeURIComponent(s)}` : "/history");
}
