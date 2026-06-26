import type { H3Event } from "h3";
import { betterAuth } from "better-auth";
import { withoutProtocol } from "ufo";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getRequestHost, getRequestProtocol } from "h3";
import { db } from "@nuxthub/db";
import { user, session, account, verification } from "@nuxthub/db/schema";

function normalizeLoopbackOrigin(origin: string): string {
  if (!import.meta.dev) return origin;

  try {
    const url = new URL(origin);
    if (url.hostname === "127.0.0.1" || url.hostname === "::1" || url.hostname === "[::1]") {
      url.hostname = "localhost";
      return url.origin;
    }
  } catch {
    // Invalid URL is handled by validateURL.
  }

  return origin;
}

function validateURL(url: string): string {
  try {
    return normalizeLoopbackOrigin(new URL(url).origin);
  } catch {
    throw new Error(`Invalid siteUrl: "${url}". Must be a valid URL.`);
  }
}

function resolveConfiguredSiteUrl(config: ReturnType<typeof useRuntimeConfig>): string | undefined {
  if (typeof config.public.siteUrl !== "string" || !config.public.siteUrl) return undefined;

  return validateURL(config.public.siteUrl);
}

function resolveEventOrigin(event?: H3Event): string | undefined {
  if (!event) return undefined;

  const host = getRequestHost(event, { xForwardedHost: true });
  const protocol = getRequestProtocol(event, { xForwardedProto: true });
  if (!host || !protocol) return undefined;

  try {
    return validateURL(`${protocol}://${host}`);
  } catch {
    return undefined;
  }
}

/**
 * Get the Nitro origin URL.
 * Adapted from nuxt-site-config by @harlan-zw
 * @see https://github.com/harlan-zw/nuxt-site-config/blob/main/packages/kit/src/util.ts
 */
function getNitroOrigin(): string | undefined {
  const cert = process.env.NITRO_SSL_CERT;
  const key = process.env.NITRO_SSL_KEY;
  let host: string | undefined = process.env.NITRO_HOST || process.env.HOST;
  let port: string | undefined;
  if (import.meta.dev) port = process.env.NITRO_PORT || process.env.PORT || "3000";
  let protocol = (cert && key) || !import.meta.dev ? "https" : "http";

  try {
    if ((import.meta.dev || import.meta.prerender) && process.env.__NUXT_DEV__) {
      const origin = JSON.parse(process.env.__NUXT_DEV__).proxy.url;
      host = withoutProtocol(origin);
      protocol = origin.includes("https") ? "https" : "http";
    } else if ((import.meta.dev || import.meta.prerender) && process.env.NUXT_VITE_NODE_OPTIONS) {
      const origin = JSON.parse(process.env.NUXT_VITE_NODE_OPTIONS).baseURL.replace(
        "/__nuxt_vite_node__",
        "",
      );
      host = withoutProtocol(origin);
      protocol = origin.includes("https") ? "https" : "http";
    }
  } catch {
    // JSON parse failed, continue with env fallbacks
  }

  if (!host) return undefined;

  if (host.startsWith("[") && host.includes("]:")) {
    const lastBracketColon = host.lastIndexOf("]:");
    const extractedPort = host.slice(lastBracketColon + 2);
    host = host.slice(0, lastBracketColon + 1);
    if (extractedPort) port = extractedPort;
  } else if (host.includes(":") && !host.startsWith("[")) {
    const hostParts = host.split(":");
    port = hostParts.pop();
    host = hostParts.join(":");
  }

  const portSuffix = port ? `:${port}` : "";
  return `${protocol}://${host}${portSuffix}`;
}

function resolveEnvironmentOrigin(): { origin: string; source: string } | undefined {
  const nitroOrigin = getNitroOrigin();
  if (nitroOrigin)
    return { origin: validateURL(nitroOrigin), source: "Nitro environment detection" };

  if (process.env.VERCEL_URL)
    return { origin: validateURL(`https://${process.env.VERCEL_URL}`), source: "VERCEL_URL" };

  if (process.env.CF_PAGES_URL)
    return { origin: validateURL(`https://${process.env.CF_PAGES_URL}`), source: "CF_PAGES_URL" };

  if (process.env.URL)
    return {
      origin: validateURL(
        process.env.URL.startsWith("http") ? process.env.URL : `https://${process.env.URL}`,
      ),
      source: "URL",
    };

  return undefined;
}

function resolveDevFallback(): { origin: string; source: string } | undefined {
  if (!import.meta.dev) return undefined;

  return { origin: "http://localhost:3000", source: "development fallback" };
}

function getBaseURL(event?: H3Event): string {
  const config = useRuntimeConfig();
  const configuredSiteUrl = resolveConfiguredSiteUrl(config);
  if (configuredSiteUrl) return configuredSiteUrl;

  const eventOrigin = resolveEventOrigin(event);
  if (eventOrigin) {
    return eventOrigin;
  }

  const environmentOrigin = resolveEnvironmentOrigin();
  if (environmentOrigin) {
    return environmentOrigin.origin;
  }

  const devFallback = resolveDevFallback();
  if (devFallback) {
    return devFallback.origin;
  }

  throw new Error("siteUrl required. Set NUXT_PUBLIC_SITE_URL.");
}

export function serverAuth(event?: H3Event) {
  const runtimeConfig = useRuntimeConfig();
  const baseURL = getBaseURL(event);

  const auth = betterAuth({
    secret: runtimeConfig.betterAuthSecret,
    baseURL,
    trustedOrigins: [baseURL],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "user",
          input: false,
        },
      },
    },
    session: {
      cookieCache: {
        enabled: true,
      },
    },
    advanced: {
      cookiePrefix: "recall",
    },
  });

  return auth;
}
