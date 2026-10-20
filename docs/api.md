# API

## Middleware (public)

| Route | Auth | |
|---|---|---|
| `GET /v1/models` | `Bearer rk_…` | `auto` (when more than one agent is on) and each agent that is on |
| `POST /v1/chat/completions` | `Bearer rk_…` | OpenAI chat completions; `stream: true` for SSE. `model`: an agent id or `auto` |
| `GET /api/config` | `Bearer ADMIN_TOKEN` | endpoint, provider (without its key), agents, API keys |
| `PUT /api/provider` | `Bearer ADMIN_TOKEN` | `{ baseURL, model, apiKey? }` (omit `apiKey` to keep the stored one) |
| `PUT /api/agents` | `Bearer ADMIN_TOKEN` | `{ disabled: ["agent-id", …] }` |
| `POST /api/keys` | `Bearer ADMIN_TOKEN` | `{ name }` → `{ id, name, key }`: the key is shown only here |
| `DELETE /api/keys/:id` | `Bearer ADMIN_TOKEN` | revoke a key |

Optional request header on `/v1`: `X-Session-Id` keeps memory per session and agent, so only the new message needs sending.

## Agents Worker (private)

Served by `createAgentServer` from `@rubrion/mastra-cloudflare`, behind the middleware's service binding. Same `/v1` routes, plus `GET /` (health and agent ids). The middleware sets these headers on every call:

| Header | |
|---|---|
| `X-Provider-Base-URL`, `X-Provider-Key`, `X-Provider-Model` | the model provider for this request |
| `X-Agents` | comma-separated ids of the agents that are on |
| `X-Session-Id` | passed through from the client |
| `Authorization: Bearer AGENTS_API_KEY` | when set |
