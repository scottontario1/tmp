/**
 * /api/files — R2 bucket file listing and deletion
 *
 * GET    /api/files          → list all objects (key, size, uploaded)
 * DELETE /api/files?key=...  → delete an object
 *
 * env.STORAGE → R2 bucket binding
 * Upload + download are handled by /api/upload.js
 */

export async function onRequestGet({ env }) {
  const listed = await env.STORAGE.list();
  const files = listed.objects.map((obj) => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded,
  }));

  return Response.json({ files });
}

export async function onRequestDelete({ request, env }) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return Response.json({ error: "key is required" }, { status: 400 });
  }

  await env.STORAGE.delete(key);
  return new Response(null, { status: 204 });
}
