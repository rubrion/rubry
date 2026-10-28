# Agents and tools

## Add an agent

Create `agents/src/agents/<name>.ts`:

```ts
import type { AgentSpec } from '@rubrion/mastra-cloudflare';

export const support: AgentSpec = {
	id: 'support',
	name: 'Support',
	// The "auto" router picks agents by this line: say what the agent is for.
	description: 'Answers questions about our product, plans and billing.',
	instructions: 'You are our support agent. Be brief and kind. …',
	maxOutputTokens: 800,
};
```

List it in `agents/src/index.ts`:

```ts
export const agents = defineAgents([writer, researcher, support], { memory });
```

It shows up in `/v1/models`, on the settings page (where you can turn it off), and in `auto` routing.

## Add a tool

```ts
import { createTool, z } from '@rubrion/mastra-cloudflare';

export const lookupOrder = createTool({
	id: 'lookup_order',
	description: 'Status of an order by its number.',
	inputSchema: z.object({ order: z.string() }),
	execute: async ({ order }) => {
		const res = await fetch(`https://api.example.com/orders/${order}`);
		return res.ok ? res.json() : { error: `HTTP ${res.status}` };
	},
});
```

Give it to an agent with `tools: { lookup_order: lookupOrder }`. Secrets a tool needs (an API token) go in `wrangler secret put` and are read with `import { env } from 'cloudflare:workers'`; declare them on `Cloudflare.Env` in `agents/src/env.d.ts`.

## Models

By default every agent uses the provider set on the settings page, or, when none is set, the Workers AI model in `agents/src/index.ts` (`DEFAULT_MODEL`, Gemma 4; it must support tool calls). An agent can use its own:

```ts
import { workersAI, openAICompatible } from '@rubrion/mastra-cloudflare';
import { env } from 'cloudflare:workers';

model: () => workersAI(env.AI, '@cf/mistralai/mistral-small-3.1-24b-instruct'),
// or
model: () => openAICompatible({ baseURL: 'https://openrouter.ai/api/v1', apiKey: env.OPENROUTER_KEY, model: 'openai/gpt-5-mini' }),
```

## Memory

Clients send the conversation in `messages`, so agents are stateless by default. A client that sends `X-Session-Id` gets memory instead: only the new message is needed, and the agent recalls the last 8 messages of that session from D1 (`MEMORY` binding; change `lastMessages` in `src/index.ts`).

## Routing

`model: "auto"` asks a planner (on the same provider) which agents should answer the last message. One agent answers when that's enough; distinct deliverables ("summarize this page and write a tweet") are split across up to three agents, each given only its part, and their replies are merged under their names. Turn it off with `planner: false` in `createAgentServer`.
