import { redirect } from "next/navigation";

// Privacy now lives under You.
export default function PrivacyRedirect() {
  redirect("/you/privacy");
}
