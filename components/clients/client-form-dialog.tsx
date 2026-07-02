"use client";

import * as React from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { joinTracker, parseTracker } from "@/lib/client-hub";
import type { Location, LocationStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS: LocationStatus[] = ["on-track", "at-risk", "delayed", "opened"];

interface FormState {
  id: string;
  client_name: string;
  name: string;
  tier: string;
  opening_date: string;
  tracker: string[];
  status: LocationStatus;
  notes: string;
  opened_date: string;
  open_outcome: string;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "location"
  );
}

function toFormState(location?: Location): FormState {
  return {
    id: location?.id ?? "",
    client_name: location?.client_name ?? "",
    name: location?.name ?? "",
    tier: location?.tier ?? "",
    opening_date: location?.opening_date ?? "",
    tracker: parseTracker(location?.tracker ?? null),
    status: location?.status ?? "on-track",
    notes: location?.notes ?? "",
    opened_date: location?.opened_date ?? "",
    open_outcome: location?.open_outcome ?? "",
  };
}

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: Location;
  userEmail: string;
  trackerRoster: string[];
  onSaved: () => void;
}

export function ClientFormDialog({
  open,
  onOpenChange,
  location,
  userEmail,
  trackerRoster,
  onSaved,
}: ClientFormDialogProps) {
  const [form, setForm] = React.useState<FormState>(() => toFormState(location));
  const [saving, setSaving] = React.useState(false);
  const isEdit = Boolean(location);

  React.useEffect(() => {
    if (open) {
      setForm(toFormState(location));
    }
  }, [open, location]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.opening_date) {
      toast.error("Location name and opening date are required.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      const id = isEdit ? location!.id : slugify(form.name);

      const payload: Partial<Location> = {
        id,
        client_name: form.client_name || null,
        name: form.name,
        tier: form.tier || null,
        opening_date: form.opening_date,
        tracker: joinTracker(form.tracker),
        status: form.status,
        notes: form.notes || null,
        opened_date: form.status === "opened" ? form.opened_date || null : null,
        open_outcome: form.status === "opened" ? form.open_outcome || null : null,
      };

      // @supabase/ssr's createBrowserClient<Database> mistypes .update()/.insert() as `never`
      // regardless of the Database generic (confirmed upstream typing defect, not a local
      // schema mistake — `payload` itself is fully typed as Partial<Location> above).
      if (isEdit) {
        const { error } = await supabase.from("locations").update(payload as never).eq("id", id);
        if (error) throw error;
      } else {
        const insertPayload = { ...payload, pre_open_done: false, post_open_done: false };
        const { error } = await supabase.from("locations").insert(insertPayload as never);
        if (error) throw error;
      }

      const activityPayload = {
        user_email: userEmail,
        action: isEdit ? "updated" : "created",
        entity: `location:${id}`,
        details: `${isEdit ? "Updated" : "Created"} ${form.name}`,
      };
      await supabase.from("activity_log").insert(activityPayload as never);

      toast.success(isEdit ? "Client updated." : "Client added.");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save client.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Client" : "Add Client"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update location details. Changes are logged to the activity feed."
              : "Add a new client location to the tracker."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="client_name">Client Name</Label>
              <Input
                id="client_name"
                value={form.client_name}
                onChange={(e) => update("client_name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Location</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tier">Tier</Label>
              <Input id="tier" value={form.tier} onChange={(e) => update("tier", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opening_date">Opening Date</Label>
              <Input
                id="opening_date"
                type="date"
                required
                value={form.opening_date}
                onChange={(e) => update("opening_date", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tracking</Label>
            <TrackingMultiSelect
              selected={form.tracker}
              roster={trackerRoster}
              onChange={(names) => update("tracker", names)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v as LocationStatus)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.status === "opened" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="opened_date">Opened Date</Label>
                <Input
                  id="opened_date"
                  type="date"
                  value={form.opened_date}
                  onChange={(e) => update("opened_date", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="open_outcome">Open Outcome</Label>
                <Input
                  id="open_outcome"
                  value={form.open_outcome}
                  onChange={(e) => update("open_outcome", e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TrackingMultiSelect({
  selected,
  roster,
  onChange,
}: {
  selected: string[];
  roster: string[];
  onChange: (names: string[]) => void;
}) {
  // Union so a name already on this record but missing from the roster stays visible and toggleable.
  const options = Array.from(new Set([...roster, ...selected]));

  function toggle(name: string, checked: boolean) {
    onChange(checked ? [...selected, name] : selected.filter((n) => n !== name));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start font-normal">
          {selected.length > 0 ? selected.join(" | ") : "Select tracking..."}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
        {options.map((name) => (
          <DropdownMenuCheckboxItem
            key={name}
            checked={selected.includes(name)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(checked) => toggle(name, checked)}
          >
            {name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
