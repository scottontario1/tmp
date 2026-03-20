/**
 * /api/kv — direct KV namespace management
 *
 * GET    /api/kv          → list all keys
 * GET    /api/kv?key=foo  → get a single value
 * PUT    /api/kv          → { key, value, ttl? } set a value
 * DELETE /api/kv?key=foo  → delete a key
 *
 * env.CACHE → KV namespace binding
 */

export async function onRequestGet({ request, env }) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (key) {
    const value = await env.CACHE.get(key);
    if (value === null) {
      return Response.json({ error: "key not found" }, { status: 404 });
    }
    return Response.json({ key, value });
  }

  // List all keys
  const list = await env.CACHE.list();
  return Response.json({ keys: list.keys });
}

export async function onRequestPut({ request, env }) {
  const body = await request.json();
  const { key, value, ttl } = body;

  if (!key || value === undefined) {
    return Response.json({ error: "key and value are required" }, { status: 400 });
  }

  const opts = ttl ? { expirationTtl: Number(ttl) } : undefined;
  await env.CACHE.put(key, String(value), opts);

  return Response.json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return Response.json({ error: "key is required" }, { status: 400 });
  }

  await env.CACHE.delete(key);
  return new Response(null, { status: 204 });
}
