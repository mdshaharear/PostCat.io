# Channel Catalog Readiness

## Current foundation

`src/data/channel-catalog.ts` transforms the canonical product, variant and offer model into separate Google and Meta catalog item shapes. Each output row has a stable variant-level `id`, shared product `item_group_id`, variant color, title, description, selected known offer price, landing-page link, image link, brand, product type, explicit Google category mapping, category labels and explicit identifier status.

Google Merchant Center and Meta catalogs share many core commerce fields, but their accepted availability strings differ; the project therefore keeps separate platform adapters instead of forcing one ambiguous feed shape.[1][2]

The current builders are local mapping and validation foundations only. They do not upload feeds, create catalogs, call platform APIs or claim that fictional demo products are eligible for publication.

## Before a real feed can be exported

- Set `NEXT_PUBLIC_SITE_URL` to the approved production HTTPS origin.
- Replace fictional products, prices, dates, ratings and offers with authorized source data.
- Add real GTIN or manufacturer MPN when available; do not invent identifiers.
- Confirm image rights and replace SVG demo art with channel-compatible final images.
- Add market-specific currency, shipping, tax, policy and availability rules.
- Validate landing-page price and availability parity immediately before publication.
- Keep Google and Meta field/value validation separate.
- Add deterministic CSV/XML/JSON export and post-export validation tests.
- Upload or schedule feeds only after explicit approval and credential setup.

## Implemented checks

- Required feed fields are non-empty.
- Production builds fail unless `NEXT_PUBLIC_SITE_URL` is an explicit HTTPS origin.
- Product and image links must use HTTPS.
- Price uses decimal amount plus ISO currency.
- One selected known offer is emitted per variant; unknown availability is excluded rather than guessed.
- Variants share `item_group_id` and retain unique variant IDs.
- Google uses underscore availability values; Meta uses spaced availability values.
- Every exported product requires an explicit Google taxonomy mapping; internal category paths are not substituted.
- Parent department and leaf subcategory are available as custom labels.

## Sources

[1] Google Merchant Center Help, “Product data specification”: https://support.google.com/merchants/answer/7052112?hl=en

[2] Meta Business Help, “Product data specifications for catalogues in Commerce Manager”: https://www.facebook.com/business/help/120325381656392
