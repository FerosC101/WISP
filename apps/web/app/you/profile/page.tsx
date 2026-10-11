import { redirect } from "next/navigation";

// The health profile lives at /you/health.
export default function ProfileRedirect() {
  redirect("/you/health");
}
