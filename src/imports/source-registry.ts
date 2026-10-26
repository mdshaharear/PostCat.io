export interface ImportSourceConfig {
  sourceId: string;
  enabled: boolean;
  adapter: "json-file" | "ebay-browse-api" | "amazon-creators-api";
  allowedCurrencies: readonly string[];
  allowedAffiliateHosts: readonly string[];
  allowedImageHosts: readonly string[];
  defaultMode: "full" | "incremental";
  maxMissingRatio: number;
}

const sources: readonly ImportSourceConfig[] = [
  {
    sourceId: "approved-demo-source",
    enabled: true,
    adapter: "json-file",
    allowedCurrencies: ["USD"],
    allowedAffiliateHosts: ["merchant.example"],
    allowedImageHosts: ["images.example"],
    defaultMode: "incremental",
    maxMissingRatio: 0.2,
  },
  {
    sourceId: "ebay-us",
    enabled: false,
    adapter: "ebay-browse-api",
    allowedCurrencies: ["USD"],
    allowedAffiliateHosts: ["ebay.com", "www.ebay.com", "rover.ebay.com"],
    allowedImageHosts: ["i.ebayimg.com", "thumbs.ebaystatic.com"],
    defaultMode: "incremental",
    maxMissingRatio: 0.1,
  },
  {
    sourceId: "amazon-us",
    enabled: false,
    adapter: "amazon-creators-api",
    allowedCurrencies: ["USD"],
    allowedAffiliateHosts: ["amazon.com", "www.amazon.com"],
    allowedImageHosts: ["m.media-amazon.com", "images-na.ssl-images-amazon.com"],
    defaultMode: "incremental",
    maxMissingRatio: 0.1,
  },
];

export function getImportSource(sourceId: string): ImportSourceConfig | undefined {
  return sources.find((source) => source.sourceId === sourceId);
}

export function listImportSources(): readonly ImportSourceConfig[] {
  return sources;
}
