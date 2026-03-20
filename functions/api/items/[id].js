/**
 * GET    /api/items/:id  — fetch one item
 * DELETE /api/items/:id  — delete one item
 *
 * env.DB    → D1 database
 * env.CACHE → KV namespace
 */

export async function onRequestGet({ params, env }) {
  const item = await env.DB.prepare("SELECT * FROM items WHERE id = ?")
    .bind(params.id)
    .first();

  if (!item) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json({ item });
}

export async function onRequestDelete({ params, env }) {
  const { success } = await env.DB.prepare("DELETE FROM items WHERE id = ?")
    .bind(params.id)
    .run();

  if (!success) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  await env.CACHE.delete("items:all");

  return new Response(null, { status: 204 });
}
