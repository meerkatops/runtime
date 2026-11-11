import type { NextConfig } from "next";

// The policy Next.js documents for an app without nonces. A nonce needs every page rendered for its
// request, and Cache Components serves a prerendered shell, so inline scripts and styles are allowed:
// the shell's own inline scripts carry no nonce, and Material UI writes its styles as <style> elements.
// React needs `eval` in development only. A source the app adds (an image host, an API) is named here.
const isDevelopment = process.env.NODE_ENV === "development";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // A read is cached only where a function or component says `"use cache"`. What can finish at build
  // time is prerendered into the static shell either way; `await connection()` holds a read to its request.
  cacheComponents: true,
  partialPrefetching: true,
  // A link to a route that does not exist fails `tsc`.
  typedRoutes: true,
  poweredByHeader: false,
  headers: () =>
    Promise.resolve([
      { source: "/(.*)", headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] },
    ]),
};

export default nextConfig;
