/**
 * POST /api/upload — upload a file to R2
 *
 * Accepts multipart/form-data with a "file" field.
 * env.STORAGE → R2 bucket binding
 */
export async function onRequestPost({ request, env }) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return Response.json({ error: "file is required" }, { status: 400 });
  }

  const key = `uploads/${Date.now()}-${file.name}`;

  await env.STORAGE.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return Response.json({ key }, { status: 201 });
}

/**
 * GET /api/upload?key=uploads/...  — download / stream a file from R2
 */
export async function onRequestGet({ request, env }) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return Response.json({ error: "key is required" }, { status: 400 });
  }

  const object = await env.STORAGE.get(key);

  if (!object) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000",
    },
  });
}
