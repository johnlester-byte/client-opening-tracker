import { ClipboardList, AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { computeClientStats } from "@/lib/client-hub";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const supabase = createClient();
  const { data: locations, error } = await supabase.from("locations").select("*");

  const stats = computeClientStats(locations ?? []);

  const STATS = [
    { label: "Active clients", value: stats.totalActive, icon: ClipboardList },
    { label: "At-risk openings", value: stats.atRisk, icon: AlertTriangle },
    { label: "Follow-ups due", value: stats.followUpsOverdue, icon: CalendarClock },
    { label: "Opened this month", value: stats.openedThisMonth, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">Client Opening Tracker summary at a glance.</p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load stats: {error.message}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
