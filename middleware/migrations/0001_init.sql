-- Settings: the model provider (its key encrypted with SECRET_KEY) and the
-- agents turned off.
CREATE TABLE settings (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
);

-- API keys for /v1: only a SHA-256 of each key is kept; the key itself is
-- shown once, when it's created.
CREATE TABLE api_keys (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	hash TEXT NOT NULL UNIQUE,
	prefix TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	last_used_at TEXT
);
