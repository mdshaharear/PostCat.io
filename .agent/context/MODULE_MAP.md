# Module Map

| Feature | Relevant source files |
|---|---|
| Global layout, metadata, design tokens | `src/app/layout.tsx`, `src/app/globals.css` |
| Site name and primary navigation | `src/config/site.ts` |
| Catalog domain types | `src/types/catalog.ts` |
| Central mock entities, taxonomy joins and queries | `src/data/catalog.ts` |
| Google/Meta catalog mapping and validation | `src/data/channel-catalog.ts`, `.agent/context/CHANNEL_CATALOG.md` |
| Authorized import contracts, validation, reconciliation and retries | `src/imports/types.ts`, `src/imports/validation.ts`, `src/imports/engine.ts`, `src/imports/retry.ts` |
| Import scheduling, source allowlist, runner and repository ports | `src/imports/scheduler.ts`, `src/imports/source-registry.ts`, `src/imports/runner.ts`, `src/imports/memory-repository.ts` |
| Local JSON dry-run adapter and safe report CLI | `src/imports/json-adapter.ts`, `src/imports/redaction.ts`, `src/imports/cli.ts` |
| Header, footer, breadcrumbs | `src/components/site-shell.tsx` |
| Product cards, grids, disclosure, empty state | `src/components/catalog-ui.tsx` |
| Mobile menu, filters, variants, newsletter | `src/components/client-controls.tsx` |
| Local product imagery | `src/components/product-visual.tsx`, `public/products/*.svg` |
| Homepage | `src/app/page.tsx` |
| Category directory and nested listings | `src/app/categories/page.tsx`, `src/app/categories/[slug]/page.tsx` |
| Crawl discovery | `src/app/sitemap.ts`, `src/app/robots.ts` |
| Product details | `src/app/products/[slug]/page.tsx` |
| Comparison | `src/app/compare/page.tsx` |
| Search/no-results | `src/app/search/page.tsx` |
| Loading, error, 404 | `src/app/loading.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx` |
| Catalog behavior tests | `tests/catalog.test.ts` |
| Import/update engine tests and non-published dry-run fixture | `tests/catalog-import.test.ts`, `tests/fixtures/authorized-feed.json` |

| Category taxonomy graph and electronics tree | `src/data/category-taxonomy.ts`, `src/data/electronics-taxonomy.ts`, `tests/category-taxonomy.test.ts` |
| Local import validation/planning primitives | `src/imports/*.ts`, `tests/catalog-import.test.ts` |
| Browser interaction tests | `playwright.config.ts`, `tests/e2e/critical-flows.spec.ts` |

| Container packaging and local runtime hardening | `Dockerfile`, `.dockerignore`, `compose.yaml`, `next.config.ts`, `scripts/prepare-standalone.mjs` |
| Liveness and standalone packaging tests | `src/app/api/health/route.ts`, `tests/health.test.ts`, `tests/standalone-packaging.test.ts` |
| GitHub quality/container checks | `.github/workflows/ci.yml` |
