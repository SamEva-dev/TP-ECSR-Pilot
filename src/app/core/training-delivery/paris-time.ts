export const PARIS_ZONE = "Europe/Paris";

// Resolve wall-clock time unambiguously in the training site's timezone.
// DST gaps and repeated times must be corrected by the user before saving.
export function parisInstant(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    return null;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: PARIS_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const matches: string[] = [];
  for (const offset of ["+01:00", "+02:00"]) {
    const instant = new Date(`${date}T${time}:00${offset}`);
    if (Number.isNaN(instant.getTime())) continue;
    const parts = Object.fromEntries(
      formatter.formatToParts(instant).map((x) => [x.type, x.value]),
    );
    if (
      `${parts["year"]}-${parts["month"]}-${parts["day"]}T${parts["hour"]}:${parts["minute"]}` ===
      `${date}T${time}`
    )
      matches.push(instant.toISOString());
  }
  return matches.length === 1 ? matches[0] : null;
}
