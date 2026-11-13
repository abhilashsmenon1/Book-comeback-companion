# Book Comeback Companion

A calm, mobile-first PWA for returning to unfinished books. Manage four reading
shelves, save bookmarks and sessions, and start a 15-minute reading ritual.

**Works locally without cloud accounts.** Optional Supabase sync is experimental
and requires setup and integration testing before use. No paid AI calls.

New here? Start with the Windows setup below.
Reuse and contributions are welcome under the [MIT license](LICENSE);
see [contributing](CONTRIBUTING.md).

## Sync and recovery (prepared, not yet connected)

Supabase email-code sign-in, account-isolated cloud libraries, conflict review and
30 rolling cloud recovery snapshots are implemented behind optional build configuration.
See [Supabase setup](supabase/SETUP.md) for migration, email template, security checks
and the phone-first migration procedure. Without configuration, the app remains local.
Cloud integration/security verification is required against a real project before launch.

Every local save now retains one automatic recovery copy. **Undo the last library
change** restores that copy, including reading sessions, and refuses stale requests.
This is device-local recovery, not an independent backup. Existing storage is preserved.

## Reading flow update

The default reading screen offers one Start reading button. On iPhone it invokes
an Apple Shortcut named exactly **Book Comeback Reading**, passing a validated,
encoded Brave music URL as text input. The user must create this shortcut once:
1. Clock: Start Timer, 15 minutes.
2. Open URLs: select Shortcut Input as the URL.

Save a YouTube track in the app and confirm shortcut setup to enable the button.
The website does not run an internal countdown, install shortcuts, confirm Clock
execution, or guarantee YouTube autoplay/background audio. The user may need to
accept an iOS app-opening prompt and press Play in Brave. Retrying Start reading
can create another native timer; Open music only is available under Reading music.
Actual native handoff requires testing on iPhone. Desktop tests cover URL encoding.

Open in Notion opens the Notion app, or a per-book HTTPS Notion page link if saved.
iOS decides whether page links open in the app or browser. Previous local notes
remain accessible under Previous notes and in library backups; new notes are written
in Notion. No notes are transmitted by the application. Progress is still saved locally.
Shortcut confirmation, Notion page links, and music preferences are device-local settings
and are not included in library backups. No personal links are committed to source.

Updates retain the same library storage key and version. Before installing an
update, download a fresh backup from the phone you read on. Keep using the same
site address and Home Screen app; clearing website data or changing browsers can
lose access to that device’s library. Cloud synchronization is inactive until configured.

## Run on Windows

Install Node.js 24 LTS and pnpm 11.25.0. From this project directory in PowerShell, run the following commands.

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Use the URL printed by Next.js if it selects a different port. Use the same URL and port each time to reopen the same local library.

If PowerShell cannot find `pnpm` and the project dependencies are already installed, start the app directly from the project directory.

```powershell
node .\node_modules\next\dist\bin\next dev
```

For a fresh setup, install Node.js 24 LTS, then run `npm install --global pnpm@11.25.0`. Open a new PowerShell window and run the setup commands above.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start Next.js with live reload |
| `pnpm lint` | Run Biome linting |
| `pnpm test` | Run TypeScript unit tests with Node’s test runner |
| `pnpm build` | Compile and type-check a production build with Next.js and webpack |
| `pnpm start` | Serve the exported production app locally after `pnpm build` |

## Use the app

1. Open **My Library** and choose **Add book**. Set a status and save a page, chapter, or both. Page count, reading date, and notes are optional. Four fictional sample books are available to explore and can be removed individually.
2. Choose **Pause book** from a book you’re reading or set **Paused** in **Edit book**. The library’s **Resume reading** shortcut prioritizes your own paused books. The default Read screen prefers your own currently reading book.
3. Check your bookmark, optionally start the configured iPhone shortcut, and use **Done for now** to save progress on the Read screen. Book details also offer progress recording. Saving logs a session and moves a paused book back to **Currently Reading**. Choose **Mark finished** when you reach the end.
4. Open **Dashboard** for counts by shelf and sessions since Monday in your device’s time zone. Editing metadata does not log a reading session.

