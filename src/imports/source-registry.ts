export interface ImportSourceConfig {
  sourceId: string;
  enabled: boolean;
  adapter: "json-file";
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
];

export function getImportSource(sourceId: string): ImportSourceConfig | undefined {
  return sources.find((source) => source.sourceId === sourceId);
}

export function listImportSources(): readonly ImportSourceConfig[] {
  return sources;
}
