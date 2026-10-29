// The agents Worker: your agents behind an OpenAI-compatible API
// (GET /v1/models, POST /v1/chat/completions, model "auto" routes).
// The middleware in front of it checks callers' keys and sends the model
// provider, the agents that are on, and an optional session id as headers.
// With no provider set, agents run on Workers AI.
import { env } from 'cloudflare:workers';
import { createAgentServer, d1Memory, defineAgents, workersAI } from '@rubrion/mastra-cloudflare';
import { researcher } from './agents/researcher';
import { writer } from './agents/writer';

/** Workers AI model used until a provider is set (it must support tool calls). */
const DEFAULT_MODEL = '@cf/google/gemma-4-26b-a4b-it';

// Add an agent: write it in src/agents/ and list it here.
export const agents = defineAgents([writer, researcher], {
	memory: d1Memory(() => env.MEMORY, { lastMessages: 8 }),
});

export default createAgentServer({
	agents,
	name: 'rubry',
	// Set it equal to the middleware's AGENTS_API_KEY; unset, the service
	// binding is the only way in anyway (workers_dev is off).
	apiKey: (e: Env) => e.AGENTS_API_KEY,
	defaultModel: (e: Env) => workersAI(e.AI, DEFAULT_MODEL, { thinking: false }),
	// A public sandbox (DEMO_MODE, as on the middleware) keeps each request
	// small: one agent per message and two tool rounds.
	maxSteps: (e: Env) => (e.DEMO_MODE === 'true' ? 2 : 5),
	maxAgents: (e: Env) => (e.DEMO_MODE === 'true' ? 1 : 3),
});
