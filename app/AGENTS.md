<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Application verification

Root `../AGENTS.md` owns delivery, migration and production-data policy. Read affected domain architecture notes when available; historical handoffs are evidence, not current commands.

- Run npm commands here. Read `package.json` for definitions instead of historical test counts.
- Before delivering application changes, run `npm run check` and verify both static export and production server build. If check does not include build, run `npm run build` separately.
- Run `npm run test:integration` for database/concurrency changes and `npm run test:browser` for affected UI/offline flows when available. Otherwise perform an equivalent scoped check and record it; do not silently skip required scenarios.
- Builds rendering taxa require seeded local data. Use the disposable setup in `../docs/DEVELOPMENT.md` when present; otherwise inspect current setup before migrations or seeding. Never substitute production credentials.
- Offline and worker checks use `next start` after a production build, not `next dev`. Use Chrome/CDP or the iOS Simulator when the embedded browser cannot run service workers.
- Preserve the generated Next.js block. Read relevant bundled Next.js guides before coding, not the entire documentation tree.
