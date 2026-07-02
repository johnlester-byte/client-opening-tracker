import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nameFromEmail } from "@/lib/client-hub";
import { ClientsTable } from "@/components/clients/clients-table";

export const dynamic = "force-dynamic";

export default async function ClientHubPage() {
  const supabase = createClient();
  const admin = createAdminClient();
  const [{ data: locations, error }, { data: userData }, { data: usersData }] = await Promise.all([
    supabase.from("locations").select("*").order("opening_date"),
    supabase.auth.getUser(),
    admin.auth.admin.listUsers(),
  ]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load clients: {error.message}
      </div>
    );
  }

  const loginRoster = Array.from(
    new Set((usersData?.users ?? []).map((u) => u.email).filter((e): e is string => Boolean(e)).map(nameFromEmail))
  ).sort();

  return (
    <ClientsTable
      initialLocations={locations ?? []}
      userEmail={userData.user?.email ?? ""}
      loginRoster={loginRoster}
    />
  );
}
