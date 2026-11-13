# Book Comeback Companion

## Working in this repository

- Use PowerShell on Windows, Node.js 24 LTS, and the pnpm version declared in package.json. Install from the committed lockfile.
- Run `pnpm lint`, `pnpm test`, and `pnpm build` before handing off changes. For UI changes, also check an iPhone-sized viewport and verify the full add, pause, refresh, and resume flow.
- Keep the product focused on an easy return to reading. Use plain language, generous touch targets, visible keyboard focus, and the existing theme variables. Respect the device’s light or dark setting.
- Keep date-only bookmarks in device-local calendar time. Record session timestamps in UTC and count dashboard weeks from Monday in the device’s time zone.
- Put domain logic in `lib/` and keep browser persistence behind `LibraryRepository`. A progress log updates the book and its session in one write. Preserve existing data when changing the storage schema.
- Keep sample books fictional. Do not put personal records, Notion data, account identifiers, or secrets in source or tests.
- Keep future restart-assistant requests server-side and use only notes explicitly provided by the user. Never infer plot or request full book text.
- Recheck the production service worker after changes to the app shell. Bump its cache version for a new offline release. Ask before external publication, deployment, or creating cloud resources.
