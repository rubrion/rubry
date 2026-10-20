// Secrets (wrangler secret put …; .dev.vars locally) aren't in wrangler.jsonc,
// so `wrangler types` can't see them.
interface Env {
	/** Same value as the middleware's AGENTS_API_KEY. Optional. */
	AGENTS_API_KEY?: string;
}
