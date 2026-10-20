# Deploy

1. Create the two D1 databases and paste their ids into the `wrangler.jsonc` files:

   ```bash
   npx wrangler d1 create rubry-config   # → middleware/wrangler.jsonc (DB)
   npx wrangler d1 create rubry-memory   # → agents/wrangler.jsonc (MEMORY)
   ```

2. Set the middleware's secrets (generate each with `openssl rand -hex 32`):

   ```bash
   cd middleware
   npx wrangler secret put ADMIN_TOKEN   # signs you in to the settings page
   npx wrangler secret put SECRET_KEY    # encrypts the provider key; don't lose or change it
   ```

   Optionally set the same `AGENTS_API_KEY` on both Workers. The agents Worker has no public URL (`workers_dev: false`), so the service binding is already the only way in.

3. Deploy (agents first: the middleware binds to it):

   ```bash
   npm run deploy
   ```

   This applies the middleware's D1 migrations and deploys both Workers. The settings page is at the middleware's URL (`https://rubry-middleware.<you>.workers.dev`, or a custom domain you add in `wrangler.jsonc` with `routes`).

4. Open the settings page, create an API key, and [connect a client](connect.md). Agents run on Workers AI (billed to your Cloudflare account, with a free daily allowance) until you set another provider there.

Rename the Workers (`name` in both `wrangler.jsonc`, and `services[0].service` in the middleware) to deploy several assistants on one account.
