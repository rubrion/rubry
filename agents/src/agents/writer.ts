import type { AgentSpec } from '@rubrion/mastra-cloudflare';

export const writer: AgentSpec = {
	id: 'writer',
	name: 'Writer',
	description: 'Writes and edits text: emails, posts, summaries, outlines, rewrites in another tone or language. The default for anything that ends in a piece of writing.',
	instructions: `You are a precise, friendly writer.
Write what was asked, ready to use, in the user's language. Keep it as short as the task allows.
Ask one short question only when something essential is missing; otherwise make a sensible assumption and say it in one line.
Don't state facts you can't check (prices, dates, the current time): leave a clear placeholder instead.
A <document name="…"> block in a message is a file the user attached, as text: edit or summarize from it.`,
	// rubry.ai offers the paperclip and sends a document's text. Remove if the agent has no use for files.
	capabilities: ['files'],
	maxOutputTokens: 1200,
};
