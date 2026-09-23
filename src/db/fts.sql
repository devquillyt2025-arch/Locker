-- FTS5 index over entries (title, body, tags). Not modeled through Drizzle
-- (it has no virtual-table support), so this runs as a plain idempotent
-- script on every startup instead of through drizzle-kit migrations.
--
-- entries.id is a TEXT uuid, not a rowid, so this is a standalone FTS5
-- table (not an external-content table) synced via triggers, with entry_id
-- carried as an UNINDEXED column to map matches back to entries.
CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  entry_id UNINDEXED,
  title,
  body,
  tags,
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS entries_fts_ai AFTER INSERT ON entries BEGIN
  INSERT INTO entries_fts(entry_id, title, body, tags)
  VALUES (new.id, new.title, new.body, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS entries_fts_ad AFTER DELETE ON entries BEGIN
  DELETE FROM entries_fts WHERE entry_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS entries_fts_au AFTER UPDATE ON entries BEGIN
  DELETE FROM entries_fts WHERE entry_id = old.id;
  INSERT INTO entries_fts(entry_id, title, body, tags)
  VALUES (new.id, new.title, new.body, new.tags);
END;
