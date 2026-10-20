// Secrets (wrangler secret put …; .dev.vars locally) aren't in wrangler.jsonc,
// so `wrangler types` can't see them.
interface Env {
	/** Signs you in to the config page and /api. */
	ADMIN_TOKEN?: string;
	/** Encrypts the provider's API key at rest. Any long random string; keep it. */
	SECRET_KEY?: string;
	/** Sent to the agents Worker; set the same value there. Optional. */
	AGENTS_API_KEY?: string;
	/**
	 * "true" for a public sandbox whose ADMIN_TOKEN is published: the provider
	 * stays the built-in model, agents can't be switched off, and keys expire
	 * after a day with daily caps (see store.ts).
	 */
	DEMO_MODE?: string;
}
