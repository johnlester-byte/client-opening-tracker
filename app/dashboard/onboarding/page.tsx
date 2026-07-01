import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">HubSpot Onboarding</h1>
        <p className="text-sm text-muted-foreground">
          Surface HubSpot onboarding deals and contact details without leaving the dashboard.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            This panel will call the HubSpot API using `HUBSPOT_PRIVATE_APP_TOKEN`.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
