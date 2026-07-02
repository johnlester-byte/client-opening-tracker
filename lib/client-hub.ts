import type { Location, LocationStatus } from "@/lib/types";

export const STATUS_LABEL: Record<LocationStatus, string> = {
  "on-track": "On Track",
  "at-risk": "At Risk",
  delayed: "Delayed",
  opened: "Opened",
};

export const STATUS_BADGE_VARIANT: Record<LocationStatus, "default" | "amber" | "destructive" | "blue"> = {
  "on-track": "default",
  "at-risk": "amber",
  delayed: "destructive",
  opened: "blue",
};

export function isFollowUpOverdue(location: Location): boolean {
  if (location.status === "opened") return false;
  const opening = new Date(location.opening_date);
  const today = new Date();
  opening.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const isPastOpening = opening.getTime() < today.getTime();
  return isPastOpening && (!location.pre_open_done || !location.post_open_done);
}

export function isOpeningThisWeek(location: Location): boolean {
  if (location.status === "opened") return false;
  const opening = new Date(location.opening_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  opening.setHours(0, 0, 0, 0);
  const diffDays = (opening.getTime() - today.getTime()) / 86_400_000;
  return diffDays >= 0 && diffDays <= 7;
}

export function isOpenedThisMonth(location: Location): boolean {
  if (location.status !== "opened" || !location.opened_date) return false;
  const opened = new Date(location.opened_date);
  const today = new Date();
  return opened.getFullYear() === today.getFullYear() && opened.getMonth() === today.getMonth();
}

export function computeClientStats(locations: Location[]) {
  return {
    totalActive: locations.filter((l) => l.status !== "opened").length,
    atRisk: locations.filter((l) => l.status === "at-risk").length,
    openingThisWeek: locations.filter(isOpeningThisWeek).length,
    followUpsOverdue: locations.filter(isFollowUpOverdue).length,
    openedThisMonth: locations.filter(isOpenedThisMonth).length,
  };
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function nameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? email;
  const first = localPart.split(".")[0] ?? localPart;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function parseTracker(tracker: string | null): string[] {
  if (!tracker) return [];
  return tracker
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinTracker(names: string[]): string | null {
  return names.length > 0 ? names.join(" | ") : null;
}
