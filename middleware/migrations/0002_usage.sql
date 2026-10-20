-- Requests per key per day (UTC), for DEMO_MODE's caps.
CREATE TABLE usage (
	day TEXT NOT NULL,
	key_id TEXT NOT NULL,
	n INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (day, key_id)
);
