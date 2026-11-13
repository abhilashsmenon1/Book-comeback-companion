# Contributing

Use Node.js 24 LTS and pnpm 11.25.0. Install with `pnpm install --frozen-lockfile`.
Read [AGENTS.md](AGENTS.md) for code and data conventions.

Before a pull request, run `pnpm lint`, `pnpm test`, and `pnpm build`.
For interface changes, check an iPhone-sized viewport and add a fictional book,
pause it, refresh, resume, and verify saved progress. Never use personal records
in fixtures, screenshots, issue reports, or commits. Preserve existing storage.

Describe the problem, the resulting behavior, validation, and any limitations.
Keep changes small. Cloud features require the separate integration and security
checks in [Supabase setup](supabase/SETUP.md); unit tests do not replace them.

Do not commit `.env.local`, library exports, credentials, or hosting metadata.
For suspected security flaws, avoid posting credentials or private data in public
issues. This project has no staffed security response service or uptime guarantee.
