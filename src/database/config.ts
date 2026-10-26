export interface DatabaseConfig {
  connectionString: string;
  host: string;
  port: number;
  database: string;
  safeLabel: string;
}

export function resolveDatabaseConfig(value: string | undefined, environment = process.env.NODE_ENV): DatabaseConfig {
  if (!value?.trim()) {
    if (environment === "production") throw new Error("DATABASE_URL is required in production");
    throw new Error("DATABASE_URL is not configured");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL");
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use PostgreSQL");
  }
  if (!url.hostname || !url.pathname.slice(1)) throw new Error("DATABASE_URL must include a host and database name");

  const port = url.port ? Number(url.port) : 5432;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("DATABASE_URL contains an invalid port");
  const database = decodeURIComponent(url.pathname.slice(1));
  const host = url.hostname;

  return {
    connectionString: value,
    host,
    port,
    database,
    safeLabel: `postgresql://${host}:${port}/${database}`,
  };
}
