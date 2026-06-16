alter table "public"."accounts" enable row level security;
alter table "public"."articles" enable row level security;
alter table "public"."bookmarks" enable row level security;
alter table "public"."editions" enable row level security;
alter table "public"."hidden_items" enable row level security;
alter table "public"."sessions" enable row level security;
alter table "public"."stock_cache" enable row level security;
alter table "public"."users" enable row level security;
alter table "public"."verification_tokens" enable row level security;
alter table "public"."weather_cache" enable row level security;

-- MorningStack uses a server-side Postgres owner connection; Data API roles stay closed by default.
create policy "Deny Data API access to accounts"
on "public"."accounts"
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny Data API access to articles"
on "public"."articles"
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny Data API access to bookmarks"
on "public"."bookmarks"
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny Data API access to editions"
on "public"."editions"
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny Data API access to hidden_items"
on "public"."hidden_items"
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny Data API access to sessions"
on "public"."sessions"
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny Data API access to stock_cache"
on "public"."stock_cache"
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny Data API access to users"
on "public"."users"
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny Data API access to verification_tokens"
on "public"."verification_tokens"
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny Data API access to weather_cache"
on "public"."weather_cache"
for all
to anon, authenticated
using (false)
with check (false);
