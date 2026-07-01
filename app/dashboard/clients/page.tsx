import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Client Hub</h1>
        <p className="text-sm text-muted-foreground">
          Track client location opening dates, status, and CSA ownership.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            The client tracker table will live here, backed by the `locations` table.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
