// Settings and API keys, in D1 (migrations/0001_init.sql).
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

/** The key's id when it is valid. */
export async function checkKey(env: Env, key: string) {
	if (!key.startsWith('rk_')) return null;
	return (await env.DB.prepare('SELECT id FROM api_keys WHERE hash = ?1').bind(await sha256(key)).first<{ id: string }>())?.id ?? null;
}

export function touchKey(env: Env, id: string) {
	return env.DB.prepare("UPDATE api_keys SET last_used_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1").bind(id).run();
}
