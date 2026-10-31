# API

## Middleware (public)

| Route | Auth | |
|---|---|---|
| `GET /v1/models` | `Bearer rk_…` | `auto` (when more than one agent is on) and each agent that is on |
| `POST /v1/chat/completions` | `Bearer rk_…` | OpenAI chat completions; `stream: true` for SSE. `model`: an agent id or `auto` |
| `GET /api/config` | `Bearer ADMIN_TOKEN` | endpoint, provider (without its key), agents, API keys |
| `PUT /api/provider` | `Bearer ADMIN_TOKEN` | `{ baseURL, model, apiKey? }` (omit `apiKey` to keep the stored one) |
| `PUT /api/agents` | `Bearer ADMIN_TOKEN` | `{ disabled: ["agent-id", …] }` |
| `PUT /api/caller-model` | `Bearer ADMIN_TOKEN` | `{ on: true }`: let callers bring their model (below) |
| `POST /api/keys` | `Bearer ADMIN_TOKEN` | `{ name }` → `{ id, name, key }`: the key is shown only here |
| `DELETE /api/keys/:id` | `Bearer ADMIN_TOKEN` | revoke a key |

Optional request headers on `/v1`:

- `X-Session-Id` keeps memory per session and agent, so only the new message needs sending.
- `X-Provider-Base-URL` (https), `X-Provider-Key`, `X-Provider-Model`: the caller's own model provider, used instead of yours **only** when **Let callers bring their model** is on in the settings (off by default; never in demo mode). The caller pays for those tokens; your tools and secrets still run here. rubry.ai uses it to run Agent Hub agents on its own model with a short-lived key, so people can try yours at no cost to you.

Replies carry OpenAI's `usage` (tokens over the planner, every agent and every tool round): in the JSON body, or on the final chunk when streaming.

## Agents Worker (private)

Served by `createAgentServer` from `@rubrion/mastra-cloudflare`, behind the middleware's service binding. Same `/v1` routes, plus `GET /` (health and agent ids). The middleware sets these headers on every call:

| Header | |
|---|---|
| `X-Provider-Base-URL`, `X-Provider-Key`, `X-Provider-Model` | the model provider for this request |
| `X-Agents` | comma-separated ids of the agents that are on |
| `X-Session-Id` | passed through from the client |
| `Authorization: Bearer AGENTS_API_KEY` | when set |
