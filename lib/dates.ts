import { addDays as addDaysFn, differenceInDays, formatDistanceToNowStrict, isPast, isToday, isTomorrow } from "date-fns";

export function addDays(d: Date, days: number): Date {
  return addDaysFn(d, days);
}

export function formatISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function expiryStatus(expiry: string | null | undefined): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "warning" | "success";
} {
  if (!expiry) return { label: "No expiry", variant: "secondary" };
  const date = new Date(expiry);
  if (isPast(date) && !isToday(date)) return { label: "Expired", variant: "destructive" };
  if (isToday(date)) return { label: "Today", variant: "warning" };
  if (isTomorrow(date)) return { label: "Tomorrow", variant: "warning" };
  const days = differenceInDays(date, new Date());
  if (days <= 3) return { label: `${days}d left`, variant: "warning" };
  return { label: `${days}d left`, variant: "success" };
}

export function relativeTime(ts: string): string {
  return formatDistanceToNowStrict(new Date(ts), { addSuffix: true });
}

export function ageInMonths(birthDate: string, at: Date = new Date()): number {
  const b = new Date(birthDate);
  let months = (at.getFullYear() - b.getFullYear()) * 12 + (at.getMonth() - b.getMonth());
  if (at.getDate() < b.getDate()) months--;
  return Math.max(0, months);
}
