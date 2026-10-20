# rubry

A template for your own multi-agent assistant, on [Cloudflare Workers](https://workers.cloudflare.com) and [Mastra](https://mastra.ai). Write agents and tools in TypeScript and get an OpenAI-compatible endpoint you can use from [rubry.ai](https://rubry.ai/chat), Open WebUI, or your own app. It runs on Workers AI out of the box, with no model keys; switch to any OpenAI-compatible provider on its settings page.

```
client (rubry.ai, Open WebUI, your app)
   │  Authorization: Bearer rk_…        OpenAI-compatible /v1
   ▼
middleware/  Worker   API keys · provider (key encrypted) · agents on/off · settings page
   │  service binding: provider, agents on, session id as headers
   ▼
agents/      Worker   your Mastra agents and tools · "auto" routing · D1 memory
   │
   ▼
Workers AI (built in), or any OpenAI-compatible provider (OpenAI, OpenRouter, LiteLLM/vLLM/Ollama…)
```

- **`agents/`**: your agents. Each is a few lines of config in `src/agents/`; tools go in `src/tools/`. The server comes from [`@rubrion/mastra-cloudflare`](https://github.com/rubrion/mastra-cloudflare), the only dependency.
- **`middleware/`**: the only public Worker, with no dependencies. It checks API keys, holds the provider config in D1, and serves the settings page (`client/`).

Ask for `model: "auto"` and a planner sends each message to the agent(s) whose description fits, splitting a request across up to three agents when it has distinct parts. Ask for an agent id to talk to it directly.

## Quick start

Needs Node 20+ and a Cloudflare account (the free plan is enough).

```bash
git clone https://github.com/rubrion/rubry my-agents && cd my-agents
npm install
cp middleware/.dev.vars.example middleware/.dev.vars   # fill ADMIN_TOKEN and SECRET_KEY
npm run dev                                            # both Workers on http://localhost:8787
```

Open http://localhost:8787, sign in with your `ADMIN_TOKEN` and create an API key (agents run on Workers AI until you set a provider there). Then:

```bash
curl -N http://localhost:8787/v1/chat/completions \
  -H "Authorization: Bearer rk_…" -H "Content-Type: application/json" \
  -d '{"model":"auto","stream":true,"messages":[{"role":"user","content":"Write a 6-word slogan for a bike shop"}]}'
```

Try it without installing anything first: take a key at [example.rubry.ai](https://example.rubry.ai) (a public demo of this template) and connect it on [rubry.ai/chat](https://rubry.ai/chat).

## Next

Full guides, with screenshots: **[docs.rubry.ai](https://docs.rubry.ai)**. In this repo:

- [Agents and tools](docs/agents.md): add an agent, a tool, a per-agent model, memory.
- [Deploy](docs/deploy.md): D1 databases, secrets, `npm run deploy`.
- [Connect](docs/connect.md): rubry.ai, Open WebUI, the OpenAI SDK.
- [API](docs/api.md): endpoints and headers.

## License

GPL-3.0. See [LICENSE](LICENSE).
