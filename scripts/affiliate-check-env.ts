import { resolveAffiliateProviderConfig, summarizeAffiliateProviders } from "../src/imports/providers/config.ts";

const summary = summarizeAffiliateProviders(process.env);
resolveAffiliateProviderConfig(process.env);
console.log(JSON.stringify(summary, null, 2));
if (!summary.ebay.ready && !summary.amazon.ready) process.exitCode = 2;
