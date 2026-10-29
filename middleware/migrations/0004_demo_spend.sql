-- DEMO_MODE's daily budget: what the replies cost, in micro-dollars, from
-- the token usage the agents Worker reports.
CREATE TABLE demo_spend (
	day TEXT PRIMARY KEY,
	micro INTEGER NOT NULL DEFAULT 0
);
