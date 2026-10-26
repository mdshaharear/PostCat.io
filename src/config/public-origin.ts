export function resolvePublicOrigin(value: string | undefined, environment: string | undefined): string {
  if (!value) {
    if (environment === "production") {
      throw new Error("NEXT_PUBLIC_SITE_URL is required for production builds");
    }
    return "http://localhost:3000";
  }
  const url = new URL(value);
  if (environment === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS in production");
  }
  return url.origin;
}

export function getPublicOrigin(): string {
  return resolvePublicOrigin(process.env.NEXT_PUBLIC_SITE_URL, process.env.NODE_ENV);
}