## iPhone and offline use

The interface follows the device’s light or dark appearance. It targets iPhone Safari 16.4 or later and modern desktop browsers. For iPhone testing, start Next.js with `pnpm dev --hostname 0.0.0.0` and open the Windows computer’s LAN address from Safari on the same network. Windows Firewall must allow the connection. Plain HTTP over the LAN supports browser testing. Use a trusted HTTPS origin for full iPhone PWA testing and service-worker support.

On an HTTPS origin, open the production app in Safari and use **Share → Add to Home Screen**. If Safari offers **Open as Web App**, leave it on. The production app registers a service worker that caches the app shell after an online visit. To test offline behavior on Windows, use `pnpm build` then `pnpm start`, open localhost once, wait for the worker to activate, and reload while offline. The optional timer runs in Apple Clock through your shortcut, not in the website.

## Architecture and data

- **Next.js App Router** exports the app shell, metadata, and web manifest to `out/` for static HTTPS hosting. The reading room uses local hash navigation so every book view can reopen from the same offline shell.
- **React and Tailwind CSS** handle the responsive interface. Theme variables follow the operating system.
- **`lib/books.ts` and `lib/library.ts`** define validation, calendar logic, and domain updates. **`lib/local-library.ts`** implements the asynchronous `LibraryRepository` with versioned `localStorage`. It saves a session and its updated bookmark together.
- **`lib/sync.ts` and `lib/supabase.ts`** implement optional three-way merging and authenticated cloud exchange. See the setup guide before enabling them.
- **`lib/restart-assistant.ts`** defines the future notes-only assistant contract. There is no AI implementation or AI request. Future provider calls and secret keys belong on a server.

**In local mode, data is specific to the browser, device, and app origin. It is not synchronized or independently backed up.** The single local undo copy is lost if site data is cleared. Changing browser profiles or ports, or using an isolated Home Screen storage context can result in a different or empty library. Sample books are included in dashboard shelf counts. Removing a book deletes its session history in the current library.

## Back up and transfer

Choose **Back up or transfer your library** at the bottom of the library. **Download library** saves a versioned JSON file with books, personal notes, positions, and sessions. Store that file somewhere you trust.

On iPhone, install the hosted app first, then open the Home Screen app and use the same transfer screen to select the JSON file from Files. Review the preview and choose **Import library**. New books and missing sessions are added in one storage write. Existing personal books keep their current fields, and fictional examples are replaced. Repeating an import avoids duplicate identifiers. Import is a transfer and recovery tool, not two-way synchronization.

The importer validates file size (5 MB maximum), schema version, identifiers, bookmarks, and session references before saving. Unknown file fields are discarded. Personal backups belong outside the source repository. The ignored `backups/` directory can hold local copies.

## Phase 2

Complete Supabase integration testing, account isolation checks, and phone-first migration before enabling sync on both iPhones. The initial database design stores one JSON library snapshot per account, rather than normalized book/session tables. A later server-side restart assistant can use explicitly supplied notes to return short recall prompts and a restart card, with no inferred plot, spoilers, or full-book text.

## Hosting your own copy

Run `pnpm build` and serve the generated `out/` directory from a trusted HTTPS
static host at the domain root. No Node server is required in production. The
included `pnpm start` server is a local preview, not a production hosting service.
The manifest and service worker use root-relative URLs; GitHub Pages project
subpaths need additional base-path and service-worker work. Publishing the source
on GitHub does not automatically deploy a public app or connect a shared database.
Each operator should configure their own Supabase project if enabling cloud sync.

## Framework references

- [Next.js App Router setup](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Tailwind CSS browser compatibility](https://tailwindcss.com/docs/compatibility)
- [WebKit Home Screen web apps](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
