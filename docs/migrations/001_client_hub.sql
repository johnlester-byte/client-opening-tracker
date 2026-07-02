-- Client Hub — add CSA ownership and HubSpot deal linkage to locations.
-- Idempotent: safe to re-run, safe if columns already exist.
alter table locations add column if not exists csa_owner text;
alter table locations add column if not exists hubspot_deal_id text;
