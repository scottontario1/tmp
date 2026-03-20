/**
 * Global middleware for all API routes.
 * Runs before every Pages Function request.
 */
export async function onRequest(context) {
  const { request, next, env } = context;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const response = await next();

  // Attach CORS headers to every response
  Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));

  return response;
}
