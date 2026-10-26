type Environment = Readonly<Record<string, string | undefined>>;

export interface EbayProviderConfig {
  clientId: string;
  clientSecret: string;
  marketplaceId: string;
  campaignId: string;
  tokenEndpoint: "https://api.ebay.com/identity/v1/oauth2/token";
  browseEndpoint: "https://api.ebay.com/buy/browse/v1";
}

export interface AmazonProviderConfig {
  credentialId: string;
  credentialSecret: string;
  credentialVersion: "3.1" | "3.2" | "3.3";
  partnerTag: string;
  marketplace: string;
  tokenEndpoint: "https://api.amazon.com/auth/o2/token" | "https://api.amazon.co.uk/auth/o2/token" | "https://api.amazon.co.jp/auth/o2/token";
}

export interface AffiliateProviderConfig {
  ebay?: EbayProviderConfig;
  amazon?: AmazonProviderConfig;
}

function nonEmpty(environment: Environment, name: string): string | undefined {
  const value = environment[name]?.trim();
  return value || undefined;
}

function rejectPublicSecrets(environment: Environment): void {
  const exposed = Object.entries(environment).find(([name, value]) => name.startsWith("NEXT_PUBLIC_") && value && /(SECRET|TOKEN|PASSWORD|PRIVATE|CREDENTIAL)/.test(name));
  if (exposed) throw new Error(`${exposed[0]} must not use NEXT_PUBLIC for affiliate credentials`);
}

function requireTogether(environment: Environment, names: readonly string[]): string[] | undefined {
  const values = names.map((name) => nonEmpty(environment, name));
  if (values.every((value) => value === undefined)) return undefined;
  const missing = names.filter((_, index) => values[index] === undefined);
  if (missing.length) throw new Error(`${missing.join(", ")} required when configuring this affiliate provider`);
  return values as string[];
}

export function resolveAffiliateProviderConfig(environment: Environment): AffiliateProviderConfig {
  rejectPublicSecrets(environment);
  const result: AffiliateProviderConfig = {};

  const ebay = requireTogether(environment, ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET", "EBAY_MARKETPLACE_ID", "EBAY_CAMPAIGN_ID"]);
  if (ebay) {
    result.ebay = {
      clientId: ebay[0],
      clientSecret: ebay[1],
      marketplaceId: ebay[2],
      campaignId: ebay[3],
      tokenEndpoint: "https://api.ebay.com/identity/v1/oauth2/token",
      browseEndpoint: "https://api.ebay.com/buy/browse/v1",
    };
  }

  const amazon = requireTogether(environment, [
    "AMAZON_CREATORS_CREDENTIAL_ID",
    "AMAZON_CREATORS_CREDENTIAL_SECRET",
    "AMAZON_CREATORS_CREDENTIAL_VERSION",
    "AMAZON_PARTNER_TAG",
    "AMAZON_MARKETPLACE",
  ]);
  if (amazon) {
    if (!(["3.1", "3.2", "3.3"] as const).includes(amazon[2] as "3.1" | "3.2" | "3.3")) {
      throw new Error("unsupported Amazon Creators API credential version");
    }
    const tokenEndpoints = {
      "3.1": "https://api.amazon.com/auth/o2/token",
      "3.2": "https://api.amazon.co.uk/auth/o2/token",
      "3.3": "https://api.amazon.co.jp/auth/o2/token",
    } as const;
    result.amazon = {
      credentialId: amazon[0],
      credentialSecret: amazon[1],
      credentialVersion: amazon[2] as "3.1" | "3.2" | "3.3",
      partnerTag: amazon[3],
      marketplace: amazon[4],
      tokenEndpoint: tokenEndpoints[amazon[2] as "3.1" | "3.2" | "3.3"],
    };
  }

  return result;
}

export function summarizeAffiliateProviders(environment: Environment): {
  ebay: { ready: boolean; missing: string[] };
  amazon: { ready: boolean; missing: string[] };
} {
  const status = (names: readonly string[]) => ({
    ready: names.every((name) => Boolean(nonEmpty(environment, name))),
    missing: names.filter((name) => !nonEmpty(environment, name)),
  });
  return {
    ebay: status(["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET", "EBAY_MARKETPLACE_ID", "EBAY_CAMPAIGN_ID"]),
    amazon: status(["AMAZON_CREATORS_CREDENTIAL_ID", "AMAZON_CREATORS_CREDENTIAL_SECRET", "AMAZON_CREATORS_CREDENTIAL_VERSION", "AMAZON_PARTNER_TAG", "AMAZON_MARKETPLACE"]),
  };
}
