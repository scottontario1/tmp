/**
 * GET  /api/items  — list items from D1
 * POST /api/items  — create a new item in D1
 *
 * env.DB     → D1 database binding
 * env.CACHE  → KV namespace binding
 */

export async function onRequestGet({ env }) {
  // Try KV cache first
  const cached = await env.CACHE.get("items:all", { type: "json" });
  if (cached) {
    return Response.json({ items: cached, fromCache: true });
  }

  const { results } = await env.DB.prepare(
    "SELECT * FROM items ORDER BY created_at DESC LIMIT 100"
  ).all();

  // Cache for 60 seconds
  await env.CACHE.put("items:all", JSON.stringify(results), {
    expirationTtl: 60,
  });

  return Response.json({ items: results, fromCache: false });
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();

  if (!body.name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const { meta } = await env.DB.prepare(
    "INSERT INTO items (name, data) VALUES (?, ?) RETURNING *"
  )
    .bind(body.name, JSON.stringify(body.data ?? null))
    .run();

  // Invalidate cache
  await env.CACHE.delete("items:all");

  return Response.json({ id: meta.last_row_id }, { status: 201 });
}
