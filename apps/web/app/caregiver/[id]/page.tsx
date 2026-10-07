import { redirect } from "next/navigation";

// Sharing now lives in the Care section.
export default async function CaregiverRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/care/share?s=${encodeURIComponent(id)}`);
}
