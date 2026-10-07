import { redirect } from "next/navigation";

// My usual now lives under You.
export default function BaselineRedirect() {
  redirect("/you/baseline");
}
