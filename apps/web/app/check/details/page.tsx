import { redirect } from "next/navigation";

// "What feels different", "When did this start?" and "Anything else?" are steps of the Check start screen.
export default function CheckDetailsRedirect() {
  redirect("/check/start");
}
