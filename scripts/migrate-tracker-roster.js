// One-off data migration: tracking is now limited to people who can log in.
// For each location.tracker, drop any name that doesn't match a real login account
// (matched by first name derived from email, e.g. rhen.pabalan@podplay.app -> Rhen).
// Idempotent — safe to re-run.
const { createClient } = require("@supabase/supabase-js");

function nameFromEmail(email) {
  const local = email.split("@")[0];
  const first = local.split(".")[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) throw usersError;
  const roster = new Set(usersData.users.map((u) => nameFromEmail(u.email)));
  console.log("Roster:", [...roster].join(", "));

  const { data: locations, error: locationsError } = await supabase
    .from("locations")
    .select("id,name,tracker");
  if (locationsError) throw locationsError;

  let updated = 0;
  for (const loc of locations) {
    if (!loc.tracker) continue;
    const names = loc.tracker.split("|").map((s) => s.trim()).filter(Boolean);
    const kept = names.filter((n) => roster.has(n));
    const dropped = names.filter((n) => !roster.has(n));
    if (dropped.length === 0) continue;

    const newTracker = kept.length > 0 ? kept.join(" | ") : null;
    console.log(`Updating ${loc.name}: "${loc.tracker}" -> "${newTracker}" (dropped: ${dropped.join(", ")})`);
    const { error } = await supabase.from("locations").update({ tracker: newTracker }).eq("id", loc.id);
    if (error) {
      console.error(`  Failed to update ${loc.name}:`, error);
      continue;
    }
    updated++;
  }
  console.log(`Done. Updated ${updated} location(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
