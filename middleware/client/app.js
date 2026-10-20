// The config page: talks to /api with the admin token kept for this tab only.
const $ = (id) => document.getElementById(id);
const TOKEN = 'rubry-admin-token';
let token = '';
try {
	token = sessionStorage.getItem(TOKEN) ?? '';
} catch {}

async function api(path, options = {}) {
	const res = await fetch(path, {
		...options,
		headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(options.headers ?? {}) },
	});
	const data = await res.json().catch(() => ({}));
	if (res.status === 401) signOut();
	if (!res.ok) throw new Error(data.error?.message ?? data.error ?? `HTTP ${res.status}`);
	return data;
}

function signOut() {
	token = '';
	try {
		sessionStorage.removeItem(TOKEN);
	} catch {}
	$('app').hidden = true;
	$('signout').hidden = true;
	$('signin').hidden = false;
}

const when = (iso) => (iso ? new Date(iso).toLocaleString() : 'never');

function render(config) {
	$('endpoint').textContent = config.endpoint;
	const form = $('provider');
	form.baseURL.value = config.provider?.baseURL ?? '';
	form.model.value = config.provider?.model ?? '';
	form.apiKey.value = '';
	$('provider-state').textContent = config.provider ? `Using ${config.provider.model} at ${new URL(config.provider.baseURL).host}.` : 'Using the built-in Workers AI model.';
	$('builtin').hidden = !config.provider;
	$('key-state').textContent = !config.secretKeySet
		? 'Set the SECRET_KEY secret on this Worker before saving a key.'
		: config.provider?.hasKey
			? 'A key is stored (encrypted). Leave the field empty to keep it.'
			: 'No key stored yet.';

	$('agents').replaceChildren(
		...config.agents.map((a) => {
			const li = document.createElement('li');
			li.innerHTML = `<label class="toggle"><input type="checkbox" /> <span><b></b><small></small></span></label>`;
			li.querySelector('b').textContent = `${a.name} (${a.id})`;
			li.querySelector('small').textContent = a.description;
			const box = li.querySelector('input');
			box.checked = a.enabled;
			box.dataset.id = a.id;
			box.addEventListener('change', saveAgents);
			return li;
		}),
	);
	if (!config.agents.length) $('agents').innerHTML = '<li class="muted">The agents Worker didn\'t answer. Is it deployed (or running locally)?</li>';

	$('keys').replaceChildren(
		...config.keys.map((k) => {
			const li = document.createElement('li');
			li.innerHTML = `<span><b></b> <code></code><small></small></span><button type="button" class="ghost danger">Delete</button>`;
			li.querySelector('b').textContent = k.name;
			li.querySelector('code').textContent = `${k.prefix}…`;
			li.querySelector('small').textContent = `created ${when(k.created_at)} · last used ${when(k.last_used_at)}`;
			li.querySelector('button').addEventListener('click', async () => {
				if (!confirm(`Delete "${k.name}"? Clients using it stop working.`)) return;
				await api(`/api/keys/${k.id}`, { method: 'DELETE' });
				load();
			});
			return li;
		}),
	);
}

async function load() {
	try {
		const config = await api('/api/config');
		$('signin').hidden = true;
		$('app').hidden = false;
		$('signout').hidden = false;
		render(config);
	} catch (e) {
		$('signin-error').textContent = token ? e.message : '';
	}
}

async function saveAgents() {
	const disabled = [...document.querySelectorAll('#agents input')].filter((b) => !b.checked).map((b) => b.dataset.id);
	await api('/api/agents', { method: 'PUT', body: JSON.stringify({ disabled }) });
}

$('signin').addEventListener('submit', (e) => {
	e.preventDefault();
	token = e.target.token.value.trim();
	try {
		sessionStorage.setItem(TOKEN, token);
	} catch {}
	load();
});
$('signout').addEventListener('click', signOut);

$('provider').preset.addEventListener('change', (e) => {
	const [baseURL, model] = e.target.value.split('|');
	if (!baseURL) return;
	$('provider').baseURL.value = baseURL;
	$('provider').model.value = model;
});

$('provider').addEventListener('submit', async (e) => {
	e.preventDefault();
	const f = e.target;
	const body = { baseURL: f.baseURL.value.trim(), model: f.model.value.trim() };
	if (f.apiKey.value) body.apiKey = f.apiKey.value;
	try {
		await api('/api/provider', { method: 'PUT', body: JSON.stringify(body) });
		$('provider-note').textContent = 'Saved.';
		load();
	} catch (err) {
		$('provider-note').textContent = err.message;
	}
});

$('builtin').addEventListener('click', async () => {
	await api('/api/provider', { method: 'DELETE' });
	$('provider-note').textContent = 'Back to the built-in model.';
	load();
});

$('new-key').addEventListener('submit', async (e) => {
	e.preventDefault();
	const created = await api('/api/keys', { method: 'POST', body: JSON.stringify({ name: e.target.name.value }) });
	e.target.reset();
	$('new-key-value').textContent = created.key;
	$('reveal').hidden = false;
	load();
});

document.addEventListener('click', async (e) => {
	const id = e.target.dataset?.copy;
	if (!id) return;
	await navigator.clipboard.writeText($(id).textContent).catch(() => {});
	e.target.textContent = 'Copied';
	setTimeout(() => (e.target.textContent = 'Copy'), 1500);
});

if (token) load();
