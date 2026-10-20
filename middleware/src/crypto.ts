// Hashing for API keys and AES-GCM for the provider key, on Web Crypto.
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export async function sha256(text: string) {
	const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const randomToken = (bytes = 32) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));

/** Compare secrets without leaking where they differ. */
export async function sameSecret(a: string, b: string) {
	const [x, y] = await Promise.all([sha256(a), sha256(b)]);
	let diff = 0;
	for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
	return diff === 0;
}

const aesKey = async (secret: string) =>
	crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', enc.encode(`rubry-provider-key|${secret}`)), 'AES-GCM', false, ['encrypt', 'decrypt']);

export async function encrypt(plain: string, secret: string) {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(secret), enc.encode(plain));
	return `${b64url(iv)}.${b64url(new Uint8Array(sealed))}`;
}

export async function decrypt(sealed: string, secret: string) {
	const [iv, data] = sealed.split('.');
	const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64url(iv) }, await aesKey(secret), unb64url(data));
	return dec.decode(plain);
}
