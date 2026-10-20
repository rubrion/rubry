// The middleware: the only public Worker.
//
//   /v1/models, /v1/chat/completions   OpenAI-compatible, for any client with an
//                                      API key (rubry.ai, Open WebUI, your app).
//                                      Forwarded to the agents Worker with the
//                                      provider, the agents that are on, and the
//                                      caller's X-Session-Id.
//   /api/*                             the config page's API (ADMIN_TOKEN)
//   everything else                    the config page (client/)
import { sameSecret } from './crypto';
import { checkKey, clearProvider, createKey, deleteKey, getDisabled, getProvider, hasProviderKey, listKeys, setDisabled, setProvider, touchKey } from './store';

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
	new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });

// Any origin may call /v1 with a key (the key is the credential; no cookies).
const CORS = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': 'authorization, content-type, x-session-id',
	'access-control-allow-methods': 'GET, POST, OPTIONS',
};

const bearer = (request: Request) => request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';

/** The agents Worker's agent ids (from its health check), cached for a minute. */
let known: { ids: string[]; at: number } | null = null;
async function agentIds(env: Env) {
	if (known && Date.now() - known.at < 60_000) return known.ids;
	const res = await env.AGENTS.fetch('https://agents/', { headers: agentsAuth(env) });
	known = { ids: ((await res.json()) as { agents?: string[] }).agents ?? [], at: Date.now() };
	return known.ids;
}

const agentsAuth = (env: Env): Record<string, string> => (env.AGENTS_API_KEY ? { authorization: `Bearer ${env.AGENTS_API_KEY}` } : {});

async function openai(request: Request, env: Env, ctx: ExecutionContext, path: string) {
	if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
	const keyId = await checkKey(env, bearer(request));
	if (!keyId) return json({ error: { message: 'Invalid API key', type: 'invalid_request_error', code: 'invalid_api_key' } }, 401, CORS);
	ctx.waitUntil(touchKey(env, keyId));

	// No provider set: the agents Worker falls back to Workers AI.
	const provider = await getProvider(env);
	const disabled = new Set(await getDisabled(env));
	const on = (await agentIds(env)).filter((id) => !disabled.has(id));

	const headers: Record<string, string> = {
		'content-type': 'application/json',
		...agentsAuth(env),
		'x-agents': on.join(','),
		...(provider ? { 'x-provider-base-url': provider.baseURL, 'x-provider-model': provider.model, 'x-provider-key': provider.apiKey } : {}),
	};
	const session = request.headers.get('x-session-id');
	if (session) headers['x-session-id'] = session;

	const res = await env.AGENTS.fetch(`https://agents${path}`, { method: request.method, headers, body: request.method === 'POST' ? request.body : undefined });
	const out = new Response(res.body, res);
	for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
	return out;
}

async function admin(request: Request, env: Env, path: string) {
	if (!env.ADMIN_TOKEN) return json({ error: 'ADMIN_TOKEN is not set' }, 503);
	if (!(await sameSecret(bearer(request), env.ADMIN_TOKEN))) return json({ error: 'unauthorized' }, 401);
	const body = request.method === 'POST' || request.method === 'PUT' ? ((await request.json().catch(() => ({}))) as Record<string, unknown>) : {};

	if (path === '/api/config' && request.method === 'GET') {
		const [provider, hasKey, disabled, keys, models] = await Promise.all([
			getProvider(env).catch(() => null),
			hasProviderKey(env),
			getDisabled(env),
			listKeys(env),
			env.AGENTS.fetch('https://agents/v1/models', { headers: agentsAuth(env) })
				.then((r) => r.json() as Promise<{ data: { id: string; name: string; description: string }[] }>)
				.then((d) => d.data.filter((m) => m.id !== 'auto'))
				.catch(() => []),
		]);
		return json({
			endpoint: `${new URL(request.url).origin}/v1`,
			provider: provider ? { baseURL: provider.baseURL, model: provider.model, hasKey } : null,
			agents: models.map((m) => ({ id: m.id, name: m.name, description: m.description, enabled: !disabled.includes(m.id) })),
			keys,
			secretKeySet: !!env.SECRET_KEY,
		});
	}

	if (path === '/api/provider' && request.method === 'PUT') {
		const baseURL = String(body.baseURL ?? '').trim();
		const model = String(body.model ?? '').trim();
		if (!/^https?:\/\//.test(baseURL) || !model) return json({ error: 'A base URL (http/https) and a model are required' }, 400);
		await setProvider(env, { baseURL, model, apiKey: typeof body.apiKey === 'string' ? body.apiKey : undefined });
		return json({ ok: true });
	}

	if (path === '/api/provider' && request.method === 'DELETE') {
		await clearProvider(env);
		return json({ ok: true });
	}

	if (path === '/api/agents' && request.method === 'PUT') {
		const disabled = Array.isArray(body.disabled) ? body.disabled.map(String) : [];
		await setDisabled(env, disabled);
		return json({ ok: true });
	}

	if (path === '/api/keys' && request.method === 'POST') {
		const name = String(body.name ?? '').trim().slice(0, 60) || 'API key';
		return json(await createKey(env, name));
	}

	const del = path.match(/^\/api\/keys\/([\w-]+)$/);
	if (del && request.method === 'DELETE') {
		await deleteKey(env, del[1]);
		return json({ ok: true });
	}

	return json({ error: 'not found' }, 404);
}

export default {
	async fetch(request, env, ctx) {
		const path = new URL(request.url).pathname;
		if (path === '/v1/models' || path === '/v1/chat/completions') return openai(request, env, ctx, path);
		if (path.startsWith('/v1/')) return json({ error: { message: 'Not found', code: 'not_found' } }, 404, CORS);
		if (path.startsWith('/api/')) return admin(request, env, path);
		return env.ASSETS.fetch(request);
	},
} satisfies ExportedHandler<Env>;
