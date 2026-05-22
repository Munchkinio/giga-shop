/**
 * Swagger UI lives on the Fastify API host, not on the Next.js storefront.
 */
export function getApiDocsUrl(): string {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    "http://localhost:3001";
  return `${apiBase}/docs`;
}
