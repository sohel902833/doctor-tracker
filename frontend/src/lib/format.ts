const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "18 Nov 2026" */
export const formatDate = (value?: string | Date | null) =>
  value ? dateFormat.format(new Date(value)) : "—";

/** "18 Nov 2026, 10:30" */
export const formatDateTime = (value?: string | Date | null) =>
  value ? dateTimeFormat.format(new Date(value)) : "—";

/** "2026-11-18" for <input type="date"> */
export const toDateInputValue = (value?: string | Date | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

/** "UNDER_TREATMENT" -> "Under treatment" */
export const humanize = (value?: string | null) =>
  value
    ? value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ")
    : "—";

export const initials = (name?: string | null) =>
  (name ?? "")
    .replace(/^dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

/** "1+0+1" from { morning: 1, noon: 0, night: 1 } */
export const formatSchedule = (schedule?: {
  morning?: number;
  noon?: number;
  night?: number;
}) =>
  [schedule?.morning ?? 0, schedule?.noon ?? 0, schedule?.night ?? 0].join("+");

export const formatPrice = (value?: number | null) =>
  value == null ? "—" : `৳ ${value.toFixed(2)}`;
