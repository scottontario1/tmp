// ── Items (D1 + KV) ──────────────────────────────────────────────

async function loadItems() {
  const list = document.getElementById("items-list");
  const res = await fetch("/api/items");
  const { items } = await res.json();

  list.innerHTML = items.length
    ? items
        .map(
          (i) =>
            `<li><span>${i.name}</span>
             <button onclick="deleteItem(${i.id})">Delete</button></li>`
        )
        .join("")
    : "<li>No items yet.</li>";
}

async function deleteItem(id) {
  await fetch(`/api/items/${id}`, { method: "DELETE" });
  loadItems();
}

document.getElementById("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("item-name").value.trim();
  if (!name) return;

  await fetch("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  e.target.reset();
  loadItems();
});

// ── File Upload (R2) ─────────────────────────────────────────────

document.getElementById("upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = document.getElementById("file-input").files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const { key } = await res.json();

  document.getElementById("upload-result").textContent =
    `Uploaded: /api/upload?key=${key}`;
  e.target.reset();
});

// ── Init ─────────────────────────────────────────────────────────
loadItems();
