-- DEMO_MODE's per-network caps: API keys made and requests sent, per day (UTC),
-- by a salted hash of the caller's IP (its /64 for IPv6).
CREATE TABLE demo_ip (
	day TEXT NOT NULL,
	ip TEXT NOT NULL,
	kind TEXT NOT NULL,
	n INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (day, ip, kind)
);
