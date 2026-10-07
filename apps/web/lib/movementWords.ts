/** One short patient phrase for a check's movement result (same wording as the result screen). */
export function movementPhrase(
  functionalStatus: string | null | undefined,
  comparison: string | null | undefined,
  severity?: string | null,
): { text: string; used: boolean } {
  if (functionalStatus === "stopped_early") return { text: "Movement check stopped early", used: true };
  if (comparison === "within_usual_range" || comparison === "faster_than_usual") return { text: "Movement within your usual", used: true };
  if (comparison === "slower_than_usual") return { text: severity === "clear" ? "Movement slower than usual" : "Movement a little slower", used: true };
  if (comparison === "unable_to_compare") return { text: "Movement couldn't be compared", used: true };
  if (comparison === "measurement_unreliable" || functionalStatus === "unreliable") return { text: "Movement reading not reliable", used: true };
  if (functionalStatus === "declined") return { text: "Movement check skipped", used: false };
  return { text: "No movement check", used: false };
}

/** Why a reading couldn't be used, from the sensing pipeline's reason code. */
export function unreliableWhy(reason: string | null | undefined) {
  if (!reason) return "The signal wasn't clear enough.";
  if (reason === "multiple_people_detected") return "It looked like someone else was moving nearby.";
  if (reason.startsWith("expected_5_rises")) return "WISP couldn't clearly see five stands.";
  if (reason === "tool_failure") return "The sensor had a problem.";
  return "The signal wasn't clear enough.";
}
