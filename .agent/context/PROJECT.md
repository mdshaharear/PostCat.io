# PostCat Project Context

## Current phase

Local frontend design foundation with reproducible production-container packaging. PostCat is a multi-category affiliate product-discovery concept at `https://postcat.io`; it does not own checkout. Real database, Payload CMS, affiliate feeds, authentication, tracking and production deployment are intentionally deferred.

## Safe assumptions

- Initial locale: `en-US`; mock currency: `USD`.
- Product, variant, merchant and offer identity remain separate.
- Ratings, reviews, freshness, prices and specifications are explicitly demo data.
- Product illustrations are local, fictional SVG assets; no merchant scraping or trademarked branding is used.
- Outbound merchant actions are inactive anchors to the local disclosure.
- Search, category, maximum-price, availability and sorting controls run against the typed local demo catalog; production search infrastructure is deferred.
- Taxonomy contains 12 broad departments and 347 total categories, including 301 descendants under Electronics. Graph validation rejects duplicate IDs/slugs, missing parents and cycles; current mock products are assigned to specific leaves and parent pages aggregate descendant products.
- Empty future categories remain navigable but emit `noindex, follow` and stay out of the sitemap until descendant products make them useful.
- Google and Meta catalog adapters are local mapping/validation foundations only; no feed is uploaded and no platform account is changed.
- Production canonical URLs, sitemap URLs and catalog links require `NEXT_PUBLIC_SITE_URL`; production builds intentionally fail when it is absent or non-HTTPS.
- Architecture should later accept repository-backed PostgreSQL/Payload data without rewriting presentational components.
- Docker uses pinned Node.js 24 LTS, Next.js standalone output, a non-root runtime user, a read-only Compose filesystem and localhost-only default port binding.
- `/api/health` is a cache-free liveness endpoint; it does not claim readiness for future database or feed dependencies.
- Every production build runs `scripts/prepare-standalone.mjs`, copying `public` and `.next/static` into the standalone artifact so local and container runtimes serve the same assets.

## Commands

- Development: `npm run dev`
- Tests: `npm test`
- Type check: `npm run typecheck`
- Lint: `npm run lint`
- Production build: `NEXT_PUBLIC_SITE_URL=https://postcat.io npm run build`
- Standalone runtime: `HOSTNAME=127.0.0.1 PORT=3000 npm run start:standalone`
- Docker Compose: `docker compose up --build`
- Full local quality gate: `NEXT_PUBLIC_SITE_URL=https://postcat.io npm run verify`

## Local verification layers

- Unit/domain tests use Node test runner via `npm test`.
- Browser critical flows use Playwright with installed Chrome via `npm run test:e2e`.
- `npm run test:all` runs both suites.
- Playwright artifacts are ignored; traces and screenshots are retained only for failures.
