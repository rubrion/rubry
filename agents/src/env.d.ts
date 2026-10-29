// Secrets (wrangler secret put …; .dev.vars locally) aren't in wrangler.jsonc,
// so `wrangler types` can't see them.
interface Env {
	/** Same value as the middleware's AGENTS_API_KEY. Optional. */
	AGENTS_API_KEY?: string;
	/** "true" on a public sandbox: one agent per message, two tool rounds. */
	DEMO_MODE?: string;
}

// Secrets your tools read through `import { env } from 'cloudflare:workers'`
// go on Cloudflare.Env, the type of that `env`:
declare namespace Cloudflare {
	interface Env {
		// ORDERS_TOKEN: string;
	}
}
