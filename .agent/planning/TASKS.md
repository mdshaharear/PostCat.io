# Tasks

## Completed

- [x] Inspect workspace and installed Node/npm/git toolchain.
- [x] Initialize local Git repository with no remote.
- [x] Create Next.js App Router, strict TypeScript and Tailwind foundation.
- [x] Define responsive PostCat design system and shared shell.
- [x] Model Category, Brand, CanonicalProduct, ProductVariant, Merchant, Offer and ProductImage separately.
- [x] Create centralized typed mock catalog and pure queries.
- [x] Build homepage, category, product, comparison and search routes.
- [x] Add loading, error, empty and 404 states.
- [x] Add mobile navigation/filter alternatives and visible focus behavior.
- [x] Expand the catalog taxonomy to 12 departments and 40+ nested subcategories.
- [x] Make parent categories discover products assigned to descendant leaf categories.
- [x] Add an all-departments directory, subcategory navigation and taxonomy breadcrumbs.
- [x] Add Google/Meta catalog mapping and validation foundations without external uploads.
- [x] Add canonical metadata, sitemap and robots discovery foundations.
- [x] Run tests, type check, lint and production build.
- [x] Expand the fictional local catalog to 24 products and 48 variants with local SVG visuals.
- [x] Add functional local query, department, price, availability and sort controls.
- [x] Redesign the homepage, responsive header/mega-menu, product cards and footer for PostCat.
- [x] Centralize the `PostCat` brand and `https://postcat.io` production origin.
- [x] Add WebSite JSON-LD, non-indexable search metadata and `/llms.txt` public discovery context.
- [x] Expand Electronics into a 301-node gadget taxonomy covering phones, PC components, CPUs, GPUs, peripherals, networking, audio, cameras, wearables, gaming, smart home, power, cables, office electronics and maker hardware.
- [x] Add taxonomy graph validation, cycle-safe traversal, deep breadcrumbs and precise product leaf assignment.
- [x] Keep empty future categories `noindex, follow`, exclude them from sitemap discovery and replace flat directory/filter rendering with scalable branch navigation and a deep-category selector.
- [x] Add an authorized-source import/update core with runtime validation, stable identities, content fingerprints, incremental/full reconciliation and destructive-snapshot guards.
- [x] Add source leases, atomic in-memory repository execution, dry-run reporting, run history, bounded JSON parsing and nested secret redaction.
- [x] Add a local `npm run import:dry-run` command that plans an approved JSON fixture without importing or publishing products.
- [x] Add local, network-free import validation, fingerprinting, reconciliation guards, retry classification and schedule helpers.
- [x] Add Playwright critical-flow coverage for desktop and mobile Chrome.
- [x] Add Next.js standalone output, pinned multi-stage Docker image and hardened local Compose configuration.
- [x] Add a cache-free `/api/health` endpoint and CI checks for source quality plus hardened Compose startup.
- [x] Package `public` and `.next/static` into standalone output and verify CSS/product assets on a non-default runtime port.
- [x] Add digest-pinned GHCR publication, protected Production deployment workflow and post-publish container smoke test.
- [x] Add hardened VPS provisioning/deploy/rollback and existing-host Nginx operations foundation.
- [x] Make rollback reuse a cached previous image digest before attempting a registry pull.
- [x] Add server-only Contabo Object Storage configuration, signed URL, content-hash metadata verification and read-only audit foundations.
- [x] Resolve homepage canonical normalization and restore the full Playwright suite to green.

## Pending

- [ ] Replace mock repository with approved Payload CMS/PostgreSQL data layer after design approval.
- [ ] Add authorized affiliate feed adapters and real offer provenance/freshness rules.
- [ ] Replace demo channel mappings with approved identifiers, image rights, market rules and deterministic export files.
- [ ] Connect Google Merchant Center or Meta Commerce Manager only after explicit approval and credentials.
- [x] Add browser-level automated accessibility and interaction tests.
- [ ] Add image rights/provenance handling before importing real product media.

## Blocked / intentionally out of scope

- Actual production deployment, merchant APIs, authentication, tracking and external service provisioning require explicit approval and credentials.
- GitHub remote/authentication and commit identity are configured, but the current deployment/storage changes have not been committed or pushed in this session.
- A local Docker engine is not installed/on `PATH`; the standalone server is verified locally, while the image build is delegated to the committed CI workflow until Docker is available.
- Live VPS, DNS/TLS, protected GitHub environment settings and a real Contabo bucket audit remain external acceptance steps.
