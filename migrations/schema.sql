-- Run with: npm run db:migrate  (remote)
--        or: npm run db:migrate:local  (local dev)

CREATE TABLE IF NOT EXISTS items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  data       TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
