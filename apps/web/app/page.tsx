import { redirect } from "next/navigation";

// Today is the patient app's home tab.
export default function Root() {
  redirect("/today");
}
