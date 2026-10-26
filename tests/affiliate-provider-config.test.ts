import test from "node:test";
import assert from "node:assert/strict";
import { resolveAffiliateProviderConfig, summarizeAffiliateProviders } from "../src/imports/providers/config.ts";
import { listImportSources } from "../src/imports/source-registry.ts";

test("affiliate provider configuration enables eBay and Amazon only with complete server-side credentials", () => {
  const config = resolveAffiliateProviderConfig({
    EBAY_CLIENT_ID: "ebay-client",
    EBAY_CLIENT_SECRET: "ebay-secret",
    EBAY_MARKETPLACE_ID: "EBAY_US",
    EBAY_CAMPAIGN_ID: "campaign-1",
    AMAZON_CREATORS_CREDENTIAL_ID: "amazon-client",
    AMAZON_CREATORS_CREDENTIAL_SECRET: "amazon-secret",
    AMAZON_CREATORS_CREDENTIAL_VERSION: "3.1",
    AMAZON_PARTNER_TAG: "postcat-20",
    AMAZON_MARKETPLACE: "www.amazon.com",
  });
  assert.equal(config.ebay?.marketplaceId, "EBAY_US");
  assert.equal(config.amazon?.tokenEndpoint, "https://api.amazon.com/auth/o2/token");
  assert.equal(config.amazon?.marketplace, "www.amazon.com");
});

test("Amazon credential versions use their required regional token endpoints", () => {
  const amazon = (version: string, marketplace: string) => resolveAffiliateProviderConfig({
    AMAZON_CREATORS_CREDENTIAL_ID: "id",
    AMAZON_CREATORS_CREDENTIAL_SECRET: "secret",
    AMAZON_CREATORS_CREDENTIAL_VERSION: version,
    AMAZON_PARTNER_TAG: "tag",
    AMAZON_MARKETPLACE: marketplace,
  }).amazon?.tokenEndpoint;
  assert.equal(amazon("3.1", "www.amazon.com"), "https://api.amazon.com/auth/o2/token");
  assert.equal(amazon("3.2", "www.amazon.co.uk"), "https://api.amazon.co.uk/auth/o2/token");
  assert.equal(amazon("3.3", "www.amazon.co.jp"), "https://api.amazon.co.jp/auth/o2/token");
});

test("affiliate provider configuration rejects incomplete, public or unsupported credentials", () => {
  assert.throws(() => resolveAffiliateProviderConfig({ EBAY_CLIENT_ID: "only-id" }), /EBAY_CLIENT_SECRET/);
  assert.throws(() => resolveAffiliateProviderConfig({
    AMAZON_CREATORS_CREDENTIAL_ID: "id",
    AMAZON_CREATORS_CREDENTIAL_SECRET: "secret",
    AMAZON_CREATORS_CREDENTIAL_VERSION: "9.9",
    AMAZON_PARTNER_TAG: "tag",
    AMAZON_MARKETPLACE: "www.amazon.com",
  }), /credential version/);
  assert.throws(() => resolveAffiliateProviderConfig({ NEXT_PUBLIC_EBAY_CLIENT_SECRET: "leaked" }), /NEXT_PUBLIC/);
});

test("affiliate readiness summary never exposes credential values", () => {
  const environment = {
    EBAY_CLIENT_ID: "ebay-client-sensitive",
    EBAY_CLIENT_SECRET: "ebay-secret-sensitive",
    EBAY_MARKETPLACE_ID: "EBAY_US",
    EBAY_CAMPAIGN_ID: "campaign-1",
  };
  const summary = summarizeAffiliateProviders(environment);
  const serialized = JSON.stringify(summary);
  assert.equal(summary.ebay.ready, true);
  assert.equal(summary.amazon.ready, false);
  assert.equal(serialized.includes("ebay-client-sensitive"), false);
  assert.equal(serialized.includes("ebay-secret-sensitive"), false);
});

test("authorized provider sources are registered but disabled until credentials are configured", () => {
  const sources = listImportSources();
  assert.equal(sources.find((source) => source.sourceId === "ebay-us")?.adapter, "ebay-browse-api");
  assert.equal(sources.find((source) => source.sourceId === "amazon-us")?.adapter, "amazon-creators-api");
  assert.equal(sources.find((source) => source.sourceId === "ebay-us")?.enabled, false);
  assert.equal(sources.find((source) => source.sourceId === "amazon-us")?.enabled, false);
});
