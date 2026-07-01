import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OpsGuidePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">OPS Guide</h1>
        <p className="text-sm text-muted-foreground">
          Searchable internal knowledge base for common CS issues and escalation paths.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Troubleshooting articles and escalation paths will be searchable here.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
