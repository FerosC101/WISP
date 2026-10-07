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
