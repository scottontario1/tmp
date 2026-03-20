// ── Screen routing ────────────────────────────────────────────

const screens   = document.querySelectorAll(".screen");
const navBtns   = document.querySelectorAll(".nav-btn, .tab-btn");

function showScreen(name) {
  screens.forEach((s) => s.classList.toggle("active", s.id === `screen-${name}`));
  navBtns.forEach((b) => {
    b.classList.toggle("active", b.dataset.screen === name);
    if (b.getAttribute("role") === "tab") {
      b.setAttribute("aria-selected", b.dataset.screen === name ? "true" : "false");
    }
  });
}

navBtns.forEach((btn) => btn.addEventListener("click", () => showScreen(btn.dataset.screen)));

// ── Toast notifications ───────────────────────────────────────

function toast(message, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Helpers ───────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function truncate(str, max = 60) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

// ── KV Store ──────────────────────────────────────────────────

const kvTbody  = document.getElementById("kv-tbody");
const kvModal  = document.getElementById("kv-modal");

async function loadKV() {
  kvTbody.innerHTML = `<tr class="empty-row"><td colspan="3">Loading…</td></tr>`;
  try {
    const res = await fetch("/api/kv");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { keys } = await res.json();

    if (!keys.length) {
      kvTbody.innerHTML = `<tr class="empty-row"><td colspan="3">No keys yet. Add one above.</td></tr>`;
      return;
    }

    // Fetch values in parallel (one request per key)
    const entries = await Promise.all(
      keys.map(async (k) => {
        try {
          const r = await fetch(`/api/kv?key=${encodeURIComponent(k.name)}`);
          const d = r.ok ? await r.json() : { value: null };
          return { key: k, value: d.value };
        } catch {
          return { key: k, value: null };
        }
      })
    );

    kvTbody.innerHTML = entries
      .map(({ key, value }) => {
        const expiry = key.expiration
          ? formatDate(new Date(key.expiration * 1000).toISOString())
          : '<span class="muted">Never</span>';
        const preview = value !== null ? truncate(value) : '<span class="muted">—</span>';
        return `
          <tr>
            <td class="mono">${escHtml(key.name)}</td>
            <td>${expiry}</td>
            <td class="col-actions">
              <div class="actions-cell">
                <button class="btn btn-ghost btn-sm"
                  onclick="openKVModal(${jsonAttr(key.name)}, ${jsonAttr(value)})">
                  View
                </button>
                <button class="btn btn-danger btn-sm"
                  onclick="deleteKV(${jsonAttr(key.name)})">
                  Delete
                </button>
              </div>
            </td>
          </tr>`;
      })
      .join("");
  } catch (err) {
    kvTbody.innerHTML = `<tr class="empty-row"><td colspan="3">Error loading keys.</td></tr>`;
    toast("Failed to load KV keys", "error");
  }
}

function openKVModal(key, value) {
  document.getElementById("kv-modal-key").textContent = key;
  document.getElementById("kv-modal-value").textContent =
    value !== null ? value : "(no value)";
  kvModal.hidden = false;
}

document.getElementById("kv-modal-close").addEventListener("click", () => {
  kvModal.hidden = true;
});
kvModal.addEventListener("click", (e) => {
  if (e.target === kvModal) kvModal.hidden = true;
});

async function deleteKV(key) {
  try {
    const res = await fetch(`/api/kv?key=${encodeURIComponent(key)}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
    toast(`Deleted "${key}"`);
    loadKV();
  } catch {
    toast("Failed to delete key", "error");
  }
}

document.getElementById("kv-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const key   = document.getElementById("kv-key").value.trim();
  const value = document.getElementById("kv-value").value;
  const ttl   = document.getElementById("kv-ttl").value;

  if (!key || value === "") return;

  try {
    const body = { key, value };
    if (ttl) body.ttl = Number(ttl);

    const res = await fetch("/api/kv", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    toast(`Saved "${key}"`);
    e.target.reset();
    loadKV();
  } catch {
    toast("Failed to save key", "error");
  }
});

document.getElementById("kv-refresh").addEventListener("click", loadKV);

// ── R2 Storage ────────────────────────────────────────────────

const r2Tbody = document.getElementById("r2-tbody");

async function loadR2() {
  r2Tbody.innerHTML = `<tr class="empty-row"><td colspan="4">Loading…</td></tr>`;
  try {
    const res = await fetch("/api/files");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { files } = await res.json();

    if (!files.length) {
      r2Tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No files yet. Upload one above.</td></tr>`;
      return;
    }

    r2Tbody.innerHTML = files
      .map((f) => `
        <tr>
          <td class="mono">${escHtml(f.key)}</td>
          <td class="muted">${formatBytes(f.size)}</td>
          <td class="muted">${formatDate(f.uploaded)}</td>
          <td class="col-actions">
            <div class="actions-cell">
              <a class="btn btn-ghost btn-sm"
                href="/api/upload?key=${encodeURIComponent(f.key)}"
                download="${escAttr(f.key.split("/").pop())}">
                Download
              </a>
              <button class="btn btn-danger btn-sm"
                onclick="deleteFile(${jsonAttr(f.key)})">
                Delete
              </button>
            </div>
          </td>
        </tr>`)
      .join("");
  } catch {
    r2Tbody.innerHTML = `<tr class="empty-row"><td colspan="4">Error loading files.</td></tr>`;
    toast("Failed to load files", "error");
  }
}

async function deleteFile(key) {
  try {
    const res = await fetch(`/api/files?key=${encodeURIComponent(key)}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
    toast(`Deleted "${key}"`);
    loadR2();
  } catch {
    toast("Failed to delete file", "error");
  }
}

// ── Drag & Drop upload ────────────────────────────────────────

const dropZone   = document.getElementById("drop-zone");
const fileInput  = document.getElementById("file-input");
const dropName   = document.getElementById("drop-name");
const uploadBtn  = document.getElementById("upload-btn");
const progressWrap = document.getElementById("progress-wrap");
const progressBar  = document.getElementById("progress-bar");
const progressLabel = document.getElementById("progress-label");

fileInput.addEventListener("change", () => {
  dropName.textContent = fileInput.files[0]?.name ?? "";
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});
["dragleave", "dragend"].forEach((ev) =>
  dropZone.addEventListener(ev, () => dropZone.classList.remove("drag-over"))
);
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer?.files[0];
  if (file) {
    // Assign to the file input via DataTransfer
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    dropName.textContent = file.name;
  }
});

document.getElementById("upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = fileInput.files[0];
  if (!file) { toast("No file selected", "error"); return; }

  uploadBtn.disabled = true;
  progressWrap.hidden = false;
  progressBar.style.width = "0%";
  progressLabel.textContent = "Uploading…";

  // Use XHR for progress tracking
  const xhr = new XMLHttpRequest();
  const formData = new FormData();
  formData.append("file", file);

  xhr.upload.addEventListener("progress", (ev) => {
    if (ev.lengthComputable) {
      const pct = Math.round((ev.loaded / ev.total) * 100);
      progressBar.style.width = `${pct}%`;
      progressLabel.textContent = `${pct}%`;
    }
  });

  xhr.addEventListener("load", () => {
    uploadBtn.disabled = false;
    progressWrap.hidden = true;
    if (xhr.status === 201) {
      toast(`Uploaded "${file.name}"`);
      e.target.reset();
      dropName.textContent = "";
      loadR2();
    } else {
      toast("Upload failed", "error");
    }
  });

  xhr.addEventListener("error", () => {
    uploadBtn.disabled = false;
    progressWrap.hidden = true;
    toast("Upload failed", "error");
  });

  xhr.open("POST", "/api/upload");
  xhr.send(formData);
});

document.getElementById("r2-refresh").addEventListener("click", loadR2);

// ── Security: safe HTML escaping ──────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(str) {
  return String(str).replace(/"/g, "&quot;");
}

function jsonAttr(val) {
  return JSON.stringify(val);
}

// ── D1 Database ───────────────────────────────────────────────

const d1Tbody = document.getElementById("d1-tbody");

async function loadD1() {
  d1Tbody.innerHTML = `<tr class="empty-row"><td colspan="5">Loading…</td></tr>`;
  try {
    const res = await fetch("/api/items");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { items } = await res.json();

    if (!items.length) {
      d1Tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No items yet. Add one above.</td></tr>`;
      return;
    }

    d1Tbody.innerHTML = items
      .map((item) => `
        <tr>
          <td class="mono muted">${escHtml(String(item.id))}</td>
          <td>${escHtml(item.name)}</td>
          <td class="mono muted">${item.data ? escHtml(truncate(item.data)) : '<span class="muted">—</span>'}</td>
          <td class="muted">${formatDate(item.created_at)}</td>
          <td class="col-actions">
            <div class="actions-cell">
              <button class="btn btn-danger btn-sm"
                onclick="deleteItem(${item.id})">
                Delete
              </button>
            </div>
          </td>
        </tr>`)
      .join("");
  } catch {
    d1Tbody.innerHTML = `<tr class="empty-row"><td colspan="5">Error loading items.</td></tr>`;
    toast("Failed to load D1 items", "error");
  }
}

async function deleteItem(id) {
  try {
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
    toast(`Deleted item #${id}`);
    loadD1();
  } catch {
    toast("Failed to delete item", "error");
  }
}

document.getElementById("d1-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("d1-name").value.trim();
  const dataRaw = document.getElementById("d1-data").value.trim();

  let data = null;
  if (dataRaw) {
    try { data = JSON.parse(dataRaw); } catch {
      toast("Data must be valid JSON", "error");
      return;
    }
  }

  try {
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, data }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    toast(`Inserted "${name}"`);
    e.target.reset();
    loadD1();
  } catch {
    toast("Failed to insert item", "error");
  }
});

document.getElementById("d1-refresh").addEventListener("click", loadD1);

// ── Init ──────────────────────────────────────────────────────

loadKV();
loadR2();
loadD1();
