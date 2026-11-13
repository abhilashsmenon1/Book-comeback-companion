# Supabase setup and launch

The cloud features are prepared but inactive until a real project is configured and
the database migration/security tests are run. Do not describe this as live sync yet.
No project, paid plan, email delivery service, or cloud database has been created by this change.

## Project and email sign-in

1. Choose an existing project or explicitly authorize a new Supabase project.
   Confirm its organization, region and plan before creating it. No paid upgrades are required by this code.
2. In the SQL editor or Supabase migration workflow, apply
   `supabase/migrations/202611120001_reading_sync.sql` once. It creates account-owned
   libraries and a rolling history of 30 revisions. Keep migration history immutable.
3. Configure Email auth for email OTP sign-in. Change the Magic Link email template
   to display `{{ .Token }}` as the sign-in code; this UI verifies the typed code and
   does not process magic-link callbacks. Configure allowed recipients or SMTP as
   required by your Supabase project. Verify email delivery before publishing.
4. Set the site URL in Supabase Auth to the existing hosted app's HTTPS origin.
5. Copy `.env.example` to `.env.local` and set the Project URL and the **publishable**
   key. Never use `sb_secret_...`, a service-role key, or database password in browser
   configuration. Neither actual value belongs in source or Git.
6. Rebuild with these environment variables present. This is a static Next export:
   `NEXT_PUBLIC_*` values become public build configuration. Changing hosting runtime
   environment variables alone does not update the bundle. The publishable key is
   intentionally public; RLS and authenticated server-side functions protect data.

## Mandatory validation before cloud launch

- Run `pnpm lint`, `pnpm test`, and `pnpm build`.
- Run `supabase/tests/security.sql` against a **test/local** database with the migration
  applied. It uses fictional fixtures and rolls back; it checks user isolation,
  anonymous denial, direct-write denial, stale revisions and backup retention.
- Test two distinct email accounts; neither should see the other's cloud books or backups.
- Test two browsers with the same account: edit different books, then the same book;
  independent edits merge and same-book changes require an explicit review.
- Test offline progress, reconnect, sign-out, expired auth, failed writes, restore,
  and recovery from a full localStorage quota. Supabase integration tests cannot be
  considered passed until exercised against an actual configured project.
- Keep the Sites access policy private. Supabase sign-in is additional authentication;
  it does not grant a second adult access through the existing ChatGPT hosting gate.
  Sharing the hosted site with another adult requires explicit user authorization.

## First sync on the phone (the authoritative starting library)

1. Download a fresh library backup from the phone before connecting.
2. Sign in under **Sync & backup**, then choose **Review device and cloud**.
3. On the phone, choose **Use this device's library in cloud** after reviewing both.
   Sample books are excluded. No data is uploaded merely by signing in.
4. On another device, sign into the same account, review, then choose **Use cloud
   library on this device**. Its previous local library is retained as the undo copy.
5. Afterwards, saves trigger automatic sync while the app is open. It also checks
   every 30 seconds while visible and when the device comes online or the app returns
   to the foreground. There is no background sync while the app is closed.

## Recovery and limits

Local saves atomically retain a single prior library version in the same localStorage
item. Undo includes books, notes and reading sessions, survives refresh, and rejects
a stale undo button. Cloud sync metadata is retained through undo so the restored
state can sync as a new revision. Failed local writes preserve the previous item.

The cloud save RPC serializes each account's writes, requires the expected revision,
and retains the latest 30 successful snapshots. Restoring a reviewed snapshot creates
a new revision. These recovery copies share the Supabase project, so they do not
replace independent exported backups or a provider disaster-recovery plan.

Whole-book three-way merging is deliberately conservative. Concurrent edits to one
book require choosing the device or cloud library; no automatic last-writer-wins.
Review choices reject stale local or remote revisions. Each network request times out
after 15 seconds; local mutations can wait on the sync lock while an exchange completes.

Sign-out leaves this device's local library available offline, still linked to the
original account. Another account cannot sync that copy. Use separate browser profiles
or separate devices for the two adults. There is no account-switch migration UI yet.
Music, shortcut setup, and per-book Notion links remain device-local preferences;
this first cloud version synchronizes books, notes, bookmarks and reading sessions only.
