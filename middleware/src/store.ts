// Settings, API keys and demo usage, in D1 (migrations/).
import { decrypt, encrypt, randomToken, sha256 } from './crypto';

export interface Provider {
	baseURL: string;
	model: string;
	/** Decrypted; only ever sent to the agents Worker. */
	apiKey: string;
}

async function get(db: D1Database, key: string) {
	return (await db.prepare('SELECT value FROM settings WHERE key = ?1').bind(key).first<{ value: string }>())?.value ?? null;
}

function set(db: D1Database, key: string, value: string) {
	return db.prepare('INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT (key) DO UPDATE SET value = ?2').bind(key, value);
}

export async function getProvider(env: Env): Promise<Provider | null> {
	const raw = await get(env.DB, 'provider');
	if (!raw) return null;
	const p = JSON.parse(raw) as { baseURL: string; model: string; key?: string };
	const apiKey = p.key && env.SECRET_KEY ? await decrypt(p.key, env.SECRET_KEY) : '';
	return { baseURL: p.baseURL, model: p.model, apiKey };
}

/** Save the provider; an omitted apiKey keeps the stored one. */
export async function setProvider(env: Env, { baseURL, model, apiKey }: { baseURL: string; model: string; apiKey?: string }) {
	if (!env.SECRET_KEY) throw new Error('SECRET_KEY is not set');
	const old = await get(env.DB, 'provider');
	const key = apiKey !== undefined ? (apiKey ? await encrypt(apiKey, env.SECRET_KEY) : '') : old ? (JSON.parse(old).key ?? '') : '';
	await set(env.DB, 'provider', JSON.stringify({ baseURL, model, key })).run();
}

/** Back to the built-in model (Workers AI on the agents Worker). */
export async function clearProvider(env: Env) {
	await env.DB.prepare("DELETE FROM settings WHERE key = 'provider'").run();
}

export async function hasProviderKey(env: Env) {
	const raw = await get(env.DB, 'provider');
	return !!raw && !!JSON.parse(raw).key;
}

export async function getDisabled(env: Env): Promise<string[]> {
	return JSON.parse((await get(env.DB, 'disabled_agents')) ?? '[]');
}

export async function setDisabled(env: Env, ids: string[]) {
	await set(env.DB, 'disabled_agents', JSON.stringify(ids)).run();
}

export async function listKeys(env: Env) {
	const { results } = await env.DB.prepare('SELECT id, name, prefix, created_at, last_used_at FROM api_keys ORDER BY created_at DESC').all();
	return results;
}

/** A new API key; the key itself is returned only here. */
export async function createKey(env: Env, name: string) {
	const key = `rk_${randomToken(24)}`;
	const id = randomToken(9);
	await env.DB.prepare('INSERT INTO api_keys (id, name, hash, prefix) VALUES (?1, ?2, ?3, ?4)').bind(id, name, await sha256(key), key.slice(0, 7)).run();
	return { id, name, key };
}

export async function deleteKey(env: Env, id: string) {
	await env.DB.prepare('DELETE FROM api_keys WHERE id = ?1').bind(id).run();
}

/** The key's id when it is valid (in demo mode, for a day after it was made). */
export async function checkKey(env: Env, key: string) {
	if (!key.startsWith('rk_')) return null;
	const row = await env.DB.prepare('SELECT id, created_at FROM api_keys WHERE hash = ?1').bind(await sha256(key)).first<{ id: string; created_at: string }>();
	if (!row) return null;
	if (isDemo(env) && Date.now() - Date.parse(row.created_at) > DEMO.keyHours * 3600_000) return null;
	return row.id;
}

// Demo mode: a public sandbox with a published ADMIN_TOKEN.
export const DEMO = {
	keyHours: 24,
	perKey: 30,
	perDay: 1000,
	maxKeys: 200,
	/** Per network (IP, or its /64) and day: keys made, and requests over all its keys. */
	keysPerIp: 3,
	perIp: 60,
	/** What a request may carry to the model: its last messages, and their text in all. */
	messages: 12,
	chars: 16_000,
};
export const isDemo = (env: Env) => env.DEMO_MODE === 'true';

/** Count one request for the key; false when the key's or the day's cap is reached. */
export async function takeDemo(env: Env, keyId: string) {
	const day = today();
	const total = await env.DB.prepare('SELECT COALESCE(SUM(n), 0) AS n FROM usage WHERE day = ?1').bind(day).first<{ n: number }>();
	if ((total?.n ?? 0) >= DEMO.perDay) return false;
	const row = await env.DB.prepare(
		'INSERT INTO usage (day, key_id, n) VALUES (?1, ?2, 1) ON CONFLICT (day, key_id) DO UPDATE SET n = n + 1 WHERE n < ?3 RETURNING n',
	)
		.bind(day, keyId, DEMO.perKey)
		.first<{ n: number }>();
	return row !== null;
}

/** The caller's network for the day: a salted hash of its IP, or of its /64 for IPv6. */
export async function network(env: Env, request: Request) {
	const ip = request.headers.get('cf-connecting-ip') ?? '';
	const net = ip.includes(':') ? ip.split(':').slice(0, 4).join(':') : ip;
	return sha256(`${env.SECRET_KEY ?? ''}|${today()}|${net}`);
}

const today = () => new Date().toISOString().slice(0, 10);

/** Count one `kind` (key, req) for the network; false when its daily cap is reached. */
export async function takeIp(env: Env, ip: string, kind: 'key' | 'req', limit: number) {
	const row = await env.DB.prepare(
		'INSERT INTO demo_ip (day, ip, kind, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT (day, ip, kind) DO UPDATE SET n = n + 1 WHERE n < ?4 RETURNING n',
	)
		.bind(today(), ip, kind, limit)
		.first<{ n: number }>();
	return row !== null;
}

type Message = { role: string; content: string | { type: string; text?: string }[] };

/** A chat request cut to the demo's size: its last messages, oldest dropped (or the last one shortened) past the text cap. */
export function trimDemo(body: { messages?: Message[] }) {
	const size = (m: Message) => (typeof m.content === 'string' ? m.content.length : m.content.reduce((n, p) => n + (p.text?.length ?? 0), 0));
	let messages = (body.messages ?? []).slice(-DEMO.messages);
	while (messages.length > 1 && messages.reduce((n, m) => n + size(m), 0) > DEMO.chars) messages = messages.slice(1);
	const last = messages.at(-1);
	if (last && typeof last.content === 'string' && last.content.length > DEMO.chars) last.content = last.content.slice(-DEMO.chars);
	if (last && Array.isArray(last.content)) for (const p of last.content) if (p.text && p.text.length > DEMO.chars) p.text = p.text.slice(-DEMO.chars);
	return { ...body, messages };
}

/** Drop expired demo keys (and old usage rows). */
export async function pruneDemo(env: Env) {
	const cutoff = new Date(Date.now() - DEMO.keyHours * 3600_000).toISOString();
	await env.DB.batch([
		env.DB.prepare('DELETE FROM api_keys WHERE created_at < ?1').bind(cutoff),
		env.DB.prepare('DELETE FROM usage WHERE day < ?1').bind(cutoff.slice(0, 10)),
		env.DB.prepare('DELETE FROM demo_ip WHERE day < ?1').bind(cutoff.slice(0, 10)),
	]);
}

export async function countKeys(env: Env) {
	return (await env.DB.prepare('SELECT COUNT(*) AS n FROM api_keys').first<{ n: number }>())?.n ?? 0;
}

export function touchKey(env: Env, id: string) {
	return env.DB.prepare("UPDATE api_keys SET last_used_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1").bind(id).run();
}
