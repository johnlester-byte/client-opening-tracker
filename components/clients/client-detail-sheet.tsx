"use client";

import * as React from "react";
import { AlertTriangle, Check, ExternalLink, Pencil } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDate, isFollowUpOverdue } from "@/lib/client-hub";
import type { ActivityLogEntry, Location, Readiness } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/clients/status-badge";

interface ClientDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location | null;
  userEmail: string;
  onEdit: (location: Location) => void;
  onChanged: () => void;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

export function ClientDetailSheet({
  open,
  onOpenChange,
  location,
  userEmail,
  onEdit,
  onChanged,
}: ClientDetailSheetProps) {
  const [activity, setActivity] = React.useState<ActivityLogEntry[]>([]);
  const [readiness, setReadiness] = React.useState<Readiness | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [togglingField, setTogglingField] = React.useState<"pre_open_done" | "post_open_done" | null>(null);
  const [openingReadiness, setOpeningReadiness] = React.useState(false);

  React.useEffect(() => {
    if (!open || !location) return;

    let cancelled = false;
    setLoading(true);
    const supabase = createClient();

    async function load() {
      try {
        const [activityRes, readinessRes] = await Promise.all([
          supabase
            .from("activity_log")
            .select("*")
            .eq("entity", `location:${location!.id}`)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase.from("readiness").select("*").eq("location_id", location!.id).maybeSingle(),
        ]);

        if (activityRes.error) throw activityRes.error;
        if (readinessRes.error) throw readinessRes.error;

        if (!cancelled) {
          setActivity(activityRes.data ?? []);
          setReadiness(readinessRes.data);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load client details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, location]);

  async function toggleFollowUp(field: "pre_open_done" | "post_open_done") {
    if (!location) return;
    const label = field === "pre_open_done" ? "Pre-open" : "Post-open";
    const nextValue = !location[field];

    setTogglingField(field);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("locations")
        .update({ [field]: nextValue } as never)
        .eq("id", location.id);
      if (error) throw error;

      await supabase.from("activity_log").insert({
        user_email: userEmail,
        action: "updated",
        entity: `location:${location.id}`,
        details: `${label} follow-up marked ${nextValue ? "done" : "not done"} for ${location.name}`,
      } as never);

      toast.success(`${label} follow-up marked ${nextValue ? "done" : "not done"}.`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update follow-up.");
    } finally {
      setTogglingField(null);
    }
  }

  async function openReadinessChecklist() {
    if (!location) return;
    setOpeningReadiness(true);
    const tab = window.open("", "_blank");
    try {
      const res = await fetch("/api/readiness/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: location.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to open readiness checklist.");
      if (tab) tab.location.href = `/readiness/${json.token}`;
      onChanged();
    } catch (err) {
      tab?.close();
      toast.error(err instanceof Error ? err.message : "Failed to open readiness checklist.");
    } finally {
      setOpeningReadiness(false);
    }
  }

  if (!location) return null;

  const overdue = isFollowUpOverdue(location);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <div className="space-y-6 pr-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white">{location.name}</h2>
              <p className="text-sm text-sidebar-foreground/70">{location.client_name}</p>
            </div>
            <StatusBadge status={location.status} />
          </div>

          {overdue && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Follow-up overdue — opening date has passed with pre/post checklist incomplete.
            </div>
          )}

          <Button size="sm" variant="secondary" onClick={() => onEdit(location)} className="gap-2">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>

          <Separator className="bg-sidebar-border" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tier" value={location.tier} />
            <Field label="Opening Date" value={formatDate(location.opening_date)} />
            <Field label="Tracking" value={location.tracker} />
            {location.status === "opened" && (
              <>
                <Field label="Opened Date" value={formatDate(location.opened_date)} />
                <Field label="Open Outcome" value={location.open_outcome} />
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={location.pre_open_done ? "default" : "outline"}
              disabled={togglingField !== null}
              onClick={() => toggleFollowUp("pre_open_done")}
              className="gap-1.5"
            >
              {location.pre_open_done && <Check className="h-3.5 w-3.5" />}
              Pre-open follow-up done
            </Button>
            <Button
              size="sm"
              variant={location.post_open_done ? "default" : "outline"}
              disabled={togglingField !== null}
              onClick={() => toggleFollowUp("post_open_done")}
              className="gap-1.5"
            >
              {location.post_open_done && <Check className="h-3.5 w-3.5" />}
              Post-open follow-up done
            </Button>
          </div>

          {location.notes && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap text-sm">{location.notes}</p>
            </div>
          )}

          <Separator className="bg-sidebar-border" />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Readiness</p>
              <span className="text-sm text-sidebar-foreground/70">{readiness?.pct ?? 0}%</span>
            </div>
            <Progress value={readiness?.pct ?? 0} />
            <Button
              size="sm"
              variant="secondary"
              disabled={openingReadiness}
              onClick={openReadinessChecklist}
              className="mt-2 gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {openingReadiness ? "Opening…" : "Open Readiness Checklist"}
            </Button>
          </div>

          <Separator className="bg-sidebar-border" />

          <div>
            <p className="mb-2 text-sm font-medium">Activity</p>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : activity.length === 0 ? (
              <p className="text-sm text-sidebar-foreground/60">No activity logged yet.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <p>{entry.details ?? entry.action}</p>
                    <p className="text-xs text-sidebar-foreground/50">
                      {entry.user_email} · {formatDate(entry.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
